if (process.env.BASE && !/127.0.0.1|localhost/.test(process.env.BASE)) { console.log('Тікелей сайтта тест жүргізуге болмайды: ол студенттердің сабағын жауып тастайды.'); process.exit(2); }
/* АКТ · Excel жұмысының API тесті. Жергілікті: wrangler dev (.dev.vars: TEACHER_PASSWORD=test123).
   Тікелей сайт: BASE=<сайт> PASS=<құпиясөз> node test/xl.api.test.mjs  (өзінің сынақ тобын жасап, соңында өшіреді) */
import { readXlsx } from '../src/xlsx.js';
import { dataFor } from '../src/excel.js';
import { solution } from './xlsol.mjs';

const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const call = async (path, o = {}, tok) => {
  const r = await fetch(B + '/api/' + path, { method: o.body ? 'POST' : (o.method || 'GET'), headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  return { s: r.status, j: await r.json() };
};
const getFile = async tok => { const r = await fetch(B + '/api/xl/file', { headers: { Authorization: 'Bearer ' + tok } }); return r.ok ? new Uint8Array(await r.arrayBuffer()) : { status: r.status, j: await r.json() }; };
const upload = async (tok, bytes) => { const r = await fetch(B + '/api/xl/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/octet-stream' }, body: bytes }); return { s: r.status, j: await r.json() }; };

let r = await call('teacher/login', { body: { password: process.env.PASS || 'test123' } }); const TT = r.j.token; ok(!!TT, 'оқытушы кірді');
const T = (p, o) => call('teacher/' + p, o, TT);
await T('session/close', { body: {} });
const GN = 'XL-' + (Date.now() % 100000);
r = await T('groups', { body: { name: GN } }); const g = r.j.groups.find(x => x.name === GN);
r = await T('students', { body: { group_id: g.id, names: 'Тест Бірінші\nТест Екінші\nТест Үшінші' } });
const [s1, s2, s3] = r.j.groups.find(x => x.id === g.id).students.sort((a, b) => a.id - b.id);
r = await T('session/start', { body: { topic: '10', group_id: g.id } }); ok(r.j.ok, 'АКТ 10 сабағы басталды');
const live = (await T('live')).j, code = live.session.code, sid = live.session.id;
const join = async s => (await call('join', { body: { student_id: s.id, code, device: 'dev' + s.id } })).j.token;
const [t1, t2, t3] = [await join(s1), await join(s2), await join(s3)];
let me = (await call('me', {}, t1)).j; ok(me.ok && me.attendance === 40 && me.tasks[1].max === 15 && me.tasks[3].max === 25, 'кірді: қатысым 40, листер 15/20/25');

console.log('Жұмыс басталмай тұрып');
let f = await getFile(t1); ok(f.status === 403 && f.j.error === 'not_started', 'файл берілмейді (жұмыс басталмаған)');
r = await upload(t1, new Uint8Array([1])); ok(r.j.error === 'not_started', 'жүктеу де жабық');
await T('session/work', { body: { minutes: 60 } });

console.log('Жеке файл');
f = await getFile(t1); ok(f instanceof Uint8Array && f.length > 3000, 'студент 1 файл алды (' + f.length + ' байт)');
const f1b = await getFile(t1); ok(Buffer.compare(Buffer.from(f), Buffer.from(f1b)) === 0, 'қайта жүктесе бірдей файл');
const f2 = await getFile(t2); ok(Buffer.compare(Buffer.from(f), Buffer.from(f2)) !== 0, 'студент 2 файлы басқа');
const wb1 = await readXlsx(f.buffer), wb2 = await readXlsx(f2.buffer);
ok(String(wb1[0].cells.get('A2').v).includes('Тест Бірінші'), 'файлда иесінің аты бар');
ok(wb1[0].cells.get('B5').v !== wb2[0].cells.get('B5').v || wb1[0].cells.get('C5').v !== wb2[0].cells.get('C5').v, 'сандар әртүрлі');
const stamp = id => /ID\s+([0-9a-f]{10})/.exec(String(id))[1];
const st1 = stamp(wb1[0].cells.get('A2').v);

console.log('Біреудің файлын салу');
const full1 = solution(dataFor(s1.id, sid), {}, st1);
r = await upload(t2, full1); ok(r.j.error === 'not_yours', 'студент 2 студент 1-дің толтырылған файлын сала алмайды: ' + r.j.error);
const D1 = dataFor(s1.id, sid);
const st2 = stamp(wb2[0].cells.get('A2').v);
r = await upload(t2, solution(D1, {}, st2)); ok(r.j.error === 'not_yours', 'өз ID қойып, бөгде сандармен салу да өтпейді: ' + r.j.error);
r = await upload(t3, new Uint8Array([9, 9, 9])); ok(r.j.error === 'bad_file', 'Excel емес файл қабылданбайды');
me = (await call('me', {}, t2)).j; ok(!me.tasks[1].sent, 'қате әрекеттер баға қоймады');

console.log('Дұрыс жұмыс');
r = await upload(t1, full1); ok(r.j.ok && r.j.sheets.length === 3, 'студент 1 жүктеді');
ok(r.j.tasks[1].pts === 14 && r.j.tasks[2].pts === 20 && r.j.tasks[3].pts === 25, 'листер: ' + [1, 2, 3].map(n => r.j.tasks[n].pts) + ' (сұрыптаусыз 14)');
ok(r.j.total === 40 + 59, 'жиынтық 40 + 59 = ' + r.j.total);
r = await upload(t1, full1); ok(r.s === 409 && r.j.error === 'already', 'екінші рет жіберуге болмайды');

console.log('Бос жұмыс (ең төменгі балл)');
r = await upload(t3, f2 && (await getFile(t3))); ok(r.j.ok && r.j.total === 50, 'бос файл → 50 балл: ' + r.j.total);

console.log('Оқытушы панелі');
const lv = (await T('live')).j, row = lv.groups.find(x => x.id === g.id).students.find(x => x.id === s1.id);
ok(row.total === 99 && row.tasks[1].pts === 14 && row.tasks[1].max === 15, 'панельде студент 1: ' + row.total + ', 1-лист ' + row.tasks[1].pts + '/15');
const w = (await T('work?session=' + sid + '&student=' + s1.id)).j;
ok(w.ok && w.subs.length === 3 && Array.isArray(w.subs[0].payload.items), 'толық жұмыс: ' + w.subs.map(s => s.payload.items.length) + ' бөлім');
r = await T('task_grade', { body: { id: w.subs[0].id, task: 1, score: 15, comment: 'жақсы' } });
ok((await T('live')).j.groups.find(x => x.id === g.id).students.find(x => x.id === s1.id).total === 100, 'оқытушы 1-листке 15 қойды → 100');
r = await T('task_grade', { body: { id: w.subs[0].id, task: 1, score: 99 } });
ok((await T('live')).j.groups.find(x => x.id === g.id).students.find(x => x.id === s1.id).tasks[1].pts === 15, 'ең көп балл 15-пен шектеледі');
const j = (await T('journal')).j; ok(j.topics.includes('10') && /АКТ/.test(j.titles['10']), 'журналда АКТ бағаны: ' + j.titles['10']);
r = await T('reopen', { body: { id: w.subs[0].id } }); me = (await call('me', {}, t1)).j; ok(!me.tasks[1].sent && !me.tasks[3].sent, 'қайта ашылды: студент қайта жібере алады');

await T('session/close', { body: {} });
await T('groups/' + g.id, { method: 'DELETE' }).catch(() => {});
await fetch(B + '/api/teacher/groups/' + g.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TT } });
console.log(fails ? '\n' + fails + ' қате' : '\nБарлығы дұрыс'); process.exit(fails ? 1 : 0);
