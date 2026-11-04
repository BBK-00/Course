/* Python 8-сабақтың (if–else, elif) мазмұнын нақты Python-мен тексереді: node test/py8.test.mjs */
import { spawnSync } from 'node:child_process';
import { lessonOf, gradeCodeItem, gradeQuizItem, publicLesson, pyTasks, PY_MAXS, constraintOk, checkRiddle } from '../src/py.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const exe = process.platform === 'win32' ? ['py', ['-3', '-']] : ['python3', ['-']];
const run = async src => { const r = spawnSync(exe[0], exe[1], { input: src, encoding: 'utf8', timeout: 20000, env: { ...process.env, PYTHONUTF8: '1' } }); return { ok: r.status === 0, stdout: r.stdout || '', stderr: r.stderr || '' }; };
const L = v => lessonOf('P8', v);

console.log('Құрылым');
ok(pyTasks('P8').join() === '1,2,3' && pyTasks('P7').join() === '1,2,3,4', 'тапсырмалар: P8 — 1,2,3; P7 — 1,2,3,4');
ok(L(1).map(t => t.items.reduce((a, i) => a + i.max, 0)).join() === '30,16,20' && PY_MAXS.P8[1] === 30 && PY_MAXS.P8[2] === 25 && PY_MAXS.P8[3] === 20, '1-тапсырма 30, 2-тапсырма 25 (16 кеңес есебі + 9 сандық), 3-тапсырма 20 балл');
ok(L(1)[0].items.map(i => i.max).join() === '12,18', 'есептер 12 + 18');
ok(L(1)[2].items.length === 10 && L(1)[2].items.every(q => q.max === 2), '10 сұрақ, әрқайсысы 2 балл');
const ids = L(1)[2].items.map(q => q.id); ok(ids.join() === '30,31,32,33,34,35,36,37,38,39', 'сұрақ идентификаторлары 30–39');

console.log('Барлық 20 нұсқа');
let refBad = 0, noElse = 0, diffBad = 0, dup = 0; const kinds = new Set(); const firstEasy = new Set(), firstMed = new Set(), orders = new Set();
for (let v = 1; v <= 20; v++) {
  const [t1, t2, t3] = L(v);
  for (const it of t2.items) {
    if (it.kind === 'quiz') { if (gradeQuizItem(it, it.correct).frac !== 1 || gradeQuizItem(it, (it.correct + 1) % 4).frac !== 0 || new Set(it.opts.map(o => o.t)).size !== 4 || !it.why) { refBad++; console.log('    quiz ✕', v, it.id); } }
    else { const g = await gradeCodeItem(run, it, it.ref); if (g.frac !== 1) { refBad++; console.log('    ref ✕', v, it.id, it.title, JSON.stringify(g.cases.filter(c => !c.ok)[0])); } }
  }
  if (t2.items.map(i => i.tag).join() !== 'code,test,bug,trace' || t2.items.map(i => i.id).join() !== '21,22,23,24') { refBad++; console.log('    tags ✕', v); }
  { const ch = t2.chest;
    if (ch.riddles.length !== 2 || ch.hints.length !== 4 || ch.hints.some(h => !h) || !ch.riddles[0].lines.length || !ch.riddles[1].img || ch.answer !== undefined || JSON.stringify(ch).includes('"keys"')) { refBad++; console.log('    chest ✕', v); }
    t2.items.forEach(i => kinds.add(i.tag + ':' + i.title)); }
  firstEasy.add(t1.items[0].title); firstMed.add(t1.items[1].title);
  for (const it of t1.items) {
    const g = await gradeCodeItem(run, it, it.ref);
    if (g.frac !== 1) { refBad++; console.log('    ref ✕', v, it.id, it.title, JSON.stringify(g.cases.filter(c => !c.ok)[0])); }
    if (!constraintOk(it, it.ref).ok) noElse++;
    /* талапты бұзатын шешім (else жоқ) 80%-пен шектеледі */
    const bad = it.ref.replace(/else:\n\s+print\([^\n]*\)\n?$/, '').replace(/elif /g, 'if ');
    if (it.id === 12) { const g2 = await gradeCodeItem(run, it, it.ref.replace(/elif /g, 'if ')); if (g2.constraint !== false) noElse++; }
  }
  const d = { 'оңай': 0, 'орташа': 0, 'қиын': 0 }; t3.items.forEach(q => { d[q.diff]++; });
  if (d['оңай'] !== 5 || d['орташа'] !== 3 || d['қиын'] !== 2) diffBad++;
  const texts = t3.items.map(q => q.q + '|' + q.code); if (new Set(texts).size !== 10) dup++;
  t3.items.forEach(q => { if (gradeQuizItem(q, q.correct).frac !== 1 || gradeQuizItem(q, (q.correct + 1) % 4).frac !== 0) refBad++; });
  orders.add(texts.join('#'));
}
ok(refBad === 0, 'әр нұсқаның дұрыс шешімі 100% өтеді, тест жауаптары дұрыс');
ok(kinds.size >= 4, 'сандық: екі сұрақ, төрт кеңес мәтіні, жауап пен кілттер жасырын');
ok(checkRiddle(0, 'Мұхтар') && checkRiddle(0, 'мухтар') && checkRiddle(0, 'Мұхтар Әуезов') && !checkRiddle(0, 'Абай') && !checkRiddle(0, 'Microsoft'), '1-сұрақ: «Мұхтар» (қазақша және орысша жазылуы) қабылданады, басқасы қабылданбайды');
ok(checkRiddle(1, 'Microsoft') && checkRiddle(1, 'майкрософт') && checkRiddle(1, ' MICROSOFT corp ') && !checkRiddle(1, 'Apple') && !checkRiddle(1, 'ms') && !checkRiddle(1, ''), '2-сұрақ: Microsoft (латынша, қазақша) қабылданады, басқасы қабылданбайды');
ok(noElse === 0, 'else/elif талабы: дұрыс шешім өтеді, талапты бұзса белгіленеді');
ok(diffBad === 0, 'әр студентте 5 оңай, 3 орташа, 2 қиын сұрақ');
ok(dup === 0, 'бір нұсқада сұрақ қайталанбайды');
ok(firstEasy.size >= 3 && firstMed.size >= 2, 'нұсқалар әртүрлі есептер береді (' + firstEasy.size + ' оңай, ' + firstMed.size + ' орташа тақырып)');
ok(orders.size >= 15, 'тест құрамы мен реті нұсқаға қарай өзгереді (' + orders.size + ' түрлі)');

console.log('Диагностика және студентке көрінісі');
const E = L(2)[0].items[0], M = L(2)[0].items[1];
let g = await gradeCodeItem(run, M, M.ref.replace(/elif /g, 'if '));
ok(g.constraint === false && g.frac <= 0.8 && g.diag.some(d => d.skill === 'elif'), 'elif орнына бөлек if: балл 80%-пен шектеледі, elif кеңесі шығады');
g = await gradeCodeItem(run, M, M.ref.replace(/<= /g, '< '));
ok(g.frac < 1 && g.diag.some(d => d.skill === 'boundary'), 'шекаралық қате: «шекаралық» кеңес');
const noElseCode = E.ref.replace(/else:\n\s+print\([^\n]*\)\n?/, '');
g = await gradeCodeItem(run, E, noElseCode);
ok(g.frac < 1, 'else жоқ: ' + Math.round(g.frac * 100) + '% (бүкіл жағдай өтпейді)');
g = await gradeCodeItem(run, E, E.ref.replace('else:', 'else x:'));
ok(g.syntax, 'else-ке шарт жазылса, синтаксис қатесі');
const pub = publicLesson(3, 5, 'P8');
ok(pub.length === 3 && pub[2].items.length === 10 && pub[0].info && pub[2].info && pub[1].pair, 'студентке 3 тапсырма беріледі, нұсқаулары бар');
ok(!JSON.stringify(pub).includes('"chest"') && !JSON.stringify(pub).includes('Билл Гейтс') && !JSON.stringify(pub).includes('Әуезов, Мағауин') && !JSON.stringify(pub).includes('майкрософт'), 'сандықтың жауабы мен кеңестері студентке алдын ала жіберілмейді');
ok(!JSON.stringify(pub).includes('"correct"') && !JSON.stringify(pub).includes('"ref"') && !JSON.stringify(pub).includes('"why"'), 'дұрыс жауап, эталон және түсініктеме студентке жіберілмейді');
const pos = new Set(); for (let s = 1; s < 40; s++) { const q = publicLesson(1, s, 'P8')[2].items[0], src = L(1)[2].items[0]; pos.add(q.opts.findIndex(o => o.i === src.correct)); }
ok(pos.size >= 3, 'дұрыс жауап орны студенттерге қарай араласады');

console.log(fails ? '\nҚателер: ' + fails : '\nБарлығы дұрыс');
process.exit(fails ? 1 : 0);
