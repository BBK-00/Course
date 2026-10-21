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
const GOOD = {
  t1: { kbd: 0, mouse: 0, scan: 0, mic: 0, cam: 0, mon: 3, prn: 3, snd: 3, hdd: 2, ram: 2, cpu: 1, gpu: 1 },
  t2: { sw: { os: 0, drv: 0, arc: 0, br: 1, txt: 1, ide: 2 }, g: ['Аппаратты басқарады, құрылғылардың жұмысын үйлестіреді', 'Пайдаланушының нақты міндеттерін орындайды', 'Жаңа бағдарламаларды жасауға арналған'] },
  t3: ['Intel Core i5-10400F', '8 ГБ', 'Windows 11', '64-биттік', '237 ГБ'],
  types: { cpu: 'hw', ram: 'hw', ssd: 'hw', mb: 'hw', os: 'sw', drv: 'sw', br: 'sw', av: 'sw' },
  funcs: { cpu: 'Барлық есептеулерді орындайды, компьютердің миы', ram: 'Деректерді уақытша және жылдам сақтайды', ssd: 'Файлдарды ұзақ мерзімге сақтайды', mb: 'Барлық құрылғыларды бір-бірімен байланыстырады', os: 'Компьютердің жұмысын басқарады, интерфейс береді', drv: 'ОЖ мен құрылғы арасындағы байланысты қамтамасыз етеді', br: 'Интернеттегі сайттарды қарауға арналған', av: 'Компьютерді вирустардан қорғайды' },
  pairs: [{ a: 'os', b: 'cpu', t: 'Операциялық жүйе процессордың жұмысын басқарады және программаларды орындатады' }, { a: 'drv', b: 'mb', t: 'Драйвер аналық тақтадағы құрылғыны жүйеге таныту үшін қажет' }]
};
let me = (await call('me', {}, t1)).j; ok(me.ok && me.attendance === 30 && [1, 2, 3, 4].map(n => me.tasks[n].max).join() === '12,12,6,40', 'кірді: қатысым 30, тапсырмалар 12/12/6/40');
const sub = (tok, n, extra = GOOD) => call('a2/submit', { body: { task: n, ...extra } }, tok);
r = await sub(t1, 1); ok(r.j.error === 'not_started', 'жұмыс басталмай жіберуге болмайды');
await T('session/work', { body: { minutes: 60 } });
r = await sub(t1, 9); ok(r.j.error === 'bad_task', 'қате тапсырма нөмірі');
r = await sub(t1, 1); ok(r.j.ok && r.j.pts === 12 && r.j.total === 42, '1-тапсырма жіберілді: 12, жиынтық ' + r.j.total);
r = await sub(t1, 1); ok(r.s === 409 && r.j.error === 'already', 'бір тапсырманы екінші рет жіберуге болмайды');
r = await sub(t1, 2); ok(r.j.ok && r.j.pts === 12, '2-тапсырма бөлек жіберілді');
r = await sub(t1, 3); ok(r.j.ok && r.j.pts === 6, '3-тапсырма');
let live2 = (await T('live')).j; let row = live2.groups[0].students.find(x => x.id === s1.id); ok(row.tasks[4] && !row.tasks[4].sent && row.tasks[3].sent, 'панельде 4 тапсырма: 4-ші әлі жіберілмеген');
r = await sub(t1, 4); ok(r.j.ok && r.j.pts === 40 && r.j.total === 100, '4-тапсырма: 40, жиынтық ' + r.j.total);
r = await sub(t2, 4); ok(r.j.ok && r.j.dup === true && r.j.pts === 0, '4-тапсырма көшірілген жауап: 0 балл');
const w = (await T('work?session=' + live.session.id + '&student=' + s1.id)).j; ok(w.ok && w.subs.length === 4 && w.subs[3].payload.items.length === 18, 'оқытушы панелі 4 тапсырманы көреді');
r = await sub('', 1); ok(r.s === 401, 'токенсіз жіберуге болмайды');
await T('session/close', { body: {} });
console.log(fails ? 'ҚАТЕ: ' + fails : 'Бәрі дұрыс');
process.exit(fails ? 1 : 0);
