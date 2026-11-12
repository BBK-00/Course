/* Студия: бар (қолмен жасалған) сабақ беттерінің мәтінін өңдеу және пән бетіндегі тақырыптар тізімін оқу.
   Интерактив демолар мен тапсырмалар кодта қалады; тек мәтін (тақырып, түсіндірме, мақсат, қорытынды) ауыстырылады. Таза функциялар. */
import { inline, esc, sanitizeBlocks, renderBody, ytId } from './studio-render.js';

export const SUBJECT_DIRS = ['python', 'scratch', 'sandyq-adister', 'akt'];

const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/* ---------- Пәннің бас бетіндегі тақырыптар тізімі ---------- */
export function parseIndex(html, subject) {
  const out = [];
  const secs = [...html.matchAll(/<h3 class="sec-title"[^>]*>([\s\S]*?)<\/h3>/g)].map(m => ({ at: m.index, title: decode(m[1].replace(/<[^>]+>/g, '').trim()) }));
  for (const m of html.matchAll(/<li>\s*(<a class="topic"[^>]*>|<div class="topic [a-z]+"[^>]*>)([\s\S]*?)<\/li>/g)) {
    const inner = m[2], num = (inner.match(/<span class="num">(\d+)<\/span>/) || [])[1]; if (!num) continue;
    const href = (m[1].match(/href="([^"]+)"/) || [])[1] || '', t = (inner.match(/<span class="t">([\s\S]*?)<\/span>/) || [])[1] || '', d = (inner.match(/<span class="s">([\s\S]*?)<\/span>/) || [])[1] || '';
    const sec = secs.filter(s => s.at < m.index).pop();
    out.push({ num: +num, title: decode(t.replace(/<[^>]+>/g, '').trim()), descr: decode(d.replace(/<[^>]+>/g, '').trim()), open: !!href, path: href ? '/' + subject + '/' + href.replace(/\.html$/, '').replace(/^\.?\/?/, '') : '', section: sec ? sec.title : '', fallback: m[1].includes('data-theory-fallback') });
  }
  return out;
}

/* ---------- Бет мәтіндерін шығару және ауыстыру ---------- */
const ITEM_RE = /<h1[^>]*>([\s\S]*?)<\/h1>|<h2>(<span class="ic">[^<]*<\/span>)([\s\S]*?)<\/h2>|<p class="pl-lead">([\s\S]*?)<\/p>|<p>([\s\S]*?)<\/p>|<div class="pl-goal">(<b>[^<]*<\/b>)([\s\S]*?)<\/div>|<li><span>([\s\S]*?)<\/span><\/li>/g;
const SAFE_TAGS = /^(code|b|strong|i|em|br)$/;

export const htmlToMd = h => decode(h.replace(/<br\s*\/?>/g, '\n').replace(/<code>([\s\S]*?)<\/code>/g, '`$1`').replace(/<(b|strong)>([\s\S]*?)<\/\1>/g, '**$2**'));
export const mdToHtml = t => inline(t).replace(/\n/g, '<br>');

function scan(html) {
  const items = []; let i = 0;
  for (const m of html.matchAll(ITEM_RE)) {
    let kind, prefix = '', inner, from;
    if (m[1] !== undefined) { kind = 'h1'; inner = m[1]; from = m.index + m[0].indexOf(m[1]); }
    else if (m[3] !== undefined) { kind = 'h2'; prefix = m[2]; inner = m[3]; from = m.index + m[0].indexOf(m[3], m[0].indexOf(m[2]) + m[2].length); }
    else if (m[4] !== undefined) { kind = 'lead'; inner = m[4]; from = m.index + m[0].indexOf(m[4]); }
    else if (m[5] !== undefined) { kind = 'p'; inner = m[5]; from = m.index + 3; }
    else if (m[7] !== undefined) { kind = 'goal'; prefix = m[6]; inner = m[7]; from = m.index + m[0].indexOf(m[6]) + m[6].length; }
    else { kind = 'li'; inner = m[8]; from = m.index + 10; }
    const tags = [...inner.matchAll(/<\/?([a-z0-9]+)/gi)].map(t => t[1].toLowerCase());
    const md = htmlToMd(inner), editable = tags.every(t => SAFE_TAGS.test(t)) && mdToHtml(md) === inner && inner.trim().length > 0;
    items.push({ i: i++, kind, inner, md, editable, from, to: from + inner.length });
  }
  return items;
}

/* ---------- Беттегі суреттер мен YouTube видеолар (id 1000+) ---------- */
const IMG_RE = /<img\b[^>]*>/g, YT_RE = /<iframe\b[^>]*youtube-nocookie\.com\/embed\/[\w-]{11}[^>]*><\/iframe>/g;
const attr = (tag, name) => { const m = tag.match(new RegExp('\\b' + name + '="([^"]*)"')); return m ? decode(m[1]) : ''; };
const setAttr = (tag, name, val) => { const re = new RegExp('\\b' + name + '="[^"]*"'); return re.test(tag) ? tag.replace(re, () => name + '="' + esc(val) + '"') : tag.replace(/^<(\w+)/, (x, t) => '<' + t + ' ' + name + '="' + esc(val) + '"'); };
export const mediaOf = tag => /^<iframe/.test(tag) ? { vid: (tag.match(/embed\/([\w-]{11})/) || [])[1] || '' } : { src: attr(tag, 'src'), alt: attr(tag, 'alt') };
function scanMedia(html) {
  const list = [...html.matchAll(IMG_RE)].map(m => ({ kind: 'img', m })).concat([...html.matchAll(YT_RE)].map(m => ({ kind: 'yt', m }))).sort((a, b) => a.m.index - b.m.index);
  return list.map((x, k) => ({ i: 1000 + k, kind: x.kind, inner: x.m[0], from: x.m.index, to: x.m.index + x.m[0].length, editable: true, media: mediaOf(x.m[0]), md: '' }));
}

/* Редакторға көрсетілетін тізім (позициясыз) және бөлім белгісі */
export function extractItems(html) {
  let sec = '';
  return [...scan(html), ...scanMedia(html)].sort((a, b) => a.from - b.from).map(it => { if (it.kind === 'h2') sec = it.md; return { i: it.i, kind: it.kind, md: it.md, inner: it.inner, editable: it.editable, media: it.media, section: it.kind === 'h2' ? '' : sec }; });
}

/* Өңдеулерді қолдану: edits = { items:{ [i]: {o:түпнұсқа inner, h:жаңа inner} }, extra:[блоктар] }. Бет кодта өзгерсе, түпнұсқа сәйкес келмейді де, өңдеу өткізіледі. */
export function applyEdits(html, edits) {
  if (!edits) return html;
  const items = [...scan(html), ...scanMedia(html)].sort((a, b) => a.from - b.from), it = edits.items || {}; let out = '', pos = 0;
  items.forEach(x => { const e = it[x.i]; if (e && e.o === x.inner && typeof e.h === 'string') { out += html.slice(pos, x.from) + e.h; pos = x.to; } });
  out += html.slice(pos);
  const extra = sanitizeBlocks(edits.extra);
  if (extra.length) {
    const card = '\n<div class="sl-extra">' + renderBody(extra) + '</div>\n';
    const link = '<link rel="stylesheet" href="/assets/studio-lesson.css?v=1">';
    out = out.replace('</head>', link + '</head>');
    const k = out.indexOf('<div class="pl-next">');
    out = k >= 0 ? out.slice(0, k) + card + out.slice(k) : out.replace('</main>', card + '</main>');
  }
  return out;
}

/* Клиенттен келген өңдеулерді тексеру: тек қазіргі беттегі өңделетін элементтерге */
export function sanitizeEdits(html, input) {
  const items = [...scan(html), ...scanMedia(html)], res = { items: {}, extra: sanitizeBlocks(input && input.extra) };
  const src = (input && input.items) || {};
  items.forEach(x => {
    if (x.media) {   /* сурет не видео: тек /media/<id> немесе түпнұсқа сурет, YouTube id */
      const e = src[x.i]; if (!e || typeof e !== 'object') return; let tag = x.inner;
      if (x.kind === 'img') { const nsrc = /^\/media\/\d+$/.test(String(e.src)) || e.src === x.media.src ? String(e.src) : x.media.src, nalt = String(e.alt === undefined ? x.media.alt : e.alt).slice(0, 200); tag = setAttr(setAttr(tag, 'src', nsrc), 'alt', nalt); }
      else { const v = ytId(e.vid); if (v) tag = tag.replace(/embed\/[\w-]{11}/, 'embed/' + v); }
      if (tag !== x.inner) res.items[x.i] = { o: x.inner, h: tag }; return;
    } const e = src[x.i]; if (!x.editable || e === undefined || e === null) return; const md = String(typeof e === 'string' ? e : e.md || '').slice(0, 4000); if (md !== x.md) res.items[x.i] = { o: x.inner, h: mdToHtml(md) }; });
  return res;
}
export { esc };
