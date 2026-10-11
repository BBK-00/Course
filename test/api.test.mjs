/* API тесті: `npx wrangler dev -c wrangler.dev.jsonc --port 8787 --local` (.dev.vars: TEACHER_PASSWORD=test123, GEMINI_STUB=1) іске қосылған кезде: node test/api.test.mjs */
const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const call = async (path, o = {}, tok) => {
  const r = await fetch(B + '/api/' + path, { method: o.body ? 'POST' : (o.method || 'GET'), headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  return { s: r.status, j: await r.json() };
};
const T = async (path, o) => call('teacher/' + path, o, TT);
let TT = '', w0; const GN = 'ИС-' + (Date.now() % 100000);

console.log('Оқытушы кіруі');
let r = await call('teacher/login', { body: { password: 'qate' } }); ok(r.s === 401 && r.j.error === 'bad_password', 'қате құпиясөз қабылданбайды');
r = await call('teacher/live'); ok(r.s === 401, 'токенсіз тізімге кіру жоқ');
r = await call('teacher/login', { body: { password: process.env.PASS || 'test123' } }); TT = r.j.token; ok(!!TT, 'дұрыс құпиясөз → токен');

await T('session/close', { body: {} });
console.log('Топ және студенттер');
r = await T('groups', { body: { name: GN } }); const g = r.j.groups.find(x => x.name === GN); ok(!!g, 'топ қосылды');
r = await T('students', { body: { group_id: g.id, names: '1. Әлиев Асқар\n2) Серік Нұрлан\nЖанар Ермек\nӘлиев Асқар\n' } }); ok(r.j.added === 3, 'студенттер тізіммен қосылды (қайталанғаны алынбады): ' + r.j.added);
const students = r.j.groups.find(x => x.id === g.id).students; const [s1, s2, s3] = students.sort((a, b) => a.id - b.id);

console.log('Сабаққа кіру');
r = await call('public/roster'); ok(r.j.open === false, 'сабақ ашылмаған: тізім жабық');
r = await T('session/start', { body: { topic: '6' } }); ok(r.j.ok, 'сабақ басталды');
r = await call('public/roster'); ok(r.j.open === true && r.j.groups.find(x => x.id === g.id).students.length === 3, 'ашық сабақта топ пен аттар көрінеді');
let live = (await T('live')).j; const code = live.session.code; ok(/^\d{4}$/.test(code), 'сабақ коды 4 таңбалы: ' + code); ok(live.session.code_ttl > 0 && live.session.code_ttl <= 60, 'код әр минут сайын өзгереді, қалған уақыт: ' + live.session.code_ttl + ' сек');
r = await call('join', { body: { student_id: s1.id, code: '0000', device: 'devA' } }); ok(r.j.error === 'bad_code', 'қате код қабылданбайды');
r = await call('join', { body: { student_id: s1.id, code, device: 'devA' } }); const tok1 = r.j.token; ok(!!tok1, 'дұрыс код → кірді');
r = await call('join', { body: { student_id: s1.id, code, device: 'devB' } }); ok(r.s === 409 && r.j.error === 'taken', 'басқа құрылғыдан сол атпен кіру жоқ');
r = await call('join', { body: { student_id: s1.id, code, device: 'devA' } }); ok(!!r.j.token, 'сол құрылғыдан қайта кіруге болады');
r = await call('join', { body: { student_id: s2.id, code, device: 'devC' } }); const tok2 = r.j.token;
let me = (await call('me', {}, tok1)).j; ok(me.ok && me.variant === 1 && me.attendance === 40, 'қатысым 40 балл, нұсқа 1');
me = (await call('me', {}, tok2)).j; ok(me.variant === 2, 'келесі студентке басқа нұсқа: ' + me.variant);
live = (await T('live')).j; const gl = live.groups.find(x => x.id === g.id).students; ok(gl.filter(s => s.present).length === 2 && !gl.find(s => s.id === s3.id).present, 'live: 2 студент бар, 1 жоқ');
r = await T('release', { body: { session_id: live.session.id, student_id: s1.id } }); r = await call('join', { body: { student_id: s1.id, code, device: 'devB' } }); ok(!!r.j.token, 'оқытушы босатқан соң басқа құрылғыдан кіруге болады');
const tok1b = r.j.token;

console.log('Тапсырмалар');
r = await call('submit', { body: { task: 1, payload: { quiz: [1, 0, 2, 0, 2, 1] } } }, tok1b); ok(r.s === 403 && r.j.error === 'not_started', 'жұмыс басталмай тапсыру жоқ');
r = await T('session/work', { body: { minutes: 40 } }); ok(r.j.ok, 'оқытушы жұмысты бастады (40 мин)');
r = await T('session/work', { body: { minutes: 50, total: true } }); live = (await T('live')).j; ok(live.session.work_until - live.session.work_started_at === 3000, 'ұзақтық 50 минутқа өзгертілді');
r = await call('submit', { body: { task: 1, payload: { quiz: [1, 0, 2, 0, 2, 1] } } }, tok1b); ok(r.j.ok && r.j.tasks[1].pts === 12, '1-тапсырма: 12/12');
r = await call('submit', { body: { task: 1, payload: { quiz: [0, 0, 0, 0, 0, 0] } } }, tok1b); ok(r.s === 409 && r.j.error === 'already', 'қайта тапсыру жоқ');
const d1 = { steps: 'x1 = (-22 - 2x2 - 2x3)/10\n'.repeat(5) + '1-итерация: x1=-2.2 ...', ans: ['-2.910', '1.045', '3.009'] };
r = await call('submit', { body: { task: 2, payload: d1, signals: { paste: 0, away: 1, f: { steps: { pasted: 0, typed: 300, first: 60000, last: 900000 } } } } }, tok1b);
ok(r.j.ok && r.j.tasks[2].sent, '2-тапсырма жіберілді: ' + JSON.stringify(r.j.tasks[2]));
r = await call('submit', { body: { task: 3, payload: { code: 'x=[0,0,0]\nfor k in range(100):\n  pass\n'.repeat(5), out: '[-3.0, 1.0, 3.0]' }, signals: { away: 0 } } }, tok1b);
ok(r.j.ok && r.j.tasks[3].sent, '3-тапсырма жіберілді: ' + JSON.stringify(r.j.tasks[3]));
ok(r.j.complete && r.j.total >= 50 && r.j.total <= 100, 'жиынтық: ' + r.j.total + ' (сынақ секундта бітті, сондықтан «тез бітті» белгісі: балл төмендейді)');
 w0 = (await T('live')).j; const w3 = (await T('work?session=' + w0.session.id + '&student=' + s1.id)).j.calc.tasks[3]; ok(/минутта/.test(w3.flags), 'ЖИ белгісі: ' + w3.flags);

console.log('Оқытушы талдауы және түзету');
live = (await T('live')).j; const sid = live.session.id;
let w = (await T(`work?session=${sid}&student=${s1.id}`)).j; ok(w.ok && w.subs.length === 3 && w.sys.includes('x1'), 'толық жұмыс ашылды (3 тапсырма, жүйе)');
const sub3 = w.subs.find(s => s.task === 3);
r = await T('task_grade', { body: { id: sub3.id, task: 3, score: 10, comment: 'Код толық емес' } });
w = (await T(`work?session=${sid}&student=${s1.id}`)).j; ok(w.calc.tasks[3].pts === 10 && w.calc.tasks[3].edited, '3-тапсырма баллы қолмен 10 болды');
r = await T('total', { body: { session_id: sid, student_id: s1.id, total: 77, comment: 'келісемін' } });
w = (await T(`work?session=${sid}&student=${s1.id}`)).j; ok(w.calc.final === 77 && w.calc.edited_total, 'қорытынды балл 77');
r = await T('total', { body: { session_id: sid, student_id: s1.id, total: null } });
w = (await T(`work?session=${sid}&student=${s1.id}`)).j; ok(w.calc.final === w.calc.auto, 'түзету алынды: ' + w.calc.final);
r = await T('regrade', { body: { id: sub3.id } }); ok(r.j.ok, 'ЖИ қайта бағалады');
r = await T('reopen', { body: { id: sub3.id } }); r = await call('submit', { body: { task: 3, payload: { code: 'print(1)', out: '1' } } }, tok1b); ok(r.j.ok, 'оқытушы ашқан соң тапсырманы қайта жіберуге болады');

console.log('Қатысым қолмен және журнал');
r = await T('attendance', { body: { session_id: sid, student_id: s3.id, present: true } });
r = await T('journal'); const row = r.j.groups.find(x => x.id === g.id).students; ok(r.j.topics.includes('6') && row.find(s => s.id === s3.id).scores['6'].attendance === 40, 'журнал: қолмен белгіленген студентке 40 қатысым');
ok(row.find(s => s.id === s1.id).scores['6'].total > 40, 'журнал: Әлиев баллы бар: ' + row.find(s => s.id === s1.id).scores['6'].total);
r = await T('attendance', { body: { session_id: sid, student_id: s3.id, present: false } });
r = await T('journal'); ok(r.j.groups.find(x => x.id === g.id).students.find(s => s.id === s3.id).scores['6'].attendance === 0, 'журнал: келмеген студентке 0 қатысым');

console.log('Жұмыс уақыты және жабу');
r = await T('session/stopwork', { body: {} }); await new Promise(res => setTimeout(res, 100));
r = await call('submit', { body: { task: 1, payload: { quiz: [] } } }, tok2); ok(r.s === 403, 'уақыт біткен соң тапсыру жоқ (' + r.j.error + ')');
r = await T('session/close', { body: {} }); r = await call('public/roster'); ok(r.j.open === false, 'сабақ жабылған: кіру тізімі жабық');

if (process.env.CLEAN) { await T('groups/' + g.id, { method: 'DELETE' }); console.log('  (сынақ тобы өшірілді)'); }
console.log(fails ? '\nҚАТЕ: ' + fails : '\nБәрі дұрыс ✓');
process.exit(fails ? 1 : 0);
