if (process.env.BASE && !/127.0.0.1|localhost/.test(process.env.BASE)) { console.log('Тікелей сайтта тест жүргізуге болмайды: ол студенттердің сабағын жауып тастайды.'); process.exit(2); }
/* Scratch 7 API тесті. Жергілікті: wrangler dev (.dev.vars: TEACHER_PASSWORD=test123).
   Тікелей сайт: BASE=<сайт> PASS=<құпиясөз> node test/sb.api.test.mjs */
import { project, sb3 } from './sbproj.mjs';

const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const call = async (path, o = {}, tok) => {
  const r = await fetch(B + '/api/' + path, { method: o.body ? 'POST' : (o.method || 'GET'), headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  return { s: r.status, j: await r.json() };
};
const up = async (tok, bytes, e = '') => { const r = await fetch(B + '/api/sb/upload?e=' + encodeURIComponent(e), { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/octet-stream' }, body: bytes }); return { s: r.status, j: await r.json() }; };
const EX = 'Рет қайталау кедергіні 20 қадам жылжытады. Әрқашан қайталау тоқтамайды. Шарт орындалғанша қайталау мәреге тигенше күтеді.';

let r = await call('teacher/login', { body: { password: process.env.PASS || 'test123' } }); const TT = r.j.token; ok(!!TT, 'оқытушы кірді');
const T = (p, o) => call('teacher/' + p, o, TT);
await T('session/close', { body: {} });
const GN = 'SB-' + (Date.now() % 100000);
const g = (await T('groups', { body: { name: GN } })).j.groups.find(x => x.name === GN);
const [s1, s2, s3] = (await T('students', { body: { group_id: g.id, names: 'Скретч Бірінші\nСкретч Екінші\nСкретч Үшінші' } })).j.groups.find(x => x.id === g.id).students.sort((a, b) => a.id - b.id);
ok((await T('session/start', { body: { topic: 'S7', group_id: g.id } })).j.ok, 'Scratch 7 сабағы басталды');
const live = (await T('live')).j, code = live.session.code, sid = live.session.id;
const join = async s => (await call('join', { body: { student_id: s.id, code, device: 'd' + s.id } })).j.token;
const [t1, t2, t3] = [await join(s1), await join(s2), await join(s3)];
let me = (await call('me', {}, t1)).j; ok(me.ok && me.attendance === 40 && me.tasks[1].max === 5 && me.tasks[2].max === 20 && me.tasks[3].max === 35, 'кірді: қатысым 40, бөлімдер 5/20/35');
r = await up(t1, sb3(project())); ok(r.j.error === 'not_started', 'жұмыс басталмай жүктеуге болмайды');
await T('session/work', { body: { minutes: 50 } });
r = await up(t1, new Uint8Array([1, 2, 3])); ok(r.j.error === 'bad_file', 'Scratch емес файл қабылданбайды');
r = await call('xl/file', {}, t1); ok(r.j.error === 'closed', 'Excel жолы бұл сабақта жабық');

console.log('Дұрыс ойын');
const FILE = sb3(project({ seed: 'a' }));
r = await up(t1, FILE, EX);
ok(r.j.ok && [1, 2, 3].map(n => r.j.tasks[n].pts).join() === '5,20,35', 'толық дұрыс: ' + (r.j.tasks ? [1, 2, 3].map(n => r.j.tasks[n].pts) : r.j.error));
ok(r.j.total === 100, 'жиынтық 40 + 60 = ' + r.j.total);
r = await up(t1, FILE, EX); ok(r.s === 409 && r.j.error === 'already', 'екінші рет жіберуге болмайды');

console.log('Көшірілген жоба');
r = await up(t2, FILE, EX); ok(r.j.ok && r.j.dup === true && r.j.total === 50, 'бірдей жоба 0 балл болады (барлығы ' + r.j.total + ')');

console.log('Жартылай және бос жұмыс');
r = await up(t3, sb3(project({ seed: 'c', cut: ['until'] })), '');
ok(r.j.ok && r.j.tasks[1].pts === 5 && r.j.tasks[2].pts === 20 && r.j.tasks[3].pts === 4, 'шартты циклсіз: ' + [1, 2, 3].map(n => r.j.tasks[n].pts) + ' → ' + r.j.total);

console.log('Оқытушы панелі');
const lv = (await T('live')).j, row = lv.groups.find(x => x.id === g.id).students.find(x => x.id === s1.id);
ok(row.total === 100 && row.tasks[3].max === 35, 'панельде студент 1: ' + row.total);
const w = (await T('work?session=' + sid + '&student=' + s2.id)).j;
ok(w.ok && /бірдей/.test(w.subs[0].flags || ''), 'көшірілген жоба туралы белгі панельде: ' + (w.subs[0].flags || '').slice(0, 40));
r = await T('task_grade', { body: { id: w.subs[0].id, task: 1, score: 5, comment: 'тексерілді' } });
ok((await T('live')).j.groups.find(x => x.id === g.id).students.find(x => x.id === s2.id).tasks[1].pts === 5, 'оқытушы 1-бөлімге 5 қойды');
r = await call('plan?topic=S7', {}, TT); ok(r.j.ok && /Циклдер/.test(r.j.html), 'Scratch жоспары оқытушыға беріледі');
r = await call('plan?topic=S7', {}, t1); ok(r.s === 403, 'студентке жоспар берілмейді');
const j = (await T('journal')).j; ok(j.topics.includes('S7') && /Scratch/.test(j.titles.S7), 'журналда Scratch бағаны: ' + j.titles.S7);
r = await T('reopen', { body: { id: w.subs[0].id } }); me = (await call('me', {}, t2)).j; ok(!me.tasks[1].sent, 'қайта ашылды');

await T('session/close', { body: {} });
await fetch(B + '/api/teacher/groups/' + g.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TT } });
console.log(fails ? '\n' + fails + ' қате' : '\nБарлығы дұрыс'); process.exit(fails ? 1 : 0);
