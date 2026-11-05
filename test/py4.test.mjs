/* Python 4-сабақтың (арифметикалық операторлар) 15 жылдам есебін нақты Python-мен тексереді: node test/py4.test.mjs */
import { spawnSync } from 'node:child_process';
import { lessonOf, publicLesson, gradeQuizItem, itemScore, pyTasks, PY_MAXS, isPy, SKILLS } from '../src/py.js';
import { checkAnswer, OPS4 } from '../src/py4.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const exe = process.platform === 'win32' ? ['py', ['-3', '-']] : ['python3', ['-']];
const pyOut = src => { const r = spawnSync(exe[0], exe[1], { input: src, encoding: 'utf8', timeout: 20000, env: { ...process.env, PYTHONUTF8: '1' } }); return r.status === 0 ? r.stdout.trim() : 'ERR ' + r.stderr; };
const L = v => lessonOf('P4', v);

console.log('Құрылым');
ok(isPy('P4') && pyTasks('P4').join() === '1,2,3,4,5' && PY_MAXS.P4[1] === 15 && PY_MAXS.P4[2] === 30 && PY_MAXS.P4[3] === 20 && PY_MAXS.P4[4] === 10 && PY_MAXS.P4[5] === 25, 'P4: 15 + 30 + 20 + 10 + үй жұмысы 25 = 100');
const t = L(1)[0];
ok(t.items.length === 15 && t.items.every(i => i.max === 1 && i.typed && i.kind === 'quiz'), '15 есеп, әрқайсысы 1 балл, жауабы жазылады');
ok(t.items.map(i => i.id).join() === '11,12,13,14,15,16,17,18,19,20,21,22,23,24,25', 'идентификаторлар 11–25');
const cnt = {}; t.items.forEach(i => { cnt[i.op] = (cnt[i.op] || 0) + 1; });
ok(['add', 'sub', 'mul', 'div', 'idiv', 'mod', 'pow'].map(k => cnt[k]).join() === '2,2,2,2,2,3,2' && Object.keys(OPS4).length === 7, 'амалдар: + 2, - 2, * 2, / 2, // 2, % 3, ** 2');
ok(Object.keys(OPS4).every(k => SKILLS[k] && SKILLS[k].tip), 'жеті амалдың да дағды түсініктемесі бар');

console.log('Барлық 20 нұсқа: жауаптар нақты Python-мен');
const progs = []; const meta = [];
for (let v = 1; v <= 20; v++) L(v)[0].items.forEach(it => { progs.push(it.code); meta.push({ v, it }); });
const out = pyOut(progs.map(c => 'print("<<<")\n' + c).join('\n') + '\n');
const got = out.split('<<<').slice(1).map(s => s.trim());
let bad = 0, selfBad = 0, altBad = 0, same = 0;
meta.forEach(({ v, it }, i) => {
  if (got[i] !== it.ans) { bad++; console.log('    ✕ жауап', v, it.code, 'күтілген', it.ans, 'Python', got[i]); }
  if (!checkAnswer(it, it.ans).ok || gradeQuizItem(it, it.ans).frac !== 1) { selfBad++; console.log('    ✕ дұрыс жауап қабылданбады', v, it.code); }
  if (checkAnswer(it, '').ok || checkAnswer(it, 'abc').ok) selfBad++;
  (it.alts || []).forEach(a => { const r = checkAnswer(it, String(a.v)); if (r.ok || r.diag[0].tag !== a.tag) { altBad++; console.log('    ✕ шатастыру', v, it.code, a.v, JSON.stringify(r.diag)); } });
  if ((it.alts || []).some(a => a.v === Number(it.ans))) same++;
});
ok(bad === 0, '300 есептің жауабы Python нәтижесімен сәйкес (' + meta.length + ' есеп)');
ok(selfBad === 0, 'дұрыс жауап қабылданады, бос және сан емес жауап қабылданбайды');
ok(altBad === 0 && same === 0, 'қате жауап дұрыс шатастыру түріне жіктеледі');
ok(new Set(Array.from({ length: 20 }, (_, i) => L(i + 1)[0].items.map(x => x.code).join('|'))).size >= 18, 'нұсқалар бір-бірінен әртүрлі (кемі 18 түрлі жинақ)');

console.log('Жауапты тексеру ережелері');
const dv = L(1)[0].items.find(i => i.op === 'div' && i.ans.endsWith('.0')), di = L(1)[0].items.find(i => i.op === 'div' && !i.ans.endsWith('.0'));
ok(checkAnswer(dv, dv.ans).ok && checkAnswer(dv, dv.ans.replace('.', ',')).ok, 'үтірмен жазылған бөлшек қабылданады');
const r1 = checkAnswer(dv, String(parseInt(dv.ans, 10)));
ok(!r1.ok && r1.diag[0].tag === 'need_float', 'бөлу 5.0 орнына 5 жазылса: float туралы түсініктеме');
ok(checkAnswer(di, di.ans).ok, 'бөлшек нәтиже қабылданады: ' + di.code + ' → ' + di.ans);
const sub2 = L(1)[0].items[3];
ok(sub2.op === 'sub' && Number(sub2.ans) < 0 && checkAnswer(sub2, '−' + Math.abs(Number(sub2.ans))).ok, 'теріс жауап (− таңбасымен де) қабылданады');
const mod0 = L(1)[0].items.find(i => i.op === 'mod' && i.ans === '0');
ok(mod0 && !checkAnswer(mod0, '0.0').ok && checkAnswer(mod0, '0.0').diag[0].tag === 'need_int', 'қалдық 0 орнына 0.0: бүтін екені түсіндіріледі');

console.log('Студентке жіберілетін көрініс');
const pub = publicLesson(3, 17, 'P4')[0];
ok(pub.items.length === 15 && pub.items.every(i => i.typed && i.opts.length === 0 && i.code), '15 есеп, жауап нұсқасыз');
ok(!/"ans"|"why"|"alts"/.test(JSON.stringify(pub)), 'дұрыс жауап пен түсініктеме студентке жіберілмейді');

console.log('Балл');
const it0 = t.items[0], sc0 = itemScore(it0, []), sc1 = itemScore(it0, [{ n: 1, frac: 0 }]), sc2 = itemScore(it0, [{ n: 1, frac: 1 }]);
ok(sc0.pts === 0 && sc2.pts === 1 && sc1.pts === 0 && !sc1.canRevise && sc1.revLeft === 0, 'дұрыс 1 балл, қате 0 балл, қайта жіберу жоқ');

console.log('Оқытушы талдауы (амалдар бойынша)');
{
  const { opStats } = await import('../src/pyapi.js');
  const items = L(1)[0].items, meta = {}; items.forEach(i => { meta[i.id] = { id: i.id, op: i.op }; });
  const at = (it, text) => { const r = checkAnswer(it, text); return [{ n: 1, at: 1, frac: r.ok ? 1 : 0, detail: { diag: r.diag, choice: text }, signals: {} }]; };
  const mk = f => Object.fromEntries(items.map(it => [it.id, at(it, f(it))]));
  const asDiv = it => it.op === 'idiv' ? String(Number(it.alts.find(a => a.tag === 'idiv_as_div').v)) : it.ans;
  const per = { 1: { name: 'Дұрыс', items: mk(it => it.ans) }, 2: { name: 'Шатасқан', items: mk(asDiv) }, 3: { name: 'Бос', items: mk(() => '999') } };
  const st = Object.fromEntries(opStats(meta, per).map(o => [o.op, o]));
  ok(st.add.pct === 67 && st.add.answers === 6 && st.add.correct === 4, '+ амалы: 6 жауаптан 4 дұрыс = 67%');
  ok(st.idiv.pct === 33 && st.idiv.mis[0].tag === 'idiv_as_div' && st.idiv.mis[0].n === 2, '// амалы: жиі қате — / мен шатастыру (2)');
  ok(st.idiv.weak.join() === 'Шатасқан,Бос' && st.add.weak.join() === 'Бос' && st.mod.students === 3, 'қиналған студенттер дұрыс анықталады');
  ok(st.mod.answers === 9 && st.pow.answers === 6 && st.div.q === 2 && st.mod.q === 3, 'әр амалдағы есеп және жауап саны');
}
console.log(fails ? '\nҚателер: ' + fails : '\nБәрі өтті');
process.exit(fails ? 1 : 0);
