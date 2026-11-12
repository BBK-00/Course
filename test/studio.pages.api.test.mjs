/* Студия: пән тақырыптары, бар сабақтың мәтінін өңдеу, тақырып карточкасы. ТЕК жергілікті сервер (wrangler dev). */
if (process.env.BASE && !/127.0.0.1|localhost/.test(process.env.BASE)) { console.log('Тікелей сайтта тест жүргізуге болмайды.'); process.exit(1); }
const B = process.env.BASE || 'http://127.0.0.1:8787';
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const raw = (p, o) => fetch(B + p, o);
const call = async (path, body, tok, method) => { const r = await raw('/api/' + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json() }; };
const TT = (await call('teacher/login', { password: process.env.PASS || 'test123' })).j.token;
const T = (p, b, m) => call('teacher/studio/' + p, b, TT, m);
const PATH = '/python/09-kuramdy-shart';

let r = await T('topics?subject=python'); const tp = r.j.topics;
ok(r.j.ok && tp.length === 24 && tp.every(t => t.path), 'Python: 24 тақырыптың да теория беті бар');
ok(tp.find(t => t.num === 9).path === PATH && tp.find(t => t.num === 1).section.startsWith('I бөлім'), '9-тақырып жолы және бөлім атауы');
r = await T('topics?subject=akt'); ok(r.j.topics.length === 36, 'АКТ: 36 тақырып');
r = await T('topics?subject=sandyq-adister'); ok(r.j.topics.length === 15 && r.j.topics.find(t => t.num === 6).state === 'code', 'Сандық әдістер: 15 тақырып, 6-ы кодта');

/* бар сабақтың мәтінін өңдеу */
const orig = await (await raw(PATH)).text();
r = await T('page?path=' + encodeURIComponent(PATH)); const items = r.j.items;
const h1 = items.find(i => i.kind === 'h1'); ok(r.j.ok && items.length > 15 && h1.editable && h1.md === 'Құрамды шарттар: and, or, not', 'беттің өңделетін мәтіндері табылды: ' + items.length);
ok((await T('page?path=' + encodeURIComponent('/python/index'))).s === 404 && (await T('page?path=' + encodeURIComponent('/python/zzz'))).s === 404 && (await T('page?path=' + encodeURIComponent('/../src/index'))).s === 404, 'бөгде жолдар қабылданбайды');
const lead = items.find(i => i.kind === 'lead' && i.editable);
r = await T('page/save', { path: PATH, items: { [h1.i]: 'Жаңа **атау** <script>x</script>', [lead.i]: lead.md }, extra: [{ t: 'p', text: 'Қосымша **мәтін**' }, { t: 'yt', url: 'https://youtu.be/dQw4w9WgXcQ' }] });
ok(r.j.ok && r.j.changed === 1 && r.j.extra === 2, 'өңдеу сақталды (өзгермеген мәтін есептелмейді)');
let page = await (await raw(PATH)).text();
ok(page.includes('Жаңа <strong>атау</strong> &lt;script&gt;x&lt;/script&gt;') && !page.includes('<script>x</script>') && page.includes('Қосымша <strong>мәтін</strong>') && page.includes('youtube-nocookie') && page.includes('studio-lesson.css'), 'өңделген бет ашық беріледі, HTML escape, қосымша блоктар бар');
ok(page.includes('py-demos9.js') && page.includes('data-python-practice="9"'), 'демолар мен өзіндік жаттығу сақталған');
r = await T('page?path=' + encodeURIComponent(PATH)); ok(r.j.items.find(i => i.i === h1.i).md.startsWith('Жаңа **атау**') && r.j.items.find(i => i.i === h1.i).orig === h1.md && r.j.extra.length === 2, 'редактор қайта ашқанда өңдеуді көрсетеді');
r = await T('page/render', { path: PATH, items: { [h1.i]: 'Алдын ала' }, extra: [] }); ok(r.j.ok && r.j.html.includes('Алдын ала') && !r.j.html.includes('Жаңа <strong>атау'), 'алдын ала қарау сақтамай жасалады');
r = await T('page/save', { path: PATH, items: {}, extra: [] }); page = await (await raw(PATH)).text(); ok(r.j.ok && page === orig, 'бәрін алып тастасақ, бет түпнұсқаға толық оралады');

/* беттегі сурет пен видео */
{
  const AK = '/akt/02-kompyuter', YP = '/python/07-if-operatory';
  let q = await T('page?path=' + encodeURIComponent(AK)); const imgs = q.j.items.filter(i => i.kind === 'img');
  ok(imgs.length === 2 && imgs[0].media.src.includes('akt2-arhitektura') && imgs[0].media.alt.includes('Инфографика'), 'АКТ 2: бетте 2 сурет табылды (сурет жолы мен сипаты)');
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  const up = await (await raw('/api/teacher/studio/media', { method: 'POST', headers: { Authorization: 'Bearer ' + TT, 'Content-Type': 'application/octet-stream' }, body: png })).json();
  const orig2 = await (await raw(AK)).text();
  r = await T('page/save', { path: AK, items: { [imgs[0].i]: { src: '/media/' + up.id, alt: 'Жаңа сурет' }, [imgs[1].i]: { src: 'https://evil.com/x.png', alt: 'a"b' } }, extra: [] });
  let pg = await (await raw(AK)).text();
  ok(r.j.ok && pg.includes('src="/media/' + up.id + '"') && pg.includes('alt="Жаңа сурет"') && !pg.includes('evil.com') && pg.includes('akt2-programmalyk.webp'), 'сурет R2-ге ауыстырылды, бөгде сілтеме қабылданбады');
  ok(pg.includes('alt="a&quot;b"'), 'alt атрибуты escape болды');
  q = await T('page?path=' + encodeURIComponent(AK)); ok(q.j.items.find(i => i.i === imgs[0].i).media.src === '/media/' + up.id && q.j.items.find(i => i.i === imgs[0].i).orig.src.includes('akt2-arhitektura'), 'редактор ауыстырылған суретті және түпнұсқаны көрсетеді');
  await T('page/save', { path: AK, items: {}, extra: [] }); ok((await (await raw(AK)).text()) === orig2, 'түпнұсқаға қайтарғанда бет бастапқы қалпына келеді');
  q = await T('page?path=' + encodeURIComponent(YP)); const yt = q.j.items.find(i => i.kind === 'yt'); ok(yt && yt.media.vid === 'Gf6m1AhTWjc', 'Python 7: YouTube видео табылды');
  const orig3 = await (await raw(YP)).text();
  await T('page/save', { path: YP, items: { [yt.i]: { vid: 'https://youtu.be/dQw4w9WgXcQ' } }, extra: [] }); pg = await (await raw(YP)).text();
  ok(pg.includes('embed/dQw4w9WgXcQ') && !pg.includes('embed/Gf6m1AhTWjc'), 'видео ауыстырылды');
  await T('page/save', { path: YP, items: { [yt.i]: { vid: 'javascript:alert(1)' } }, extra: [] }); pg = await (await raw(YP)).text();
  ok(pg === orig3, 'жарамсыз видео сілтемесі қабылданбайды');
}

/* тақырып карточкасы мен жаңа тақырыпты жасау */
r = await T('topic/save', { subject: 'python', num: 1, title: 'IDE-мен танысу (жаңа)', descr: 'Қысқа сипаттама' }); ok(r.j.ok, 'карточка атауы сақталды');
r = await T('topics?subject=python'); ok(r.j.topics.find(t => t.num === 1).title === 'IDE-мен танысу (жаңа)' && r.j.topics.find(t => t.num === 1).descr === 'Қысқа сипаттама', 'тізімде жаңа атау көрінеді');
const nl = await T('lesson/new', { subject: 'python', title: 'IDE-мен танысу (жаңа)', template: 'theory', topic_num: 1 }); ok(nl.j.ok, 'тақырыпқа Студия сабағы жасалды');
r = await T('topics?subject=python'); ok(r.j.topics.find(t => t.num === 1).state === 'studio', '1-тақырып күйі: студияда жасалған');
await T('lesson/publish', { id: nl.j.id });
const pub = await (await raw('/api/pub/lessons')).json(); ok(pub.lessons.some(l => l.topic_num === 1 && l.subject === 'python') && pub.meta.some(m => m.num === 1), 'ашық тізімде topic_num және карточка атауы бар');
ok((await (await raw('/python/index.html')).text()).includes('studio-topics.js'), 'пән бетінде автотолтыру скрипті бар');
await T('lesson/del', { id: nl.j.id }); await T('topic/save', { subject: 'python', num: 1, title: '', descr: null });
r = await T('topics?subject=python'); ok(r.j.topics.find(t => t.num === 1).state === 'code', 'Студия сабағын алып тастағанда теория беті сақталады');
console.log(fails ? '\nҚателер: ' + fails : '\nБәрі өтті'); process.exit(fails ? 1 : 0);
