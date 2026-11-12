/* Студия: сабақ блоктарын тексеру және қауіпсіз HTML-ге айналдыру. Таза функциялар (D1/R2 жоқ), сондықтан тестке оңай.
   Блок: { id, t:'h'|'p'|'img'|'yt'|'note'|'code'|'table'|'steps'|'hr', ... }. Шикі HTML қабылданбайды: бәрі escape-пен шығады. */

import {CODE_LANGS, sanitizeDocument, renderDocument, documentText, mediaLayout, mediaStyle, photoStyle} from '../assets/studio-format.js';

export const BUILTIN_SUBJECTS = [
  { id: 'python', title: 'Python', icon: '🐍', path: '/python/' },
  { id: 'scratch', title: 'Scratch', icon: '🧩', path: '/scratch/' },
  { id: 'sandyq-adister', title: 'Сандық әдістер', icon: '🔢', path: '/sandyq-adister/' },
  { id: 'akt', title: 'АКТ', icon: '💻', path: '/akt/' }
];
export const BLOCK_TYPES = ['h', 'p', 'img', 'yt', 'note', 'code', 'table', 'steps', 'hr'];
export const NOTE_KINDS = { remember: 'Есте сақта', mistake: 'Жиі қате', tip: 'Кеңес', info: 'Назар аудар' };
const LIM = { blocks: 200, text: 8000, code: 6000, rows: 30, cols: 8, cell: 200, steps: 20, title: 120, alt: 200 };

export const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const str = (v, n) => String(v === undefined || v === null ? '' : v).slice(0, n);

/* YouTube сілтемесінен 11 таңбалы id алу (youtu.be, watch?v=, embed, shorts) */
export function ytId(u) {
  const s = String(u || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#/]|$)/i);
  return m ? m[1] : '';
}

/* Қысқа белгілеу: **қалың**, `код`, [мәтін](https://...). Алдымен escape, содан кейін белгілер ауыстырылады. */
export function inline(text) {
  let t = esc(text);
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)"'<>]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return t;
}
/* Абзац: бос жолмен бөлінеді; "- " жолдары тізім, "1. " нөмірленген тізім. */
export function richText(text) {
  const out = [];
  String(text || '').replace(/\r/g, '').split(/\n{2,}/).forEach(par => {
    const lines = par.split('\n').filter(l => l.trim());
    if (!lines.length) return;
    if (lines.every(l => /^\s*[-•]\s+/.test(l))) out.push('<ul>' + lines.map(l => '<li>' + inline(l.replace(/^\s*[-•]\s+/, '')) + '</li>').join('') + '</ul>');
    else if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) out.push('<ol>' + lines.map(l => '<li>' + inline(l.replace(/^\s*\d+[.)]\s+/, '')) + '</li>').join('') + '</ol>');
    else out.push('<p>' + lines.map(inline).join('<br>') + '</p>');
  });
  return out.join('');
}

/* Клиенттен келген блоктарды тексеріп, тек рұқсат етілген өрістерді қалдыру */
export function sanitizeBlocks(input) {
  const list = Array.isArray(input) ? input.slice(0, LIM.blocks) : [], out = [];
  list.forEach((b, i) => {
    if (!b || typeof b !== 'object' || !BLOCK_TYPES.includes(b.t)) return;
    const o = { id: str(b.id || 'b' + i, 24).replace(/[^\w-]/g, ''), t: b.t };
    if (b.section === 'review' || b.section === 'summary') o.section = b.section;
    if (b.t === 'h') { o.text = str(b.text, LIM.title); o.lv = b.lv === 3 ? 3 : 2; }
    else if (b.t === 'p') {
      if (Array.isArray(b.doc)) o.doc = sanitizeDocument(b.doc);
      else o.text = str(b.text, LIM.text);
    }
    else if (b.t === 'img') { o.media = Number.isInteger(b.media) && b.media > 0 ? b.media : 0; o.alt = str(b.alt, LIM.alt); o.cap = str(b.cap, LIM.alt); Object.assign(o, mediaLayout(b)); }
    else if (b.t === 'yt') { o.vid = ytId(b.vid || b.url); o.cap = str(b.cap, LIM.alt); Object.assign(o, mediaLayout(b)); }
    else if (b.t === 'note') { o.kind = NOTE_KINDS[b.kind] ? b.kind : 'remember'; o.text = str(b.text, LIM.text); }
    else if (b.t === 'code') { o.code = str(b.code, LIM.code); o.cap = str(b.cap, LIM.alt); if (CODE_LANGS.includes(b.lang)) o.lang = b.lang; }
    else if (b.t === 'table') { o.rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, LIM.rows).map(r => (Array.isArray(r) ? r : []).slice(0, LIM.cols).map(c => str(c, LIM.cell))); o.head = b.head !== false; }
    else if (b.t === 'steps') o.items = (Array.isArray(b.items) ? b.items : []).slice(0, LIM.steps).map(x => str(x, 600));
    out.push(o);
  });
  return out;
}

/* Бір блоктың HTML-і. Сурет: /media/<id>. */
export function renderBlock(b) {
  switch (b.t) {
    case 'h': return b.text ? '<h3 class="sl-h3">' + inline(b.text) + '</h3>' : '';
    case 'p': return '<div class="sl-text">' + (Array.isArray(b.doc) ? renderDocument(b.doc) : richText(b.text)) + '</div>';
    case 'img': return b.media ? '<figure class="sl-fig" style="' + mediaStyle(b) + '"><img src="/media/' + b.media + '" alt="' + esc(b.alt) + '" style="' + photoStyle(b) + '" loading="lazy" decoding="async">' + (b.cap ? '<figcaption>' + inline(b.cap) + '</figcaption>' : '') + '</figure>' : '';
    case 'yt': return b.vid ? '<figure class="sl-fig sl-yt" style="' + mediaStyle(b) + '"><div class="sl-ratio"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(b.vid) + '?rel=0" title="' + esc(b.cap || 'Видео') + '" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' + (b.cap ? '<figcaption>' + inline(b.cap) + '</figcaption>' : '') + '</figure>' : '';
    case 'note': return '<aside class="sl-note sl-' + esc(b.kind) + '"><b>' + esc(NOTE_KINDS[b.kind] || '') + '</b>' + richText(b.text) + '</aside>';
    case 'code': return '<figure class="sl-fig">' + '<pre class="sl-code" tabindex="0"><code>' + esc(b.code) + '</code></pre>' + (b.cap ? '<figcaption>' + inline(b.cap) + '</figcaption>' : '') + '</figure>';
    case 'table': {
      if (!b.rows || !b.rows.length) return '';
      const rows = b.rows, head = b.head !== false ? rows[0] : null, body = head ? rows.slice(1) : rows;
      return '<div class="sl-twrap"><table class="sl-table">' + (head ? '<thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead>' : '') + '<tbody>' + body.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    case 'steps': return b.items && b.items.length ? '<ol class="sl-steps">' + b.items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ol>' : '';
    case 'hr': return '<hr class="sl-hr">';
    default: return '';
  }
}

export function blockText(block) {
  return Array.isArray(block.doc) ? documentText(block.doc) : String(block.text || '');
}

export function reviewQuestions(blocks) {
  return blocks.filter(block => block.section === 'review' && block.t === 'steps')
    .flatMap(block => block.items || []).map(text => String(text).trim()).filter(Boolean).slice(0, 12);
}

/* Блоктарды карточкаларға бөлу: әр «2-деңгей тақырып» жаңа нөмірленген карточка ашады */
export function renderBody(blocks) {
  const cards = [{ title: '', html: '' }];
  (blocks || []).forEach(b => {
    if (b.t === 'h' && b.lv !== 3) { cards.push({ title: b.text, html: '' }); return; }
    cards[cards.length - 1].html += renderBlock(b);
  });
  let n = 0;
  return cards.filter(c => c.title || c.html).map(c => '<section class="pl-card sl-card">' + (c.title ? '<h2><span class="ic">' + (++n) + '</span>' + inline(c.title) + '</h2>' : '') + c.html + '</section>').join('\n');
}

const HEAD = (title, desc) => '<!doctype html>\n<html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  + '<title>' + esc(title) + '</title>' + (desc ? '<meta name="description" content="' + esc(desc) + '">' : '')
  + '<link rel="stylesheet" href="/assets/lesson.css"><link rel="stylesheet" href="/assets/py-lesson.css"><link rel="stylesheet" href="/assets/studio-lesson.css?v=2"><link rel="stylesheet" href="/assets/student.css?v=20261111"></head>';

/* Сабақ беті. opts: { subject:{id,title}, preview:bool, task:{ topic, items:[{title,minutes}], hw:{on} } }
   task болса, 3 қойынды (Түсіндіру / Тапсырмалар / Қорытынды) шығады және тапсырмалар py-work.js арқылы жұмыс істейді. */
export function lessonPage(lesson, opts = {}) {
  const sub = opts.subject || {}, title = lesson.title || 'Атаусыз сабақ', T = opts.task;
  const back = '/c/' + encodeURIComponent(sub.id || '');
  const blocks = lesson.blocks || [];
  const theory = blocks.filter(block => !block.section);
  const review = blocks.filter(block => block.section === 'review');
  const summary = blocks.filter(block => block.section === 'summary');
  const first = theory.find(block => block.t === 'p' && blockText(block).trim());
  const desc = first ? blockText(first).slice(0, 160) : '';
  const hero = '<div class="pl-card sl-hero"><h1>' + esc(title) + '</h1></div>';
  const foot = '<footer class="pl-foot">© Бақытжанов Бекет Қайратұлы · <a href="/">Басты бет</a></footer>';
  const banner = opts.preview ? '<div class="sl-banner">Алдын ала қарау: жарияланбаған нұсқа' + (T && T.note ? '. ' + esc(T.note) : '') + '</div>' : '';
  if (!T || opts.preview) {
    const extra = opts.preview && T ? '<div class="pl-card"><h2>Тапсырмалар</h2><ol class="sl-steps">' + T.items.map(i => '<li>' + esc(i.title) + ' · ' + i.minutes + ' минут' + (i.points ? ' · ' + i.points + ' балл' : '') + '</li>').join('') + (T.hw?.on ? '<li>Үй жұмысы · 25 балл</li>' : '') + '</ol></div>' : '';
    const sections = [
      ['theory', theory, 'Түсіндіру'], ['review', review, 'Бекіту'], ['summary', summary, 'Қорытынды']
    ];
    const visible = opts.preview ? sections.filter(([key]) => key === (opts.section || 'theory')) : sections.filter(([, items]) => items.length);
    const content = visible.map(([key, items, name]) =>
      (key !== 'theory' ? '<h2 class="sl-section-heading">' + name + '</h2>' : '') +
      (items.length ? renderBody(items) : '<p class="sl-empty">Бұл бөлім әлі бос.</p>')).join('');
    return HEAD(title + ' — ' + (sub.title || 'Сабақ'), desc) + '<body class="student-lesson pl sl-page">'
      + '<header class="topbar pl-top"><div class="topbar-in"><a class="pl-back" href="' + back + '" aria-label="' + esc(sub.title || 'Пән') + '">←<span class="pl-bk"> ' + esc(sub.title || 'Пән') + '</span></a><div class="pl-brand"><span>' + esc(title) + '</span></div></div></header>'
      + banner + '<main class="pl-wrap">' + hero + (opts.section === 'tasks' ? extra || '<p class="sl-empty">Тапсырма әлі қосылмаған.</p>' : content) + '</main>' + foot + '</body></html>';
  }
  const ov = T.items.map((i, k) => '<li><span class="p4-task-number">' + (k + 1) + '</span><div><b>' + esc(i.title) + '</b><span>' + i.minutes + ' минут</span></div></li>').join('')
    + (T.hw && T.hw.on ? '<li><span class="p4-task-number">' + (T.items.length + 1) + '</span><div><b>Үй жұмысы</b><span>Фото · 25 балл</span></div></li>' : '');
  return HEAD(title + ' — ' + (sub.title || 'Сабақ'), desc).replace('</head>', '<link rel="stylesheet" href="/assets/py-work.css?v=20261106-queue"><link rel="stylesheet" href="/assets/py-lesson4.css?v=20261106-compact"></head>') + '<body class="student-lesson pl p4 sl-page">'
    + '<header class="topbar pl-top"><div class="topbar-in"><a class="pl-back" href="' + back + '" aria-label="' + esc(sub.title || 'Пән') + '">←<span class="pl-bk"> ' + esc(sub.title || 'Пән') + '</span></a><div class="pl-brand"><span>' + esc(title) + '</span></div>'
    + '<nav class="pl-seg" role="tablist" aria-label="Сабақ бөлімдері"><button type="button" role="tab" data-tab="teo" class="on">1 Түсіндіру</button><button type="button" role="tab" data-tab="task">2 Тапсырмалар</button><button type="button" role="tab" data-tab="sum">3 Қорытынды</button></nav></div></header>'
    + '<main class="pl-wrap"><section class="pl-pane" id="teo" data-pane="teo">' + hero + renderBody(theory) + '<div class="pl-next"><button type="button" class="btn primary big" data-go="task">Тапсырмаларға өту →</button></div></section>'
    + '<section class="pl-pane pl-tasks" id="task" data-pane="task" hidden><div class="pl-card p4-task-overview"><div class="p4-task-title"><h2><span class="ic">2</span>Тапсырмалар</h2><span class="p4-task-total">Барлығы 100 балл</span></div><ol class="p4-task-map" aria-label="Тапсырмалар">' + ov + '</ol></div><div id="pyTasks"></div><div id="pyPreview"></div></section>'
    + '<section class="pl-pane" id="sum" data-pane="sum" hidden>'
    + (review.length ? '<h2 class="sl-section-heading">Бекіту</h2>' + renderBody(review) : '')
    + (summary.length ? '<h2 class="sl-section-heading">Қорытынды</h2>' + renderBody(summary) : '')
    + '<div class="pl-card"><h2><span class="ic">3</span>Сабақ нәтижесі</h2><p class="pl-lead">Нәтижеңді және қайталауға тұратын тақырыптарды көр.</p><div class="stepbar"><button type="button" class="btn primary" id="pySumBtn">📊 Нәтижемді көрсету</button></div><div id="pySum"></div></div></section></main>' + foot
    + '<script src="/assets/lesson-core.js?v=20261111"></script><script src="/assets/join.js?v=20261112"></script><script src="/assets/code-editor.js"></script><script src="/assets/py-work.js?v=20261108-d"></script>'
    + '<script>(function(){const{$}=L,panes=[...document.querySelectorAll(".pl-pane")],tabs=[...document.querySelectorAll(".pl-seg button")];function go(id,push){if(!panes.some(p=>p.id===id))id="teo";panes.forEach(p=>{p.hidden=p.id!==id});tabs.forEach(b=>{const on=b.dataset.tab===id;b.classList.toggle("on",on);b.setAttribute("aria-selected",on?"true":"false")});if(push!==false){try{history.replaceState(null,"","#"+id)}catch(e){}}window.scrollTo(0,0)}tabs.forEach(b=>b.addEventListener("click",()=>go(b.dataset.tab)));document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));const hash=(location.hash||"").slice(1);go(panes.some(p=>p.id===hash)?hash:' + JSON.stringify(opts.initialTab || "teo") + ',false);window.Join.mount({title:' + JSON.stringify(title).replace(/</g, '\\u003c') + '});window.PyWork.mount({topic:' + JSON.stringify(T.topic) + ',tasks:$("#pyTasks"),summary:$("#pySum"),summaryBtn:$("#pySumBtn")});{const tk=$("#pyTasks"),pv=$("#pyPreview"),sync=()=>{pv.hidden=!!tk.querySelector(".py-bar")};new MutationObserver(sync).observe(tk,{childList:true,subtree:true});sync()}})();</script></body></html>';
}

/* Пән беті немесе жалпы тізім */
export function listPage(title, intro, items, back) {
  const cards = items.length ? '<ol class="sl-list">' + items.map(i => '<li><a class="sl-item" href="' + esc(i.href) + '"><span class="sl-ico">' + esc(i.icon || '•') + '</span><span class="sl-it"><b>' + esc(i.title) + '</b>' + (i.sub ? '<small>' + esc(i.sub) + '</small>' : '') + '</span><span class="sl-go">→</span></a></li>').join('') + '</ol>' : '<p class="sl-empty">Әзірге жарияланған сабақ жоқ.</p>';
  return HEAD(title) + '<body class="student-lesson pl sl-page"><header class="topbar pl-top"><div class="topbar-in"><a class="pl-back" href="' + esc(back || '/') + '">←<span class="pl-bk"> Артқа</span></a><div class="pl-brand"><span>' + esc(title) + '</span></div></div></header>'
    + '<main class="pl-wrap"><div class="pl-card sl-hero"><h1>' + esc(title) + '</h1>' + (intro ? '<p>' + esc(intro) + '</p>' : '') + '</div><div class="pl-card">' + cards + '</div></main>'
    + '<footer class="pl-foot">© Бақытжанов Бекет Қайратұлы · <a href="/">Басты бет</a></footer></body></html>';
}

/* Атаудан slug: қазақша әріптерді латынға ауыстырады */
const TR = { а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', қ: 'k', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f', х: 'h', һ: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'y', і: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export const slugify = s => String(s || '').toLowerCase().split('').map(c => TR[c] !== undefined ? TR[c] : c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'sabaq';
