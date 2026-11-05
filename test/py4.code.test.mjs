/* Python 4-сабақтың 2-тапсырмасын (есепті кодқа айналдыру, 5 есеп) нақты Python-мен тексереді: node test/py4.code.test.mjs */
import { spawnSync } from 'node:child_process';
import { lessonOf, publicLesson, gradeCodeItem, consoleHarness, NEED_MARK } from '../src/py.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const exe = process.platform === 'win32' ? ['py', ['-3', '-']] : ['python3', ['-']];
const spawn = input => spawnSync(exe[0], exe[1], { input, encoding: 'utf8', timeout: 20000, env: { ...process.env, PYTHONUTF8: '1' } });
const run = async src => { const r = spawn(src); return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr }; };
const NL = String.fromCharCode(10);

console.log('Құрылым және эталон шешімдер');
const t2 = lessonOf('P4', 1)[1];
ok(t2.n === 2 && t2.items.length === 4 && t2.items.map(i => i.id).join() === '31,32,33,34', '4 есеп, идентификаторлар 31–34');
ok(t2.items.map(i => i.max).join() === '7,7,8,8' && t2.items.reduce((a, i) => a + i.max, 0) === 30, '2 оңай × 7 + 2 орташа × 8 = 30 балл');
ok(t2.items.map(i => i.title.split(' ')[0]).join() === 'Оңай,Оңай,Орташа,Орташа', 'деңгейлер: 2 оңай, 2 орташа (қиын жоқ)');
ok(t2.items.map(i => i.fig).join() === 'rect-area,share,rect-perim,clock', 'әр есептің суреті бар');
ok(lessonOf('P4', 1)[1].items.map(i => i.title).join() === lessonOf('P4', 17)[1].items.map(i => i.title).join(), 'барлық студентте бірдей типті есептер');
let refBad = 0, zeroBad = 0;
for (const it of t2.items) {
  if (!it.text || it.cases.length < 5 || !it.hints.under || !it.sample) refBad++;
  const g = await gradeCodeItem(run, it, it.ref); if (g.frac !== 1) { refBad++; console.log('    ✕ эталон', it.title, JSON.stringify(g.cases.filter(c => !c.ok)[0])); }
  const z = await gradeCodeItem(run, it, 'print(0)'); if (z.frac >= 1) { zeroBad++; console.log('    ✕ print(0) өтті', it.title); }
}
ok(refBad === 0, 'эталон шешімдер өз тест жағдайларынан өтеді');
ok(zeroBad === 0, 'бос жауап (print(0)) ешбір есептен өтпейді');
ok(t2.items.slice(0, 2).every(i => !/\)\s*\*|\+/.test(i.ref.split(NL).filter(l => l.startsWith('print')).join(''))), 'оңай есептер бір амалмен шешіледі');

console.log('3-тапсырма: формуланы кодқа айналдыру; 4-тапсырма: тест');
const t3 = lessonOf('P4', 1)[2], t4 = lessonOf('P4', 1)[3];
ok(t3.n === 3 && t3.items.length === 5 && t3.items.map(i => i.max).join() === '3,3,4,4,6' && t3.items.map(i => i.id).join() === '41,42,43,44,45' && t3.items.map(i => i.title.split(' ')[0]).join() === 'Оңай,Оңай,Орташа,Орташа,Қиын', '3-тапсырма: 2 оңай (3+3), 2 орташа (4+4), 1 қиын (6) = 20 балл');
ok(t3.items.slice(0, 3).every(i => i.cases.length === 1 && i.cases[0].in.length === 0 && !i.sample) && t3.items.slice(3).every(i => i.cases[0].in.length > 0 && i.sample), 'алғашқы 3 есеп айнымалысыз (енгізу жоқ), соңғы 2-еуі айнымалымен');
const hard0 = await gradeCodeItem(run, t3.items[0], 'print(15)'); ok(hard0.frac === 0 && hard0.diag.length, 'жауапты санмен жазып қойса (print(15)), 0 балл және түсініктеме');
let b3 = 0;
for (const it of t3.items) { const g = await gradeCodeItem(run, it, it.ref); if (g.frac !== 1) { b3++; console.log('    ✕ эталон', it.title); } const z = await gradeCodeItem(run, it, 'print(0)'); if (z.frac >= 1) { b3++; console.log('    ✕ print(0)', it.title); } }
ok(b3 === 0 && t3.items.every(i => /pf-math/.test(i.text)), 'эталон өтеді, бос жауап өтпейді, формула мәтінде бар');
const bad3 = ['a = int(input())', 'b = int(input())', 'c = int(input())', 'print((a + b) / 2 * c)'].join(NL) + NL;
const g3 = await gradeCodeItem(run, t3.items[3], bad3); ok(g3.frac < 1 && g3.diag.length, 'бөлімде жақшасыз (a + b) / 2 * c ұсталады');
const bad4 = ['a = int(input())', 'b = int(input())', 'c = int(input())', 'print(b + 10 * c - 2 * (a + b) / a * c - 2 * a)'].join(NL) + NL;
const g4 = await gradeCodeItem(run, t3.items[4], bad4); ok(g4.frac < 1 && g4.diag.length, 'күрделі бөлшекте жақшасыз жазу ұсталады');
ok(t4.n === 4 && t4.items.length === 5 && t4.items.every(i => i.kind === 'quiz' && i.max === 2 && i.opts.length >= 4 && i.correct >= 0 && i.why) && t4.items.map(i => i.id).join() === '51,52,53,54,55', '4-тапсырма: 5 тест сұрағы × 2 = 10 балл');
ok(new Set(Array.from({ length: 20 }, (_, i) => lessonOf('P4', i + 1)[3].items.map(q => q.q + q.code).join('|'))).size > 5, 'тест сұрақтары студенттерде әртүрлі');

console.log('Типтік қателер ұсталады');
const wrong = { 'Кәмпитті бөлу': ['n = int(input())', 'k = int(input())', 'print(n / k)'], 'Тікбұрыштың ауданы': ['a = int(input())', 'b = int(input())', 'print(a + b)'], 'Тікбұрыштың периметрі': ['a = int(input())', 'b = int(input())', 'print(2 * a + b)'], 'Секундты минутқа айналдыру': ['n = int(input())', 'print(n / 60)', 'print(n % 60)'] };
let wBad = 0;
for (const it of t2.items) { const g = await gradeCodeItem(run, it, wrong[it.title.split(' · ')[1]].join(NL) + NL); if (g.frac >= 1 || !g.diag.length) { wBad++; console.log('    ✕ қате ұсталмады', it.title); } }
ok(wBad === 0, 'типтік қателер ұсталады және кеңес беріледі');
const hv = await gradeCodeItem(run, t2.items[0], t2.items[0].ref.split('int(input())').join('input()'));
ok(hv.frac < 1 && hv.diag.some(d => /int|мәтін|Түрлері/.test(d.text)), 'int() ұмытылса, түсінікті кеңес шығады');
const pub2 = JSON.stringify(publicLesson(3, 17, 'P4')[1]);
ok(!/"ref"|"cases"|"hints"/.test(pub2) && /"fig":"rect-area"/.test(pub2) && /"text"/.test(pub2), 'студентке эталон жіберілмейді, мәтін мен сурет түрі жіберіледі');

console.log('1-тапсырма: біртаңбалы және екітаңбалы сандар аралас');
let one = 0, two = 0;
for (let v = 1; v <= 20; v++) lessonOf('P4', v)[0].items.filter(i => i.op === 'add' || i.op === 'sub').forEach(i => (i.code.match(/\d+/g) || []).forEach(n => { if (n.length === 1) one++; else two++; }));
ok(one > 20 && two > 20, 'қосу/азайту есептерінде біртаңбалы (' + one + ') және екітаңбалы (' + two + ') сандар бар');

console.log('Консоль (input() жолдың өзінде)');
const cons = (code, inputs) => { const r = spawn(consoleHarness(code, inputs)); return { out: r.stdout.split(String.fromCharCode(13)).join(''), err: r.stderr, need: r.stderr.includes(NEED_MARK) }; };
const prog = ['a = int(input("a = "))', 'b = int(input("b = "))', 'print("S =", a + b)'].join(NL) + NL;
let c = cons(prog, []); ok(c.need && c.out === 'a = ', 'енгізу жоқ: бірінші сұрау шығады');
c = cons(prog, ['3', '4']); ok(!c.need && c.out === 'a = 3' + NL + 'b = 4' + NL + 'S = 7' + NL, 'жауаптар жолға жазылып, бағдарлама аяқталады');
c = cons(prog, ['x']); ok(!c.need && /ValueError/.test(c.err) && !/_input/.test(c.err), 'қате: тек студент коды көрсетіледі');

console.log(fails ? NL + 'Қателер: ' + fails : NL + 'Бәрі өтті');
process.exit(fails ? 1 : 0);
