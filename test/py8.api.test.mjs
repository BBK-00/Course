/* Python 8-сабақтың API тесті. ТЕК жергілікті сервер: wrangler dev (.dev.vars: TEACHER_PASSWORD=test123; код Judge0 арқылы нақты орындалады, интернет керек). */
import { lessonOf } from '../src/py.js';
if (process.env.BASE && !/127.0.0.1|localhost/.test(process.env.BASE)) { console.log('Тікелей сайтта тест жүргізуге болмайды.'); process.exit(1); }
const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const call = async (path, o = {}, tok) => {
  const r = await fetch(B + '/api/' + path, { method: o.body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  return { s: r.status, j: await r.json() };
};
let r = await call('teacher/login', { body: { password: process.env.PASS || 'test123' } }); const TT = r.j.token; ok(!!TT, 'оқытушы кірді');
const T = (p, o) => call('teacher/' + p, o, TT);
await T('session/close', { body: {} });
const GN = 'P8-' + (Date.now() % 100000);
const g = (await T('groups', { body: { name: GN } })).j.groups.find(x => x.name === GN);
const [s1, s2, s3, s4] = (await T('students', { body: { group_id: g.id, names: 'ТЕСТ_СЕГІЗІНШІ\nТЕСТ_ЖҰБЫ\nТЕСТ_ҮШІНШІ\nТЕСТ_ТӨРТІНШІ' } })).j.groups.find(x => x.id === g.id).students;
ok((await T('session/start', { body: { topic: 'P8', group_id: g.id } })).j.ok, '8-сабақ басталды');
const live = (await T('live')).j, code = live.session.code, SES = live.session.id;
const t1 = (await call('join', { body: { student_id: s1.id, code, device: 'd' + s1.id } })).j.token, t2 = (await call('join', { body: { student_id: s2.id, code, device: 'd' + s2.id } })).j.token, t3 = (await call('join', { body: { student_id: s3.id, code, device: 'd' + s3.id } })).j.token, t4 = (await call('join', { body: { student_id: s4.id, code, device: 'd' + s4.id } })).j.token;
const me = (await call('me', {}, t1)).j;
ok(me.ok && me.attendance === 0 && Object.keys(me.tasks).join() === '1,2,3' && me.tasks[1].max === 30 && me.tasks[2].max === 25 && me.tasks[3].max === 20, 'кірді: тапсырмалар 1 (30), 2 (25), 3 (20)');
const L = lessonOf('P8', me.variant, me.variant), items = L.flatMap(t => t.items), item = id => items.find(i => i.id === id);

await T('session/work', { body: { minutes: 60 } });
r = await call('py/data', {}, t1);
ok(r.j.ok && r.j.ready && r.j.tasks.length === 3 && r.j.tasks[0].items.length === 2 && r.j.tasks[2].items.length === 10, 'студентке 2 есеп және 10 сұрақ берілді');
ok(r.j.tasks[1].locked && r.j.tasks[1].items.length === 0 && r.j.pair.has === false, 'жұпсыз 2-тапсырма жабық');
const rn = await call('py/submit', { body: { item: 21, code: 'print(1)' } }, t1); ok(rn.j.error === 'no_pair', 'жұпсыз 2-тапсырманы жіберуге болмайды');
ok(!JSON.stringify(r.j.tasks).includes('"ref"') && !JSON.stringify(r.j.tasks).includes('"cases"') && !JSON.stringify(r.j.tasks).includes('"correct"'), 'дұрыс жауап пен тест жағдайлары жіберілмейді');
const pub = r.j.tasks[2].items;
ok(pub.every(q => q.kind === 'quiz' && Array.isArray(q.opts) && q.opts.length === 4), 'әр сұрақта 4 жауап нұсқасы');

/* 1-тапсырма: екі есеп бір сұраныспен, біреуі қате */
const e = item(11), m = item(12);
const wrongMed = m.ref.replace(/elif /g, 'if ');
r = await call('py/submit', { body: { codes: { 11: e.ref, 12: wrongMed } } }, t1);
const ra = r.j.results || [];
ok(r.j.ok && ra.length === 2, '1-тапсырма бір сұраныспен жіберілді');
ok(ra.find(x => x.item === 11).pts === 12 && ra.find(x => x.item === 11).f1 === 1, 'оңай есеп: толық дұрыс, 12 балл');
const rm = ra.find(x => x.item === 12);
ok(rm.f1 < 1 && rm.f1 <= 0.8 && rm.diag.some(d => d.skill === 'elif') && rm.canRevise, 'орташа есеп: бөлек if қолданылса 80%-пен шектеледі және elif кеңесі шығады');
ok(r.j.scores[1].max === 30 && r.j.total === 12 + rm.pts, 'жиынтық баллға 1-тапсырма енді');
await new Promise(res => setTimeout(res, 8500));
r = await call('py/submit', { body: { item: 12, code: m.ref } }, t1);
ok(r.j.ok && r.j.results[0].best >= 1 && r.j.results[0].pts > rm.pts, 'түзетілді: балл өсті (қатемен жұмыс)');

/* 3-тапсырма: тест. 10 сұрақ, 7 дұрыс, 3 қате */
const quiz = {}; items.filter(i => i.kind === 'quiz' && i.task === 3).forEach((q, k) => { const pubQ = pub.find(x => x.id === q.id); quiz[q.id] = k < 7 ? q.correct : (q.correct + 1) % 4; });
r = await call('py/submit', { body: { quiz } }, t1);
ok(r.j.ok && r.j.results.length === 10 && r.j.results.filter(x => x.f1 === 1).length === 7, 'тест: 10 сұрақ, 7 дұрыс');
ok(r.j.scores[3].pts === 14 && r.j.scores[3].max === 20, '3-тапсырма: 7 × 2 = 14 / 20');
const wrongIds = r.j.results.filter(x => x.f1 < 1).map(x => x.item);
ok(r.j.results.filter(x => x.f1 < 1).every(x => x.explain), 'қате жауапқа түсініктеме берілді');
await new Promise(res => setTimeout(res, 8500));
const q0 = item(wrongIds[0]);
r = await call('py/submit', { body: { item: wrongIds[0], choice: q0.correct } }, t1);
ok(r.j.ok && r.j.results[0].pts === 1, 'қате сұрақты түзетсе, жоғалған 2 баллдың 50%-ы қайтады (1 балл)');

/* 2-тапсырма: жұптық «Сандық». Жұпты оқытушы құрады */
const SID = { session_id: SES };
let lv = (await T('live')).j; ok(Array.isArray(lv.pairs) && lv.pairs.length === 0 && lv.free.length === 4, 'оқытушы панелінде жұп жоқ, 4 студент жұпсыз');
r = await T('pairs/make', { body: { ...SID, a: s1.id, b: s1.id } }); ok(r.j.error === 'taken', 'студентті өзімен жұптауға болмайды');
r = await T('pairs/make', { body: { ...SID, a: s1.id, b: s2.id } }); ok(r.j.ok, 'оқытушы жұп құрды (1-2)');
r = await T('pairs/make', { body: { ...SID, a: s1.id, b: s3.id } }); ok(r.j.error === 'taken', 'жұпта тұрған студентті қайта жұптауға болмайды');
r = await T('pairs/auto', { body: SID }); ok(r.j.ok && r.j.made === 1, 'қалған екеуі кездейсоқ жұпталды');
lv = (await T('live')).j; const pr34 = lv.pairs.find(x => x.a.id !== s1.id && x.a.id !== s2.id);
r = await T('pairs/break', { body: { id: pr34.id } }); ok(r.j.ok, 'жұмыс басталмаған жұпты бұзуға болады');
r = await T('pairs/make', { body: { ...SID, a: s3.id } }); ok(r.j.ok, 'студент жеке қалдырылды');
r = await call('py/data', {}, t3); ok(r.j.pair.has && r.j.pair.solo && r.j.pair.chest.riddles.length === 2 && r.j.tasks[1].items.length === 4, 'жеке студентке де сандық (2 сұрақ) пен 4 кеңес ашылды');
r = await call('py/data', {}, t4); ok(r.j.pair.has === false && r.j.tasks[1].locked, 'жұпсыз студентке 2-тапсырма әлі жабық');
const rd = await call('py/data', {}, t2);
ok(rd.j.pair.has && rd.j.pair.partner.id === s1.id && rd.j.tasks[1].items.length === 4 && rd.j.pair.hints.length === 4 && rd.j.pair.hints.every(x => !x.got && x.text === ''), 'екеуіне де сандық және 4 кеңес ашылды, кеңес мәтіндері жабық');
ok(!JSON.stringify(rd.j).includes('Билл Гейтс') && !JSON.stringify(rd.j).includes('Әуезов, Мағауин') && !JSON.stringify(rd.j).includes('"answer"') && !JSON.stringify(rd.j).includes('"keys"') && rd.j.pair.chest.now === 9 && rd.j.pair.chest.riddles[0].lines.length > 0 && rd.j.pair.chest.riddles[1].img && rd.j.pair.hints.map(x => x.riddle).join() === '0,0,1,1', 'жауаптар мен кеңес мәтіндері алдын ала жіберілмейді, сыйлық 9 балл, кеңестер екі сұраққа бөлінген');
const P2 = L[1].items, CH = lessonOf('P8', me.variant, me.variant)[1].chest;
r = await call('py/chest', { body: { riddle: 0, answer: 'Мұхтар' } }, t4); ok(r.j.error === 'no_pair', 'жұпсыз студент сандықты аша алмайды');
r = await call('py/submit', { body: { item: 21, code: P2[0].ref } }, t1);
ok(r.j.ok && r.j.results[0].f1 === 1, '1-студент код кеңесін шешті');
r = await call('py/data', {}, t2);
ok(r.j.pair.found === 1 && r.j.pair.hints[0].got && r.j.pair.hints[0].text === CH.hints[0] && r.j.pair.hints.slice(1).every(x => !x.got && !x.text) && r.j.state[21].f1 === 1, 'серіктес нәтижені көреді, бірінші кеңес мәтіні ашылды');
const wrongOf = q => (q.correct + 1) % 4;
r = await call('py/submit', { body: { quiz: { 23: P2[2].correct, 24: wrongOf(P2[3]) } } }, t2);
ok(r.j.ok && r.j.results.find(x => x.item === 23).f1 === 1 && r.j.results.find(x => x.item === 24).f1 === 0, '2-студент қатені тап (дұрыс) және нәтижені тап (қате) жіберді');
r = await call('py/data', {}, t1); ok(r.j.pair.found === 2 && r.j.pair.hints[2].got && r.j.pair.hints[2].text === CH.hints[2] && !r.j.pair.hints[3].got, 'қате жауап кеңес бермейді, дұрысы кеңес ашты');
r = await call('py/chest', { body: { riddle: 2, answer: 'x' } }, t1); ok(r.j.error === 'bad_request', 'сұрақ нөмірі қате болса қабылданбайды');
r = await call('py/chest', { body: { riddle: 0, answer: 'Абай' } }, t1); ok(r.j.ok && r.j.good === false && r.j.pair.chest.tries === 1 && !r.j.pair.chest.open && r.j.pair.chest.riddles.every(x => !x.solved), 'қате жауап: әрекет есептелді, сандық жабық');
r = await call('py/chest', { body: { riddle: 0, answer: 'Мұхтар' } }, t2); ok(r.j.error === 'wait', 'жиі болжауға болмайды (10 секунд)');
await new Promise(res => setTimeout(res, 10500));
r = await call('py/submit', { body: { item: 24, choice: P2[3].correct } }, t2);
ok(r.j.ok && r.j.results[0].best >= 1 && r.j.results[0].f1 === 0, 'нәтижені тап қатемен жұмыс арқылы түзетілді');
r = await call('py/chest', { body: { riddle: 0, answer: ' мұхтар ' } }, t2);
ok(r.j.ok && r.j.good && !r.j.pair.chest.open && r.j.pair.chest.riddles[0].solved && !r.j.pair.chest.riddles[1].solved, '1-сұрақтың жауабы табылды (қазақша әріппен де қабылданды), сандық әлі жабық');
r = await call('py/chest', { body: { riddle: 0, answer: 'Мұхтар' } }, t1); ok(r.j.error === 'already', 'шешілген сұраққа қайта жауап беруге болмайды');
r = await call('py/chest', { body: { riddle: 1, answer: 'Microsoft' } }, t1);
ok(r.j.ok && r.j.good && r.j.pair.chest.open && r.j.pair.chest.riddles.every(x => x.solved) && r.j.pair.chest.used === 3 && r.j.pair.chest.pts === 2, 'екі сұрақ шешілді, сандық ашылды: 3 кеңес, 1 қате жауап → 9 − 6 − 1 = 2 балл');
r = await call('py/chest', { body: { riddle: 1, answer: 'Microsoft' } }, t1); ok(r.j.error === 'already', 'ашылған сандықты қайта ашуға болмайды');
r = await call('py/submit', { body: { item: 22, choice: P2[1].correct } }, t1);
ok(r.j.ok && r.j.results[0].f1 === 1, 'сандық ашылғаннан кейін де кеңес есебін шешуге болады (4 балл)');
r = await call('py/data', {}, t2); ok(r.j.pair.found === 4 && r.j.pair.chest.pts === 2 && r.j.pair.chest.used === 3, 'сыйлық ашылған сәттегі кеңес санымен бекітілген');
lv = (await T('live')).j; const rows = lv.groups.flatMap(x => x.students), a = rows.find(x => x.id === s1.id), b = rows.find(x => x.id === s2.id);
ok(b.tasks[2].pts === a.tasks[2].pts && a.tasks[2].pts === 16, '2-тапсырма балы екі студентке де бірдей: ' + a.tasks[2].pts + ' / 25 (4 + 4 + 4 + 2 + сандық 2)');
const pr = lv.pairs.find(x => x.a.id === s1.id);
ok(pr && pr.found === 4 && pr.hints === 3 && pr.chest === 2 && pr.pts === 16 && pr.tries === 1 && pr.solved === 2 && pr.open_at && pr.items.map(i => i.tries).join() === '1,1,1,2', 'оқытушы панелі жұптың жұмысын көрсетеді: кеңестер, сандық, баллы');
r = await T('pairs/break', { body: { id: pr.id } }); ok(r.j.error === 'started', 'жұмысы басталған жұпты бұзуға болмайды');
r = await call('me', {}, t2); ok(r.j.ok, 'жұп студенті жүйеде жұмыс істейді');

/* оқытушы жағы */
const stat = (await T('py_stats?session=' + SES)).j;
ok(stat.ok && stat.items.length === 16, 'оқытушы талдауында 16 есеп/сұрақ');
const ld = (await T('live')).j, row = ld.groups.flatMap(x => x.students).find(x => x.id === s1.id);
ok(row && Object.keys(row.tasks).join() === '1,2,3', 'оқытушы панелінде 1, 2, 3-тапсырма бар');

await T('session/close', { body: {} });
console.log(fails ? '\nҚателер: ' + fails : '\nБарлығы дұрыс');
process.exit(fails ? 1 : 0);
