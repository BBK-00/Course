if (process.env.BASE && !/127.0.0.1|localhost/.test(process.env.BASE)) { console.log('Тікелей сайтта тест жүргізуге болмайды: ол студенттердің сабағын жауып тастайды.'); process.exit(2); }
/* АКТ 13 API тесті. ТЕК жергілікті сервер: wrangler dev (.dev.vars: TEACHER_PASSWORD=test123, GEMINI_STUB=1). */
import { pptx } from './mmproj.mjs';

const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const call = async (path, o = {}, tok) => {
  const r = await fetch(B + '/api/' + path, { method: o.body ? 'POST' : (o.method || 'GET'), headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  return { s: r.status, j: await r.json() };
};
const PDF = new TextEncoder().encode('%PDF-1.4\n%test\n');
const up = async (tok, bytes, pdf = PDF) => { const fd = new FormData(); if (bytes) fd.append('pptx', new Blob([bytes]), 'a.pptx'); if (pdf) fd.append('pdf', new Blob([pdf]), 'a.pdf'); const r = await fetch(B + '/api/mm/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd }); return { s: r.status, j: await r.json() }; };

let r = await call('teacher/login', { body: { password: process.env.PASS || 'test123' } }); const TT = r.j.token; ok(!!TT, 'оқытушы кірді');
const T = (p, o) => call('teacher/' + p, o, TT);
await T('session/close', { body: {} });
const GN = 'MM-' + (Date.now() % 100000);
const g = (await T('groups', { body: { name: GN } })).j.groups.find(x => x.name === GN);
const [s1, s2, s3] = (await T('students', { body: { group_id: g.id, names: 'АБДОЛЛА_ЖАНГҮЛ\nАГИСОВ_ҚАБЫЛЕТ\nАЙБЕКҰЛЫ_БЕКТҰРСЫН' } })).j.groups.find(x => x.id === g.id).students.sort((a, b) => a.id - b.id);
ok((await T('session/start', { body: { topic: 'A13' } })).j.ok, 'АКТ 13 сабағы басталды');
const live = (await T('live')).j, code = live.session.code, sid = live.session.id;
const join = async s => (await call('join', { body: { student_id: s.id, code, device: 'd' + s.id } })).j.token;
const [t1, t2, t3] = [await join(s1), await join(s2), await join(s3)];
let me = (await call('me', {}, t1)).j; ok(me.ok && me.attendance === 30 && me.tasks[1].max === 20 && me.tasks[2].max === 30 && me.tasks[3].max === 20, 'кірді: қатысым 30, бөлімдер 20/30/20');
r = await up(t1, pptx()); ok(r.j.error === 'not_started', 'жұмыс басталмай жүктеуге болмайды');
await T('session/work', { body: { minutes: 50 } });
r = await up(t1, null); ok(r.j.error === 'need_both', 'екі файл да керек');
r = await up(t1, pptx(), new TextEncoder().encode('not a pdf')); ok(r.j.error === 'bad_pdf', 'PDF емес файл қабылданбайды');
r = await up(t1, new Uint8Array([1, 2, 3])); ok(r.j.error === 'bad_pptx', 'pptx емес файл қабылданбайды');
r = await up(t1, pptx({ author: 'Басқа Адам' })); ok(r.j.error === 'no_author', 'бірінші слайдта өз аты жоқ → бас тартылады');
me = (await call('me', {}, t1)).j; ok(!me.tasks[1].sent, 'қате әрекеттер баға қоймады');

console.log('Дұрыс куиз');
const FULL = pptx({ author: 'Абдолла Жангүл' });
r = await up(t1, FULL);
ok(r.j.ok && [1, 2, 3].map(n => r.j.tasks[n].pts).join() === '20,30,14', 'балл: ' + (r.j.tasks ? [1, 2, 3].map(n => r.j.tasks[n].pts) : r.j.error));
ok(r.j.total === 30 + 64, 'жиынтық 30 + 64 = ' + r.j.total);
r = await up(t1, FULL); ok(r.s === 409 && r.j.error === 'already', 'екінші рет жіберуге болмайды');

console.log('Көшірілген және әлсіз жұмыс');
r = await up(t2, pptx({ author: 'Агисов Қабылет' })); ok(r.j.ok && r.j.dup === true && r.j.total === 40, 'бірдей мәтінді презентация 0 балл (' + r.j.total + ')');
r = await up(t3, pptx({ author: 'Айбекұлы Бектұрсын', cut: ['1vid', '2aud'], noReveal: [4], slides: 7 }));
ok(r.j.ok && r.j.tasks[1].pts < 20 && r.j.tasks[2].pts < 30 && r.j.total < 94, 'толық емес жұмыс аз балл алады: ' + [1, 2, 3].map(n => r.j.tasks[n].pts) + ' → ' + r.j.total);

console.log('Оқытушы панелі');
const lv = (await T('live')).j, row = lv.groups.find(x => x.id === g.id).students.find(x => x.id === s1.id);
ok(row.total === 94 && row.tasks[3].max === 20, 'панельде студент 1: ' + row.total);
const w = (await T('work?session=' + sid + '&student=' + s1.id)).j;
ok(w.ok && w.subs.length === 3 && w.subs[2].payload.items.length === 10, 'толық жұмыс: ' + w.subs.map(s => s.payload.items.length) + ' слайд');
r = await call('plan?topic=A13', {}, TT); ok(r.j.ok && /МД-220/.test(r.j.html), 'жоспар оқытушыға беріледі');
r = await call('plan?topic=A13', {}, t1); ok(r.s === 403, 'студентке жоспар берілмейді');
const j = (await T('journal')).j; ok(j.topics.includes('A13') && /13/.test(j.titles.A13), 'журналда АКТ 13 бағаны: ' + j.titles.A13);
r = await T('reopen', { body: { id: w.subs[0].id } }); me = (await call('me', {}, t1)).j; ok(!me.tasks[1].sent, 'қайта ашылды');

await T('session/close', { body: {} });
await fetch(B + '/api/teacher/groups/' + g.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + TT } });
console.log(fails ? '\n' + fails + ' қате' : '\nБарлығы дұрыс'); process.exit(fails ? 1 : 0);
