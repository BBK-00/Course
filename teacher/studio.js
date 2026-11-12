/* Студия: сабақ жасау редакторы. Токен — оқытушы панелімен ортақ (sessionStorage 'ttok'). Мәтін тек textContent арқылы шығады. */
import { richEditor, codeEditor } from './studio-editor.js';
import { documentText, mediaLayout, mediaStyle, photoStyle } from '../assets/studio-format.js';

(function(){
'use strict';
const $ = s => document.querySelector(s);
const h = (tag, a, kids) => { const e = document.createElement(tag); for (const k in (a || {})) { const v = a[k]; if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else if (k === 'on') { for (const ev in v) e.addEventListener(ev, v[ev]); } else if (v === true) e.setAttribute(k, ''); else if (v !== false && v !== null && v !== undefined) e.setAttribute(k, v); } [].concat(kids || []).forEach(c => { if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); }); return e; };
let TOK = ''; try { TOK = sessionStorage.getItem('ttok') || ''; } catch (e) {}
function loginForStudio(){
  const url = new URL('/teacher/', location.origin);
  url.searchParams.set('next', 'studio');
  const q = new URLSearchParams(location.search);
  for (const key of ['id', 'page']) if (q.get(key)) url.searchParams.set(key, q.get(key));
  location.replace(url.href);
}
if (!TOK) { loginForStudio(); return; }

const TYPES = [
  { t: 'h', ic: '𝗧', name: 'Тақырып', make: () => ({ t: 'h', lv: 2, text: '' }) },
  { t: 'p', ic: '¶', name: 'Мәтін', make: () => ({ t: 'p', text: '' }) },
  { t: 'img', ic: '▧', name: 'Фото', make: () => ({ t: 'img', media: 0, alt: '', cap: '' }) },
  { t: 'yt', ic: '▶', name: 'Видео (YouTube)', make: () => ({ t: 'yt', vid: '', cap: '' }) },
  { t: 'note', ic: '💡', name: 'Ескерту', make: () => ({ t: 'note', kind: 'remember', text: '' }) },
  { t: 'code', ic: '</>', name: 'Код', make: () => ({ t: 'code', lang: 'python', code: '', cap: '' }) },
  { t: 'table', ic: '▦', name: 'Кесте', make: () => ({ t: 'table', head: true, rows: [['', ''], ['', '']] }) },
  { t: 'steps', ic: '①', name: 'Қадамдар', make: () => ({ t: 'steps', items: ['', ''] }) },
  { t: 'hr', ic: '―', name: 'Бөлгіш', make: () => ({ t: 'hr' }) }
];
const NAME = Object.fromEntries(TYPES.map(x => [x.t, x.name]));
const NOTE = { remember: 'Есте сақта', mistake: 'Жиі қате', tip: 'Кеңес', info: 'Назар аудар' };
const ST = { view: 'theory', tasks: { v: 1, tasks: [], hw: {} }, mode: 'lesson', topics: {}, page: null, subjects: [], lessons: [], cur: null, blocks: [], title: '', base: 0, dirty: false, r2: true, hist: [], phone: true };
const uid = () => 'b' + Math.random().toString(36).slice(2, 9);

async function api(path, body, method, raw){
  try {
    const r = await fetch('/api/teacher/studio/' + path, { method: method || (body !== undefined ? 'POST' : 'GET'), headers: { Authorization: 'Bearer ' + TOK, ...(raw ? raw.headers : { 'Content-Type': 'application/json' }) }, body: raw ? raw.body : body !== undefined ? JSON.stringify(body) : undefined });
    if (r.status === 401) { try { sessionStorage.removeItem('ttok'); } catch (e) {} stashDraft(); loginForStudio(); return { ok: false, error: 'auth' }; }
    return await r.json();
  } catch (e) { return { ok: false, error: 'network' }; }
}
let toastT = 0;
function toast(t){ const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, 3200); }
const ERR = { network: 'Желі жоқ. Қайта көреміз.', too_big: 'Сабақ тым үлкен.', empty: 'Сабақта мазмұн жоқ: алдымен мәтін, сурет не тапсырма қосыңыз.', no_r2: 'Сурет сақтайтын орын (R2) әлі қосылмаған.', quota: 'Бүгінгі сурет жүктеу шегі аяқталды.', bad_type: 'Тек JPG, PNG, WebP не GIF суреті жарайды.', conflict: 'Сабақ басқа жерде өзгерген.' };
const ERR2 = { invalid: 'Тапсырмада толтырылмаған жер бар.', ref_fail: 'Үлгі шешім өз тестінен өтпеді.', media_missing: 'Бос фото немесе видео блогын толтырыңыз.', unavailable: 'Код орындау қызметі уақытша жауап бермеді. Кейін қайта тексеріңіз.', used_tasks: 'Бұл сабақ өтіп қойған. Өзгерген тапсырмаларды жаңа көшірмеде жариялаңыз.', has_sessions: 'Бұл сабақ бойынша сабақ өткізілген. Оны жасыруға болады.', not_found: 'Сабақ немесе нұсқа табылмады.' };
const etext = j => ERR2[j.error] || ERR[j.error] || ('Қате: ' + (j.error || 'белгісіз'));

/* ---------- Диалог ---------- */
const dialog = $('#dlg');
let dialogBusy = false;
function dlg(content){
  const box = $('#dlgBox');
  box.replaceChildren(...[].concat(content));
  dialog.setAttribute('aria-label', box.querySelector('h2')?.textContent || 'Курс студиясы');
  if (!dialog.open) dialog.showModal();
  (box.querySelector('input,select,textarea') || box.querySelector('button'))?.focus();
}
function closeDlg(force){ if (dialog.open && (!dialogBusy || force === true)) dialog.close(); }
dialog.addEventListener('cancel', event => { if (dialogBusy) event.preventDefault(); });
dialog.addEventListener('click', e => { if (e.target === dialog) closeDlg(); });
document.addEventListener('keydown', e => {
  const focus = document.activeElement;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/^(INPUT|TEXTAREA)$/.test(focus.tagName) && !focus.isContentEditable) {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
  }
});

/* ---------- Қайтару (Undo) ---------- */
let undone = [];
function historyButtons() {
  $('#bUndo').disabled = ST.hist.length < 2;
  $('#bRedo').disabled = !undone.length;
}
function pushHist(){
  const snapshot = JSON.stringify({blocks: ST.blocks, tasks: ST.tasks, title: ST.title});
  if (ST.hist.at(-1) !== snapshot) {
    ST.hist.push(snapshot);
    if (ST.hist.length > 60) ST.hist.shift();
    undone = [];
  }
  historyButtons();
}
function restoreEditor(snapshot) {
  Object.assign(ST, JSON.parse(snapshot));
  if (ST.mode === 'lesson') $('#title').value = ST.title;
  changed(false);
  clearTimeout(histT);
  renderEditor(); historyButtons();
}
function undo(){
  pushHist();
  if (ST.hist.length < 2) return;
  undone.push(ST.hist.pop());
  restoreEditor(ST.hist.at(-1));
}
function redo(){
  if (!undone.length) return;
  ST.hist.push(undone.pop());
  restoreEditor(ST.hist.at(-1));
}
$('#bUndo').addEventListener('click', undo);
$('#bRedo').addEventListener('click', redo);

/* ---------- Сақтау ---------- */
let saveT = 0, prevT = 0, histT = 0, saving = null, revision = 0, previewRequest = 0, navigation = 0, mediaPending = 0;
function setState(t, cls){
  const e = $('#saveState');
  e.textContent = t; e.className = 'st-save ' + (cls || '');
  $('#bSave').hidden = ST.mode === 'page';
  $('#bSave').disabled = !ST.cur || !ST.dirty || t === 'Сақталуда…';
  $('#bPreview').disabled = !ST.cur && !ST.page;
}
$('#bSave').addEventListener('click', () => save());
function rememberEditor() {
  const url = new URL(location.href);
  url.searchParams.delete('id');
  url.searchParams.delete('page');
  if (ST.cur) url.searchParams.set('id', ST.cur.id);
  if (ST.page) url.searchParams.set('page', ST.page.path);
  if (url.href !== location.href) history.replaceState(null, '', url);
}
const draftKey = id => 'course-studio-draft:' + id;
function stashDraft(){
  if (ST.mode !== 'lesson' || !ST.cur || !ST.dirty) return;
  try { localStorage.setItem(draftKey(ST.cur.id), JSON.stringify({ base: ST.base, title: ST.title, blocks: ST.blocks, tasks: ST.tasks })); } catch {}
}
function changed(structural){
  revision++;
  ST.dirty = true; setState('Сақталмаған…'); clearTimeout(saveT);
  if (ST.mode === 'lesson') { stashDraft(); saveT = setTimeout(save, 1000); }
  clearTimeout(prevT); prevT = setTimeout(preview, 500);
  clearTimeout(histT); if (structural) pushHist(); else histT = setTimeout(pushHist, 900);
  paintReadiness();
}
const mediaChanged = it => it.media && (it.media.src !== it.orig.src || it.media.alt !== it.orig.alt || it.media.vid !== it.orig.vid);
function pageItems(){ const items = {}; ST.page.items.forEach(it => { if (it.media) { if (mediaChanged(it)) items[it.i] = it.media; } else if (it.editable && it.md !== it.orig) items[it.i] = it.md; }); return items; }
async function savePage(){
  if (!ST.page || saving) return false;
  const current = revision;
  setState('Сақталуда…');
  const items = pageItems();
  saving = api('page/save', { path: ST.page.path, items, extra: ST.blocks });
  const j = await saving;
  saving = null;
  if (j.ok) { ST.dirty = revision !== current; setState(ST.dirty ? 'Сақталмаған өзгеріс бар' : 'Сайтқа сақталды', ST.dirty ? '' : 'ok'); await loadList(); return !ST.dirty; }
  setState(etext(j), 'err'); return false;
}
async function save(force){
  if (ST.mode !== 'lesson' || !ST.cur) return true;
  if (saving) {
    await saving;
    if (saving) return false;
  }
  if (!ST.dirty && force !== true) return true;
  clearTimeout(saveT);
  const current = revision, id = ST.cur.id, title = ST.title;
  setState('Сақталуда…');
  saving = api('lesson/save', { id, title, blocks: ST.blocks, tasks: ST.tasks, base: ST.base, autosave: true, force: force === true });
  const j = await saving;
  saving = null;
  if (j.ok) {
    ST.base = j.updated_at;
    ST.dirty = revision !== current;
    const lesson = ST.lessons.find(x => x.id === id);
    if (lesson) {
      lesson.title = title;
      lesson.updated_at = j.updated_at;
      lesson.dirty = lesson.status === 'published' && j.updated_at > (lesson.published_at || 0);
    }
    if (ST.dirty) {
      stashDraft();
      saveT = setTimeout(save, 400);
      setState('Сақталмаған өзгеріс бар');
    } else {
      try { localStorage.removeItem(draftKey(id)); } catch {}
      setState('Сақталды ' + new Date().toTimeString().slice(0, 5), 'ok');
    }
    paintPub(); renderSide(); paintReadiness();
    return !ST.dirty;
  }
  if (j.error === 'conflict') { setState('Қақтығыс', 'err'); dlg([h('h2', { text: 'Сабақ басқа жерде өзгерген' }), h('p', { text: 'Басқа құрылғыда не терезеде осы сабақ сақталған. Қайсысын қалдырамыз?' }), h('div', { class: 'st-row' }, [h('button', { class: 'st-btn', text: 'Жаңасын жүктеу', on: { click: () => { closeDlg(); openLesson(ST.cur.id, true); } } }), h('button', { class: 'st-btn st-primary', text: 'Менікін сақтау', on: { click: async () => { closeDlg(); await save(true); } } })])]); return false; }
  setState('Сақталмады · ' + etext(j), 'err');
  stashDraft();
  clearTimeout(saveT);
  if (j.error === 'network') saveT = setTimeout(save, 5000);
  return false;
}
window.addEventListener('beforeunload', e => { if (ST.dirty) { stashDraft(); e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('online', () => { if (ST.mode === 'lesson' && ST.dirty) save(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && ST.mode === 'lesson' && ST.dirty) save(); });

async function beforeSwitch() {
  if (saving) await saving;
  if (!ST.dirty) return true;
  if (ST.mode === 'page') return confirm('Бұл беттегі өзгерістер сақталмаған. Басқа сабаққа өтесіз бе?');
  return save();
}

/* ---------- Алдын ала қарау ---------- */
async function preview(){
  const version = ++previewRequest;
  if (ST.mode === 'page' && ST.page) { const items = pageItems(); const j = await api('page/render', { path: ST.page.path, items, extra: ST.blocks }); if (j.ok && version === previewRequest) { $('#frame').setAttribute('sandbox', 'allow-same-origin allow-popups'); $('#frame').srcdoc = j.html; } return; }
  if (!ST.cur) return;
  const j = await api('render', { title: ST.title, blocks: ST.blocks, tasks: ST.tasks, subject: ST.cur.subject, section: ST.view });
  if (j.ok && version === previewRequest) { $('#frame').setAttribute('sandbox', 'allow-scripts allow-popups'); $('#frame').srcdoc = j.html; }
}
$('#bPhone').addEventListener('click', () => { ST.phone = true; $('#frameBox').className = 'st-frame phone'; $('#bPhone').classList.add('on'); $('#bWide').classList.remove('on'); });
$('#bWide').addEventListener('click', () => { ST.phone = false; $('#frameBox').className = 'st-frame'; $('#bWide').classList.add('on'); $('#bPhone').classList.remove('on'); });

/* ---------- Сол жақ: пәндер мен сабақтар ---------- */
const STATE_LBL = { code: 'дайын', studio: '', empty: 'бос' };
function topicRow(sub, t){
  const on = (ST.mode === 'page' && ST.page && ST.page.path === t.path) || (ST.mode === 'lesson' && ST.cur && t.lesson && ST.cur.id === t.lesson.id) || (ST.mode === 'topic' && ST.topicCtx && ST.topicCtx.sub === sub.id && ST.topicCtx.num === t.num);
  const dot = t.state === 'code' ? h('i', { class: 'dot code', title: 'Қолмен жасалған сабақ: мәтінін өңдеуге болады' }) : t.state === 'studio' ? h('i', { class: 'dot ' + (t.lesson.dirty ? 'dirty' : t.lesson.status), title: t.lesson.status === 'published' ? 'Жарияланған' : 'Жоба' }) : h('i', { class: 'dot empty', title: 'Әлі жасалмаған' });
  return h('button', { class: 'st-les st-topic' + (on ? ' on' : '') + (t.state === 'empty' ? ' empty' : ''), type: 'button', on: { click: () => t.state === 'code' ? openPage(sub, t) : t.state === 'studio' ? openLesson(t.lesson.id) : openTopic(sub, t) } }, [dot, h('span', { class: 't', text: t.num + '. ' + t.title }), h('span', { class: 'lbl', text: t.edited ? 'өзгертілген' : STATE_LBL[t.state] || '' })]);
}
function renderSide(){
  const side = $('#side'), open = new Set([...side.querySelectorAll('details[open]')].map(d => d.dataset.id));
  if (!side.children.length) { const first = ST.subjects.find(s => s.id === 'python') || ST.subjects[0]; if (first) open.add(first.id); }
  side.replaceChildren(...ST.subjects.map(sub => {
    const reg = ST.topics[sub.id], ls = ST.lessons.filter(l => l.subject === sub.id);
    let kids;
    if (reg && reg.topics.length) {
      let sec = null; kids = [];
      reg.topics.filter(t => t.state !== 'empty' || ST.topicCtx?.sub === sub.id && ST.topicCtx?.num === t.num).forEach(t => {
        if (t.section && t.section !== sec) { sec = t.section; kids.push(h('div', {class:'st-sec', text:sec})); }
        kids.push(topicRow(sub, t));
      });
      if (reg.extra.length) { kids.push(h('div', { class: 'st-sec', text: 'Қосымша сабақтар' })); reg.extra.forEach(l => kids.push(lessonRow(l))); }
      const empty = reg.topics.filter(t => t.state === 'empty' && !(ST.topicCtx?.sub === sub.id && ST.topicCtx?.num === t.num));
      if (empty.length) kids.push(h('details', {class:'st-empty-topics'}, [
        h('summary', {text:'Бос тақырыптар · ' + empty.length}), ...empty.map(t => topicRow(sub, t))
      ]));
    } else kids = ls.map(lessonRow);
    const cnt = reg && reg.topics.length ? reg.topics.filter(t => t.state !== 'empty').length + '/' + reg.topics.length : String(ls.length);
    return h('details', { class: 'st-sub', 'data-id': sub.id, open: open.has(sub.id) || (ST.cur && ST.cur.subject === sub.id) || (ST.page && ST.page.sub === sub.id) || (ST.topicCtx && ST.topicCtx.sub === sub.id) }, [
      h('summary', {}, [h('span', { text: sub.icon || '📘' }), h('span', { text: sub.title }), h('span', { class: 'n', text: cnt })]), ...kids,
      h('button', { class: 'st-add', type: 'button', text: '+ Жаңа сабақ', on: { click: () => newLesson(sub) } })]);
  }));
  filterLessons();
}
function filterLessons() {
  const query = $('#lessonSearch').value.trim().toLocaleLowerCase('kk');
  for (const group of document.querySelectorAll('#side .st-sub')) {
    const courseMatch = !query || group.querySelector('summary').textContent.toLocaleLowerCase('kk').includes(query);
    const lessons = [...group.querySelectorAll('.st-les')];
    lessons.forEach(lesson => { lesson.hidden = !courseMatch && !lesson.textContent.toLocaleLowerCase('kk').includes(query); });
    group.hidden = !courseMatch && lessons.every(lesson => lesson.hidden);
    if (query && !group.hidden) {
      group.open = true;
      const empty = group.querySelector('.st-empty-topics');
      if (empty?.querySelector('.st-les:not([hidden])')) empty.open = true;
    }
  }
}
$('#lessonSearch').addEventListener('input', filterLessons);
function lessonRow(l){ const cur = ST.mode === 'lesson' && ST.cur && ST.cur.id === l.id; const st = ST.lessons.find(x => x.id === l.id) || l; return h('button', { class: 'st-les' + (cur ? ' on' : ''), type: 'button', on: { click: () => openLesson(l.id) } }, [h('i', { class: 'dot ' + (st.dirty ? 'dirty' : st.status), title: st.status === 'published' ? 'Жарияланған' : st.status === 'hidden' ? 'Жасырылған' : 'Жоба' }), h('span', { class: 't', text: l.title })]); }
function newSubject(){
  const inp = h('input', { class: 'st-field', maxlength: 60, placeholder: 'Курс атауы', 'aria-label': 'Курс атауы', required: true });
  const status = h('p', { class: 'st-hint', role: 'status' });
  const submit = h('button', { type: 'submit', class: 'st-btn st-primary', text: 'Курс қосу' });
  const form = h('form', {}, [inp, status, h('div', { class: 'st-row' }, [
    submit, h('button', { class: 'st-btn', type: 'button', text: 'Болдырмау', on: { click: closeDlg } })
  ])]);
  form.onsubmit = async event => {
    event.preventDefault();
    if (dialogBusy || !inp.value.trim()) return;
    dialogBusy = submit.disabled = true;
    const j = await api('subject', { title: inp.value.trim() });
    dialogBusy = submit.disabled = false;
    if (!j.ok) { status.textContent = etext(j); return; }
    closeDlg();
    await loadList();
    const course = ST.subjects.find(s => s.id === j.id);
    const group = course && $('#side').querySelector('[data-id="' + course.id + '"]');
    if (group) group.open = true;
    toast('Курс қосылды.');
  };
  dlg([h('h2', { text: 'Жаңа курс' }), form]);
}
$('#newCourse').addEventListener('click', newSubject);
$('#templates').addEventListener('click', () => {
  const current = ST.cur?.subject || ST.page?.sub || ST.topicCtx?.sub;
  if (ST.subjects.length) newLesson(ST.subjects.find(s => s.id === current));
  else newSubject();
});
function newLesson(sub, topic){
  const course = h('select', { class: 'st-field', 'aria-label': 'Сабақтың курсы', disabled: Boolean(topic) }, [
    h('option', { value: '', text: 'Курсты таңдаңыз' }),
    ...ST.subjects.map(s => h('option', { value: s.id, text: s.title }))
  ]);
  course.value = sub?.id || '';
  const inp = h('input', { class: 'st-field', maxlength: 120, placeholder: 'Сабақ атауы', 'aria-label': 'Жаңа сабақ атауы', value: topic?.title || '' });
  const status = h('p', { class: 'st-hint', role: 'status' });
  const templates = [['theory', 'Теория үлгісі', 'Мақсат, түсіндірме және мысал'], ['blank', 'Бос сабақ', 'Блоктарды өзіңіз қосасыз']];
  const go = async template => {
    if (dialogBusy || !course.value) return;
    dialogBusy = true; refreshButtons();
    if (!(await beforeSwitch())) { dialogBusy = false; refreshButtons(); return; }
    const prepared = revision;
    status.textContent = 'Жоба жасалуда…';
    const j = await api('lesson/new', { subject: course.value, title: inp.value.trim() || 'Жаңа сабақ', template, topic_num: topic?.num });
    if (!j.ok) { dialogBusy = false; refreshButtons(); status.textContent = etext(j); return; }
    await loadList();
    dialogBusy = false; refreshButtons();
    closeDlg();
    if (await openLesson(j.id, false, prepared)) toast(j.existing ? 'Осы тақырыптағы жоба ашылды.' : 'Жаңа сабақ жоба ретінде ашылды.');
  };
  const buttons = templates.map(([id, label, description]) => h('button', {
    class: 'st-tpl', type: 'button', on: { click: () => go(id) }
  }, [h('b', { text: label }), h('span', { text: description })]));
  const refreshButtons = () => buttons.forEach(button => { button.disabled = dialogBusy || !course.value; });
  course.onchange = refreshButtons;
  refreshButtons();
  dlg([h('h2', { text: 'Жаңа сабақ' }), course, inp, h('div', { class: 'st-tpls' }, buttons), status,
    h('div', { class: 'st-row' }, h('button', { class: 'st-btn', type: 'button', text: 'Болдырмау', on: { click: closeDlg } }))]);
}
let listRequest = 0;
async function loadList(){
  const ticket = ++listRequest;
  const j = await api('list');
  if (ticket !== listRequest) return;
  if (!j.ok) { toast(etext(j)); return; }
  const reg = j.subjects.filter(x => x.builtin); const res = await Promise.all(reg.map(x => api('topics?subject=' + x.id)));
  if (ticket !== listRequest) return;
  ST.subjects = j.subjects; ST.lessons = j.lessons; ST.r2 = j.r2;
  reg.forEach((x, i) => { ST.topics[x.id] = res[i].ok ? res[i] : { topics: [], extra: [] }; }); renderSide();
}

/* ---------- Сабақты ашу ---------- */
async function openLesson(id, force, preparedRevision){
  const selection = ++navigation;
  if (!force && ST.cur?.id === id) { setView('write'); return true; }
  if ((!force && preparedRevision !== revision && !(await beforeSwitch())) || selection !== navigation) return false;
  const draftRevision = revision;
  const j = await api('lesson?id=' + id);
  if (selection !== navigation) return false;
  if (!j.ok) { toast(etext(j)); return false; }
  if (draftRevision !== revision && ST.dirty && !(await beforeSwitch())) return false;
  if (selection !== navigation) return false;
  previewRequest++;
  const l = j.lesson; ST.mode = 'lesson'; ST.page = null; ST.topicCtx = null; ST.cur = l; ST.tasks = l.tasks || { v: 1, tasks: [], hw: {} }; if (!force) ST.view = 'theory'; ST.blocks = l.blocks.length ? l.blocks : []; ST.title = l.title; ST.base = l.updated_at; ST.dirty = false; ST.hist = []; pushHist();
  ['title', 'bVers', 'bPub'].forEach(i => { $('#' + i).disabled = false; }); $('#title').value = l.title; setState('');
  let backup = null;
  try { backup = JSON.parse(localStorage.getItem(draftKey(id)) || 'null'); } catch {}
  if (!force && backup && backup.base === ST.base && Array.isArray(backup.blocks) && backup.tasks) {
    Object.assign(ST, {title: backup.title, blocks: backup.blocks, tasks: backup.tasks});
    $('#title').value = ST.title;
    changed(true);
    toast('Осы құрылғыдағы сақталмаған жоба ашылды.');
  } else if (!force && backup && Array.isArray(backup.blocks) && backup.tasks) {
    dlg([h('h2', {text:'Сақталмаған жоба табылды'}),
      h('p', {text:'Сервердегі сабақ өзгерген. Осы құрылғыдағы жобаны бөлек сабақ ретінде ашуға болады.'}),
      h('div', {class:'st-row'}, [
        h('button', {class:'st-btn st-primary', type:'button', text:'Бөлек көшірме ашу', on:{click:async e => {
          e.currentTarget.disabled = true;
          const copy = await api('lesson/new', {subject:l.subject,title:backup.title + ' · қалпына келтірілген'});
          if (!copy.ok) { toast(etext(copy)); return; }
          const stored = await api('lesson/save', {id:copy.id,title:backup.title + ' · қалпына келтірілген',blocks:backup.blocks,tasks:backup.tasks});
          if (!stored.ok) { toast(etext(stored)); return; }
          try { localStorage.removeItem(draftKey(id)); } catch {}
          closeDlg(); await loadList(); await openLesson(copy.id);
        }}}),
        h('button', {class:'st-btn', type:'button', text:'Сервер нұсқасын қарау', on:{click:closeDlg}})
      ])]);
  }
  rememberEditor();
  paintPub(); renderSide(); renderEditor(); $('#edit').scrollTop = 0; preview(); paintReadiness(); setView('write');
  return true;
}
function paintPub(){
  if (ST.mode === 'page') { const b = $('#bPub'); b.textContent = 'Сайтқа сақтау'; $('#bOpen').hidden = false; $('#bOpen').href = ST.page.path; return; }
  const l = ST.cur, b = $('#bPub'), o = $('#bOpen'), st = (ST.lessons.find(x => x.id === l.id) || l);
  b.textContent = st.status === 'published' ? (st.dirty ? 'Жаңартып жариялау' : 'Жарияланған ✓') : 'Жариялау';
  if (st.status === 'published') { o.hidden = false; o.href = '/c/' + l.subject + '/' + l.slug; } else o.hidden = true;
}
$('#title').addEventListener('input', e => {
  ST.title = e.target.value;
  const heading = $('#editorHeading');
  if (heading) heading.textContent = ST.title || 'Атаусыз сабақ';
  changed(false);
});

/* ---------- Тақырып карточкасы: атауы мен сипаттамасы (пән бетіндегі карточка) ---------- */
function cardPanel(sub, num, title, descr){
  const t = h('input', { class: 'st-field', maxlength: 160, 'aria-label': 'Тақырып атауы' }), d = h('textarea', { class: 'st-ta', rows: 2, maxlength: 400, 'aria-label': 'Қысқаша сипаттама', placeholder: 'Қысқаша сипаттама' });
  t.value = title || ''; d.value = descr || ''; d.style.minHeight = '56px';
  return h('details', { class: 'st-blk st-card' }, [h('summary', { text: 'Пән бетіндегі карточка: атауы және сипаттамасы' }), h('div', { class: 'st-row' }, [t]), h('div', { class: 'st-row' }, [d]), h('div', { class: 'st-row' }, [h('button', { class: 'st-btn st-primary', type: 'button', text: 'Карточканы сақтау', on: { click: async () => { const j = await api('topic/save', { subject: sub, num, title: t.value, descr: d.value }); if (!j.ok) { toast(etext(j)); return; } await loadList(); toast('Карточка сақталды'); } } })])]);
}
function topicOf(sub, num){ const r = ST.topics[sub]; return r && r.topics.find(x => x.num === num); }

/* бос тақырып */
async function openTopic(sub, t){
  const selection = ++navigation;
  if (!(await beforeSwitch())) return;
  if (selection !== navigation) return;
  previewRequest++;
  ST.mode = 'topic'; ST.cur = null; ST.page = null; ST.topicCtx = { sub: sub.id, num: t.num }; ST.blocks = []; ST.dirty = false;
  ST.hist = []; undone = []; historyButtons();
  ['title', 'bVers', 'bPub'].forEach(i => { $('#' + i).disabled = true; }); $('#title').value = t.title; $('#bOpen').hidden = true; setState('');
  $('#edit').replaceChildren(h('div', { class: 'st-doc' }, [
    h('div', { class: 'st-empty', style: 'margin:0 0 14px;max-width:none;text-align:left' }, [h('b', { text: t.num + '. ' + t.title }), h('span', { text: sub.title + (t.section ? ' · ' + t.section : '') + ' · материал әзірленуде' }), h('button', { class: 'st-btn st-primary', type: 'button', text: '+ Осы тақырыпқа сабақ жасау', on: { click: () => newLesson(sub, t) } })]),
    cardPanel(sub.id, t.num, t.title, t.descr)]));
  rememberEditor(); $('#frame').srcdoc = ''; paintReadiness(); renderSide(); setView('write');
}

/* бар (кодпен жасалған) сабақтың мәтіндерін өңдеу */
const KIND = { h1: 'Сабақ атауы', h2: 'Бөлім тақырыбы', lead: 'Бөлімнің кіріспесі', p: 'Түсіндірме', goal: 'Мақсат', li: 'Қорытынды тармағы' };
async function openPage(sub, t){
  const selection = ++navigation;
  if (ST.page?.path === t.path) { setView('write'); return; }
  if (!(await beforeSwitch()) || selection !== navigation) return;
  const draftRevision = revision;
  const j = await api('page?path=' + encodeURIComponent(t.path));
  if (selection !== navigation) return;
  if (!j.ok) { toast(etext(j)); return; }
  if (draftRevision !== revision && ST.dirty && !(await beforeSwitch())) return;
  if (selection !== navigation) return;
  previewRequest++;
  ST.mode = 'page'; ST.cur = null; ST.topicCtx = null; ST.page = { sub: sub.id, num: t.num, path: t.path, items: j.items, title: t.title }; ST.blocks = j.extra || []; ST.dirty = false; ST.hist = []; pushHist();
  $('#title').disabled = true; $('#title').value = t.title; $('#bVers').disabled = true; $('#bPub').disabled = false; setState(''); paintPub();
  rememberEditor(); renderSide(); renderEditor(); $('#edit').scrollTop = 0; preview(); paintReadiness(); setView('write');
}
function mediaCard(it, pagePath){
  const m = it.media, card = h('div', { class: 'st-blk' + (mediaChanged(it) ? ' st-changed' : '') }), isImg = it.kind === 'img';
  const head = h('div', { class: 'st-bh' }, [h('span', { text: isImg ? 'Сурет (сабақ бетінде)' : 'Видео (YouTube, сабақ бетінде)' }), h('span', { class: 'sp' }), mediaChanged(it) ? h('button', { class: 'st-btn', type: 'button', text: 'Түпнұсқаға қайту', on: { click: () => { it.media = { ...it.orig }; changed(true); renderEditor(); } } }) : null]);
  card.append(head);
  if (isImg) {
    const url = (() => { try { return new URL(m.src, location.origin + pagePath).pathname; } catch (e) { return m.src; } })();
    const st = h('p', { class: 'st-hint' });
    const ai = h('input', { class: 'st-field', maxlength: 200, placeholder: 'Сурет сипаты', 'aria-label': 'Сурет сипаты' }); ai.value = m.alt || ''; ai.addEventListener('input', () => { it.media.alt = ai.value; changed(false); });
    const pick = () => { const i = h('input', { type: 'file', accept: 'image/*' }); i.addEventListener('change', () => { if (i.files[0]) uploadImage(i.files[0], { alt: m.alt, set: id => { it.media.src = '/media/' + id; } }, st, () => renderEditor()); }); i.click(); };
    card.append(h('img', { class: 'st-thumb', src: url, alt: m.alt || 'Сурет' }), h('div', { class: 'st-row' }, [ai, h('button', { class: 'st-btn', type: 'button', text: 'Суретті ауыстыру', on: { click: pick } })]), st);
  } else {
    const vi = h('input', { class: 'st-field', placeholder: 'YouTube сілтемесін қойыңыз', 'aria-label': 'YouTube сілтемесі' }), hint = h('p', { class: 'st-hint' });
    vi.value = 'https://youtu.be/' + m.vid;
    vi.addEventListener('input', () => { const id = ytIdOf(vi.value); if (id) { it.media.vid = id; hint.textContent = 'Дұрыс: видео табылды ✓'; hint.className = 'st-hint'; changed(false); } else { hint.textContent = 'Бұл YouTube сілтемесі емес.'; hint.className = 'st-hint bad'; } });
    card.append(h('iframe', { class: 'st-yt', src: 'https://www.youtube-nocookie.com/embed/' + m.vid, title: 'Видео', loading: 'lazy' }), h('div', { class: 'st-row' }, [vi]), hint);
  }
  return card;
}
function pageHead(){
  const P = ST.page, box = h('div'); let sec = '';
  box.append(h('div', { class: 'st-blk st-info' }, [h('b', { text: 'Қолмен жасалған сабақ' }), h('p', { class: 'st-hint', text: 'Интерактив демолар мен тапсырмалар кодта қалады. Төмендегі мәтіндерді өзгертуге, сабақтың соңына сурет, видео, мәтін қосуға болады. «Сайтқа сақтау» басқан бойда студенттерге көрінеді.' })]));
  const cp = topicOf(P.sub, P.num); if (cp) box.append(cardPanel(P.sub, P.num, cp.title, cp.descr));
  const pagePath = P.path;
  P.items.forEach(it => {
    if (it.media) { box.append(mediaCard(it, pagePath)); return; }
    if (it.kind === 'h2' && it.section !== sec) sec = '';
    const changed_ = it.md !== it.orig, k = KIND[it.kind] || 'Мәтін';
    const head = h('div', { class: 'st-bh' }, [h('span', { text: k }), h('span', { class: 'sp' }), changed_ ? h('button', { class: 'st-btn', type: 'button', text: 'Түпнұсқаға қайту', on: { click: () => { it.md = it.orig; changed(true); renderEditor(); } } }) : null]);
    if (!it.editable) { box.append(h('div', { class: 'st-blk st-ro' }, [head, h('p', { class: 'st-hint', text: 'Бұл мәтінде күрделі белгі бар, кодта өңделеді.' }), h('div', { class: 'st-orig', text: it.orig })])); return; }
    const t = h('textarea', { class: 'st-ta', rows: 2 }); t.value = it.md; t.addEventListener('input', () => { it.md = t.value; grow(t); changed(false); }); requestAnimationFrame(() => grow(t));
    box.append(h('div', { class: 'st-blk' + (changed_ ? ' st-changed' : '') + (it.kind === 'h2' ? ' st-h2' : '') }, [head, t]));
  });
  box.append(h('h3', { class: 'st-sech', text: 'Сабақтың соңына қосу' }), h('p', { class: 'st-hint', text: 'Мұнда қосқан сурет, видео, мәтін сабақтың теория бөлімінің соңында шығады.' }));
  return box;
}

function draftProblems() {
  const problems = [];
  if (!ST.title.trim()) problems.push('Сабақ атауын жазыңыз.');
  if (mediaPending) problems.push('Сурет жүктеліп жатыр.');
  if (ST.blocks.some(b => b.t === 'yt' && !ytIdOf(b.vid))) problems.push('Видео сілтемесін тексеріңіз.');
  if (ST.blocks.some(b => b.t === 'img' && !b.media)) problems.push('Бос фото блогына сурет жүктеңіз.');
  if (ST.tasks.tasks.some(t => !t.items.length)) problems.push('Бос тапсырмаға есеп қосыңыз.');
  if (ST.tasks.grading === 'manual' && ST.tasks.tasks.length) {
    const score = ST.tasks.tasks.reduce((sum, t) => sum + (+t.pts || 0), 0);
    const expected = ST.tasks.hw?.on ? 75 : 100;
    if (score !== expected) problems.push('Тапсырмалар · ' + score + ' / ' + expected + ' балл. Қосындыны түзетіңіз.');
  }
  if (ST.tasks.hw?.on && Math.abs((ST.tasks.hw.crit || []).reduce((sum, c) => sum + (+c.pts || 0), 0) - 25) > 0.01) problems.push('Үй жұмысының критерийлері 25 балл болуы керек.');
  return problems;
}

function paintReadiness() {
  const host = $('#readiness');
  host.hidden = ST.mode !== 'lesson' || !ST.cur;
  if (host.hidden) return;
  const textCount = ST.blocks.filter(b => (b.doc ? documentText(b.doc) : b.text)?.trim() || b.media || ytIdOf(b.vid) || b.code?.trim() || b.rows?.flat().some(Boolean) || b.items?.some(Boolean)).length;
  const itemCount = ST.tasks.tasks.reduce((sum, task) => sum + task.items.length, 0);
  const problems = draftProblems();
  const row = (label, value) => h('div', {class: 'st-read-row'}, [h('span', {text: label}), h('b', {text: value})]);
  const total = ST.tasks.grading === 'manual'
    ? ST.tasks.tasks.reduce((sum, task) => sum + (+task.pts || 0), ST.tasks.hw?.on ? 25 : 0)
    : 100;
  host.replaceChildren(h('h3', {text: 'Жариялау тексерісі'}),
    row('Мазмұн', textCount + ' блок'), row('Тапсырмалар', itemCount + ' есеп'),
    row('Жалпы балл', itemCount ? total + ' / 100' : '—'),
    ...problems.map(problem => h('p', {class: 'st-warning', text: '! ' + problem})));
  if (ST.dirty) host.append(h('button', {class:'st-btn', type:'button', text:'Қазір сақтау', on:{click:() => save()}}));
}

async function duplicateLesson() {
  if (!ST.cur || dialogBusy) return;
  const { id, subject } = ST.cur;
  dialogBusy = true;
  if (!(await save()) || ST.cur?.id !== id) { dialogBusy = false; return; }
  const j = await api('lesson/new', {subject, title: ST.title + ' · көшірме', copy: id});
  if (!j.ok) {
    dialogBusy = false;
    $('#dlgBox').append(h('p', { class: 'st-hint bad', role: 'alert', text: etext(j) }));
    return;
  }
  await loadList();
  dialogBusy = false;
  closeDlg(); await openLesson(j.id);
  toast('Көшірме жоба ретінде жасалды.');
}

/* ---------- Жариялау, нұсқалар ---------- */
async function publish() {
  if (dialogBusy) return;
  if (ST.mode === 'page') { if (await savePage()) toast('Өзгерістер сайтта көрінеді'); return; }
  if (!ST.cur) return; if (!(await save())) return;
  const st = ST.lessons.find(x => x.id === ST.cur.id), pubd = st && st.status === 'published';
  if (pubd && !st.dirty) {
    const { id, subject, slug } = ST.cur;
    const url = location.origin + '/c/' + subject + '/' + slug;
    const status = h('p', { class: 'st-hint', role: 'status' });
    const hide = h('button', { class: 'st-btn st-danger', text: 'Жасыру', on: { click: async () => {
      if (dialogBusy) return;
      dialogBusy = hide.disabled = true;
      const j = await api('lesson/publish', { id, publish: false });
      if (j.ok) await loadList();
      dialogBusy = hide.disabled = false;
      if (!j.ok) { status.textContent = etext(j); return; }
      closeDlg();
      if (ST.cur?.id === id) paintPub();
      toast('Сабақ жасырылды.');
    } } });
    dlg([h('h2', { text: 'Сабақ жарияланған' }), h('a', { href: url, target: '_blank', rel: 'noopener', text: 'Студент бетін ашу' }), status,
      h('div', { class: 'st-row' }, [
        h('button', { class: 'st-btn', text: 'Сілтемені көшіру', on: { click: async () => {
          try { await navigator.clipboard.writeText(url); status.textContent = 'Сілтеме көшірілді.'; }
          catch { status.textContent = 'Көшіру мүмкін болмады.'; }
        } } }),
        hide, h('button', { class: 'st-btn', text: 'Жабу', on: { click: closeDlg } })
      ])]);
    return;
  }
  const problems = draftProblems();
  if (problems.length) {
    dlg([h('h2', {text:'Жариялау алдында түзетіңіз'}), h('ul', {class:'stt-list bad'}, problems.map(text => h('li', {text}))), h('button', {class:'st-btn', type:'button', text:'Редакторға қайту', on:{click:closeDlg}})]);
    return;
  }
  const confirmPublish = h('button', {class:'st-btn st-primary', type:'button', text:'Жариялау'});
  const status = h('p', {class:'st-hint', role:'status'});
  const target = ST.cur.id;
  confirmPublish.addEventListener('click', async () => {
    if (dialogBusy || ST.cur?.id !== target) return;
    dialogBusy = confirmPublish.disabled = true;
    if (!(await save()) || ST.cur?.id !== target) { dialogBusy = confirmPublish.disabled = false; return; }
    status.textContent = 'Мазмұн мен тапсырмалар тексерілуде…';
    const j = await api('lesson/publish', {id: target});
    if (!j.ok) {
      dialogBusy = confirmPublish.disabled = false;
      status.textContent = etext(j);
      status.classList.add('bad');
      if (j.problems) status.replaceChildren(h('ul', {class:'stt-list bad'}, j.problems.map(text => h('li', {text}))));
      if (j.error === 'used_tasks' && !status.querySelector('button')) status.append(h('button', {class:'st-btn', type:'button', text:'Көшірме жасау', on:{click:duplicateLesson}}));
      return;
    }
    await loadList();
    dialogBusy = confirmPublish.disabled = false;
    if (ST.cur?.id === target) paintPub();
    dlg([h('h2', {text:'Сабақ жарияланды'}), h('p', {text:ST.title}), h('div', {class:'st-row'}, [
      h('a', {class:'st-btn st-primary', href:j.url, target:'_blank', rel:'noopener', text:'Студент бетін ашу'}),
      h('button', {class:'st-btn', type:'button', text:'Сілтемені көшіру', on:{click:async () => {
        const notice = $('#dlgBox .st-hint');
        try { await navigator.clipboard.writeText(location.origin + j.url); notice.textContent = 'Сілтеме көшірілді.'; }
        catch { notice.textContent = 'Сілтемені ашып, мекенжай жолағынан көшіріңіз.'; }
      }}})
    ]), h('p', { class: 'st-hint', role: 'status' })]);
  });
  dlg([h('h2', {text:'Сабақты жариялау'}), h('p', {text:ST.title}), h('p', {class:'st-hint', text:'Тексеру аяқталса, осы нұсқа студенттерге ашылады.'}), status,
    h('div', {class:'st-row'}, [confirmPublish, h('button', {class:'st-btn', type:'button', text:'Болдырмау', on:{click:closeDlg}})])]);
}
$('#bPub').addEventListener('click', publish);
$('#bVers').addEventListener('click', async () => {
  if (!ST.cur || dialog.open) return;
  const id = ST.cur.id, selection = navigation;
  const trigger = $('#bVers');
  trigger.disabled = true;
  const j = await api('versions?id=' + id);
  trigger.disabled = !ST.cur;
  if (selection !== navigation || ST.cur?.id !== id || dialog.open) return;
  if (!j.ok) { toast(etext(j)); return; }
  const dates = new Intl.DateTimeFormat('kk-KZ', { timeZone: 'Asia/Qyzylorda', dateStyle: 'short', timeStyle: 'short' });
  const status = h('p', { class: 'st-hint', role: 'status' });
  const restore = async (event, version) => {
    if (dialogBusy || ST.cur?.id !== id) return;
    const button = event.currentTarget;
    dialogBusy = button.disabled = true;
    if (!(await save()) || ST.cur?.id !== id) { dialogBusy = button.disabled = false; return; }
    status.textContent = 'Нұсқа қалпына келтірілуде…';
    const result = await api('restore', { id, ver: version, base: ST.base });
    if (result.ok) {
      await loadList();
      if (ST.cur?.id === id) await openLesson(id, true);
    }
    dialogBusy = button.disabled = false;
    if (!result.ok) { status.textContent = etext(result); return; }
    closeDlg();
    toast('Нұсқа қалпына келтірілді.');
  };
  const versions = j.versions.map(v => h('div', { class: 'st-ver' }, [
    h('div', {}, [h('b', { text: v.title || 'Атаусыз' }), h('br'), h('small', { text: dates.format(new Date(v.at)) + (v.label ? ' · ' + v.label : '') })]),
    h('span', { class: 'sp' }),
    h('button', { class: 'st-btn', type: 'button', text: 'Қалпына келтіру', on: { click: event => restore(event, v.ver) } })
  ]));
  dlg([h('h2', { text: 'Нұсқалар тарихы' }), ...(versions.length ? versions : [h('p', { text: 'Нұсқалар әзірге жоқ.' })]), status,
    h('div', { class: 'st-row' }, [
      h('button', { class: 'st-btn', type: 'button', text: 'Көшірме жасау', on: { click: duplicateLesson } }),
      h('button', { class: 'st-btn', type: 'button', text: 'Жабу', on: { click: closeDlg } })
    ])]);
});

/* ---------- Блоктар ---------- */
function grow(ta){ ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight + 2, 80) + 'px'; }
function ta(b, key, mono, ph){ const t = h('textarea', { class: 'st-ta' + (mono ? ' mono' : ''), rows: 3, placeholder: ph || '', spellcheck: mono ? 'false' : 'true' }); t.value = b[key] || ''; t.addEventListener('input', () => { b[key] = t.value; grow(t); changed(false); }); requestAnimationFrame(() => grow(t)); return t; }
function field(b, key, ph, max){ const i = h('input', { class: 'st-field', type: 'text', maxlength: max || 200, placeholder: ph || '' }); i.value = b[key] || ''; i.addEventListener('input', () => { b[key] = i.value; changed(false); }); return i; }
function linkDialog(insert){
  const url = h('input', { class: 'st-field', type: 'url', placeholder: 'https://…', 'aria-label': 'Сілтеме мекенжайы' });
  const add = () => {
    try {
      const parsed = new URL(url.value.trim());
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error();
      closeDlg(); insert(parsed.href);
    } catch { toast('Толық https сілтемесін енгізіңіз.'); }
  };
  url.addEventListener('keydown', event => { if (event.key === 'Enter') add(); });
  dlg([h('h2', { text: 'Сілтеме қосу' }), url, h('div', { class: 'st-row' }, [
    h('button', { class: 'st-btn st-primary', type: 'button', text: 'Қосу', on: { click: add } }),
    h('button', { class: 'st-btn', type: 'button', text: 'Болдырмау', on: { click: closeDlg } })
  ])]);
}

function bodyOf(b){
  if (b.t === 'h') { const sel = h('select', { class: 'st-field', 'aria-label': 'Тақырып деңгейі', style: 'max-width:280px;margin-top:8px' }, [h('option', { value: '2', text: 'Бөлім (жаңа карточка)' }), h('option', { value: '3', text: 'Кіші тақырып' })]); sel.value = String(b.lv || 2); sel.addEventListener('change', () => { b.lv = +sel.value; changed(true); }); return [field(b, 'text', 'Тақырып мәтіні', 120), sel]; }
  if (b.t === 'p') return [richEditor(b, () => changed(false), linkDialog)];
  if (b.t === 'note') { const sel = h('select', { class: 'st-field', 'aria-label': 'Ескерту түрі', style: 'max-width:200px;margin-bottom:8px' }, Object.entries(NOTE).map(([k, v]) => h('option', { value: k, text: v }))); sel.value = b.kind || 'remember'; sel.addEventListener('change', () => { b.kind = sel.value; changed(false); }); return [sel, ta(b, 'text', false, 'Ескертудің мәтіні…')]; }
  if (b.t === 'code') return [codeEditor(b, () => changed(false), payload => api('run', payload)), field(b, 'cap', 'Код сипаттамасы')];
  if (b.t === 'yt') {
    const f = field(b, 'vid', 'YouTube сілтемесін қойыңыз', 300);
    const hint = h('p', { class: 'st-hint', role: 'status' });
    const check = () => {
      hint.textContent = ytIdOf(f.value) ? 'Сілтеме қабылданды. Оң жақтан ойнатып көріңіз.' : 'YouTube бейнесінің сілтемесін енгізіңіз.';
      hint.classList.toggle('bad', !!f.value && !ytIdOf(f.value));
    };
    f.addEventListener('input', check);
    check();
    return [f, hint, mediaControls(b), field(b, 'cap', 'Видео атауы немесе сипаттамасы')];
  }
  if (b.t === 'img') return imgBody(b);
  if (b.t === 'steps') { const box = h('div'); const draw = () => { box.replaceChildren(...b.items.map((x, i) => { const inp = h('input', { class: 'st-field', maxlength: 600, placeholder: 'Қадам мәтіні' }); inp.value = x; inp.addEventListener('input', () => { b.items[i] = inp.value; changed(false); }); return h('div', { class: 'st-li' }, [h('span', { class: 'num', text: String(i + 1) }), inp, h('button', { class: 'st-ic', type: 'button', title: 'Өшіру', 'aria-label': 'Қадамды өшіру', text: '✕', on: { click: () => { b.items.splice(i, 1); draw(); changed(true); } } })]); }), h('button', { class: 'st-btn', type: 'button', text: '+ Қадам', on: { click: () => { b.items.push(''); draw(); changed(true); } } })); }; draw(); return [box]; }
  if (b.t === 'table') return tableBody(b);
  return [h('p', { class: 'st-hint', text: 'Сызық бөлімдерді ажыратады.' })];
}
const ytIdOf = u => { const s = String(u || '').trim(); if (/^[\w-]{11}$/.test(s)) return s; const m = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#/]|$)/i); return m ? m[1] : ''; };
function tableBody(b){
  const box = h('div', { class: 'st-twrap' });
  const draw = () => {
    const tb = h('table', { class: 'st-grid' }, b.rows.map((r, i) => h('tr', {}, r.map((c, j) => { const inp = h('input', { maxlength: 200, 'aria-label': 'Қатар ' + (i + 1) + ', баған ' + (j + 1), placeholder: i === 0 && b.head ? 'Тақырып' : '' }); inp.value = c; inp.addEventListener('input', () => { b.rows[i][j] = inp.value; changed(false); }); return h('td', {}, inp); }))));
    box.replaceChildren(tb, h('div', { class: 'st-row' }, [
      h('button', { class: 'st-btn', type: 'button', text: '+ Қатар', on: { click: () => { b.rows.push(b.rows[0].map(() => '')); draw(); changed(true); } } }),
      h('button', { class: 'st-btn', type: 'button', text: '+ Баған', disabled: b.rows[0].length >= 8, on: { click: () => { b.rows.forEach(r => r.push('')); draw(); changed(true); } } }),
      h('button', { class: 'st-btn', type: 'button', text: '− Қатар', disabled: b.rows.length <= 1, on: { click: () => { b.rows.pop(); draw(); changed(true); } } }),
      h('button', { class: 'st-btn', type: 'button', text: '− Баған', disabled: b.rows[0].length <= 1, on: { click: () => { b.rows.forEach(r => r.pop()); draw(); changed(true); } } }),
      h('label', { class: 'st-hint' }, [h('input', { type: 'checkbox', checked: b.head !== false, on: { change: e => { b.head = e.target.checked; changed(true); draw(); } } }), ' Бірінші қатар тақырып'])]));
  };
  draw(); return [box];
}

/* ---------- Сурет: сығу және жүктеу ---------- */
async function compress(file){
  if (file.type === 'image/gif' && file.size <= 600 * 1024) return file;
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let w = bmp.width, hh = bmp.height, k = Math.min(1, 1600 / Math.max(w, hh)); w = Math.round(w * k); hh = Math.round(hh * k);
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, hh); x.drawImage(bmp, 0, 0, w, hh);
    for (const q of [0.85, 0.72, 0.6]) { const blob = await new Promise(r => c.toBlob(r, 'image/webp', q)); if (blob && blob.type === 'image/webp' && blob.size <= 300 * 1024) return blob; if (blob && blob.type !== 'image/webp') { const jb = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); if (jb && jb.size <= 300 * 1024) return jb; } }
    w = Math.round(w * 0.8); hh = Math.round(hh * 0.8);
  }
  throw new Error('big');
}
async function uploadImage(file, b, status, redraw){
  if (!ST.r2) { status.textContent = ERR.no_r2; status.className = 'st-hint bad'; return; }
  if (!file.type.startsWith('image/')) { status.textContent = 'Сурет файлын таңдаңыз.'; return; }
  const owner = ST.cur || ST.page;
  mediaPending++;
  paintReadiness();
  try {
    status.className = 'st-hint'; status.textContent = 'Сығып жатыр…';
    const blob = await compress(file); status.textContent = 'Жүктеп жатыр (' + Math.round(blob.size / 1024) + ' КБ)…';
    const j = await api('media', undefined, 'POST', { headers: { 'Content-Type': 'application/octet-stream', 'X-Alt': encodeURIComponent(b.alt || '') }, body: blob });
    if (!j.ok) { status.textContent = etext(j); status.className = 'st-hint bad'; return; }
    if (owner !== (ST.cur || ST.page) || (!b.set && !ST.blocks.includes(b))) return;
    if (b.set) b.set(j.id); else b.media = j.id;
    changed(true); redraw();
  } catch (e) { status.textContent = 'Суретті өңдей алмадық. Басқа сурет таңдап көріңіз.'; status.className = 'st-hint bad'; }
  finally { mediaPending--; paintReadiness(); }
}
function mediaControls(block, image) {
  const layout = mediaLayout(block);
  const grid = h('div', { class: 'st-media-tools' });
  const apply = () => {
    if (image) {
      image.parentElement.style.cssText = mediaStyle(block);
      image.style.cssText = photoStyle(block);
    }
    changed(false);
  };
  function range(label, key, minimum) {
    const input = h('input', {type: 'range', min: minimum, max: 100, value: layout[key], 'aria-label': label});
    const name = h('span', {text: label + ' · ' + layout[key] + '%'});
    input.addEventListener('input', () => {
      block[key] = +input.value;
      name.textContent = label + ' · ' + input.value + '%';
      apply();
    });
    return h('label', {}, [name, input]);
  }
  function choose(label, key, values) {
    const select = h('select', {class: 'st-field', 'aria-label': label}, values.map(([value, text]) => h('option', {value, text})));
    select.value = layout[key];
    select.addEventListener('change', () => {
      block[key] = select.value;
      apply();
      if (key === 'crop') position.hidden = select.value === 'original';
    });
    return h('label', {}, [h('span', {text: label}), select]);
  }
  grid.append(range('Ені', 'width', 25), choose('Туралау', 'align', [['left','Солға'],['center','Ортаға'],['right','Оңға']]));
  const position = h('div', {class: 'st-crop-position', hidden: layout.crop === 'original'}, [range('Көлденең', 'x', 0), range('Тігінен', 'y', 0)]);
  if (image) grid.append(choose('Қию', 'crop', [['original','Түпнұсқа'],['wide','Кең 16:9'],['square','Шаршы'],['portrait','Тік 3:4']]), position);
  return grid;
}
function imgBody(b){
  const box = h('div'), status = h('p', { class: 'st-hint', 'data-upload': '', role: 'status' });
  const draw = () => {
    box.replaceChildren();
    if (b.media) {
      const image = h('img', { class: 'st-photo', src: '/media/' + b.media, alt: b.alt || 'Жүктелген сурет', style: photoStyle(b) });
      box.append(h('figure', {class: 'st-photo-frame', style: mediaStyle(b)}, image), mediaControls(b, image),
        h('div', { class: 'st-row' }, [field(b, 'alt', 'Суреттің балама сипаттамасы'), h('button', { class: 'st-btn', type: 'button', text: 'Ауыстыру', on: { click: pick } })]),
        field(b, 'cap', 'Сурет астындағы жазу'));
    } else {
      const drop = h('div', { class: 'st-drop', tabindex: 0, role: 'button', 'aria-label': 'Сурет таңдау', text: 'Суретті осында сүйреп әкеліңіз, басып таңдаңыз не Ctrl+V басыңыз' });
      drop.addEventListener('click', pick); drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); })); ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
      drop.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadImage(f, b, status, draw); });
      drop.addEventListener('paste', e => { const f = [...(e.clipboardData ? e.clipboardData.files : [])][0]; if (f) { e.preventDefault(); uploadImage(f, b, status, draw); } });
      box.append(drop);
    }
    box.append(status);
  };
  function pick(){ const i = h('input', { type: 'file', accept: 'image/*' }); i.addEventListener('change', () => { if (i.files[0]) uploadImage(i.files[0], b, status, draw); }); i.click(); }
  draw(); return [box];
}
document.addEventListener('paste', e => {
  const f = [...(e.clipboardData ? e.clipboardData.files : [])].find(x => /^image\//.test(x.type));
  if (e.defaultPrevented || !f || !ST.cur || ST.view === 'tasks' || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  e.preventDefault();
  const b = addBlock('img', ST.blocks.length);
  const status = $('#edit [data-id="' + b.id + '"] [data-upload]');
  uploadImage(f, b, status, () => renderEditor(b.id));
});

/* ---------- Редактор ---------- */
function addBlock(type, at) {
  const definition = TYPES.find(x => x.t === type);
  const block = {id: uid(), ...definition.make()};
  if (ST.mode === 'lesson' && ['review', 'summary'].includes(ST.view)) block.section = ST.view;
  ST.blocks.splice(at, 0, block);
  closeDlg(); changed(true); renderEditor(block.id);
  return block;
}
function palette(at){
  dlg([h('h2', { text: 'Блок қосу' }), h('div', { class: 'st-pal' }, TYPES.map(x => h('button', { type: 'button', on: { click: () => addBlock(x.t, at) } }, [h('i', { text: x.ic }), h('span', { text: x.t === 'steps' && ST.view === 'review' ? 'Бекіту сұрақтары' : x.name })])))]);
}
const SECTIONS = [['theory','Түсіндіру'], ['tasks','Тапсырмалар'], ['review','Бекіту'], ['summary','Қорытынды']];
function viewTabs(){
  return h('div', { class: 'stt-tabs', role: 'tablist', 'aria-label': 'Сабақ бөлімдері' }, SECTIONS.map(([k, t]) => h('button', { type: 'button', role: 'tab', class: ST.view === k ? 'on' : '', 'aria-selected': ST.view === k ? 'true' : 'false', text: t, on: { click: () => { ST.view = k; renderEditor(); $('#edit').scrollTop = 0; preview(); } } })));
}
function lessonHeader(){
  const sub = ST.subjects.find(x => x.id === ST.cur.subject);
  return h('div', {class: 'st-doc-head'}, [
    h('small', {text: (ST.cur.topic_num ? ST.cur.topic_num + '-сабақ · ' : '') + (sub?.title || 'Курс')}),
    h('h1', {id: 'editorHeading', text: ST.title || 'Атаусыз сабақ'}),
    viewTabs()
  ]);
}
function renderTasksView(){
  const host = $('#edit'), box = h('div'), top = host.scrollTop;
  host.replaceChildren(h('div', { class: 'st-doc' }, [lessonHeader(), box]));
  window.StudioTasks.render(box, ST.tasks, {
    changed: s => changed(s),
    check: () => api('lesson/check', { id: ST.cur.id, tasks: ST.tasks }),
    code: (item, key, update) => {
      const content = { lang: 'python', code: item[key] || '' };
      return codeEditor(content, () => { item[key] = content.code; update(); }, payload => api('run', {...payload, language:'python'}), {fixedLanguage:true});
    }
  });
  host.scrollTop = top;
}
function renderEditor(focusId){
  const host = $('#edit');
  if (ST.mode === 'lesson' && ST.cur && ST.view === 'tasks') { renderTasksView(); return; }
  if (!ST.cur && !(ST.mode === 'page' && ST.page)) return;
  const headNodes = ST.mode === 'page' ? [pageHead()] : [lessonHeader()];
  const topic = ST.cur?.topic_num && topicOf(ST.cur.subject, ST.cur.topic_num);
  if (topic && ST.view === 'theory') headNodes.push(cardPanel(ST.cur.subject, topic.num, topic.title, topic.descr));
  const indices = ST.blocks.map((b, i) => i).filter(i => ST.mode === 'page' || (ST.blocks[i].section || 'theory') === ST.view);
  const end = indices.length ? indices.at(-1) + 1 : ST.blocks.length;
  if (!indices.length) {
    const label = SECTIONS.find(([key]) => key === ST.view)?.[1];
    host.replaceChildren(h('div', { class: 'st-doc' }, [...headNodes, h('div', { class: 'st-empty st-empty-section' }, [
      h('b', { text: ST.mode === 'page' ? 'Қосымша блок қосыңыз' : label + ' бөлімін толтырыңыз' }),
      h('span', { text: ST.view === 'review' ? 'Талқылау сұрақтарын немесе қысқа жаттығуды енгізіңіз.' : 'Мәтін, фото, видео немесе код блогын қосыңыз.' }),
      h('button', { class: 'st-btn st-primary', type: 'button', text: '+ Блок қосу', on: { click: () => palette(end) } }),
      ST.view === 'review' ? h('button', {class: 'st-btn', type: 'button', text: '+ Бекіту сұрақтары', on: {click: () => addBlock('steps', end)}}) : null
    ])]));
    return;
  }
  const doc = h('div', { class: 'st-doc' }, headNodes);
  const insBtn = at => h('div', { class: 'st-ins' }, h('button', { type: 'button', 'aria-label': 'Осында блок қосу', title: 'Осында блок қосу', text: '+ қосу', on: { click: () => palette(at) } }));
  indices.forEach((i, position) => {
    const b = ST.blocks[i];
    const move = other => {
      [ST.blocks[i], ST.blocks[other]] = [ST.blocks[other], ST.blocks[i]];
      changed(true); renderEditor(b.id);
    };
    doc.append(insBtn(i));
    const card = h('div', { class: 'st-blk', 'data-id': b.id }, [
      h('div', { class: 'st-bh' }, [h('span', { text: b.t === 'steps' && ST.view === 'review' ? 'Бекіту сұрақтары' : NAME[b.t] || b.t }), h('span', { class: 'sp' }),
        h('button', { class: 'st-ic', type: 'button', title: 'Жоғары', 'aria-label': 'Жоғары жылжыту', text: '↑', disabled: position === 0, on: { click: () => move(indices[position - 1]) } }),
        h('button', { class: 'st-ic', type: 'button', title: 'Төмен', 'aria-label': 'Төмен жылжыту', text: '↓', disabled: position === indices.length - 1, on: { click: () => move(indices[position + 1]) } }),
        h('button', { class: 'st-ic', type: 'button', title: 'Көшіру', 'aria-label': 'Блокты көшіру', text: '⧉', on: { click: () => { const c = JSON.parse(JSON.stringify(b)); c.id = uid(); ST.blocks.splice(i + 1, 0, c); changed(true); renderEditor(c.id); } } }),
        h('button', { class: 'st-ic', type: 'button', title: 'Өшіру', 'aria-label': 'Блокты өшіру', text: '🗑', on: { click: () => { ST.blocks.splice(i, 1); changed(true); renderEditor(); toast('Блок өшірілді. Қайтару: ↶'); } } })]),
      ...bodyOf(b)]);
    doc.append(card);
  });
  doc.append(h('div', {class: 'st-insert-tray'}, [
    h('button', { class: 'st-btn st-primary', type: 'button', text: '+ Блок қосу', on: { click: () => palette(end) } }),
    ...['p', 'img', 'yt', 'code'].map(type => h('button', {class: 'st-btn', type: 'button', text: type === 'yt' ? 'Видео' : NAME[type], on: {click: () => addBlock(type, end)}}))
  ]));
  const top = host.scrollTop; host.replaceChildren(doc); host.scrollTop = top;
  if (focusId) { const c = host.querySelector('[data-id="' + focusId + '"]'); if (c) { c.scrollIntoView({ block: 'nearest' }); const f = c.querySelector('[contenteditable=true], textarea, input:not([type=checkbox])'); if (f) f.focus({ preventScroll: true }); } }
}

/* ---------- Көрініс ауыстыру (телефон) ---------- */
function setView(v){ $('#app').dataset.view = v; $('#bPreview').setAttribute('aria-pressed', String(v === 'prev')); document.querySelectorAll('.st-tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); if (v === 'prev') preview(); }
document.querySelectorAll('.st-tabs button').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
$('#bPreview').addEventListener('click', () => setView($('#app').dataset.view === 'prev' ? 'write' : 'prev'));
$('#bClosePreview').addEventListener('click', () => setView('write'));

(async function init(){
  await loadList();
  const params = new URLSearchParams(location.search), id = Number(params.get('id')), path = params.get('page');
  if (Number.isSafeInteger(id) && id > 0) await openLesson(id);
  else if (path) {
    const subject = ST.subjects.find(s => ST.topics[s.id]?.topics.some(t => t.path === path && t.state === 'code'));
    if (subject) await openPage(subject, ST.topics[subject.id].topics.find(t => t.path === path));
  }
  if (!ST.cur && !ST.page && matchMedia('(max-width:760px)').matches) setView('side');
})();
})();
