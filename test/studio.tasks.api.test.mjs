/* Студия: тапсырмасы бар сабақ (деректі сабақ) толық жолы. ТЕК жергілікті сервер (wrangler dev, Judge0 нақты орындалады). */
if (process.env.BASE && !/127.0.0.1|localhost/.test(process.env.BASE)) { console.log('Тікелей сайтта тест жүргізуге болмайды.'); process.exit(1); }
const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const call = async (path, o = {}, tok) => { const r = await fetch(B + '/api/' + path, { method: o.body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined }); return { s: r.status, j: await r.json() }; };
const TT = (await call('teacher/login', { body: { password: process.env.PASS || 'test123' } })).j.token; ok(!!TT, 'оқытушы кірді');
const T = (p, o) => call('teacher/' + p, o, TT), S = (p, o) => T('studio/' + p, o);

const tasks = { v: 1, tasks: [
  { title: 'Қосу', minutes: 8, pts: 0, info: '', items: [
    { k: 'code', title: 'Қосынды', text: 'Екі бүтін сан берілген. Қосындысын шығар.', starter: '', ref: 'a = int(input())\nb = int(input())\nprint(a + b)\n', hint: 'int(input()) екі рет.', cases: [{ in: '2\n3', out: '5' }, { in: '10\n-4', out: '6' }, { in: '0\n0', out: '0' }] },
    { k: 'code', title: 'Жұп па', text: 'Сан жұп болса «жұп», әйтпесе «тақ» шығар.', ref: 'n = int(input())\nif n % 2 == 0:\n    print("жұп")\nelse:\n    print("тақ")\n', hint: '% амалын қолдан.', cases: [{ in: '4', out: 'жұп' }, { in: '7', out: 'тақ' }] }] },
  { title: 'Қатені түзет', minutes: 6, items: [
    { k: 'fix', title: 'Айырма емес', text: 'Қосындыны шығару керек.', starter: 'a = int(input())\nb = int(input())\nprint(a - b)\n', ref: 'a = int(input())\nb = int(input())\nprint(a + b)\n', hint: 'Амал белгісі.', cases: [{ in: '2\n3', out: '5' }, { in: '9\n1', out: '10' }] }] },
  { title: 'Тест', minutes: 5, items: [
    { k: 'quiz', q: 'print(2 + 3) нені шығарады?', code: '', opts: ['5', '23', 'Қате'], correct: 0, why: '2 + 3 = 5.' },
    { k: 'quiz', q: 'Қай функция мәтінді санға айналдырады?', code: '', opts: ['str()', 'int()', 'print()'], correct: 1, why: 'int() мәтінді бүтін санға айналдырады.' }] }
], hw: { on: true, title: 'Жоба: калькулятор', lead: 'Екі санды қосатын бағдарлама жаз.', how: 'Фото түсір.', items: ['input() қолдан'], crit: [{ t: 'Дұрыс есептейді', pts: 20 }, { t: 'Таза код', pts: 5 }] } };

const nl = await S('lesson/new', { body: { subject: 'python', title: 'Сынақ: деректі сабақ', template: 'blank' } }); const id = nl.j.id; ok(nl.j.ok, 'сабақ жасалды');
let r = await S('lesson/save', { body: { id, blocks: [{ id: 'a', t: 'p', text: 'Теория мәтіні' }], tasks, autosave: true } }); ok(r.j.ok, 'тапсырмалармен сақталды');
r = await S('lesson?id=' + id); ok(r.j.lesson.tasks.tasks.length === 3 && r.j.lesson.tasks.tasks[0].items.length === 2 && r.j.lesson.tasks.hw.crit.length === 2, 'тапсырмалар қайта оқылады');

/* тексеру: толық емес жоба */
r = await S('lesson/check', { body: { id, tasks: { tasks: [{ title: 'x', items: [{ k: 'code', text: '', ref: '', cases: [] }, { k: 'quiz', q: '', opts: ['a'] }] }], hw: { on: true, title: '', crit: [] } } } });
ok(r.j.problems.length >= 4 && r.j.problems.some(p => /эталон/.test(p)) && r.j.problems.some(p => /кемінде 2 жауап/.test(p)) && r.j.problems.some(p => /критерий/.test(p)), 'толтырылмаған жерлер табылды: ' + r.j.problems.length);
r = await S('lesson/check', { body: { id } }); ok(r.j.ok && !r.j.infra && r.j.problems.length === 0 && r.j.failed.length === 0 && r.j.warns.length === 0, 'барлық эталон шешім өз тестінен өтті, қателі код өтіп кетпейді');
/* дұрыс емес эталон: жариялауға болмайды */
const badTasks = JSON.parse(JSON.stringify(tasks)); badTasks.tasks[0].items[0].ref = 'print(1)\n';
await S('lesson/save', { body: { id, blocks: [{ id: 'a', t: 'p', text: 'Теория мәтіні' }], tasks: badTasks } });
r = await S('lesson/publish', { body: { id } }); ok(!r.j.ok && r.j.error === 'ref_fail' && r.j.problems.length === 1, 'эталон өтпесе, жариялау тоқтайды');
r = await S('lesson/save', { body: { id, blocks: [{ id: 'a', t: 'p', text: 'Теория мәтіні' }], tasks } });
r = await S('lesson/publish', { body: { id } }); ok(r.j.ok && r.j.tasks === true, 'жарияланды (тапсырмалармен)');
const TOPIC = 'D' + id;

/* ашық бет: 3 қойынды, тапсырма скрипті */
const page = await (await fetch(B + r.j.url)).text();
ok(page.includes('data-tab="task"') && page.includes('PyWork.mount') && page.includes('"' + TOPIC + '"') && page.includes('Қосу') && page.includes('Теория мәтіні'), 'ашық бетте Түсіндіру/Тапсырмалар/Қорытынды және тапсырма скрипті бар');

/* оқытушы панелі үшін тізім */
r = await S('datalessons'); const dl = r.j.lessons.find(x => x.topic === TOPIC);
ok(dl && dl.noHw[1] + dl.noHw[2] + dl.noHw[3] === 100 && dl.withHw[1] + dl.withHw[2] + dl.withHw[3] === 75 && Object.values(dl.noHw).every(v => v % 5 === 0) && Object.values(dl.withHw).every(v => v % 5 === 0) && dl.hw === true, 'ұпай: үй жұмысыз ' + JSON.stringify(dl && dl.noHw) + ', үй жұмысымен ' + JSON.stringify(dl && dl.withHw));

/* сабақ өткізу */
await T('session/close', { body: {} });
const GN = 'D-' + (Date.now() % 100000);
const g = (await T('groups', { body: { name: GN } })).j.groups.find(x => x.name === GN);
const st = (await T('students', { body: { group_id: g.id, names: 'ТЕСТ_ДЕРЕКТІ' } })).j.groups.find(x => x.id === g.id).students[0];
r = await T('session/start', { body: { topic: TOPIC, group_id: g.id } }); ok(r.j.ok, 'сабақ басталды: ' + TOPIC);
const live = (await T('live')).j, code = live.session.code;
ok(live.pycfg && live.pycfg.hw === true && live.pycfg.pts[1] === dl.withHw[1] && Object.keys(live.pycfg.pts).join() === '1,2,3,5' && live.pycfg.defaults.titles[1] === 'Қосу', 'оқытушы панелі: баптау (үй жұмысы белгісі, ұпай, атаулар)');
const tok = (await call('join', { body: { student_id: st.id, code, device: 'dd1' } })).j.token;
const me = (await call('me', {}, tok)).j; ok(me.ok && Object.keys(me.tasks).join() === '1,2,3,5', 'студент кірді: 1, 2, 3 және үй жұмысы');
r = await call('py/data', {}, tok); ok(r.j.ok && r.j.tasks.every(t => t.locked), 'тапсырмалар басталмағанша жабық');
for (const [n, m] of [[1, 8], [2, 6], [3, 5]]) await T('pywin', { body: { task: n, minutes: m, action: 'start' } });
r = await call('py/data', {}, tok); const D = r.j.tasks;
ok(D.length === 3 && D[0].items.length === 2 && D[1].items.length === 1 && D[2].items.length === 2, 'студентке 2 + 1 + 2 есеп берілді');
ok(!/"ref"|"correct"|"why"/.test(JSON.stringify(D)) && D[0].items[0].text.includes('Екі бүтін сан') && D[1].items[0].starter.includes('a - b'), 'дұрыс жауап жіберілмейді, қателі код көрсетіледі');
ok(D.every((t, k) => t.items.reduce((a, i) => a + i.max, 0) === dl.withHw[k + 1]), 'есеп баллдары тапсырма ұпайына тең: ' + JSON.stringify(D.map(t => t.items.map(i => i.max))));
const I1 = D[0].items, I2 = D[1].items[0], Q = D[2].items;
r = await call('py/submit', { body: { codes: { [I1[0].id]: 'a = int(input())\nb = int(input())\nprint(a + b)\n', [I1[1].id]: 'n = int(input())\nprint("жұп")\n' } } }, tok);
const res = r.j.results || [];
ok(r.j.ok && res.length === 2 && res[0].f1 === 1 && res[1].f1 === 0.5, 'код тексерілді: біріншісі толық, екіншісі 1/2 тесттен өтті');
ok(res[1].diag && res[1].diag.some(d => /Кеңес|%|қолдан/.test(d.text) || d.text.length > 5), 'қате болғанда кеңес шықты: ' + (res[1].diag[0] || {}).text);
r = await call('py/submit', { body: { codes: { [I2.id]: 'a = int(input())\nb = int(input())\nprint(a + b)\n' } } }, tok); ok(r.j.ok && r.j.results[0].f1 === 1, 'қатені түзет: түзетілген код толық өтті');
const right = Q.map(q => q.opts.find(o => o.t === (q.q.startsWith('print') ? '5' : 'int()')).i); const quiz = {}; Q.forEach((q, i) => { quiz[q.id] = right[i]; });
r = await call('py/submit', { body: { quiz } }, tok); ok(r.j.ok && r.j.results.every(x => x.f1 === 1), 'тест: дұрыс жауаптар (нұсқалар араласқан)');
const me2 = (await call('me', {}, tok)).j; const tot = Object.values(me2.tasks).reduce((a, t) => a + (t.pts || 0), 0);
ok(Math.abs(tot - (15 + 15 * 0.5 + 15 + 30 + 0)) < 0.01 || tot > 60, 'ұпайлар есептелді: ' + JSON.stringify(Object.fromEntries(Object.entries(me2.tasks).map(([k, t]) => [k, t.pts]))));
/* баптау: үй жұмысын өшіру */
r = await T('pycfg', { body: { hw: false, pts: {} } }); ok(r.j.ok, 'үй жұмысы өшірілді');
const live3 = (await T('live')).j; ok(live3.pycfg.hw === false && live3.pycfg.pts[1] === dl.noHw[1] && Object.keys(live3.pycfg.pts).join() === '1,2,3,5', 'ұпай 100-ге қайта есептелді: ' + dl.noHw[1] + '/' + dl.noHw[2] + '/' + dl.noHw[3]);
r = await call('py/hw', { body: { photo: 'AAAA', mime: 'image/png' } }, tok); ok(!r.j.ok, 'үй жұмысы өшірулі болса, фото қабылданбайды');

await T('session/close', { body: {} });
r = await S('lesson/save', { body: { id, blocks:[{id:'changed',t:'p',text:'Жаңа жоба'}], tasks:{...tasks,tasks:tasks.tasks.slice(1)} } });
ok(r.j.ok, 'өткізілген сабақтың жобасын өңдеуге болады');
r = await S('lesson/publish', { body: { id } });
ok(r.s === 409 && r.j.error === 'used_tasks', 'өткен сабақтың тапсырмалары ауыстырылмайды');
const copy = await S('lesson/new', { body: {subject:'python',title:'Көшірме',copy:id} });
const copied = await S('lesson?id=' + copy.j.id);
ok(copied.j.lesson.status === 'draft' && copied.j.lesson.tasks.tasks.length === 2, 'өзгерген тапсырмалар бөлек жобаға көшеді');
r = await S('lesson/del', { body: { id } }); ok(!r.j.ok && r.j.error === 'has_sessions', 'сабақ өткізілген болса, өшіруге болмайды');
r = await S('lesson/publish', { body: { id, publish: false } }); ok(r.j.status === 'hidden', 'жасыруға болады');
console.log(fails ? '\nҚателер: ' + fails : '\nБәрі өтті'); process.exit(fails ? 1 : 0);
