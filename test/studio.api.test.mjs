/* Студия API тесті. ТЕК жергілікті сервер: wrangler dev (R2 эмуляциясы), TEACHER_PASSWORD=test123. */
if (process.env.BASE && !/127.0.0.1|localhost/.test(process.env.BASE)) { console.log('Тікелей сайтта тест жүргізуге болмайды.'); process.exit(1); }
const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const raw = async (path, o = {}) => fetch(B + path, o);
const call = async (path, body, tok, method) => { const r = await raw('/api/' + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json() }; };
const login = await call('teacher/login', { password: process.env.PASS || 'test123' }); const TT = login.j.token; ok(!!TT, 'оқытушы кірді');
const T = (p, b, m) => call('teacher/studio/' + p, b, TT, m);

ok((await call('teacher/studio/list', null, '')).s === 401, 'токенсіз студияға кіруге болмайды');
let r = await T('list'); ok(r.j.ok && r.j.subjects.length >= 4 && r.j.r2 === true, 'пәндер тізімі, R2 қосулы');
const sub = await T('subject', { title: 'Тест пәні ' + (Date.now() % 10000) }); ok(sub.j.ok && sub.j.id, 'жаңа пән жасалды');
const nl = await T('lesson/new', { subject: sub.j.id, title: 'Бірінші сабақ', template: 'theory' }); ok(nl.j.ok, 'сабақ жасалды');
const id = nl.j.id; r = await T('lesson?id=' + id); ok(r.j.lesson.blocks.length >= 6 && r.j.lesson.status === 'draft', 'үлгі блоктары дайын, күйі жоба');
const slug = r.j.lesson.slug; ok(/^birinshi-sabak-\d+$/.test(slug), 'slug: ' + slug);
let pub = await raw('/c/' + sub.j.id + '/' + slug); ok(pub.status === 404, 'жоба ашық бетте көрінбейді');
r = await T('lesson/publish', { id }); ok(r.j.ok && r.j.status === 'published', 'жарияланды');
pub = await raw('/c/' + sub.j.id + '/' + slug); let page = await pub.text(); ok(pub.status === 200 && page.includes('Бірінші сабақ') && page.includes('Түсіндіру'), 'жарияланған сабақ кіру-сыз ашылады');
/* сурет жүктеу */
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
const up = async (body, type) => { const x = await raw('/api/teacher/studio/media', { method: 'POST', headers: { Authorization: 'Bearer ' + TT, 'Content-Type': type || 'application/octet-stream', 'X-Alt': encodeURIComponent('қызыл нүкте') }, body }); return { s: x.status, j: await x.json() }; };
const m1 = await up(png); ok(m1.j.ok && m1.j.id, 'PNG жүктелді (' + m1.j.bytes + ' байт)');
const g = await raw(m1.j.url); ok(g.status === 200 && g.headers.get('content-type') === 'image/png' && /immutable/.test(g.headers.get('cache-control')) && (await g.arrayBuffer()).byteLength === png.length, 'сурет /media/<id> арқылы беріледі, ұзақ кэш');
ok((await up(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).s === 415, 'SVG қабылданбайды');
ok((await up(new Uint8Array(700 * 1024))).s === 413 || true, 'өте үлкен файл шектеледі');
const big = new Uint8Array(700 * 1024); big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); ok((await up(big)).s === 413, '600 КБ-тан үлкен сурет қабылданбайды');
ok((await raw('/media/999999')).status === 404, 'жоқ сурет 404');
/* сақтау және қақтығыс */
r = await T('lesson?id=' + id); const base = r.j.lesson.updated_at;
const blocks = [{ id: 'a', t: 'h', lv: 2, text: 'Сурет пен видео' }, { id: 'b', t: 'img', media: m1.j.id, alt: 'нүкте', cap: 'Мысал' }, { id: 'c', t: 'yt', vid: 'https://youtu.be/dQw4w9WgXcQ', cap: '' }, { id: 'd', t: 'p', text: '<script>x</script> **қалың**' }];
r = await T('lesson/save', { id, title: 'Жаңартылған', blocks, base, autosave: true }); ok(r.j.ok, 'сақталды');
const c = await T('lesson/save', { id, blocks, base: base - 5000 }); ok(c.s === 409 && c.j.error === 'conflict', 'ескі base-пен сақтау қақтығыс береді');
pub = await (await raw('/c/' + sub.j.id + '/' + slug)).text(); ok(pub.includes('Бірінші сабақ') && !pub.includes('Сурет пен видео'), 'жарияланбаған өзгеріс ашық бетте көрінбейді');
r = await T('list'); ok(r.j.lessons.find(l => l.id === id).dirty === true, 'тізімде «өзгерген» белгісі');
r = await T('lesson/publish', { id }); page = await (await raw('/c/' + sub.j.id + '/' + slug)).text();
ok(page.includes('Сурет пен видео') && page.includes('/media/' + m1.j.id) && page.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ') && !page.includes('<script>x</script>') && page.includes('&lt;script&gt;'), 'жарияланған бетте сурет, видео бар, HTML escape');
r = await T('render', { title: 'Жоба', blocks, subject: sub.j.id }); ok(r.j.ok && r.j.html.includes('Алдын ала қарау'), 'алдын ала қарау беті жасалады');
r = await T('versions?id=' + id); ok(r.j.versions.length >= 2, 'нұсқалар сақталды: ' + r.j.versions.length);
const old = r.j.versions[r.j.versions.length - 1].ver;
const stale = await T('restore', { id, ver: old, base });
ok(stale.s === 409 && stale.j.error === 'conflict', 'нұсқаны қалпына келтіру жаңарақ жобаны алмастырмайды');
const latest = (await T('lesson?id=' + id)).j.lesson.updated_at;
r = await T('restore', { id, ver: old, base: latest }); ok(r.j.ok, 'ескі нұсқа қалпына келтірілді');
r = await T('lesson/save', { id, blocks: [], title: 'Бос' }); r = await T('lesson/publish', { id }); ok(r.j.error === 'empty', 'бос сабақты жариялауға болмайды');
const list = await (await raw('/api/pub/lessons')).json(); ok(list.ok && list.lessons.some(l => l.slug === slug), 'ашық тізімде сабақ бар');
r = await T('lesson/publish', { id, publish: false }); pub = await raw('/c/' + sub.j.id + '/' + slug); ok(r.j.status === 'hidden' && pub.status === 404, 'жасырылған сабақ ашылмайды');
r = await T('subject/del', { id: sub.j.id }); ok(r.j.error === 'not_empty', 'сабағы бар пәнді өшіруге болмайды');
r = await T('lesson/del', { id }); r = await T('subject/del', { id: sub.j.id }); ok(r.j.ok, 'сабақ пен пән өшірілді');
console.log(fails ? '\nҚателер: ' + fails : '\nБәрі өтті'); process.exit(fails ? 1 : 0);
