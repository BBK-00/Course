/* API тесті. Жергілікті: `npx wrangler dev -c wrangler.dev.jsonc --port 8787 --local` (.dev.vars: TEACHER_PASSWORD=test123, GEMINI_STUB=1).
   Тікелей сайт: BASE=<сайт> PASS=<құпиясөз> CLEAN=1 node test/api.test.mjs
   Тапсырмалар: 1 қолмен (фото) · 2 бағдарлама · 3 тест */
const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const call = async (path, o = {}, tok) => {
  const r = await fetch(B + '/api/' + path, { method: o.body ? 'POST' : (o.method || 'GET'), headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  return { s: r.status, j: await r.json() };
};
let TT = '';
const T = (path, o) => call('teacher/' + path, o, TT);
const GN = 'ИС-' + (Date.now() % 100000);
const GOOD = 'A = [[10, 2, 2], [2, 10, -2], [-2, 2, 10]]\nb = [-22, -2, 38]\nx = [0.0, 0.0, 0.0]\nfor k in range(100):\n    for i in range(3):\n        s = sum(A[i][j] * x[j] for j in range(3) if j != i)\n        x[i] = (b[i] - s) / A[i][i]   # жаңа мән бірден\nprint(x[0], x[1], x[2])';
// 1x1 JPEG
const PHOTO = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

console.log('Оқытушы кіруі');
let r = await call('teacher/login', { body: { password: 'qate' } }); ok(r.s === 401 && r.j.error === 'bad_password', 'қате құпиясөз қабылданбайды');
r = await call('teacher/live'); ok(r.s === 401, 'токенсіз тізімге кіру жоқ');
r = await call('teacher/login', { body: { password: process.env.PASS || 'test123' } }); TT = r.j.token; ok(!!TT, 'дұрыс құпиясөз → токен');
await T('session/close', { body: {} });

console.log('Топ және студенттер');
r = await T('groups', { body: { name: GN } }); const g = r.j.groups.find(x => x.name === GN); ok(!!g, 'топ қосылды');
r = await T('students', { body: { group_id: g.id, names: '1. Әлиев Асқар\n2) Серік Нұрлан\nЖанар Ермек\nӘлиев Асқар\n' } }); ok(r.j.added === 3, 'студенттер тізіммен қосылды (қайталанғаны алынбады): ' + r.j.added);
const [s1, s2, s3] = r.j.groups.find(x => x.id === g.id).students.sort((a, b) => a.id - b.id);

console.log('Сабаққа кіру');
r = await call('public/roster'); ok(r.j.open === false, 'сабақ ашылмаған: тізім жабық');
r = await T('session/start', { body: { topic: '6' } }); ok(r.j.ok, 'сабақ басталды');
let live = (await T('live')).j; const code = live.session.code; ok(/^\d{4}$/.test(code), 'сабақ коды 4 таңбалы: ' + code); ok(live.session.code_ttl > 0 && live.session.code_ttl <= 60, 'код әр минут сайын өзгереді, қалған уақыт: ' + live.session.code_ttl + ' сек');
r = await call('join', { body: { student_id: s1.id, code: code === '0000' ? '1111' : '0000', device: 'devA' } }); ok(r.j.error === 'bad_code', 'қате код қабылданбайды');
r = await call('join', { body: { student_id: s1.id, code, device: 'devA' } }); const tok1 = r.j.token; ok(!!tok1, 'дұрыс код → кірді');
r = await call('join', { body: { student_id: s1.id, code, device: 'devB' } }); ok(r.s === 409 && r.j.error === 'taken', 'басқа құрылғыдан сол атпен кіру жоқ');
r = await call('join', { body: { student_id: s2.id, code, device: 'devC' } }); const tok2 = r.j.token;
let me = (await call('me', {}, tok1)).j; ok(me.ok && me.variant === 1 && me.attendance === 40, 'қатысым 40 балл, нұсқа 1');
me = (await call('me', {}, tok2)).j; ok(me.variant === 2, 'келесі студентке басқа нұсқа: ' + me.variant);
r = await T('release', { body: { session_id: live.session.id, student_id: s1.id } }); r = await call('join', { body: { student_id: s1.id, code, device: 'devB' } }); const tok1b = r.j.token; ok(!!tok1b, 'оқытушы босатқан соң басқа құрылғыдан кіруге болады');

console.log('Тапсырмалар (әрқайсысының өз таймері)');
r = await call('run', { body: { language: 'python', code: 'print(2+2)' } }, tok1b); ok(r.j.ok && r.j.run.stdout.trim() === '4', 'сервер кодты нақты орындайды (' + (r.j.run && r.j.run.backend) + ')');
r = await call('run', { body: { language: 'cpp', code: '#include <iostream>\nint main(){std::cout<<6*7;}' } }, tok1b); ok(r.j.ok && r.j.run.stdout.trim() === '42', 'C++ компиляторы жұмыс істейді (' + (r.j.run && r.j.run.backend) + ')');
r = await call('task/start', { body: { task: 1 } }, tok1b); ok(r.s === 403 && r.j.error === 'not_started', 'оқытушы жұмысты бастамай тапсырма басталмайды');
r = await T('session/work', { body: { minutes: 50 } }); ok(r.j.ok, 'оқытушы жұмысты бастады (50 мин)');
r = await call('submit', { body: { task: 3, payload: { quiz: [1, 0, 2, 0, 2, 1] } } }, tok1b); ok(r.s === 403 && r.j.error === 'task_not_started', 'тапсырманы «Бастау» баспай жіберуге болмайды');
r = await call('task/start', { body: { task: 3 } }, tok1b); ok(r.j.ok && r.j.tasks[3].started_at && r.j.tasks[3].limit === 6, 'тест басталды, шегі 6 мин');
r = await call('submit', { body: { task: 3, payload: { quiz: [1, 0, 2, 0, 2, 1] } } }, tok1b); ok(r.j.ok && r.j.tasks[3].pts === 12, 'тест: 12/12');
r = await call('submit', { body: { task: 3, payload: { quiz: [0, 0, 0, 0, 0, 0] } } }, tok1b); ok(r.s === 409 && r.j.error === 'already', 'қайта тапсыру жоқ');
r = await call('task/start', { body: { task: 1 } }, tok1b); ok(r.j.tasks[1].limit === 12, 'қолмен есеп басталды, шегі 12 мин');
const hand = { steps: 'x1 = (-22 - 2x2 - 2x3)/10\n'.repeat(5) + '1-итерация ...', ans: ['-2.910', '1.045', '3.009'], photo: PHOTO, photo_mime: 'image/jpeg' };
r = await call('submit', { body: { task: 1, payload: hand, signals: { paste: 0, away: 1, f: { steps: { pasted: 0, typed: 300, first: 60000, last: 900000 } } } } }, tok1b); ok(r.j.ok && r.j.tasks[1].sent, 'қолмен есеп (фотомен) жіберілді: ' + JSON.stringify(r.j.tasks[1]));
r = await call('task/start', { body: { task: 2 } }, tok1b);
r = await call('submit', { body: { task: 2, payload: { code: '# сабақтағы мысал\nA = [[4, 1, 1], [1, 5, 2], [1, 2, 6]]\nprint([1.0, 2.0, -1.0])', lang: 'python' }, signals: { away: 0 } } }, tok1b);
ok(r.j.ok && r.j.tasks[2].sent && r.j.tasks[2].pts <= 3, 'басқа жүйенің кодын қойса, балл өте аз: ' + JSON.stringify(r.j.tasks[2]));
ok(r.j.complete && r.j.total >= 50 && r.j.total <= 100, 'жиынтық: ' + r.j.total);
live = (await T('live')).j; const sid = live.session.id;
let w = (await T(`work?session=${sid}&student=${s1.id}`)).j; ok(/минутта/.test(w.calc.tasks[1].flags), 'ЖИ белгісі (тапсырма тез жіберілді): ' + w.calc.tasks[1].flags);
ok(w.subs.find(s => s.task === 1).payload.photo.length > 50, 'фото сақталды, оқытушы көре алады');

console.log('Оқытушы талдауы және түзету');
ok(w.ok && w.subs.length === 3 && w.sys.includes('x1'), 'толық жұмыс ашылды (3 тапсырма, жүйе)');
const subCode = w.subs.find(s => s.task === 2);
r = await T('task_grade', { body: { id: subCode.id, task: 2, score: 10, comment: 'Код толық емес' } });
w = (await T(`work?session=${sid}&student=${s1.id}`)).j; ok(w.calc.tasks[2].pts === 10 && w.calc.tasks[2].edited, 'бағдарлама баллы қолмен 10 болды');
r = await T('total', { body: { session_id: sid, student_id: s1.id, total: 77, comment: 'келісемін' } });
w = (await T(`work?session=${sid}&student=${s1.id}`)).j; ok(w.calc.final === 77 && w.calc.edited_total, 'қорытынды балл 77');
r = await T('total', { body: { session_id: sid, student_id: s1.id, total: null } });
w = (await T(`work?session=${sid}&student=${s1.id}`)).j; ok(w.calc.final === w.calc.auto, 'түзету алынды: ' + w.calc.final);
r = await T('regrade', { body: { id: subCode.id } }); ok(r.j.ok, 'ЖИ қайта бағалады');
r = await T('reopen', { body: { id: subCode.id } });
r = await call('submit', { body: { task: 2, payload: { code: GOOD, lang: 'python' } } }, tok1b); ok(r.j.error === 'task_not_started', 'қайта ашылған тапсырманы қайта «Бастау» керек');
r = await call('task/start', { body: { task: 2 } }, tok1b); r = await call('submit', { body: { task: 2, payload: { code: GOOD, lang: 'python' } } }, tok1b); ok(r.j.ok && r.j.tasks[2].pts >= 12, 'мәнін өз нұсқасына өзгертіп дұрыс жазса, толық балл алады: ' + JSON.stringify(r.j.tasks[2]));

console.log('Бекіту және рефлексия');
r = await call('feedback', { body: { level: 4, learned: ['идея'], hard: 'Код', comment: 'жақсы' } }, tok1b); ok(r.j.ok, 'студент рефлексия жіберді');
r = await T('feedback'); ok(r.j.rows.length >= 1 && r.j.levels[3] >= 1, 'оқытушы кері байланысты көреді');
r = await T('consolidate'); ok(r.j.low.length >= 2 && r.j.low[0].total <= r.j.low[1].total, 'бекіту: ең аз балл алғандар өсу ретімен: ' + r.j.low.map(x => x.name + ' ' + x.total).join(', '));
const before = (await T('work?session=' + sid + '&student=' + s1.id)).j.calc.final;
r = await T('bonus', { body: { session_id: sid, student_id: s1.id, points: 5, note: 'дұрыс жауап' } });
const after = (await T('work?session=' + sid + '&student=' + s1.id)).j.calc; ok(after.bonus === 5 && after.final === Math.min(100, before + 5), 'бонус +5 жалпы балға қосылды: ' + before + ' → ' + after.final);
me = (await call('me', {}, tok1b)).j; ok(me.bonus === 5 && me.feedback === true, 'студент бонусты және рефлексия белгісін көреді');
console.log('Қатысым қолмен және журнал');
r = await T('attendance', { body: { session_id: sid, student_id: s3.id, present: true } });
r = await T('journal'); const row = r.j.groups.find(x => x.id === g.id).students; ok(r.j.topics.includes('6') && row.find(s => s.id === s3.id).scores['6'].attendance === 40, 'журнал: қолмен белгіленген студентке 40 қатысым');
ok(row.find(s => s.id === s1.id).scores['6'].total > 40, 'журнал: Әлиев баллы бар: ' + row.find(s => s.id === s1.id).scores['6'].total);
r = await T('attendance', { body: { session_id: sid, student_id: s3.id, present: false } });
r = await T('journal'); ok(r.j.groups.find(x => x.id === g.id).students.find(s => s.id === s3.id).scores['6'].attendance === 0, 'журнал: келмеген студентке 0 қатысым');

console.log('Жұмыс уақыты және жабу');
r = await T('session/stopwork', { body: {} }); await new Promise(res => setTimeout(res, 100));
r = await call('task/start', { body: { task: 3 } }, tok2); ok(r.s === 403, 'уақыт біткен соң тапсырма басталмайды (' + r.j.error + ')');
r = await T('session/close', { body: {} }); r = await call('public/roster'); ok(r.j.open === false, 'сабақ жабылған: кіру тізімі жабық');
if (process.env.CLEAN) { await T('groups/' + g.id, { method: 'DELETE' }); console.log('  (сынақ тобы өшірілді)'); }
console.log(fails ? '\nҚАТЕ: ' + fails : '\nБәрі дұрыс ✓');
process.exit(fails ? 1 : 0);
