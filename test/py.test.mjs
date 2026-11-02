/* Python сабағының мазмұнын, тексеруін және диагностикасын нақты Python-мен тексереді: node test/py.test.mjs
   (Windows-та `py` іске қосқышы, басқа жүйеде python3 қолданылады). */
import { spawnSync } from 'node:child_process';
import { lessonP7, gradeCodeItem, gradeQuizItem, itemScore, publicLesson, skillSummary, taskPayload, PY_MAX } from '../src/py.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const exe = process.platform === 'win32' ? ['py', ['-3', '-']] : ['python3', ['-']];
const run = async src => { const r = spawnSync(exe[0], exe[1], { input: src, encoding: 'utf8', timeout: 20000, env: { ...process.env, PYTHONUTF8: '1' } }); return { ok: r.status === 0, stdout: r.stdout || '', stderr: r.stderr || '' }; };

console.log('Балл жиыны');
const L1 = lessonP7(1);
ok(L1.map(t => t.items.reduce((a, i) => a + i.max, 0)).join() === Object.values(PY_MAX).join() && Object.values(PY_MAX).reduce((a, b) => a + b) === 100, 'тапсырмалар 20+40+20+20 = 100');
ok(L1.map(t => t.items.length).join() === '4,2,4,5', 'есептер саны 4,2,4,5');

console.log('Барлық 20 нұсқа');
let refBad = 0, starterBad = 0, ids = new Set();
for (let v = 1; v <= 20; v++) {
  for (const t of lessonP7(v)) for (const it of t.items) {
    if (it.kind === 'quiz') { if (gradeQuizItem(it, it.correct).frac !== 1 || gradeQuizItem(it, (it.correct + 1) % 4).frac !== 0) refBad++; continue; }
    const g = await gradeCodeItem(run, it, it.ref);
    if (g.frac !== 1) { refBad++; if (refBad < 6) console.log('    ref ✕', v, it.id, g.cases.map(c => c.ok).join(), JSON.stringify(g.diag), JSON.stringify(g.cases.filter(c => !c.ok)[0])); }
    if (it.kind === 'fix') { const s = await gradeCodeItem(run, it, it.starter); if (s.frac >= 1 || !s.diag.length) { starterBad++; console.log('    starter ✕', v, it.id, s.frac, JSON.stringify(s.diag)); } }
    ids.add(it.id);
  }
}
ok(refBad === 0, 'әр нұсқаның дұрыс шешімі 100% өтеді');
ok(starterBad === 0, 'қатесі бар код өтпейді және түсініктеме береді');
ok(new Set(Array.from({ length: 20 }, (_, i) => lessonP7(i + 1)[0].items[0].text)).size > 1, 'нұсқалар бір-бірінен өзгеше');

console.log('Диагностика');
const A = lessonP7(3)[0].items[0];   /* жас */
const m = (it, a, b) => it.ref.replace(a, b);
let g = await gradeCodeItem(run, A, m(A, '>=', '>'));
ok(g.frac < 1 && g.diag.some(d => d.skill === 'boundary'), 'шекаралық мән: >= орнына > → «шекаралық» кеңес');
g = await gradeCodeItem(run, A, A.ref.replace('int(input())', 'input()'));
ok(g.frac < 1 && g.diag.some(d => d.skill === 'input' && /int\(input\(\)\)/.test(d.text)), 'int() ұмытылған → input түсініктемесі');
g = await gradeCodeItem(run, A, A.ref.replace(':\n', '\n'));
ok(g.syntax && g.diag[0].skill === 'syntax' && /қос нүкте/.test(g.diag[0].text), 'қос нүкте ұмытылған → синтаксис түсініктемесі');
g = await gradeCodeItem(run, A, A.ref.replace('>=', '='));
ok(g.syntax && g.diag[0].skill === 'compare', '= орнына == → «салыстыру» түсініктемесі: ' + (g.diag[0] || {}).text);
g = await gradeCodeItem(run, A, 'age = int(input())\nif age >= 1:\nprint("x")\n');
ok(g.syntax && /шегініс/.test(g.diag[0].text), 'шегініс жоқ → шегініс түсініктемесі');
g = await gradeCodeItem(run, A, 'print("Жеке куәлік алуға болады")');
ok(g.frac < 1 && g.passed > 0, 'шартсыз print: бір бөлігі ғана өтеді (' + g.passed + '/' + g.total + ')');
g = await gradeCodeItem(run, A, 'while True:\n    pass\n');
ok(g.frac === 0 || g.diag.length, 'шексіз цикл бағалауды құлатпайды');

const G = lessonP7(3)[1].items[1];   /* шәкіртақы */
g = await gradeCodeItem(run, G, G.ref.replace('if att', 'if gpa >= 0 and att'));
ok(g.constraint === false && g.frac <= 0.8 && g.diag.some(d => /and/.test(d.text)), 'and қолданылса: талап бұзылады, балл 80%-дан аспайды');
const andOnly = 'gpa = int(input())\natt = int(input())\nif gpa >= ' + /\d+/.exec(G.cases[0].in[0])[0] + ' and att >= ' + G.cases[0].in[1] + ':\n    print("Шәкіртақы тағайындалды")\n';
g = await gradeCodeItem(run, G, andOnly);
ok(g.passed === g.total && g.frac === 0.8, 'and-мен дұрыс жұмыс істесе де 80% (талап бұзылған)');

const B = lessonP7(5)[1].items[0];   /* банкомат */
g = await gradeCodeItem(run, B, B.ref.replace('amount <= 0', 'amount < 0'));
ok(g.frac < 1 && g.diag.some(d => d.skill === 'boundary'), 'банкомат: 0 сомасы өңделмейді → шекаралық кеңес');

console.log('Қатемен жұмыс');
const it5 = { max: 5, kind: 'code' };
let sc = itemScore(it5, [{ n: 1, frac: 0.6 }]);
ok(sc.pts === 3 && sc.canRevise && sc.revLeft === 3, '1-әрекет 60% → 3 / 5, қайта жіберуге болады');
sc = itemScore(it5, [{ n: 1, frac: 0.6 }, { n: 2, frac: 1 }]);
ok(sc.pts === 4.4, 'түзетілген: 5×(0.6 + 0.7×0.4) = 4.4: ' + sc.pts);
sc = itemScore(it5, [{ n: 1, frac: 0.6 }, { n: 2, frac: 0.2 }]);
ok(sc.pts === 3, 'нашар қайта жіберу балды төмендетпейді');
sc = itemScore(it5, [{ n: 1, frac: 1 }]);
ok(sc.pts === 5 && !sc.canRevise, 'бірден дұрыс → толық, қайта жіберу керек емес');
sc = itemScore(it5, [{ n: 1, frac: 0 }, { n: 2, frac: 0 }, { n: 3, frac: 0 }, { n: 4, frac: 1 }]);
ok(sc.pts === 3.5 && sc.revLeft === 0, '3-қайта жіберуде дұрыс → 0 + 0.7×5 = 3.5, әрекет таусылды');
sc = itemScore({ max: 4, kind: 'quiz' }, [{ n: 1, frac: 0 }, { n: 2, frac: 1 }]);
ok(sc.pts === 2 && sc.revLeft === 0, 'тест: түзету 50% → 2 / 4, бір-ақ рет');

console.log('Тест және қорытынды');
const pl = publicLesson(1, 17)[3].items;
ok(pl.length === 5 && pl.every(q => q.opts.length >= 4 && q.correct === undefined), 'студентке дұрыс жауап жіберілмейді');
const pos = new Set(); for (let s = 1; s < 40; s++) { const q = publicLesson(1, s)[3].items[0]; const src = lessonP7(1)[3].items[0]; pos.add(q.opts.findIndex(o => o.i === src.correct)); }
ok(pos.size >= 3, 'дұрыс жауаптың орны студентке қарай өзгереді: ' + [...pos].sort().join());
const t1 = lessonP7(1)[0], by = { 11: [{ n: 1, frac: 1 }], 12: [{ n: 1, frac: 0.4 }, { n: 2, frac: 1 }], 13: [{ n: 1, frac: 0.2 }] };
const tp = taskPayload(t1, by);
ok(Math.abs(tp.pts - 10.1) < 0.01 && !tp.done, 'тапсырма жиыны: ' + tp.pts);
const sm = skillSummary([t1], by, { 12: [{ skill: 'boundary' }], 13: [{ skill: 'input' }] });
ok(sm.some(s => s.skill === 'input' && s.state === 'repeat') && sm.some(s => s.skill === 'boundary' && s.state === 'fixed'), 'дағды қорытындысы: «қайтала» және «түзетілді»');

console.log(fails ? '\nҚателер: ' + fails : '\nБарлығы дұрыс');
process.exit(fails ? 1 : 0);
