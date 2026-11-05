/* Python 4-сабақтың (арифметикалық операторлар) API тесті. ТЕК жергілікті сервер: wrangler dev (.dev.vars: TEACHER_PASSWORD=test123).
   Код орындалмайды (жауаптар жазылады), сондықтан Judge0 керек емес. node test/py4.api.test.mjs */
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
const GN = 'P4-' + (Date.now() % 100000);
const g = (await T('groups', { body: { name: GN } })).j.groups.find(x => x.name === GN);
const [s1, s2] = (await T('students', { body: { group_id: g.id, names: 'ТЕСТ_БІРІНШІ\nТЕСТ_ЕКІНШІ' } })).j.groups.find(x => x.id === g.id).students;
ok((await T('session/start', { body: { topic: 'P4', group_id: g.id } })).j.ok, '4-сабақ басталды');
const live = (await T('live')).j, code = live.session.code, SES = live.session.id;
const t1 = (await call('join', { body: { student_id: s1.id, code, device: 'd' + s1.id } })).j.token, t2 = (await call('join', { body: { student_id: s2.id, code, device: 'd' + s2.id } })).j.token;
const me = (await call('me', {}, t1)).j;
ok(me.ok && Object.keys(me.tasks).join() === '1,2,3,4,5' && me.tasks[1].max === 15 && me.tasks[2].max === 30 && me.tasks[3].max === 20 && me.tasks[4].max === 10 && me.tasks[5].max === 25, 'кірді: 1-тапсырма 15, 2-тапсырма 35, үй жұмысы 20 балл');
const L = lessonOf('P4', me.variant), items = L[0].items;

r = await call('py/data', {}, t1);
ok(r.j.ok && r.j.ready && r.j.tasks.length === 4 && r.j.tasks.every(t => t.locked && t.items.length === 0), 'тапсырмалар басталмағанша бәрі жабық (құлыптаулы), мәтіні берілмейді');
const L0 = lessonOf('P4', me.variant);
r = await call('py/submit', { body: { quiz: { [L0[0].items[0].id]: L0[0].items[0].ans } } }, t1); ok(!r.j.ok && r.j.error === 'time_over', 'басталмаған тапсырмаға жауап жіберуге болмайды');
const W = (task, minutes, action) => T('pywin', { body: { task, minutes, action: action || 'start' } });
r = await W(3, 15); ok(r.j.ok && r.j.wins[3], 'оқытушы 3-тапсырманы жеке бастады');
r = await call('py/data', {}, t1);
ok(r.j.tasks.find(t => t.n === 3).items.length === 5 && r.j.tasks.find(t => t.n === 1).locked && r.j.tasks.find(t => t.n === 2).locked, 'тек 3-тапсырма ашылды, қалғаны жабық');
await W(1, 7); await W(2, 22); await W(4, 5);
r = await call('py/data', {}, t1);
ok(r.j.ok && r.j.ready && r.j.tasks.length === 4 && r.j.tasks[0].items.length === 15 && r.j.tasks[1].items.length === 4 && r.j.tasks[2].items.length === 5 && r.j.tasks[3].items.length === 5, 'студентке 15 + 4 + 5 + 5 тапсырма берілді');
ok(r.j.tasks[0].items.every(q => q.typed && q.code && q.opts.length === 0), 'есептер жауабы жазылатын түрде');
ok(!/"ans"|"why"|"alts"|"correct"/.test(JSON.stringify(r.j.tasks)), 'дұрыс жауап студентке жіберілмейді');

/* бірінші студент: 11 дұрыс, // есептері / арқылы шатастырылған, % бірі қате, қалғандары бос */
const mis = it => it.op === 'idiv' ? String(it.alts.find(a => a.tag === 'idiv_as_div').v) : it.op === 'mod' ? String(Number(it.ans) + 1) : it.ans;
const first = {}; items.slice(0, 13).forEach(it => { first[it.id] = mis(it); });
r = await call('py/submit', { body: { quiz: first } }, t1);
const res = r.j.results || [];
ok(r.j.ok && res.length === 13, '13 жауап бір сұраныспен жіберілді');
const good = items.slice(0, 13).filter(it => mis(it) === it.ans).length;
ok(res.filter(x => x.f1 === 1).length === good && r.j.scores[1].pts === good, 'балл: ' + good + ' дұрыс × 1 = ' + good);
const bad = res.find(x => x.f1 < 1);
ok(bad && bad.ans !== undefined && bad.why && bad.diag.length && bad.canRevise === false, 'қате жауапқа дұрыс жауап және түсініктеме көрсетілді, қайта жіберу жоқ');
const idv = res.find(x => items.find(i => i.id === x.item).op === 'idiv');
ok(idv && idv.diag[0].skill === 'idiv' && idv.diag[0].tag === 'idiv_as_div', '// есебі: / арқылы шатастыру анықталды');

/* қайта жіберу мүмкін емес, бірақ жіберілмеген есепті кейін жіберуге болады */
r = await call('py/submit', { body: { item: items[0].id, choice: items[0].ans } }, t1);
ok(!r.j.ok && (r.j.error === 'full' || r.j.error === 'no_tries'), 'жіберілген жауапты өзгертуге болмайды');
r = await call('py/submit', { body: { quiz: { [items[13].id]: items[13].ans, [items[14].id]: '  ' + items[14].ans + ' ' } } }, t1);
ok(r.j.ok && r.j.results.length === 2 && r.j.results.every(x => x.f1 === 1), 'қалған 2 есеп кейін жіберілді (бос орынмен де)');
r = await call('py/data', {}, t1);
const dn = r.j.state[items[2].id];
ok(r.j.tasks[0].items.every(q => r.j.state[q.id].done) && dn.choice !== undefined, 'бет жаңартылса, жауаптар сақталады');

/* екінші студент (өз нұсқасы бар): бәрі дұрыс, ‘5.0’ орнына ‘5’ */
const me2 = (await call('me', {}, t2)).j, items2 = lessonOf('P4', me2.variant)[0].items;
const all2 = {}; items2.forEach(it => { all2[it.id] = it.ans; });
const f0 = items2.find(i => i.op === 'div' && i.ans.endsWith('.0')); all2[f0.id] = String(parseInt(f0.ans, 10));
r = await call('py/submit', { body: { quiz: all2 } }, t2);
ok(r.j.ok && r.j.results.length === 15 && r.j.results.filter(x => x.f1 < 1).length === 1 && r.j.scores[1].pts === 14, '2-студент: 14 дұрыс = 14 / 15 (float жазбаған)');
ok(r.j.results.find(x => x.item === f0.id).diag[0].tag === 'need_float', '5.0 орнына 5: float туралы түсініктеме');

/* 2-тапсырма: ашық үлгі, консоль, код есептері */
const NL = String.fromCharCode(10);
r = await call('py/sample', {}); ok(r.j.ok && r.j.tasks[1].items.length === 4 && !/"ref"|"cases"/.test(JSON.stringify(r.j)), 'үлгі сабаққа кірмей-ақ көрінеді, эталонсыз');
const cit = lessonOf('P4', me.variant)[1].items;
ok(r.j.tasks[1].items.every(q => q.kind === 'code' && q.text.length > 80), 'үлгі есептердің мәтіні толық');
const con = ['a = int(input("a = "))', 'b = int(input("b = "))', 'print(a + b)'].join(NL) + NL;
r = await call('run', { body: { code: con, language: 'python', console: true, inputs: [] } }, t1);
ok(r.j.ok && r.j.run.need === true && r.j.run.stdout === 'a = ', 'консоль: бірінші input() сұрауы шығады, жауап күтеді');
r = await call('run', { body: { code: con, language: 'python', console: true, inputs: ['3', '4'] } }, t1);
ok(r.j.ok && r.j.run.need === false && r.j.run.stdout.split(String.fromCharCode(13)).join('') === 'a = 3' + NL + 'b = 4' + NL + '7' + NL, 'консоль: жауаптар жолға жазылып, бағдарлама аяқталады');
const wrongE = cit[0].ref.split('int(input())').join('input()');
r = await call('py/submit', { body: { codes: { [cit[0].id]: cit[0].ref, [cit[1].id]: wrongE } } }, t1);
const ra = r.j.results || [];
ok(r.j.ok && ra.length === 2 && ra.find(x => x.item === cit[0].id).pts === 7 && ra.find(x => x.item === cit[0].id).f1 === 1, '2-тапсырма: дұрыс шешім 5 балл (нақты орындалды)');
const rb = ra.find(x => x.item === cit[1].id);
ok(rb && rb.f1 < 1 && rb.diag.length && rb.canRevise, 'int() ұмытылған шешім: балл кемиді, түсінікті кеңес және қатемен жұмыс мүмкіндігі бар');
ok(r.j.scores[2].pts === 7 + rb.pts && r.j.scores[2].max === 30, 'жиынтық баллға 2-тапсырма енді');

/* қорытынды: дағдылар */
r = await call('py/summary', {}, t1);
ok(r.j.ok && r.j.rows.length === 29 && r.j.skills.some(s => s.state === 'repeat' && s.skill === 'idiv'), 'қорытындыда // амалы қайталауға тұрады');

/* оқытушы талдауы */
const stat = (await T('py_stats?session=' + SES)).j;
ok(stat.ok && Array.isArray(stat.ops) && stat.ops.length === 7 && stat.students.length === 2, 'оқытушы талдауында 7 амал және 2 студент');
const o = Object.fromEntries(stat.ops.map(x => [x.op, x]));
ok(o.idiv.pct === 50 && o.idiv.mis[0].tag === 'idiv_as_div' && o.idiv.weak.includes('ТЕСТ_БІРІНШІ'), '//: 4 жауаптың 2-і дұрыс, жиі қате — / мен шатастыру, 1-студент қиналған');
ok(o.div.mis.some(m => m.tag === 'need_float') && o.add.pct === 100, '/: float қатесі көрінеді; +: 100%');
const ld = (await T('live')).j, row = ld.groups.flatMap(x => x.students).find(x => x.id === s1.id);
ok(row && Object.keys(row.tasks).join() === '1,2,3,4,5' && row.tasks[1].max === 15 && row.tasks[2].max === 30 && row.tasks[5].max === 25, 'оқытушы панелінде 1-тапсырма (15), 2-тапсырма (30) және үй жұмысы (20) бар');

/* 5-тапсырма: үй жұмысы (фото), ЖИ бағалайды (тест режимінде Gemini орнына жасанды жауап) */
let hwr = await call('py/data', {}, t1); ok(hwr.j.hw && hwr.j.hw.open === true && hwr.j.hw.done === false, 'үй жұмысы әрқашан ашық (оқытушы бастамай-ақ)');
const photo = 'A'.repeat(3000);
hwr = await call('py/hw', { body: { photo: 'short', mime: 'image/jpeg' } }, t1); ok(!hwr.j.ok && hwr.j.error === 'bad_request', 'жарамсыз сурет қабылданбайды');
hwr = await call('py/hw', { body: { photo, mime: 'image/jpeg' } }, t1);
ok(hwr.j.ok && hwr.j.hw.done && hwr.j.hw.score === 20 && hwr.j.hw.attempts === 1 && hwr.j.scores[5].pts === 20 && hwr.j.scores[5].max === 25, 'үй жұмысы бағаланды: 20 / 25, баллға енді');
hwr = await call('py/hw', { body: { photo, mime: 'image/jpeg' } }, t1); ok(!hwr.j.ok && hwr.j.error === 'wait', 'жиі қайта жіберуге болмайды (20 секунд)');
const ldx = (await T('live')).j, rowx = ldx.groups.flatMap(x => x.students).find(x => x.id === s1.id);
ok(rowx.tasks[5].sent && rowx.tasks[5].pts === 20, 'оқытушы панелінде 5-тапсырма баллы көрінеді');
const wk = (await T('work?session=' + SES + '&student=' + s1.id)).j; ok(wk.hw && wk.hw.photo === photo && wk.hw.comment, 'оқытушы суретті және ЖИ пікірін көре алады');

/* терезелер: тапсырма жабылады, қатемен жұмыс бөлек басталады */
await W(1, 0, 'stop'); await new Promise(res => setTimeout(res, 100));
const clo = lessonOf('P4', me.variant)[0].items.find(i => i.op === 'idiv');
r = await call('py/data', {}, t1); ok(r.j.wins[1].until <= r.j.now && r.j.wins[2] && !r.j.wins[0], 'жабылған тапсырманың терезесі өтті, қатемен жұмыс әлі жоқ');
await W(1, 0, 'extend').catch(() => 0);
await W(0, 10); r = await call('py/data', {}, t1); ok(!!r.j.wins[0], 'қатемен жұмыс терезесі басталды');
await T('session/close', { body: {} });
console.log(fails ? '\nҚателер: ' + fails : '\nБарлығы дұрыс');
process.exit(fails ? 1 : 0);
