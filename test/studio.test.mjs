/* Студия: блоктарды тексеру және қауіпсіз HTML рендері. node test/studio.test.mjs */
import { sanitizeBlocks, renderBlock, renderBody, lessonPage, inline, richText, ytId, slugify } from '../src/studio-render.js';
import { sniffImage } from '../src/studio.js';
import { sanitizeTasks, validateTasks, compileDef, buildData } from '../src/data-lessons.js';
import { gradeQuizItem } from '../src/py.js';
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };

ok(ytId('https://youtu.be/dQw4w9WgXcQ?t=5') === 'dQw4w9WgXcQ' && ytId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x') === 'dQw4w9WgXcQ' && ytId('https://www.youtube.com/shorts/dQw4w9WgXcQ') === 'dQw4w9WgXcQ' && ytId('https://evil.com/watch?v=dQw4w9WgXcQ') === '' && ytId('javascript:alert(1)') === '', 'YouTube сілтемелері: дұрыстары танылады, бөгде домен қабылданбайды');
ok(inline('<script>alert(1)</script> **қалың** `код`').includes('&lt;script&gt;') && !inline('<img onerror=x>').includes('<img'), 'мәтіндегі HTML escape болады');
ok(!inline('[x](javascript:alert(1))').includes('<a '), 'javascript: сілтемесі жасалмайды');
ok(inline('[Сайт](https://a.kz/x?y=1)').includes('rel="noopener noreferrer"'), 'сыртқы сілтеме noopener-мен');
ok(richText('- а\n- б').startsWith('<ul>') && richText('1. а\n2. б').startsWith('<ol>') && richText('а\n\nб').split('<p>').length === 3, 'тізім мен абзац');
const bad = sanitizeBlocks([{ t: 'script', text: 'x' }, { t: 'p', text: 'a'.repeat(9000) }, { t: 'img', media: 'abc' }, { t: 'img', media: 7, alt: '<b>' }, { t: 'yt', url: 'https://youtu.be/dQw4w9WgXcQ' }, { t: 'note', kind: 'zzz', text: 'q' }, null, 5]);
ok(bad.length === 5 && bad[0].text.length === 8000 && bad[1].media === 0 && bad[2].media === 7 && bad[3].vid === 'dQw4w9WgXcQ' && bad[4].kind === 'remember', 'блоктар тазаланады, белгісіз түр тасталады');
ok(sanitizeBlocks(Array.from({ length: 500 }, () => ({ t: 'hr' }))).length === 200, 'блок саны шектеледі');
ok(renderBlock({ t: 'img', media: 0 }) === '' && renderBlock({ t: 'yt', vid: '' }) === '', 'бос сурет пен видео шықпайды');
const img = renderBlock({ t: 'img', media: 12, alt: 'a"b', cap: 'x' });
ok(img.includes('src="/media/12"') && img.includes('alt="a&quot;b"') && img.includes('loading="lazy"'), 'сурет: /media/<id>, alt escape, жалқау жүктеу');
ok(renderBlock({ t: 'yt', vid: 'dQw4w9WgXcQ' }).includes('youtube-nocookie.com/embed/dQw4w9WgXcQ'), 'YouTube nocookie embed');
ok(renderBlock({ t: 'code', code: '<b>if x:</b>' }).includes('&lt;b&gt;'), 'код блогы escape');
const tb = renderBlock({ t: 'table', rows: [['a', 'b'], ['1', '<i>2']], head: true });
ok(tb.includes('<thead>') && tb.includes('&lt;i&gt;2'), 'кесте: тақырып және escape');
const body = renderBody([{ t: 'p', text: 'кіріспе' }, { t: 'h', lv: 2, text: 'Бірінші' }, { t: 'p', text: 'а' }, { t: 'h', lv: 3, text: 'кіші' }, { t: 'h', lv: 2, text: 'Екінші' }, { t: 'steps', items: ['x', 'y'] }]);
ok((body.match(/pl-card/g) || []).length === 3 && body.includes('<span class="ic">1</span>Бірінші') && body.includes('<span class="ic">2</span>Екінші') && body.includes('sl-h3'), 'h2 бойынша карточкаларға бөлінеді, нөмірленеді');
const page = lessonPage({ title: 'Тест <сабақ>', blocks: [{ t: 'p', text: 'Сәлем' }] }, { subject: { id: 'python', title: 'Python' } });
ok(page.includes('<title>Тест &lt;сабақ&gt; — Python</title>') && page.includes('/assets/studio-lesson.css') && !page.includes('<сабақ>'), 'бет тақырыбы escape, CSS қосылған');
ok(lessonPage({ title: 'x', blocks: [] }, { preview: true }).includes('Алдын ала қарау'), 'алдын ала қарауда белгі бар');
const rich = sanitizeBlocks([{ t:'p', section:'summary', doc:[
  {tag:'strong', children:[{tag:'span', style:{font:'Georgia', size:22, color:'#123456', position:'fixed'}, children:['Мәтін <svg>']}]},
  {tag:'a', href:'javascript:alert(1)', children:['Сілтеме']},
  {tag:'script', children:['x()']}
] }]);
const styled = renderBlock(rich[0]);
ok(styled.includes('font-family:Georgia;font-size:22px;color:#123456') && styled.includes('&lt;svg&gt;') && !/javascript:|position:|<script/.test(styled), 'пішімделген мәтін сақталады, еркін CSS пен қауіпті HTML өтпейді');
const dangerousTitle = '</script><script>alert(1)</script>';
const authored = lessonPage({ title:dangerousTitle, blocks:rich }, { task:{topic:'D1', items:[]} });
ok(!authored.includes(dangerousTitle) && authored.includes(String.fromCharCode(92) + 'u003c/script>') && authored.includes('Мәтін &lt;svg&gt;'), 'сабақ атауы сценарийді бұзбайды, қорытынды көрінеді');
const exact = sanitizeTasks({grading:'manual', tasks:[
  {title:'Бірінші',pts:34,items:[{k:'short',q:'Жауап?',answers:'Отыз төрт\n34'}]},
  {title:'Екінші',pts:66,items:[{k:'quiz',q:'Таңдаңыз',opts:['A','B'],correct:0}]}
]});
const def = compileDef(exact);
ok(!validateTasks(exact).length && def.noHw[1] === 34 && def.noHw[2] === 66 && def.itemPts.noHw[1][0] === 34, 'қолмен қойылған нақты балл сақталады');
const answer = buildData(exact,def,1)[0].items[0];
ok(gradeQuizItem(answer,'  ОТЫЗ   ТӨРТ ').frac === 1 && gradeQuizItem(answer,'35').frac === 0, 'қысқа жауап баламалары тексеріледі');
ok(slugify('Құрамды шарттар: and/or') === 'kuramdy-sharttar-and-or' && slugify('???') === 'sabaq', 'slug латынға ауысады');
ok(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))?.ext === 'jpg' && sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0]))?.ext === 'png' && sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')) === null && sniffImage(new Uint8Array(3)) === null, 'сурет түрі байттардан танылады, SVG қабылданбайды');
console.log(fails ? '\nҚателер: ' + fails : '\nБәрі өтті'); process.exit(fails ? 1 : 0);
