/* Python сабағының API тесті. ТЕК жергілікті сервер: wrangler dev (.dev.vars: TEACHER_PASSWORD=test123, GEMINI_STUB=1; код Judge0 арқылы нақты орындалады, интернет керек)
   Тікелей сайтта жүргізуге болмайды. */
import { lessonP7 } from '../src/py.js';
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
const GN = 'PY-' + (Date.now() % 100000);
const g = (await T('groups', { body: { name: GN } })).j.groups.find(x => x.name === GN);
const [s1, s2] = (await T('students', { body: { group_id: g.id, names: 'ТЕСТ_БІРІНШІ\nТЕСТ_ЕКІНШІ' } })).j.groups.find(x => x.id === g.id).students;
ok((await T('session/start', { body: { topic: 'P7', group_id: g.id } })).j.ok, 'Python сабағы басталды');
const live = (await T('live')).j, code = live.session.code, SES = live.session.id;
const join = async s => (await call('join', { body: { student_id: s.id, code, device: 'd' + s.id } })).j.token;
const [t1, t2] = [await join(s1), await join(s2)];
let me = (await call('me', {}, t1)).j;
ok(me.ok && me.attendance === 0 && [1, 2, 3, 4].map(n => me.tasks[n].max).join() === '20,40,20,20', 'кірді: қатысым балы жоқ, тапсырмалар 20/40/20/20');
const variant = me.variant, L = lessonP7(variant), item = id => L.flatMap(t => t.items).find(i => i.id === id);

r = await call('py/data', {}, t1); ok(r.j.ok && r.j.ready === false, 'жұмыс басталмай тапсырма мәтіні берілмейді');
r = await call('py/submit', { body: { item: 11, code: 'print(1)' } }, t1); ok(r.j.error === 'not_started', 'жұмыс басталмай жіберуге болмайды');
await T('session/work', { body: { minutes: 60 } });
r = await call('py/data', {}, t1);
ok(r.j.ready && r.j.phase === 'work' && r.j.tasks.length === 4 && r.j.tasks[0].items.length === 4, 'тапсырмалар берілді');
ok(!JSON.stringify(r.j.tasks).includes('"ref"') && !JSON.stringify(r.j.tasks).includes('"cases"') && !JSON.stringify(r.j.tasks).includes('correct'), 'дұрыс жауап пен тест жағдайлары студентке жіберілмейді');
ok((await call('py/open', { body: { item: 11 } }, t1)).j.ok, 'тапсырма ашылды (уақыт өлшеуі басталды)');

/* 1-есеп: шекара қатесі → қатемен жұмыс */
const i11 = item(11), wrong = i11.ref.replace('>=', '>');
r = await call('py/submit', { body: { item: 11, code: wrong, signals: { typed: 80 } } }, t1);
const a1 = r.j.results && r.j.results[0];
ok(r.j.ok && a1 && a1.passed === 4 && a1.total === 5 && a1.pts === 4 && a1.canRevise, '1-есеп: шекаралық қате → 4/5 тест, 4 балл, түзетуге болады');
ok(a1.diag.some(d => d.skill === 'boundary'), 'шекаралық мән бойынша түсініктеме берілді');
ok(a1.cases.filter(c => !c.ok).length === 1 && a1.cases.filter(c => c.ok).every(c => c.exp === undefined), 'қате жағдайда күтілген жауап көрсетілді, дұрысында жасырылды');
ok(r.j.scores[1].pts === 4 && r.j.total === 4, 'жиынтық: 4');
r = await call('py/submit', { body: { item: 11, code: i11.ref } }, t1); ok(r.s === 429 && r.j.error === 'wait', 'бірден қайта жіберуге болмайды (8 секунд)');
await new Promise(res => setTimeout(res, 8500));
r = await call('py/submit', { body: { item: 11, code: i11.ref } }, t1);
ok(r.j.ok && r.j.results[0].f1 === 0.8 && r.j.results[0].pts === 4.7 && !r.j.results[0].canRevise, 'түзетілді: 5×(0.8 + 0.7×0.2) = 4.7 балл');
r = await call('py/submit', { body: { item: 11, code: i11.ref } }, t1); ok(r.s === 409, 'толық дұрыс есепті қайта жіберуге болмайды');

/* 2-тапсырма: and қолданылған кірістірілген талап */
const i22 = item(22), andCode = 'gpa = int(input())\natt = int(input())\nif gpa >= ' + i22.ref.match(/gpa >= (\d+)/)[1] + ' and att >= ' + i22.ref.match(/att >= (\d+)/)[1] + ':\n    print("Шәкіртақы тағайындалды")\n';
r = await call('py/submit', { body: { item: 22, code: andCode } }, t1);
ok(r.j.ok && r.j.results[0].passed === 4 && r.j.results[0].pts === 16 && r.j.results[0].diag.some(d => /and/.test(d.text)), '«and» талабы бұзылған: тесттері өтсе де 16 / 20');

/* 3-тапсырма: қатесі бар код + синтаксис */
const i31 = item(31);
r = await call('py/submit', { body: { item: 31, code: i31.starter } }, t1);
ok(r.j.ok && r.j.results[0].syntax && r.j.results[0].pts === 0 && /қос нүкте/.test(r.j.results[0].diag[0].text), '3.1: қосулы емес код → синтаксис түсініктемесі, 0 балл');
await new Promise(res => setTimeout(res, 8500));
r = await call('py/submit', { body: { item: 31, code: i31.ref } }, t1);
ok(r.j.ok && r.j.results[0].pts === 3.5, '3.1 түзетілді: 0.7×5 = 3.5 (қатемен жұмыс)');

/* 4-тапсырма: тест */
const pub = (await call('py/data', {}, t1)).j.tasks[3].items;
const wrongOpt = q => q.opts.find(o => o.i !== item(q.id).correct).i;
const choice = {}; pub.forEach((q, i) => { choice[q.id] = i < 3 ? item(q.id).correct : wrongOpt(q); });
r = await call('py/submit', { body: { quiz: choice } }, t1);
ok(r.j.ok && r.j.results.length === 5 && r.j.scores[4].pts === 12, 'тест: 3 дұрыс → 12 / 20');
const bad = r.j.results.find(x => x.explain); ok(!!bad && bad.canRevise, 'қате сұрақ үшін түсініктеме берілді');
await new Promise(res => setTimeout(res, 8500));
r = await call('py/submit', { body: { item: bad.item, choice: item(bad.item).correct } }, t1);
ok(r.j.ok && r.j.results[0].pts === 2 && !r.j.results[0].canRevise, 'тест түзетілді: 50% = 2 / 4');
r = await call('py/submit', { body: { item: bad.item, choice: item(bad.item).correct } }, t1); ok(r.s === 409, 'тестті екінші рет түзетуге болмайды');

/* ЖИ кеңесі және қорытынды */
r = await call('py/hint', { body: { item: 22 } }, t1); ok(r.j.ok && r.j.hint && r.j.left === 5, 'ЖИ кеңесі берілді (5 қалды)');
r = await call('py/hint', { body: { item: 22 } }, t1); ok(r.j.error === 'wait', 'кеңесті жиі сұрауға болмайды');
r = await call('py/hint', { body: { item: 31 } }, t1); ok(r.j.error === 'full', 'толық түзетілген есепке кеңес керек емес');
r = await call('py/hint', { body: { item: 14 } }, t1); ok(r.j.error === 'no_attempt', 'жіберілмеген есепке кеңес берілмейді');
r = await call('py/summary', {}, t1);
ok(r.j.ok && r.j.rows.length === 15 && r.j.skills.length > 0 && r.j.rows.find(x => x.id === 11).secs !== null, 'қорытынды: дағдылар мен уақыт бар');

/* екінші студент: тәуелсіз */
r = await call('py/data', {}, t2); ok(r.j.ready && r.j.total === 0, 'екінші студенттің нәтижесі бөлек');
const me2 = (await call('me', {}, t2)).j, i11b = lessonP7(me2.variant).flatMap(t => t.items).find(i => i.id === 11);
r = await call('py/submit', { body: { item: 11, code: i11b.ref } }, t2); ok(r.j.ok && r.j.results[0].pts === 5, 'екінші студент бірден дұрыс: 5 балл');
/* бүтін тапсырманы бір сұраныспен жіберу */
const it2 = id => lessonP7(me2.variant).flatMap(x => x.items).find(i => i.id === id);
r = await call('py/submit', { body: { codes: { 12: it2(12).ref, 13: it2(13).ref, 14: it2(14).ref } } }, t2);
ok(r.j.ok && r.j.results.length === 3 && r.j.results.every(x => x.pts === 5) && r.j.scores[1].pts === 20 && r.j.total === 20, 'бүтін тапсырма: 3 есеп бір сұраныспен бағаланды, 1-тапсырма 20 / 20');
r = await call('py/submit', { body: { codes: { 12: it2(12).ref } } }, t2); ok(r.j.error === 'full' || r.s === 409, 'жіберілген есепті қайта жіберуге болмайды');
r = await call('py/submit', { body: { codes: { 13: 'while True:\n    pass\n', 14: item(14).ref } } }, t1);
const r13 = r.j.results && r.j.results.find(x => x.item === 13), r14 = r.j.results && r.j.results.find(x => x.item === 14);
ok(r.j.ok && r14 && r14.f1 === 1 && r13 && r13.f1 < 1, 'шексіз цикл бір есепте болса да, екіншісі дұрыс бағаланады (13: ' + (r13 && r13.passed) + '/5, 14: ' + (r14 && r14.passed) + '/5)');
r = await call('py/submit', { body: { item: 99, code: 'x=1\nprint(x)' } }, t2); ok(r.j.error === 'bad_item', 'жоқ есеп нөмірі қабылданбайды');
r = await call('py/data', {}, 'bad.token'); ok(r.s === 401, 'токенсіз кіруге болмайды');

/* оқытушы */
const lv = (await T('live')).j, st1 = lv.groups.flatMap(x => x.students).find(s => s.id === s1.id);
ok(st1.tasks[1].sent && Object.keys(st1.tasks).length === 4 && st1.total > 0, 'оқытушы панелі: 4 тапсырма, жалпы ' + st1.total);
const ps = (await T('py_stats?session=' + SES)).j;
ok(ps.ok && ps.items.length === 15 && ps.students.length === 2, 'оқытушы талдауы: 15 есеп, 2 студент');
const pi = ps.items.find(i => i.id === 11); ok(pi.sent === 2 && pi.firstPass === 50 && pi.avgGain > 0, '1.1 есеп: 2 студент, бірінші әрекетте 50%, түзету өсімі бар');
const wk = (await T('work?session=' + SES + '&student=' + s1.id)).j; ok(wk.ok && wk.subs.length === 4 && wk.calc.final > 0, 'студенттің толық жұмысы ашылады');
await T('task_grade', { body: { id: wk.subs.find(s => s.task === 1).id, task: 1, score: 3, comment: 'қолмен' } });
r = await call('py/submit', { body: { item: 12, code: item(12).ref } }, t1);
const afterT = (await T('work?session=' + SES + '&student=' + s1.id)).j.calc.tasks[1];
ok(afterT.pts === 3 && afterT.edited, 'оқытушы қойған баға жаңа жіберуден кейін де сақталады');

/* жұмыс аяқталған соң: тек қатемен жұмыс */
await T('session/stopwork', { body: {} });
r = await call('py/data', {}, t2); ok(r.j.phase === 'revise', 'жұмыс тоқтаған соң «қатемен жұмыс» кезеңі');
r = await call('py/submit', { body: { item: 31, code: it2(31).ref } }, t2); ok(r.j.error === 'time_over', 'тоқтатылған соң жаңа есеп жіберуге болмайды');
r = await call('py/submit', { body: { item: 22, code: i22.ref } }, t1); ok(r.j.ok && r.j.results[0].pts === 16 + 0.7 * 4 || r.j.results[0].pts > 16, 'қатемен жұмыс кезеңінде түзетуге болады: ' + (r.j.results && r.j.results[0].pts));
await T('session/close', { body: {} });
console.log(fails ? '\nҚателер: ' + fails : '\nБарлығы дұрыс'); process.exit(fails ? 1 : 0);
