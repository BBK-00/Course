/* 7-тақырып API тесті: нұсқалар, бастау, көшіруді 0 қылу, кеш жіберу, автоматты тексеру.
   Жергілікті: `npx wrangler dev -c wrangler.dev.jsonc --port 8787 --local` (.dev.vars: TEACHER_PASSWORD=test123, GEMINI_STUB=1), содан `node test/approx.api.test.mjs` */
import { data7, expected7, auto7, V7 } from '../src/approx.js';
const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const call = async (path, o = {}, tok) => {
  const r = await fetch(B + '/api/' + path, { method: o.body ? 'POST' : (o.method || 'GET'), headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  return { s: r.status, j: await r.json() };
};
let TT = ''; const T = (path, o) => call('teacher/' + path, o, TT);

console.log('Нұсқалар және автоматты тексеру (серversіз)');
ok(V7.length === 20 && new Set(V7.map(v => JSON.stringify(v))).size === 20, '20 әртүрлі нұсқа');
for (let t = 1; t <= 3; t++) { const e = expected7(t, 1); const out = t === 2 ? e.map(x => x.seq.join(' ')).join('\n') : e.map(x => x.one).join('\n'); ok(auto7(t, 1, out).pts === [7, 10, 10][t - 1], t + '-тапсырма: дұрыс жауап толық балл (' + auto7(t, 1, out).pts + ')'); ok(auto7(t, 1, 'сәлем 0 0 0').pts <= 3, t + '-тапсырма: дұрыс емес жауап аз балл алады'); }

console.log('Оқытушы және студент');
let r = await call('teacher/login', { body: { password: process.env.PASS || 'test123' } }); TT = r.j.token; ok(!!TT, 'оқытушы кірді');
await T('session/close', { body: {} });
const GN = 'АП-' + (Date.now() % 100000);
r = await T('groups', { body: { name: GN } }); const g = r.j.groups.find(x => x.name === GN);
r = await T('students', { body: { group_id: g.id, names: 'Әлиев Асқар\nСерік Нұрлан\nЖанар Ермек' } }); const [s1, s2, s3] = r.j.groups.find(x => x.id === g.id).students.sort((a, b) => a.id - b.id);
r = await T('session/start', { body: { topic: '7' } }); ok(r.j.ok, '7-тақырып сабағы басталды');
let live = (await T('live')).j; const code = live.session.code; ok(live.session.topic === '7', 'сессия тақырыбы 7');
const join = async (st, dev) => (await call('join', { body: { student_id: st.id, code, device: dev } })).j.token;
const t1 = await join(s1, 'a'), t2 = await join(s2, 'b'), t3 = await join(s3, 'c');
let me = (await call('me', {}, t1)).j; ok(me.ok && me.variant === 1 && me.data && me.data.t1.x0 === data7(1).t1.x0, 'студентке нұсқа деректері беріледі');
ok(!JSON.stringify(me).includes('"one"'), 'дұрыс жауап студентке көрінбейді');
r = await call('task/start', { body: { task: 1 } }, t1); ok(r.s === 403 && r.j.error === 'not_started', 'жұмыс басталмай тапсырма жоқ');
r = await T('session/work', { body: { minutes: 35 } }); ok(r.j.ok, 'оқытушы жұмысты бастады (35 мин)');
r = await call('submit', { body: { task: 1, payload: { code: 'print(1)', lang: 'python' }, signals: {} } }, t1); ok(r.j.error === 'task_not_started', 'бастамай жіберуге болмайды');
r = await call('task/start', { body: { task: 1 } }, t1); ok(r.j.ok && [1, 2, 3].every(n => r.j.tasks[n].started_at && r.j.tasks[n].limit === 35), 'бір «Бастау» үш тапсырманы да бастайды (35 мин)');

const py1 = v => { const d = data7(v).t1; return 'x0 = ' + d.x0 + '\ny0 = ' + d.y0 + '\nx1 = ' + d.x1 + '\ny1 = ' + d.y1 + '\nx = ' + d.x + '\nk = (y1 - y0) / (x1 - x0)\np = y0 + k * (x - x0)\nprint(k)\nprint(p)\n'; };
console.log('Дұрыс код → автоматты балл');
r = await call('submit', { body: { task: 1, payload: { code: py1(1), lang: 'python' }, signals: { typed: 200, assist: 10, tpl: 80, pasted: 0, paste: 0 } } }, t1);
ok(r.j.ok && r.j.tasks[1].sent, 'код жіберілді (' + JSON.stringify(r.j.tasks && r.j.tasks[1]) + ')');
let w = (await T('work?session=' + live.session.id + '&student=' + s1.id)).j; let sub = w.subs.find(x => x.task === 1);
ok(sub && sub.auto_score === 7, 'нәтиже дұрыс: автоматты 7/7 (' + (sub && sub.auto_score) + ', ' + (sub && sub.payload.run && sub.payload.run.backend) + ')');
ok(sub && !sub.payload.zero && sub.payload.late === 0, 'мерзімінде, көшірілмеген');
ok(w.calc.tasks[1].pts >= 7, 'балл есептелді: ' + w.calc.tasks[1].pts + ' / ' + w.calc.tasks[1].max);

console.log('Көшіріп қойса → 0');
r = await call('task/start', { body: { task: 1 } }, t2);
r = await call('submit', { body: { task: 1, payload: { code: py1(2), lang: 'python' }, signals: { typed: 5, assist: 0, tpl: 80, pasted: 300, paste: 1 } } }, t2);
w = (await T('work?session=' + live.session.id + '&student=' + s2.id)).j; sub = w.subs.find(x => x.task === 1);
ok(sub && sub.payload.zero === 'paste' && w.calc.tasks[1].pts === 0, 'қою әрекеті 40 таңбадан асса: 0 балл');
r = await call('task/start', { body: { task: 1 } }, t3);
r = await call('submit', { body: { task: 2, payload: { code: 'x = ' + 'a'.repeat(400), lang: 'python' }, signals: { typed: 10, assist: 0, tpl: 50, pasted: 0, paste: 0 } } }, t3);
w = (await T('work?session=' + live.session.id + '&student=' + s3.id)).j; sub = w.subs.find(x => x.task === 2);
ok(sub && sub.payload.zero === 'typed' && w.calc.tasks[2].pts === 0, 'код терілмей пайда болса: 0 балл');

console.log('Кеш жіберу');
r = await call('submit', { body: { task: 1, payload: { code: py1(1), lang: 'python' }, signals: { typed: 200, assist: 10, tpl: 80 } } }, t1); ok(r.s === 409 && r.j.error === 'already', 'бір тапсырма екі рет жіберілмейді');
const { lateFactor7 } = await import('../src/grading.js');
ok(lateFactor7(0) === 1 && lateFactor7(1) === 1 && lateFactor7(11) === 0.7 && lateFactor7(100) === 0.4, 'кешіккенде коэффициент: 11 минут → 0,7; ең аз 0,4');

console.log('Тақырып ауысуы');
r = await T('reopen', { body: { id: sub.id } }); ok(r.j.ok, 'оқытушы қайта ашты');
await T('session/close', { body: {} });
console.log(fails ? '\nҚателер: ' + fails : '\nБарлығы дұрыс ✓');
process.exit(fails ? 1 : 0);
