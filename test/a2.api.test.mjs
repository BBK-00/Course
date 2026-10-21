/* АКТ 2 API тесті. ТЕК жергілікті сервер: wrangler dev (.dev.vars: TEACHER_PASSWORD=test123, GEMINI_STUB=1). */
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
const GN = 'A2-' + (Date.now() % 100000);
const g = (await T('groups', { body: { name: GN } })).j.groups.find(x => x.name === GN);
const [s1, s2] = (await T('students', { body: { group_id: g.id, names: 'АБДОЛЛА_ЖАНГҮЛ\nАГИСОВ_ҚАБЫЛЕТ' } })).j.groups.find(x => x.id === g.id).students;
ok((await T('session/start', { body: { topic: 'A2', group_id: g.id } })).j.ok, 'АКТ 2 сабағы басталды');
const g2 = (await T('groups', { body: { name: GN + 'B' } })).j.groups.find(x => x.name === GN + 'B');
const [o1] = (await T('students', { body: { group_id: g2.id, names: 'БАСҚА_ТОП' } })).j.groups.find(x => x.id === g2.id).students;
const live = (await T('live')).j, code = live.session.code;
ok(!(await T('session/start', { body: { topic: 'A2' } })).j.ok, 'топсыз сабақ басталмайды');
const ro = (await call('public/roster')).j; ok(ro.groups.length === 1 && ro.groups[0].id === g.id, 'тізімде тек таңдалған топ');
r = await call('join', { body: { student_id: o1.id, code, device: 'dx' } }); ok(r.j.error === 'wrong_group', 'басқа топ студенті кіре алмайды');
ok(!(await T('live')).j.groups.some(x => x.id === g2.id), 'панельде басқа топ есептелмейді');
const join = async s => (await call('join', { body: { student_id: s.id, code, device: 'd' + s.id } })).j.token;
const [t1, t2] = [await join(s1), await join(s2)];
let me = (await call('me', {}, t1)).j; ok(me.ok && me.attendance === 30 && me.tasks[1].max === 24 && me.tasks[2].max === 32 && me.tasks[3].max === 14, 'кірді: қатысым 30, бөлімдер 24/32/14');
const GOOD = { types: { cpu: 'hw', ram: 'hw', ssd: 'hw', mb: 'hw', os: 'sw', drv: 'sw', br: 'sw', av: 'sw' },
  funcs: { cpu: 'Барлық есептеулерді орындайды, компьютердің миы', ram: 'Деректерді уақытша және жылдам сақтайды', ssd: 'Файлдарды ұзақ мерзімге сақтайды', mb: 'Барлық құрылғыларды бір-бірімен байланыстырады', os: 'Компьютердің жұмысын басқарады, интерфейс береді', drv: 'ОЖ мен құрылғы арасындағы байланысты қамтамасыз етеді', br: 'Интернеттегі сайттарды қарауға арналған', av: 'Компьютерді вирустардан қорғайды' },
  pairs: [{ a: 'os', b: 'cpu', t: 'Операциялық жүйе процессордың жұмысын басқарады және программаларды орындатады' }, { a: 'drv', b: 'mb', t: 'Драйвер аналық тақтадағы құрылғыны жүйеге таныту үшін қажет' }] };
r = await call('a2/submit', { body: GOOD }, t1); ok(r.j.error === 'not_started', 'жұмыс басталмай жіберуге болмайды');
await T('session/work', { body: { minutes: 30 } });
r = await call('a2/submit', { body: GOOD }, t1);
ok(r.j.ok && [1, 2, 3].map(n => r.j.tasks[n].pts).join() === '24,32,14', 'балл: ' + (r.j.tasks ? [1, 2, 3].map(n => r.j.tasks[n].pts) : r.j.error));
ok(r.j.total === 100, 'жиынтық 30 + 70 = ' + r.j.total);
r = await call('a2/submit', { body: GOOD }, t1); ok(r.s === 409 && r.j.error === 'already', 'екінші рет жіберуге болмайды');
r = await call('a2/submit', { body: GOOD }, t2); ok(r.j.ok && r.j.dup === true && r.j.total === 40, 'көшірілген жауап: 0 балл, тек қатысым 30 + ең төменгі 10 (' + r.j.total + ')');
const w = (await T('work?session=' + live.session.id + '&student=' + s1.id)).j; ok(w.ok && w.subs.length === 3 && w.subs[0].payload.items.length === 8, 'оқытушы панелі жауап тармақтарын көреді');
r = await call('a2/submit', { body: GOOD }, ''); ok(r.s === 401, 'токенсіз жіберуге болмайды');
await T('session/close', { body: {} });
console.log(fails ? 'ҚАТЕ: ' + fails : 'Бәрі дұрыс');
process.exit(fails ? 1 : 0);
