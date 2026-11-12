/* Python 9–10-сабақтардың (құрамды және кірістірілген шарттар) мазмұнын нақты Python-мен тексереді: node test/py910.test.mjs */
import { spawnSync } from 'node:child_process';
import { lessonOf, publicLesson, gradeCodeItem, gradeQuizItem, pyTasks, maxesOf, cfgOf, isWin, isPy, PY_MAXS, SKILLS, NEW_LESSONS } from '../src/py.js';
import { compute } from '../src/grading.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const exe = process.platform === 'win32' ? ['py', ['-3', '-']] : ['python3', ['-']];
const run = async src => { const r = spawnSync(exe[0], exe[1], { input: src, encoding: 'utf8', timeout: 20000, env: { ...process.env, PYTHONUTF8: '1' } }); return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr }; };
const sum = (tasks, n) => Math.round(tasks.find(t => t.n === n).items.reduce((a, i) => a + i.max, 0) * 100) / 100;

for (const topic of ['P9', 'P10']) {
  console.log('\n' + topic);
  const L = lessonOf(topic, 3), def = NEW_LESSONS[topic].def;
  ok(isWin(topic) && isPy(topic) && pyTasks(topic).join() === '1,2,3,4,5', 'тіркелген: 4 тапсырма + 5-үй жұмысы');
  ok(L.length === 4 && L.map(t => t.items.length).join() === '3,4,1,5', 'құрылым: 3 үлгі есеп, 4 қате, 1 қызық, 5 тест сұрағы');
  ok(L.every(t => t.info && t.title), 'әр тапсырмада атау мен түсіндірме бар');
  ok(L.map(t => sum(L, t.n)).join() === '25,20,20,10' && PY_MAXS[topic][5] === 25, 'әдепкі ұпай (үй жұмысымен): 25 + 20 + 20 + 10 = 75, үй жұмысы 25');
  const noHw = lessonOf(topic, 3, undefined, { topic, cfg: JSON.stringify({ hw: false }) });
  ok(noHw.map(t => sum(noHw, t.n)).join() === '35,25,25,15' && pyTasks(topic, { cfg: JSON.stringify({ hw: false }) }).join() === '1,2,3,4', 'үй жұмыссыз: 35 + 25 + 25 + 15 = 100, 5-тапсырма жоқ');
  const cust = lessonOf(topic, 3, undefined, { topic, cfg: JSON.stringify({ hw: true, pts: { 1: 40, 2: 10, 3: 15, 4: 10 } }) });
  ok(cust.map(t => sum(cust, t.n)).join() === '40,10,15,10' && maxesOf(topic, { cfg: JSON.stringify({ hw: true, pts: { 1: 40, 2: 10, 3: 15, 4: 10 } }) })[5] === 25, 'оқытушы ұпайды өзгертсе, есептер ұпайы пропорционалды масштабталады');
  let refBad = 0, startBad = 0, shape = 0;
  for (let v = 0; v <= 3; v++) {
    for (const t of lessonOf(topic, v)) for (const it of t.items) {
      if (it.kind === 'quiz') { if (gradeQuizItem(it, it.correct).frac !== 1 || new Set(it.opts.map(o => o.t)).size !== it.opts.length || !it.why || !it.skills.length) shape++; continue; }
      if (!it.text || it.cases.length < 4 || !it.hints.under || !it.sample || !it.skills.length || !it.op) shape++;
      const g = await gradeCodeItem(run, it, it.ref); if (g.frac !== 1) { refBad++; console.log('    ✕ эталон', it.title, JSON.stringify(g.cases.filter(c => !c.ok)[0])); }
      if (it.kind === 'fix') { const s = await gradeCodeItem(run, it, it.starter); if (s.frac >= 1) { startBad++; console.log('    ✕ қателі код өтіп кетті', it.title); } else if (!s.diag.length) { startBad++; console.log('    ✕ кеңес жоқ', it.title); } }
      if (it.kind === 'code') { const z = await gradeCodeItem(run, it, 'print(0)'); if (z.frac >= 1) { startBad++; console.log('    ✕ print(0) өтті', it.title); } }
    }
  }
  ok(shape === 0, 'әр есепте мәтін, мысал, кеңес, дағды және тест жағдайлары бар; тест жауаптары дұрыс');
  ok(refBad === 0, 'барлық эталон шешім өз тест жағдайларынан өтеді');
  ok(startBad === 0, 'қателі код өтпейді және оған кеңес беріледі; бос жауап өтпейді');
  const used = new Set(L.flatMap(t => t.items.flatMap(i => i.skills)));
  ok([...used].every(k => SKILLS[k] && SKILLS[k].tip), 'барлық дағдының түсініктемесі бар');
  const opKeys = new Set(Object.keys(def.concepts)); ok(L.every(t => t.items.every(i => !i.op || opKeys.has(i.op))), 'әр есептің концепті талдау тізіміне кіреді');
  const pub = JSON.stringify(publicLesson(3, 17, topic));
  ok(!/"ref"|"cases"|"correct"|"hints"/.test(pub), 'студентке эталон, тест жағдайлары мен дұрыс жауап жіберілмейді');
  const variants = new Set(Array.from({ length: 12 }, (_, i) => lessonOf(topic, i + 1)[3].items.map(q => q.q + q.code).join('|'))); ok(variants.size >= 5, 'тест сұрақтары студенттерде әртүрлі (' + variants.size + ' жинақ)');
  const subs = [1, 2, 3, 4].map(n => ({ task: n, auto_score: sum(L, n), payload: JSON.stringify({ done: true }) })).concat([{ task: 5, auto_score: 25, payload: JSON.stringify({ done: true }) }]);
  const c = compute({ id: 1 }, subs, null, 0, topic, { topic });
  ok(c.final === 100 && c.tasks[5].max === 25 && c.tasks[1].max === 25, 'жиынтық: барлық тапсырма толық болса 100, 5-тапсырма 25');
  const c2 = compute({ id: 1 }, subs.slice(0, 4), null, 0, topic, { topic, cfg: JSON.stringify({ hw: false }) });
  ok(c2.tasks[5] === undefined && c2.tasks[1].max === 35 && c2.complete === true, 'үй жұмыссыз: 5-тапсырма есептелмейді, 1-тапсырма 35');
}
console.log(fails ? '\nҚателер: ' + fails : '\nБәрі өтті');
process.exit(fails ? 1 : 0);
