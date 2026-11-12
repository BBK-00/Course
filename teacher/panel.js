
(function(){
'use strict';
const $ = s => document.querySelector(s);
const h = (tag, a, kids) => { const e = document.createElement(tag); for (const k in (a || {})) { if (k === 'text') e.textContent = a[k]; else if (k === 'class') e.className = a[k]; else if (k === 'on') { for (const ev in a[k]) e.addEventListener(ev, a[k][ev]); } else if (a[k] !== false && a[k] !== undefined) e.setAttribute(k, a[k]); } [].concat(kids === undefined ? [] : kids).forEach(c => { if (c !== null && c !== undefined && c !== false) e.append(c); }); return e; };
let QROPEN = false, TOK = '', LIVE = null, ROSTER = [], JOUR = null, TAB = 'live', DETAIL = null, busy = false, VIEW = 0, gFilter = '', jf = '', skew = 0, WMIN = 30, wDirty = false;
try { TOK = sessionStorage.getItem('ttok') || ''; } catch (e) {}
const band = v => v === '' || v === null || v === undefined ? '#e2e8f0' : v >= 90 ? '#b7e1c1' : v >= 75 ? '#dcefc8' : v >= 60 ? '#fff1b8' : '#ffd6cc';
const has = v => v !== '' && v !== null && v !== undefined;
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const hhmm = t => { const d = new Date(t * 1000), p = n => String(n).padStart(2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()); };

async function api(path, body, method){
  try {
    const r = await fetch('/api/teacher/' + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json(); if (r.status === 401) { out(); return { ok: false, error: 'auth' }; } return j;
  } catch (e) { return { ok: false, error: 'network' }; }
}

/* ---------- Кіру ---------- */
async function login(pw){
  let j; try { j = await (await fetch('/api/teacher/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })).json(); } catch (e) { j = { error: 'network' }; }
  if (!j.ok) { $('#eLogin').textContent = j.error === 'bad_password' ? 'Құпиясөз дұрыс емес.' : j.error === 'no_password' ? 'Құпиясөз бапталмаған: Cloudflare-де TEACHER_PASSWORD қосыңыз.' : j.error === 'wait' ? 'Қате көп болды. 10 минуттан кейін қайта көріңіз.' : 'Серверге қосыла алмады.'; return false; }
  TOK = j.token; try { sessionStorage.setItem('ttok', TOK); } catch (e) {} start(); return true;
}
function out(){ TOK = ''; try { sessionStorage.removeItem('ttok'); } catch (e) {} $('#app').hidden = true; $('#topnav').hidden = true; $('#login').hidden = false; $('#pw').value = ''; closeDetail(); }
$('#fLogin').addEventListener('submit', async e => { e.preventDefault(); $('#eLogin').textContent = ''; const b = $('#bLogin'); b.disabled = true; b.textContent = 'Тексеріп жатыр…'; await login($('#pw').value); b.disabled = false; b.textContent = 'Кіру'; });
$('#bLesson').addEventListener('click', e => { e.preventDefault(); window.open(lessonPath() + '#t=' + encodeURIComponent(TOK), '_blank'); });
$('#bOut').addEventListener('click', e => { e.preventDefault(); out(); });
/* Студияда жасалған (тапсырмасы бар) сабақтарды тізімге қосу */
const DSUB = { python: 'py', akt: 'akt', scratch: 'sb', 'sandyq-adister': 'sm' };
async function loadDataLessons(){
  const j = await api('studio/datalessons'); if (!j.ok) return;
  j.lessons.forEach(L => {
    const sid = DSUB[L.subject] || L.subject; let subj = SUBJ.find(s => s.id === sid);
    if (!subj) { subj = { id: sid, name: L.subjectTitle || L.subject, ico: '📘', topics: [] }; SUBJ.push(subj); }
    const ks = Object.keys(L.noHw).map(Number), tasks = ks.concat(L.hw ? [5] : []);
    const t = { id: L.topic, n: L.n || '•', title: L.title, path: L.path, min: ks.reduce((a, k) => a + (L.minutes[k] || 0), 0), tasks: tasks.length, tl: tasks, att: 0, py: true, hidden: L.status !== 'published' };
    const old = subj.topics.findIndex(x => x.id === L.topic); if (old >= 0) subj.topics[old] = t; else subj.topics.push(t);
    TP[L.topic] = { ...t, subj };
    if (L.questions?.length) window.TeacherLessons.questions[L.topic] = L.questions;
    const meta = {}; ks.forEach(k => { meta[k] = { title: L.titles[k], max: L.withHw[k], min: L.minutes[k], desc: '' }; }); meta[5] = { title: 'Үй жұмысы', max: 25 };
    window.TeacherLessons.tasks[L.topic] = meta; if (!WINT.includes(L.topic)) WINT.push(L.topic);
  });
}
async function start(){ $('#login').hidden = true; $('#app').hidden = false; $('#topnav').hidden = false; await loadDataLessons(); loadLive(true); loadRoster(); }
/* ---------- Пәндер мен тақырыптар: барлық ереже бір жерде ---------- */
/* att — кіргенге түсетін балл, tasks — тапсырма саны, min — әдепкі жұмыс уақыты, ai — ЖИ бағасы бар ма, py — қатемен жұмыс кезеңі бар ма */
const SUBJ = window.TeacherLessons.subjects;
const TP = {}; SUBJ.forEach(s => s.topics.forEach(t => { TP[t.id] = { ...t, subj: s }; }));
const TL = ti => { const base = ti.tl || Array.from({ length: ti.tasks }, (_, i) => i + 1); return LIVE && LIVE.pycfg && LIVE.pycfg.hw === false && LIVE.session && LIVE.session.topic === ti.id ? base.filter(k => k !== 5) : base; };   /* тапсырма нөмірлері (кейбір сабақта 2 және 4 кейін қосылады) */
const tinfo = id => TP[id] || { id, n: id, title: String(id), subj: { id: '', name: '' }, path: '/', min: 30, tasks: 3, att: 40 };
const tname = id => { const t = tinfo(id); return (t.subj.name ? t.subj.name + ' · ' : '') + t.n + '-тақырып: ' + t.title; };
const tshort = id => { const t = tinfo(id); return (t.subj.name ? t.subj.name + ' ' : '') + t.n; };
const fdate = t => { const d = new Date(t * 1000), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
const download = (name, text) => { const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })), download: name }); document.body.append(a); a.click(); a.remove(); };
const csv = rows => rows.map(r => r.map(v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
let STF = '', SESS = { t: 0, rows: null, busy: false, g: '', s: '' }, LS = {}, lessonStarting = false, lessonPending = false, rosterRevision = 0;
try { LS = JSON.parse(sessionStorage.getItem('tstart') || '{}'); } catch (e) {}

/* ---------- Сабақ (live) ---------- */
const lessonPath = () => {
  const topic = LIVE?.session?.topic || LS.t || '6';
  return /^P\d+$/.test(topic) ? '/live/python/' + topic : tinfo(topic).path;
};
function openPj(){ const u = location.origin + lessonPath(); $('#pjUrl').textContent = u; $('#pj').hidden = false; document.body.style.overflow = 'hidden'; fillPj(); }
function closePj(){ $('#pj').hidden = true; document.body.style.overflow = ''; }
function fillPj(){ if ($('#pj').hidden || !LIVE || !LIVE.session) return; $('#pjCode').textContent = LIVE.session.code || ''; $('#pjTtl').textContent = 'Код ' + mmss(600 - (Math.floor(Date.now() / 1000 + skew) % 600)) + ' минуттан кейін өзгереді'; }
$('#pjX').addEventListener('click', closePj); document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#pj').hidden) closePj(); });
function tickTimer(){
  fillPj();
  const t = $('#timer'), ses = LIVE.session;
  if (t && ses.work_until) {
    const nowS = Date.now() / 1000 + skew, left = Math.floor(ses.work_until - nowS);
    if (left > 0) { t.textContent = '⏱ ' + mmss(left); t.classList.toggle('late', left <= 300); }
    else if (tinfo(ses.topic).py && nowS < ses.work_until + 900) { t.textContent = '🔁 Қатемен жұмыс ' + mmss(Math.floor(ses.work_until + 900 - nowS)); t.classList.remove('late'); }
    else { t.textContent = '⏱ Уақыт бітті'; t.classList.add('late'); }
  }
  const c = $('#codettl'); if (c) c.textContent = 'Код ' + mmss(600 - (Math.floor(Date.now() / 1000 + skew) % 600)) + ' минуттан кейін өзгереді';
}

/* 8-сабақ: жұптарды құру және «Сандық» ойынын тікелей бақылау */
const PSEL = new Set();
function pairCard(ses){
  const open = ses.status === 'open', free = LIVE.free || [], pairs = (LIVE.pairs || []).slice(), box = h('div', { class: 'card' });
  [...PSEL].forEach(id => { if (!free.some(f => f.id === id)) PSEL.delete(id); });
  const act = async (p, body) => { const j = await api(p, Object.assign({ session_id: ses.id }, body || {})); if (!j.ok) alert(j.error === 'taken' ? 'Бұл студент қазір бос емес.' : j.error === 'started' ? 'Бұл жұп жұмысты бастап қойған, бұзуға болмайды.' : 'Қате болды.'); PSEL.clear(); loadLive(true); };
  pairs.sort((a, b) => (a.open_at && b.open_at ? a.open_at - b.open_at : a.open_at ? -1 : b.open_at ? 1 : b.pts - a.pts));
  const opened = pairs.filter(p => p.open_at).length;
  box.append(h('div', { class: 'row', style: 'margin-bottom:6px' }, [h('h2', { text: '👥 Жұптар · «Сандық»', style: 'margin:0' }), h('span', { class: 'sp' }), h('span', { class: 'sub', style: 'display:inline', text: pairs.length + ' жұп · сандық ашқан: ' + opened + ' · жұпсыз: ' + free.length })]));
  if (open) {
    const sel = [...PSEL];
    box.append(h('p', { class: 'sub', text: free.length ? 'Жұпсыз студенттер (екеуін таңдап «Жұптау» батырмасын бас, немесе кездейсоқ жұптат):' : (pairs.length ? 'Барлық кірген студент жұпта. Кешіккен студент кірсе, осы жерде пайда болады.' : 'Студенттер сабаққа кіргенде осы жерде пайда болады.') }));
    if (free.length) box.append(h('div', { class: 'row', style: 'flex-wrap:wrap;gap:6px;margin-bottom:8px' }, free.map(f => h('button', { class: 'btn sm' + (PSEL.has(f.id) ? ' primary' : ''), text: (PSEL.has(f.id) ? '✓ ' : '') + f.name, on: { click: () => { if (PSEL.has(f.id)) PSEL.delete(f.id); else PSEL.add(f.id); renderLive(); } } }))));
    box.append(h('div', { class: 'row', style: 'flex-wrap:wrap;gap:8px;margin-bottom:10px' }, [
      h('button', { class: 'btn primary', text: '🔗 Таңдалған екеуін жұптау', disabled: sel.length !== 2, on: { click: () => act('pairs/make', { a: sel[0], b: sel[1] }) } }),
      h('button', { class: 'btn', text: '👤 Таңдалғанды жеке', disabled: sel.length !== 1, on: { click: () => act('pairs/make', { a: sel[0] }) } }),
      h('button', { class: 'btn', text: '🎲 Қалғандарды кездейсоқ жұптау (' + free.length + ')', disabled: !free.length, on: { click: () => { if (confirm('Жұпсыз ' + free.length + ' студентті кездейсоқ жұптайсыз ба?' + (free.length % 2 ? ' Біреуі жеке қалады.' : ''))) act('pairs/auto'); } } })]));
  }
  if (!pairs.length) { box.append(h('p', { class: 'sub', text: 'Жұп әлі құрылған жоқ. Студенттер 2-тапсырмаға жұп құрылғаннан кейін кіреді, 1 және 3-тапсырманы жұпсыз орындай береді.' })); return box; }
  const cell = it => it.ok ? h('td', { style: 'color:#15803d;font-weight:700', text: '✓' + (it.tries > 1 ? ' (' + it.tries + ')' : '') }) : it.done ? h('td', { style: 'color:#b45309', text: '✗ ' + it.tries }) : h('td', { text: '·' });
  const ago = p => { const m = Math.max(0, Math.round((LIVE.now - p.last) / 60)); return m < 1 ? 'жаңа' : m + ' мин бұрын'; };
  const head = ['', 'Жұп', 'Код', 'Тест', 'Қатені тап', 'Нәтижені тап', 'Кеңес', 'Сандық', 'Балл', 'Соңғы әрекет', ''];
  const rows = pairs.map((p, i) => {
    const stalled = ses.work_until && open && !p.open_at && LIVE.now - p.last > 360;
    return h('tr', { class: stalled ? 'org' : '' }, [
      h('td', { text: p.open_at ? (i === 0 ? '🏆' : '#' + (i + 1)) : '' }),
      h('td', { class: 'l' }, [h('b', { text: p.a.name }), p.b ? h('span', { class: 'sub', style: 'display:block', text: '+ ' + p.b.name }) : h('span', { class: 'sub', style: 'display:block', text: 'жеке' })])]
      .concat(p.items.map(cell))
      .concat([h('td', { text: p.open_at ? String(p.hints) : p.found + ' ашық' }),
        h('td', { style: p.open_at ? 'color:#15803d;font-weight:700' : '', text: p.open_at ? '🔓 ' + hhmm(p.open_at) + ' · ' + p.chest + ' б.' : '🔒 ' + p.solved + '/2' + (p.tries ? ' · қате: ' + p.tries : '') }),
        h('td', {}, h('span', { class: 'pill', style: 'background:' + band(Math.round(p.pts / 25 * 100)), text: p.pts + ' / 25' })),
        h('td', { text: ago(p) }),
        h('td', {}, open && !p.started ? h('button', { class: 'btn sm', title: 'Жұпты бұзу', text: '✕', on: { click: () => { if (confirm('Жұпты бұзасыз ба?')) act('pairs/break', { id: p.id }); } } }) : '')]));
  });
  box.append(h('div', { class: 'tw' }, h('table', { class: 't' }, [h('thead', {}, h('tr', {}, head.map((c, i) => h('th', { class: i === 1 ? 'l' : '', text: c })))), h('tbody', {}, rows)])));
  box.append(h('p', { class: 'sub', text: '✓ — кеңес есебі шешілді (жақшада әрекет саны), ✗ — әлі қате, · — жіберілмеген. «Кеңес» бағанында сандық ашылғанда қанша кеңес қолданылғаны көрсетіледі. Сыйлық: 9 балл, әр кеңес 2 балл, әр қате жауап 1 балл алады. Сары жол — 6 минуттан артық әрекет жоқ.' }));
  return box;
}

/* Жаңа сабақ: 1 пән → 2 тақырып → 3 топ */
function startGroups(){ return LIVE?.allGroups || LIVE?.groups || ROSTER; }
function rememberStart(choice){ LS=choice; try{sessionStorage.setItem('tstart',JSON.stringify(choice));}catch{} }
function syncStartGroups(){ document.querySelectorAll('.lesson-start-form').forEach(form=>form.refreshGroups?.(startGroups())); }
function startCard(preselected={}){
  const choice={...LS,...preselected};
  const courseLink=preselected.courseLink;
  const form=h('form',{class:'card lesson-start-form'});
  const sel=(label,node)=>h('label',{class:'sf'},[h('span',{text:label}),node]);
  const subj=h('select',{class:'field','aria-label':'Пән'},SUBJ.map(s=>h('option',{value:s.id,text:s.ico+' '+s.name})));
  const top=h('select',{class:'field','aria-label':'Тақырып'});
  const grp=h('select',{class:'field','aria-label':'Топ'});
  const note=h('p',{class:'sub'}),info=h('div',{class:'sinfo'});
  const error=h('p',{class:'bad start-error',role:'alert',hidden:true});
  const go=h('button',{type:'submit',class:'btn primary','data-start-submit':'',text:'▶ Сабақты бастау'});
  const manage=btn('Топтарды басқару',()=>{closeNewLesson();goTab('roster');},'sm');
  const remember=()=>rememberStart({s:subj.value,t:top.value,g:grp.value});
  const upd=()=>{
    const t=TP[top.value]; if(!t)return;
    info.replaceChildren();
    [['Тапсырма',t.tasks+' тапсырма'],['Жұмыс уақыты',t.id==='P4'?'49 минут + 10 минут қатемен жұмыс':(t.id==='P9'||t.id==='P10')?'54 минут + 10 минут қатемен жұмыс':t.id==='P12'?t.min+' минут':WINT.includes(t.id)?t.min+' минут + 10 минут қатемен жұмыс':t.min+' минут'+(t.py?' + 15 минут қатемен жұмыс':'')],['Қатысым',t.att?t.att+' балл':'балл берілмейді'],['Бағалау',t.ai?'автоматты + ЖИ':t.py?'автоматты (код нақты орындалады)':'автоматты']].forEach(([k,v])=>info.append(h('span',{class:'sc'},[h('b',{text:k+': '}),v])));
  };
  const fill=keep=>{
    const subject=SUBJ.find(s=>s.id===subj.value)||SUBJ[0];
    top.replaceChildren(...subject.topics.filter(t=>!t.hidden).map(t=>h('option',{value:t.id,text:t.n+'-тақырып: '+t.title})));
    if(subject.topics.some(t=>t.id===keep))top.value=keep;
    upd();
  };
  let groupSignature='',initial=true;
  form.refreshGroups=groups=>{
    const signature=JSON.stringify(groups.map(g=>[g.id,g.name,g.students.filter(s=>s.active!==false).length]));
    if(signature!==groupSignature || initial){
      const wanted=initial?String(choice.g||''):grp.value;
      grp.replaceChildren(h('option',{value:'',text:'— топты таңдаңыз —'}),...groups.map(g=>h('option',{value:String(g.id),text:g.name+' ('+g.students.filter(s=>s.active!==false).length+' студент)'})));
      grp.value=groups.some(g=>String(g.id)===wanted)?wanted:'';
      groupSignature=signature;initial=false;
    }
    note.textContent=courseLink
      ? courseLink.group_name+' · '+courseLink.subject+' · '+courseLink.year+'–'+(courseLink.year+1)
      : groups.length?'Сабақ басталғанда 4 таңбалы кіру коды шығады. Басқа ашық сабақ болса, ол жабылады.':'Алдымен топ қосыңыз. Одан кейін осы жерден сабақ бастай аласыз.';
    go.disabled=lessonStarting||lessonPending||!groups.length;
    go.textContent=lessonStarting?'Басталып жатыр…':'▶ Сабақты бастау';
  };
  subj.onchange=()=>{fill();remember();error.hidden=true;};
  top.onchange=()=>{upd();remember();error.hidden=true;};
  grp.onchange=()=>{remember();error.hidden=true;};
  if(SUBJ.some(s=>s.id===choice.s))subj.value=choice.s;
  fill(choice.t);form.refreshGroups(startGroups());remember();
  if(courseLink)subj.disabled=grp.disabled=true;
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(lessonStarting||lessonPending)return;
    if(!grp.value){error.textContent='Сабақ өтетін топты таңдаңыз.';error.hidden=false;grp.focus();return;}
    remember();lessonStarting=true;error.hidden=true;
    const controls=[subj,top,grp];controls.forEach(el=>el.disabled=true);
    form.setAttribute('aria-busy','true');syncStartGroups();
    try{
      const result=await api('session/start',{topic:top.value,group_id:Number(grp.value),course_group_id:courseLink?.id});
      if(!result.ok){
        error.textContent=ERR_UI[result.error]||'Сабақ басталмады. Қайта көріңіз.';error.hidden=false;
        if(result.error==='no_group')await loadRoster();
        return;
      }
      VIEW=0;SESS.t=0;SESS.rows=null;liveShape='';contextShape='';analysisAt=0;analysisFor=0;
      lessonPending=true;if(LIVE)LIVE.session=null;
      closeNewLesson();
      const live=await loadLive(true);
      goTab('live');rememberUI();
      toast(live?'Сабақ басталды. Кіру коды дайын.':'Сабақ басталды. Деректерді қайта жүктеңіз.',!live);
    }finally{
      lessonStarting=false;controls.forEach(el=>el.disabled=false);form.removeAttribute('aria-busy');syncStartGroups();
      if(courseLink)subj.disabled=grp.disabled=true;
    }
  });
  form.append(h('h2',{text:'Жаңа сабақ'}),note,h('div',{class:'startgrid'},[sel('1 · Пән',subj),sel('2 · Тақырып',top),sel('3 · Топ',grp),go]),error,info,h('div',{class:'start-manage'},manage));
  return form;
}

/* Сақталған сабақтар: әр топқа бөлек блок */
/* Сабақтың қорытынды көрсеткіштері */
function summaryCard(ses, all, ti){
  const pres = all.filter(s => s.present), tot = pres.map(s => s.total), avg = tot.length ? Math.round(tot.reduce((a, b) => a + b, 0) / tot.length) : 0;
  const flag = ti.ai ? pres.filter(s => s.ai_pct >= 50).length : 0;
  const cells = [['Келген', pres.length + ' / ' + all.length], ['Жұмысты бітірген', String(pres.filter(s => s.complete).length)], ['Орташа балл', tot.length ? String(avg) : '—'], ['Ең жоғары', tot.length ? String(Math.max(...tot)) : '—'], ['Ең төмен', tot.length ? String(Math.min(...tot)) : '—']].concat(ti.ai ? [['ЖИ күдігі (50%+)', String(flag)]] : []);
  const exp = () => { const head = ['Топ', 'Студент', 'Қатысым', 'Нұсқа'].concat(TL(ti).map(n => n + '-тапсырма')).concat(['Қорытынды балл']); const rows = LIVE.groups.flatMap(g => g.students.filter(s => s.active !== false).map(s => [g.name, s.name, s.present ? 'иә' : 'жоқ', s.present ? s.variant : ''].concat(TL(ti).map(n => { const t = s.tasks && s.tasks[n]; return t && t.sent ? t.pts : ''; })).concat([s.present ? s.total : '']))); download('нәтиже-' + ses.id + '.csv', csv([head].concat(rows))); };
  return h('div', { class: 'card' }, [h('div', { class: 'row', style: 'margin-bottom:8px' }, [h('h2', { text: 'Сабақ қорытындысы', style: 'margin:0' }), h('span', { class: 'sp' }), h('button', { class: 'btn sm', text: '⬇ CSV', on: { click: exp } })]), h('div', { class: 'stats4' }, cells.map(([l, v]) => h('div', { class: 'stat4' }, [h('b', { text: v }), h('span', { text: l })])))]);
}

/* ---------- Студенттің толық жұмысы ---------- */
async function openDetail(sid, stu){ DETAIL = { sid, stu }; const j = await api('work?session=' + sid + '&student=' + stu); if (!j.ok) return; paintDetail(j); $('#ov').hidden = false; document.body.style.overflow = 'hidden'; }
function closeDetail(){ if (detailDirty && !confirm('Сақталмаған өзгерістер бар. Терезені жабасыз ба?')) return; detailDirty = false; DETAIL = null; $('#ov').hidden = true; document.body.style.overflow = ''; }
$('#ov').addEventListener('click', e => { if (e.target.id === 'ov') closeDetail(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && DETAIL) closeDetail(); });
async function reDetail(note){ const j = await api('work?session=' + DETAIL.sid + '&student=' + DETAIL.stu); if (j.ok) { paintDetail(j); if (note) { const m = $('#panel .msg'); if (m) { m.className = 'msg ok'; m.textContent = note; } } } loadLive(true); }
const pre = (t, v) => h('div', { class: 'box' }, [h('h3', { text: t }), h('pre', { text: v === '' || v === undefined || v === null ? '—' : String(v) })]);
function paintDetail(j){ detailDirty = false;
  const P = $('#panel'); P.innerHTML = ''; const c = j.calc;
  P.append(h('div', { class: 'p-head' }, [h('h2', { text: j.student.name }), h('span', { class: 'sub', text: j.student.group + ' · ' + tname(j.session.topic) + (j.attendance && j.session.topic !== '10' ? ' · нұсқа №' + j.attendance.variant : '') }), h('span', { class: 'sp' }), h('button', { class: 'btn', text: '✕ Жабу', on: { click: closeDetail } })]));
  const x10 = ['10', 'S7', 'A13', 'A2', 'P7', 'P8'].includes(j.session.topic) || WINT.includes(j.session.topic), x7 = j.session.topic === '7';
  const left = h('div', {}, x10 ? [] : [pre('Студентке берілген жүйе', j.sys), pre('Дұрыс жауап (тек сізге)', j.note)]);
  const right = h('div', {});
  const by = {}; j.subs.forEach(s => { by[s.task] = s; });
  (['P4', 'P9', 'P10'].includes(j.session.topic) || WINT.includes(j.session.topic) ? Object.keys(c.tasks).map(Number) : j.session.topic === 'P8' ? [1, 2, 3] : j.session.topic === 'A2' || j.session.topic === 'P7' ? [1, 2, 3, 4] : [1, 2, 3]).forEach(n => {
    const s = by[n], t = c.tasks[n];
    const title = taskMeta[j.session.topic]?.[n] ? n + '-тапсырма · ' + taskMeta[j.session.topic][n].title + ' (' + (c.tasks[n] && c.tasks[n].max !== undefined ? c.tasks[n].max : taskMeta[j.session.topic][n].max) + ')' : j.session.topic === 'P4' ? n === 5 ? '5-тапсырма · Үй жұмысы (25)' : n === 4 ? '4-тапсырма · Қорытынды тест (10)' : n === 3 ? '3-тапсырма · Формуланы кодқа айналдыру: 5 есеп (20)' : n === 2 ? '2-тапсырма · Есепті кодқа айналдыру: 4 есеп (30)' : '1-тапсырма · Экранға не шығады: 15 жылдам есеп (15)' : j.session.topic === 'P8' ? n + '-тапсырма · ' + { 1: 'Есептерді Python тілінде орындау (30)', 2: 'Жұптық «Сандық» (25)', 3: 'Тест: if–else және elif (20)' }[n] : j.session.topic === 'P7' ? n + '-тапсырма · ' + ['Есептерді Python тілінде орындау (20)', 'Практикалық есептер (40)', 'Кодтағы қателерді түзету (20)', 'Қорытынды тест (20)'][n - 1] : x10 && j.session.topic === 'A2' ? n + '-тапсырма · ' + ['Құрылғыларды қызмет түріне бөлу (12)', 'Бағдарламаларды топқа жіктеу (18)', 'Компьютер сипаттамасы (10)', 'Аппараттық және программалық жабдықтама (30)'][n - 1] : x10 && j.session.topic === 'A13' ? n + '-бөлім · ' + ['Сұрақ пен жауап (10×2)', 'Медиа (10×3)', 'Рәсімдеу, дизайн (10×2)'][n - 1] : x10 && j.session.topic === 'S7' ? n + '-бөлім · ' + ['Ойыншыны басқару', 'Кедергінің қозғалысы', 'Жеңу/ұтылу, анимация, дыбыс, түсіндіру'][n - 1] : x7 ? n + '-тапсырма · ' + ['Сызықтық интерполяция (оңай)', 'Шеткі айырымдар (орташа)', 'Квадраттық интерполяция (орташа)'][n - 1] : x10 ? n + '-лист · ' + ['Оңай', 'Орташа', 'Күрделі'][n - 1] : n === 1 ? '1-тапсырма · Қолмен есептеу' : n === 2 ? '2-тапсырма · Бағдарлама' : '3-тапсырма · Тест';
    if (!s) { const box=h('div',{class:'box'},[h('h3',{text:title}),h('p',{class:'sub',text:n===5&&j.hw_upload?'Фото сақталды. ЖИ бағасы әлі қойылмаған.':'Әлі жіберілмеген.'})]);if(n===5&&j.hw_upload)box.append(homeworkUploadView(j.hw_upload));left.append(box);return; }
    const p = s.payload, parts = [h('h3', { text: title + ' — ' + t.pts + ' / ' + t.max + (t.edited ? ' (сіз қойдыңыз)' : '') })];
    if (x10 && s.flags) parts.push(h('p', { class: 'aibox', text: s.flags }));
    if (x10) parts.push(h('pre', { text: (p.items || []).map(i => (i.got >= i.max ? '✓ ' : i.got > 0 ? '◑ ' : '✗ ') + i.id + '  ' + i.label + ' — ' + i.got + ' / ' + i.max).join('\n') }));
    if (x7) {
      const r = p.run || {}, sg = s.signals || {};
      if (p.zero) parts.push(h('p', { class: 'aibox', text: '🔴 ' + (p.zero === 'paste' ? 'Код сырттан көшіріліп қойылған (қою әрекеті: ' + (sg.pasted || 0) + ' таңба): 0 балл.' : 'Код терілмей пайда болған (жазылған ' + (sg.typed || 0) + ' + көмек ' + (sg.assist || 0) + ' таңба, код ' + (p.code || '').length + '): 0 балл.') }));
      if (p.late > 1) parts.push(h('p', { class: 'aibox', text: '⏱ Мерзімнен ' + p.late + ' минут кеш жіберілді: балл ×' + t.late_factor + '.' }));
      parts.push(h('pre', { text: p.code || '—' }), h('pre', { text: 'Тіл: ' + (p.lang || 'python') + ' · нақты орындалды (' + (r.status || '—') + ')\nНәтиже: ' + (r.stdout || '—') + (r.stderr ? '\nҚате: ' + r.stderr : '') + '\nТексеру: ' + (p.items || []).map(i => (i.ok ? '✓ ' : '✗ ') + i.label + ' (' + i.w + ')').join(' · ') + '\nНәтиже балы: ' + s.auto_score + ' · терілген ' + (sg.typed || 0) + ', автотолтыру ' + (sg.assist || 0) + ', қою әрекеті ' + (sg.paste || 0) + ', беттен шыққан ' + (sg.away || 0) }));
      parts.push(h('p', { class: 'sub', text: 'ЖИ: ' + (has(s.ai_score) ? s.ai_score + ' · ЖИ үлесі ' + s.ai_pct + '%' : 'әлі бағаланған жоқ') })); if (s.flags) parts.push(h('p', { class: 'aibox', text: s.flags })); if (s.ai_comment) parts.push(h('p', { class: 'aibox', text: s.ai_comment }));
    }
    if (j.session.topic === 'P4' && n === 5 && j.hw) parts.push(h('div', { style: 'overflow:auto;max-height:520px;margin-bottom:8px' }, h('img', { src: 'data:' + (j.hw.mime || 'image/jpeg') + ';base64,' + j.hw.photo, alt: 'Үй жұмысы', style: 'max-width:100%' })), h('p', { class: 'aibox', text: 'ЖИ: ' + j.hw.score + ' / 25 · әрекет: ' + j.hw.attempts + '. ' + (j.hw.comment || '') }));
    if (j.session.topic === 'P4' && n === 5 && p.review) parts.push(homeworkReviewView(p.review));
    if (n === 5 && j.hw_upload) parts.push(homeworkUploadView(j.hw_upload));
    if (!x10 && !x7 && n === 1) {
      if (p.photo) parts.push(h('div', { style: 'overflow:auto;max-height:520px;margin-bottom:8px' }, h('img', { src: 'data:' + (p.photo_mime || 'image/jpeg') + ';base64,' + p.photo, alt: 'Дәптер фотосы', title: 'Басып үлкейту', style: 'max-width:100%;border-radius:12px;border:1px solid var(--line);cursor:zoom-in', on: { click: e => { e.target.style.maxWidth = e.target.style.maxWidth === 'none' ? '100%' : 'none'; } } })));
      else parts.push(h('p', { class: 'sub', text: 'Фото жүктелмеген.' }));
      parts.push(h('pre', { text: 'Жауаптар: ' + (p.ans || []).join(' ; ') + '\nЖауап балы: ' + s.auto_score + ' / 9' }));
      if (p.steps) parts.push(h('pre', { text: p.steps }));
    }
    if (!x10 && !x7 && n === 2) { const r = p.run || {}; parts.push(h('pre', { text: p.code || '—' }), h('pre', { text: 'Тіл: ' + (p.lang || 'python') + ' · нақты орындалды (' + (r.status || '—') + ')\nНәтиже: ' + (r.stdout || p.out || '—') + (r.stderr ? '\nҚате: ' + r.stderr : '') + '\nНәтиже балы: ' + s.auto_score + ' / 12' })); }
    if (!x10 && !x7 && n === 3) parts.push(h('pre', { text: 'Таңдаған жауаптар (нөмірі): ' + (p.quiz || []).map(v => v === null ? '—' : v + 1).join(', ') + '\nДұрыс жауап балы: ' + s.auto_score + ' / 12' }));
    if (!x10 && !x7 && n < 3) { parts.push(h('p', { class: 'sub', text: 'ЖИ: ' + (has(s.ai_score) ? s.ai_score + ' / ' + (n === 1 ? 15 : 12) + ' · ЖИ үлесі ' + s.ai_pct + '%' : 'әлі бағаланған жоқ') })); if (s.flags) parts.push(h('p', { class: 'aibox', text: s.flags })); if (s.ai_comment) parts.push(h('p', { class: 'aibox', text: s.ai_comment })); }
    const sc = h('input', { class: 'field', type: 'number', min: '0', max: String(t.max), style: 'width:90px', placeholder: String(t.pts), value: has(s.teacher_score) ? String(s.teacher_score) : '' });
    const cm = h('input', { class: 'field', type: 'text', placeholder: 'Пікір (міндетті емес)', value: s.teacher_comment || '', style: 'flex:1;min-width:160px' });
    parts.push(h('div', { class: 'row', style: 'margin-top:8px' }, [h('span', { text: 'Балл:' }), sc, cm, h('button', { class: 'btn sm primary', text: 'Сақтау', on: { click: async () => { const saved = await api('task_grade', { id: s.id, task: n, score: sc.value.trim(), comment: cm.value }); if (!saved.ok) return; detailDirty = false; reDetail('Сақталды ✓'); } } }),
      (x7 || (n < 3 && !x10)) ? h('button', { class: 'btn sm', text: 'ЖИ-мен қайта', on: { click: async e => { e.target.disabled = true; e.target.textContent = 'Тексеріп жатыр…'; const saved = await api('regrade', { id: s.id }); if (!saved.ok) { e.target.disabled = false; e.target.textContent = 'ЖИ-мен қайта'; return; } detailDirty = false; reDetail('ЖИ қайта бағалады ✓'); } } }) : '',
      h('button', { class: 'btn sm danger', text: 'Қайта орындату', title: 'Жауаптарды тазалап, тапсырманы қайта орындату', on: { click: async () => { if (confirm('Осы тапсырманың жауаптары мен автоматты бағасы тазаланады. Студент оны қайта орындай алады. Жалғастырасыз ба?')) { const saved = await api('reopen', { id: s.id }); if (!saved.ok) return; detailDirty = false; reDetail('Қайта ашылды ✓'); } } } })]));
    left.append(h('div', { class: 'box' }, parts));
  });
  const tot = h('input', { class: 'field big', type: 'number', min: '0', max: '100', placeholder: String(c.auto), value: j.result && has(j.result.teacher_total) ? String(j.result.teacher_total) : '' });
  const tc = h('textarea', { class: 'field', rows: '2', placeholder: 'Пікір (міндетті емес)' }); tc.value = j.result ? j.result.teacher_comment || '' : '';
  right.append(h('div', { class: 'box edit' }, [h('h3', { text: 'Қорытынды балл: ' + c.final + ' / 100' + (c.edited_total ? ' (сіз қойдыңыз)' : '') }),
    h('dl', { class: 'kv' }, (j.session.topic === 'P4' || j.session.topic === 'P7' || j.session.topic === 'P8' || j.session.topic === 'P9' || j.session.topic === 'P10' || WINT.includes(j.session.topic) ? [['Тапсырмалар' + (j.session.topic === 'P4' ? '' : ' (қатемен жұмыс есепке алынған)'), c.quality + ' / ' + (j.session.topic === 'P4' ? 100 : j.session.topic === 'P8' ? 75 : 100)], ['Автоматты балл', String(c.auto)]] : x10 ? [['Қатысым', c.attendance + (j.session.topic === 'A13' || j.session.topic === 'A2' ? ' / 30' : ' / 40')], [j.session.topic === 'S7' || j.session.topic === 'A13' || j.session.topic === 'A2' ? 'Үш бөлім (сапа)' : 'Үш лист (сапа)', c.quality + (j.session.topic === 'A13' || j.session.topic === 'A2' ? ' / 70' : ' / 60')], ['Автоматты балл', String(c.auto)]] : [['Қатысым', c.attendance + ' / 40'], ['Тапсырмалар (сапа)', c.quality + ' / 60'], ['ЖИ үлесі (3 тапсырманың орташасы)', c.ai_pct + '%'], ['ЖИ коэффициенті', String(c.k)], ['Автоматты балл', String(c.auto)]]).flatMap(([a, b]) => [h('dt', { text: a }), h('dd', { text: b })])),
    h('label', { text: 'Қорытынды балл (0–100). Бос қалса, автоматты балл алынады.' }), tot, h('label', { text: 'Пікір' }), tc,
    h('div', { class: 'row', style: 'margin-top:12px' }, [h('button', { class: 'btn primary', text: 'Сақтау', on: { click: async () => { const v = tot.value.trim(); if (v !== '' && (isNaN(+v) || +v < 0 || +v > 100)) return; const saved = await api('total', { session_id: DETAIL.sid, student_id: DETAIL.stu, total: v, comment: tc.value }); if (!saved.ok) return; detailDirty = false; reDetail('Сақталды ✓ Журналға түсті.'); } } }),
      h('button', { class: 'btn', text: 'Автоматты баллға қайту', on: { click: async () => { const saved = await api('total', { session_id: DETAIL.sid, student_id: DETAIL.stu, total: null, comment: tc.value }); if (!saved.ok) return; detailDirty = false; reDetail('Автоматты баллға қайтты ✓'); } } })]), h('div', { class: 'msg', role: 'status' })]));
  P.append(h('div', { class: 'p-body' }, [left, right]));
}

/* ---------- Бекіту: 3 сұрақ, дөңгелек, бонус, кері байланыс ---------- */
let QUESTIONS = ['Гаусс–Зейдель әдісінің басты ерекшелігі қандай?', 'Әдіс қандай шартта жинақталады?', 'Итерацияны қашан тоқтатамыз?'];
const FACES = ['😟', '😕', '😐', '🙂', '😀'];
let WR = null, spinning = false, qi = 0, picked = null, rot = 0, wnote = '', PICKED = new Set(), NOREP = true, pickSes = 0;
async function loadWrap(){ if (spinning) return; const [c, fb] = await Promise.all([api('consolidate' + sessionQuery()), api('feedback' + sessionQuery())]); if (c.ok && fb.ok) { WR = { c, fb }; renderWrap(); } }
setInterval(() => { if (TOK && !document.hidden && TAB === 'wrap' && !spinning && !picked) loadWrap(); }, 10000);
const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#7C3AED', '#0891B2', '#EA580C', '#DB2777', '#4F46E5', '#65A30D'];
function drawWheel(cv, names){
  const S = 760, cx = S / 2, ctx = cv.getContext('2d'), n = names.length, seg = 2 * Math.PI / n;
  cv.width = S; cv.height = S; ctx.clearRect(0, 0, S, S);
  names.forEach((nm, i) => {
    const a0 = -Math.PI / 2 + i * seg; ctx.beginPath(); ctx.moveTo(cx, cx); ctx.arc(cx, cx, cx - 4, a0, a0 + seg); ctx.closePath(); ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.save(); ctx.translate(cx, cx); ctx.rotate(a0 + seg / 2); ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = '600 ' + (n > 8 ? 30 : 36) + 'px system-ui,sans-serif';
    const short = nm.length > 18 ? nm.slice(0, 17) + '…' : nm; ctx.fillText(short, cx - 30, 12); ctx.restore();
  });
  ctx.beginPath(); ctx.arc(cx, cx, 34, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
}
function renderWrap(){
  const root = $('#s-wrap'), c = WR.c, fb = WR.fb; root.innerHTML = '';
  if (c.session && c.session.id !== pickSes) { pickSes = c.session.id; PICKED = new Set(); }
  const low = NOREP ? c.low.filter(x => !PICKED.has(x.id)) : c.low;
  root.append(h('div', { class: 'card' }, [h('h2', { text: 'Бекіту: 3 жалпы сұрақ' }), h('ol', { class: 'qs' }, QUESTIONS.map((q, i) => h('li', { class: i === qi % 3 ? 'cur' : '', text: q }))),
    h('p', { class: 'sub', text: 'Жауап беретін студентті дөңгелек таңдайды: ең аз балл алған 10 студент арасынан. Дұрыс жауап бонус балл болып, жалпы баллға және журналға қосылады.' })]));
  if (!low.length) { root.append(h('div', { class: 'card' }, c.low.length ? [h('p', { text: 'Барлық студент таңдалып болды (' + c.low.length + ').' }), h('button', { class: 'btn primary', text: '↺ Тізімді қайта толтыру', on: { click: () => { PICKED = new Set(); renderWrap(); } } })] : h('p', { text: 'Әзірге сабаққа кірген студент жоқ.' }))); }
  else {
    const cv = h('canvas', { 'aria-label': 'Студент таңдау дөңгелегі' });
    const win = h('div'), info = h('p', { class: 'sub', style: 'text-align:center', text: low.length + ' студент: ' + low.map(x => x.name.split(' ')[0] + ' ' + x.total).join(', ') });
    const spinB = h('button', { class: 'btn primary', style: 'font-size:1.15rem;min-height:52px;padding:0 28px', text: '🎯 Айналдыру', on: { click: () => spin() } });
    const chk = h('input', { type: 'checkbox', style: 'width:20px;height:20px', on: { change: e => { NOREP = e.target.checked; renderWrap(); } } }); chk.checked = NOREP;
    const taken = c.low.filter(x => PICKED.has(x.id));
    root.append(h('div', { class: 'card', style: 'text-align:center' }, [h('h2', { text: 'Дөңгелек', style: 'text-align:left' }), h('div', { class: 'wheel-wrap' }, [h('div', { class: 'pointer' }), cv]), h('div', { style: 'margin:14px 0' }, spinB),
      h('div', { class: 'row', style: 'justify-content:center;margin-bottom:8px' }, [h('label', { style: 'display:flex;gap:8px;align-items:center;cursor:pointer' }, [chk, 'Бұрын таңдалғанды қайталамау']), h('button', { class: 'btn sm', text: '↺ Тізімді қайта толтыру', on: { click: () => { PICKED = new Set(); renderWrap(); } } })]),
      taken.length ? h('p', { class: 'sub', style: 'text-align:center', text: 'Таңдалғандар (' + taken.length + '): ' + taken.map(x => x.name.split(' ')[0]).join(', ') }) : '', info, win]));
    drawWheel(cv, low.map(x => x.name));
    cv.style.transform = 'rotate(' + rot + 'deg)';
    function spin(){
      if (spinning) return; spinning = true; picked = null; win.innerHTML = ''; spinB.disabled = true;
      const n = low.length, seg = 360 / n, w = crypto.getRandomValues(new Uint32Array(1))[0] % n;
      const r0 = ((rot % 360) + 360) % 360, delta = (((-(w + 0.5) * seg - r0) % 360) + 360) % 360;
      rot = rot + 360 * 6 + delta; cv.style.transition = 'transform 4.6s cubic-bezier(.12,.7,.2,1)'; cv.style.transform = 'rotate(' + rot + 'deg)';
      setTimeout(() => { spinning = false; spinB.disabled = false; picked = low[w]; PICKED.add(picked.id); showWinner(); }, 4800);
    }
    function showWinner(){
      const p = picked, q = QUESTIONS[qi % 3], pts = h('input', { class: 'field', type: 'number', min: '1', max: '10', value: '5', style: 'width:80px' });
      const give = async v => { if (!(v >= 1)) return; await api('bonus', { session_id: c.session.id, student_id: p.id, points: v, note: q }); picked = null; qi++; wnote = p.name + ': +' + v + ' балл қосылды ✓'; loadWrap(); };
      win.innerHTML = ''; win.append(h('div', { class: 'winner', style: 'text-align:left' }, [h('h3', { text: '🎯 ' + p.name }), h('span', { class: 'sub', text: p.group + ' · қазіргі балл ' + p.total + (p.bonus ? ' (оның ішінде бонус +' + p.bonus + ')' : '') }), h('div', { class: 'q', text: q }),
        h('div', { class: 'row' }, [h('button', { class: 'btn primary', text: 'Дұрыс +5', on: { click: () => give(5) } }), h('button', { class: 'btn', text: 'Жартылай +3', on: { click: () => give(3) } }), h('button', { class: 'btn', text: 'Қате · 0', on: { click: () => { picked = null; qi++; renderWrap(); } } }), h('span', { class: 'sp' }), pts, h('button', { class: 'btn sm', text: 'Қосу', on: { click: () => give(+pts.value) } })])]));
    }
    if (picked) showWinner();
  }
  root.append(h('div', { class: 'card' }, [h('h2', { text: 'Бонус баллдар' }), wnote ? h('p', { class: 'ok', style: 'font-weight:600', text: wnote }) : '', c.log.length ? h('div', {}, c.log.map(l => h('div', { class: 'cmt row' }, [h('span', { text: l.full_name + ' · +' + l.points + ' · ' + (l.note || '') }), h('span', { class: 'sp' }), h('button', { class: 'btn sm danger', text: '✕', title: 'Өшіру', on: { click: async () => { await api('bonus_delete', { id: l.id }); wnote = ''; loadWrap(); } } })]))) : h('p', { class: 'sub', text: 'Әзірге бонус қойылған жоқ.' })]));
  const mx = Math.max(1, ...fb.levels);
  root.append(h('div', { class: 'card' }, [h('h2', { text: 'Кері байланыс (рефлексия)' }), h('p', { class: 'sub', text: fb.rows.length + ' / ' + fb.present + ' студент жауап берді' }),
    h('div', {}, fb.levels.map((n, i) => h('div', { class: 'bar5' }, [h('span', { text: FACES[i] + ' ' + (i + 1) }), h('div', { class: 'b' }, h('i', { style: 'width:' + (n / mx * 100) + '%' })), h('b', { text: String(n) })]))),
    fb.rows.length ? h('div', { style: 'margin-top:12px' }, fb.rows.map(r => h('div', { class: 'cmt' }, [h('b', { text: FACES[r.level - 1] + ' ' + r.name }), h('span', { class: 'sub', text: r.group + (r.hard ? ' · қиын: ' + r.hard : '') + (r.learned.length ? ' · түсінді: ' + r.learned.join(', ') : '') }), r.comment ? h('div', { text: r.comment }) : '']))) : '']));
}

/* ---------- Сабақ жоспары (тек мұғалімдерге) ---------- */
/* ---------- Топтар мен студенттер ---------- */
function applyRoster(groups){
  ROSTER=groups;
  if(LIVE)LIVE.allGroups=groups;
  contextShape='';syncStartGroups();
}
async function loadRoster(){
  const revision=rosterRevision,j=await api('roster');
  if(!j.ok)return;
  if(revision===rosterRevision)applyRoster(j.groups);
  renderRoster();
}
function setRoster(j){
  if(!j.ok)return;
  rosterRevision++;applyRoster(j.groups);renderRoster();loadLive(true);
}
/* ---------- Журнал ---------- */
let js = '', jq = '', jsort = 'name';
async function loadJournal(){ const j = await api('journal'); if (j.ok) { JOUR = j; renderJournal(); } }
function loadProgress(){
  return window.TeacherProgress({
    root:$('#s-progress'),h,api,
    async startLesson(course){
      if(!SUBJ.some(s=>s.id===course.course))await loadDataLessons();
      if(!SUBJ.some(s=>s.id===course.course&&s.topics.some(t=>!t.hidden))){
        toast('Бұл курстың тапсырмасы бар жарияланған сабағын таңдаңыз.',true);return;
      }
      if(!startGroups().some(g=>g.id===course.group_id))await loadRoster();
      newLesson({s:course.course,g:String(course.group_id),courseLink:course});
    }
  });
}
/* бағандар: алдымен пән бойынша, сосын тақырып нөмірі бойынша */
function jTopics(){
  const ord = id => { const t = TP[id]; return t ? SUBJ.indexOf(t.subj) * 1000 + (+t.n || 0) : 9999; };
  return JOUR.topics.slice().sort((a, b) => ord(a) - ord(b)).filter(t => !js || (TP[t] && TP[t].subj.id === js));
}
const jTaken = sc => !!(sc && (sc.present || sc.sent));
function jRows(){
  const T = jTopics(), q = jq.trim().toLowerCase();
  const rows = JOUR.groups.filter(g => !jf || String(g.id) === jf).flatMap(g => g.students.map(s => {
    const got = T.map(t => s.scores[t]).filter(jTaken), avg = got.length ? Math.round(got.reduce((a, x) => a + x.total, 0) / got.length) : null;
    return { g: g.name, s, avg, n: got.length };
  })).filter(r => !q || r.s.name.toLowerCase().includes(q));
  if (jsort === 'avg') rows.sort((a, b) => (b.avg === null ? -1 : b.avg) - (a.avg === null ? -1 : a.avg) || a.s.name.localeCompare(b.s.name, 'kk'));
  else rows.sort((a, b) => a.g.localeCompare(b.g, 'kk') || a.s.name.localeCompare(b.s.name, 'kk'));
  return rows;
}
function jTable(){ const T = jTopics(); return [['Аты-жөні', 'Тобы'].concat(T.map(tname)).concat(['Орташа'])].concat(jRows().map(r => [r.s.name, r.g].concat(T.map(t => jTaken(r.s.scores[t]) ? r.s.scores[t].total : '')).concat([r.avg === null ? '' : r.avg]))); }
function renderJournal(){
  const root = $('#s-journal'); root.innerHTML = '';
  root.append(h('div',{class:'journal-explainer'},[h('p',{class:'sub',text:'Бір тақырып бірнеше рет өтсе, студенттің ең жоғары бағасы алынады. Өшірілген сабақтар есепке кірмейді.'}),btn('Сабақтарды басқару',()=>goTab('archive'),'sm')]));
  if (!JOUR.topics.length) { root.append(h('div', { class: 'card' }, h('p', { text: 'Әлі сабақ өткен жоқ.' }))); return; }
  const T = jTopics(), rows = jRows();
  const opt = (v, t, cur) => h('option', { value: v, text: t, selected: cur === v ? 'selected' : false });
  const subjSel = h('select', { class: 'field', style: 'max-width:200px', 'aria-label': 'Пән', on: { change: e => { js = e.target.value; renderJournal(); } } }, [opt('', 'Барлық пән', js)].concat(SUBJ.filter(s => JOUR.topics.some(t => TP[t] && TP[t].subj.id === s.id)).map(s => opt(s.id, s.ico + ' ' + s.name, js))));
  const grpSel = h('select', { class: 'field', style: 'max-width:200px', 'aria-label': 'Топ', on: { change: e => { jf = e.target.value; renderJournal(); } } }, [opt('', 'Барлық топ', jf)].concat(JOUR.groups.map(g => opt(String(g.id), g.name, jf))));
  const srt = h('select', { class: 'field', style: 'max-width:200px', 'aria-label': 'Реттеу', on: { change: e => { jsort = e.target.value; renderJournal(); } } }, [opt('name', 'Аты бойынша', jsort), opt('avg', 'Орташа балл бойынша', jsort)]);
  const q = h('input', { class: 'field', type: 'search', placeholder: 'Студентті іздеу…', value: jq, style: 'max-width:220px', 'aria-label': 'Іздеу', on: { input: e => { jq = e.target.value; const pos = e.target.selectionStart; renderJournal(); const n = $('#s-journal input[type=search]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } } });
  root.append(h('div', { class: 'row', style: 'margin-bottom:12px' }, [subjSel, grpSel, srt, q, h('span', { class: 'sp' }),
    h('button', { class: 'btn', text: '📋 Көшіру', on: { click: async e => { try { await navigator.clipboard.writeText(jTable().map(r => r.join('\t')).join('\n')); e.target.textContent = '✓ Көшірілді'; } catch (x) { e.target.textContent = 'Көшіру мүмкін болмады'; } } } }),
    h('button', { class: 'btn', text: '⬇ CSV', on: { click: () => download('журнал.csv', csv(jTable())) } })]));
  root.append(h('div', { class: 'legend' }, [['90+', '#b7e1c1'], ['75–89', '#dcefc8'], ['60–74', '#fff1b8'], ['60-тан төмен', '#ffd6cc'], ['сабаққа келмеген', '#f3f4f6']].map(([t, c]) => h('span', { class: 'lg' }, [h('i', { style: 'background:' + c }), t])).concat([h('span', { class: 'sub', style: 'display:inline;margin-left:8px', text: 'Ұяшықты басып, студенттің жұмысын ашуға болады. ✎ — оқытушы баллы.' })])));
  if (!T.length || !rows.length) { root.append(h('div', { class: 'card' }, h('p', { text: !T.length ? 'Бұл пән бойынша сабақ өткен жоқ.' : 'Іздеу бойынша студент табылмады.' }))); return; }
  const cell = (sc, stu) => {
    if (!jTaken(sc)) return h('td', { style: 'background:#f3f4f6' }, h('span', { class: 'sub', text: 'жоқ' }));
    const ti = tinfo(sc.topic), bits = []; if (ti.att) bits.push('қатысым ' + sc.attendance); if (!sc.complete) bits.push(sc.sent + '/' + TL(ti).length + ' тапсырма');
    return h('td', { class: 'jc', title: 'Жұмысын ашу', style: 'background:' + band(sc.total), on: { click: () => openDetail(sc.session, stu.id) } }, [h('b', { text: String(sc.total) }), sc.edited ? h('span', { class: 'sub mark', text: '✎' }) : '', bits.length ? h('span', { class: 'sub', text: bits.join(' · ') }) : '']);
  };
  const head = [h('th', { text: '№' }), h('th', { class: 'l', text: 'Студент' }), h('th', { text: 'Топ' })].concat(T.map(t => h('th', { title: tname(t) }, [h('span', { text: tshort(t) }), h('span', { class: 'sub thsub', text: tinfo(t).title })]))).concat([h('th', { text: 'Орташа' })]);
  const body = rows.map((r, i) => h('tr', {}, [h('td', { text: String(i + 1) }), h('td', { class: 'l', text: r.s.name }), h('td', { text: r.g })].concat(T.map(t => cell(r.s.scores[t], r.s))).concat([h('td', { style: 'font-weight:700;background:' + band(r.avg === null ? '' : r.avg), text: r.avg === null ? '—' : String(r.avg) })])));
  const foot = h('tr', { class: 'foot' }, [h('td', { text: '' }), h('td', { class: 'l', text: 'Топ орташасы (келгендер)' }), h('td', { text: '' })].concat(T.map(t => { const v = rows.map(r => r.s.scores[t]).filter(jTaken).map(x => x.total); return h('td', { text: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) + ' (' + v.length + ')' : '—' }); })).concat([h('td', { text: '' })]));
  root.append(h('div', { class: 'tw jt' }, h('table', { class: 't' }, [h('thead', {}, h('tr', {}, head)), h('tbody', {}, body), h('tfoot', {}, foot)])));
}

/* Dashboard v2 — shared lesson workspace. Does not migrate or rewrite stored grades. */
let lastDetailKey = '', detailDirty = false, detailOrigin = null, toastTimer = 0, liveRequest = 0, liveShape = '', controlShape = '', contextShape = '', route = 'live', analysisAt = 0, winBusy = false;
let liveQuery = '', rosterGroup = '', groupQuery = '', homeworkQuery = '', homeworkGroup = '', homeworkStatus = '', HW = null;
const taskMeta = window.TeacherLessons.tasks;
const WINDEF = { ...Object.fromEntries(Object.entries(taskMeta.P4).filter(([,t])=>t.min).map(([n,t])=>[n,t.min])), 0:10 };
const WINT = ['P4', 'P9', 'P10', 'P12'];   /* әр тапсырма жеке басталатын сабақтар */
const winDef = () => ({ ...Object.fromEntries(Object.entries(taskMeta[LIVE?.session?.topic] || taskMeta.P4).filter(([, t]) => t.min).map(([n, t]) => [n, t.min])), 0: 10 });
const WINMIN = { ...WINDEF };
const ICONS = {
 monitor:'M3 4h18v13H3zM8 21h8M12 17v4',file:'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6',book:'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2zM12 5v16',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',archive:'M3 4h18v5H3zM5 9v12h14V9M10 13h4',logout:'M9 21H4V3h5M13 8l5 4-5 4M7 12h12',menu:'M3 6h18M3 12h18M3 18h18',external:'M14 3h7v7M21 3l-11 11M10 3H3v18h18v-7',check:'M4 12l5 5L20 6',alert:'M12 8v5M12 17h.01M12 3l10 18H2z',chart:'M4 21V10M10 21V3M16 21v-7M22 21H1',code:'M8 6l-6 6 6 6M16 6l6 6-6 6M14 3l-4 18',search:'M21 21l-6-6M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14',copy:'M8 8h13v13H8zM16 8V3H3v13h5',download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',clock:'M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',arrow:'M9 5l7 7-7 7'
};
function icon(name){ const s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','icon');s.setAttribute('aria-hidden','true');const p=document.createElementNS(s.namespaceURI,'path');p.setAttribute('d',ICONS[name]||ICONS.file);s.append(p);return s; }
document.querySelectorAll('[data-icon]').forEach(e=>e.replaceWith(icon(e.dataset.icon)));
function btn(text,fn,cls=''){return h('button',{type:'button',class:'btn '+cls,text,on:{click:fn}});}
function toast(msg,error=false){const e=$('#toast');e.textContent=msg;e.className='dash-toast'+(error?' error':'');e.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.hidden=true,6500);}
function syncStatus(ok){const e=$('#syncStatus');e.classList.toggle('offline',!ok);e.querySelector('span').textContent=ok?'Соңғы жаңарту: '+new Date().toLocaleTimeString('kk-KZ',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'Байланыс үзілді. Соңғы деректер көрсетіліп тұр.';}
const ERR_UI={course_mismatch:'Таңдалған пән, топ немесе оқу жылы курс байланысына сәйкес келмейді.',group_has_history:'Бұл топ курс журналымен байланысқан. Бағалар тарихы сақталады.',network:'Байланыс үзілді. Өзгеріс сақталмады. Қайта көріңіз.',auth:'Кіру уақыты аяқталды. Қайта кіріңіз.',no_session:'Ашық сабақ жоқ.',no_group:'Бұл топ табылмады. Топтар тізімін жаңартып, қайта таңдаңыз.',bad_topic:'Бұл тақырып қолжетімсіз. Басқа тақырыпты таңдаңыз.',started:'Бұл жұмысты студент бастап қойған.',bad_request:'Енгізілген мәліметті тексеріңіз.',not_found:'Мәлімет табылмады.',session_open:'Жүріп жатқан сабақты өшіруге болмайды. Алдымен сабақты аяқтаңыз.',session_trashed:'Алдымен сабақты «Өшірілгендер» бөлімінен қалпына келтіріңіз.'};
const originalApi=api;
api=async function(path,body,method){const j=await originalApi(path,body,method);if(!j.ok && (body || method==='DELETE' || method==='PATCH'))toast(ERR_UI[j.error]||'Әрекет орындалмады. Мәліметтерді тексеріп, қайта көріңіз.',true);return j;};
function sessionQuery(){return LIVE&&LIVE.session?'?session='+LIVE.session.id:'';}
function allStudents(){return (LIVE?.groups||[]).flatMap(g=>g.students.filter(s=>s.active!==false).map(s=>({...s,group:g.name,group_id:g.id})));}
function meta(n){const ti=tinfo(LIVE?.session?.topic);return taskMeta[ti.id]?.[n]||{title:n+'-тапсырма',max:allStudents()[0]?.tasks?.[n]?.max||0};}
function taskState(n){const w=LIVE?.pywins?.[n],t=Math.floor(Date.now()/1000+skew);return !w?'wait':t<=w.until?'work':'done';}
function currentTask(){if(!LIVE?.session)return null;const ti=tinfo(LIVE.session.topic);if(WINT.includes(ti.id))return TL(ti).filter(n=>n!==5).find(n=>taskState(n)==='work')||null;return null;}
function studentState(s){if(!s.present)return ['Кірмеді','muted'];const n=currentTask(),ts=s.tasks||{};if(Object.values(ts).some(t=>t.pending))return ['Тексерілуде','muted'];if(n&&ts[n]?.sent&&ts[n].pts<ts[n].max*.5)return ['Қате бар','warn'];if(n&&ts[n]?.sent)return ['Жіберді','ok'];const ns=TL(tinfo(LIVE.session.topic)).filter(k=>!WINT.includes(LIVE.session.topic)||k!==5);if(ns.every(k=>ts[k]?.done||ts[k]?.sent&&ts[k].pts>=ts[k].max))return ['Аяқтады','ok'];return ['Орындауда',''];}
function rememberUI(){try{sessionStorage.setItem('teacher-dashboard-ui',JSON.stringify({route,tab:TAB,view:VIEW}));}catch{}}
function mobileClose(){document.body.classList.remove('menu-open');$('#mobileMenu').setAttribute('aria-expanded','false');$('#sidebarShade').hidden=true;}
$('#collapseSidebar').onclick=()=>{const x=document.body.classList.toggle('sidebar-collapsed');$('#collapseSidebar').textContent=x?'»':'«';$('#collapseSidebar').setAttribute('aria-expanded',String(!x));try{localStorage.setItem('teacher-sidebar',x?'1':'0');}catch{}};
try{if(localStorage.getItem('teacher-sidebar')==='1')$('#collapseSidebar').click();}catch{}
$('#mobileMenu').onclick=()=>{const x=document.body.classList.toggle('menu-open');$('#sidebarShade').hidden=!x;$('#mobileMenu').setAttribute('aria-expanded',String(x));};$('#sidebarShade').onclick=mobileClose;
$('#projectorButton').onclick=()=>{if(!LIVE?.session||LIVE.session.status!=='open')return toast('Проектор үшін алдымен сабақты бастаңыз.');openPj();$('#pjX').focus();};
function goTab(next){route=['live','analysis','wrap','plan'].includes(next)?'live':next;TAB=next;mobileClose();document.querySelectorAll('#mainNav .dash-nav').forEach(b=>{b.classList.toggle('on',b.dataset.route===route);b.setAttribute('aria-current',b.dataset.route===route?'page':'false');});document.querySelectorAll('#tabs .tab').forEach(b=>{b.classList.toggle('on',b.dataset.t===TAB);b.setAttribute('aria-selected',String(b.dataset.t===TAB));});document.querySelectorAll('.sec').forEach(s=>s.classList.toggle('on',s.id==='s-'+TAB));$('#tabs').hidden=route!=='live';rememberUI();renderHeading();if(TAB==='live')renderLive();if(TAB==='analysis')renderAnalysis(true);if(TAB==='wrap'){setQuestions();loadWrap();}if(TAB==='plan')loadPlan();if(TAB==='journal')loadJournal();if(TAB==='roster')loadRoster();if(TAB==='archive')renderArchive();if(TAB==='homework')loadHomework();if(TAB==='progress')loadProgress();}
document.querySelectorAll('#mainNav [data-route]').forEach(b=>b.onclick=()=>goTab(b.dataset.route));document.querySelectorAll('#tabs [data-t]').forEach(b=>b.onclick=()=>goTab(b.dataset.t));
function newLesson(choice={}){if(lessonStarting||lessonPending){toast('Сабақ деректері жүктелуде. Сәл күтіңіз.');return;}$('#newLessonBody').replaceChildren(startCard(choice));$('#newLessonDialog').hidden=false;$('#newLessonBody select')?.focus();}
function closeNewLesson(){$('#newLessonDialog').hidden=true;}
$('#closeNewLesson').onclick=closeNewLesson;$('#newLessonDialog').onclick=e=>{if(e.target.id==='newLessonDialog')closeNewLesson();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){mobileClose();closeNewLesson();}});
function renderHeading(){if(!LIVE)return;const se=LIVE.session,ti=tinfo(se?.topic),titles={progress:'Үлгерім',homework:'Үй жұмысы',journal:'Бағалар журналы',roster:'Топтар мен студенттер',archive:'Сабақтар архиві'};const title=route==='live'?(lessonPending?'Сабақ басталды':se&&(se.status==='open'||VIEW)?ti.title:'Сабақты бастау'):titles[route];const subtitle=route==='live'?(VIEW?'Архивтегі сабақ · '+fdate(se.created_at):se?.status==='open'?(LIVE.groups.map(g=>g.name).join(', ')+' · '+allStudents().length+' студент'):'Пәнді, тақырыпты және топты таңдаңыз.'):({progress:'Топтар, бағалар тарихы және болжам',homework:'Студент жұмыстары, ЖИ пікірі және оқытушы бағасы',journal:'Сақталған бағалар · ұяшықты басып жұмысын ашыңыз',roster:'Топты таңдап, студенттерін басқарыңыз',archive:'Сақталған сабақтар, сынақ сабақтарын өшіру және қалпына келтіру'})[route];const acts=h('div',{class:'heading-actions'});if(route==='live'){if(VIEW)acts.append(btn('Тікелей сабақ',()=>selectSession(0)));if(se?.status==='open'&&!VIEW)acts.append(btn('Сабақты аяқтау',async()=>{if(!confirm('Сабақ аяқталсын ба? Барлық жұмыстар мен бағалар сақталады. Қазір сабақ жабылған соң студенттің жаңа жауап жіберуі де тоқтайды.'))return;const j=await api('session/close',{});if(j.ok){SESS.t=0;await loadLive(true);toast('Сабақ сақталды. Нәтижені архивтен көре аласыз.');}},'danger'));acts.append(btn('Жаңа сабақ',()=>newLesson()));}$('#pageHeading').replaceChildren(h('div',{},[h('h1',{text:title}),h('p',{text:subtitle})]),acts);const status=$('#lessonStatus');status.textContent=lessonPending?'Жүктелуде':VIEW?'Архив':se?.status==='open'?'Сабақ жүріп жатыр':'Сабақ аяқталған';status.classList.toggle('archived',!!VIEW||se?.status!=='open');$('#topnav').hidden=route!=='live';renderContext();}
function renderContext(){const se=LIVE?.session,ti=tinfo(se?.topic),groups=LIVE?.allGroups||[];const key=JSON.stringify([se?.id,VIEW,route,groups.map(g=>[g.id,g.name])]);if(contextShape===key)return;contextShape=key;if(route!=='live'){$('#contextBar').replaceChildren(h('span',{class:'sub',text:'Оқытушы панелі / '+({progress:'Үлгерім',homework:'Үй жұмысы',journal:'Журнал',roster:'Топтар',archive:'Архив'})[route]}));return;}const opt=(value,text,sel)=>h('option',{value,text,selected:sel});const subj=h('select',{class:'field','aria-label':'Пәнді таңдау'},SUBJ.map(s=>opt(s.id,s.name,s.id===ti.subj.id)));const top=h('select',{class:'field','aria-label':'Тақырыпты таңдау'}),grp=h('select',{class:'field','aria-label':'Топты таңдау'},groups.map(g=>opt(String(g.id),g.name,g.id===se?.group_id)));const fill=()=>{top.replaceChildren(...(SUBJ.find(s=>s.id===subj.value)?.topics||[]).map(t=>opt(t.id,t.n+'-сабақ',t.id===se?.topic)));};fill();const choose=async()=>{const j=await api('sessions');if(!j.ok)return;SESS.rows=j.rows;const hit=j.rows.filter(s=>s.topic===top.value&&(!grp.value||s.group_id===+grp.value)).sort((a,b)=>b.id-a.id)[0];if(hit)await selectSession(hit.id);else{LS={s:subj.value,t:top.value,g:grp.value};newLesson();contextShape='';renderContext();}};subj.onchange=()=>{fill();choose();};top.onchange=choose;grp.onchange=choose;$('#contextBar').replaceChildren(subj,top,grp);}
async function selectSession(id){if(detailDirty&&!confirm('Баға терезесінде сақталмаған өзгерістер бар. Сабақты ауыстырасыз ба?'))return;VIEW=id;liveShape='';contextShape='';analysisAt=0;analysisFor=0;closeNewLesson();await loadLive(true);goTab('live');}
async function loadLive(force=false){if(!TOK)return;const ticket=++liveRequest;const j=await api('live'+(VIEW?'?session='+VIEW:''));if(ticket!==liveRequest)return;if(VIEW&&j.ok&&!j.session){VIEW=0;toast('Бұл сабақ табылмады. Ағымдағы сабақ ашылады.');return loadLive(true);}if(!j.ok){syncStatus(false);return;}LIVE=j;lessonPending=false;rosterRevision++;ROSTER=j.allGroups||j.groups;syncStartGroups();skew=LIVE.now-Date.now()/1000;syncStatus(true);if(TAB==='live')renderLive();else{renderHeading();if(TAB==='analysis')renderAnalysis();}if(force&&TAB==='archive')renderArchive();return j;}
setInterval(()=>{if(TOK&&!document.hidden&&route==='live')loadLive();},4000);
setInterval(()=>{if(TOK&&!document.hidden&&LIVE){tickTimer();tickDashboard();}},1000);
function renderLive(){if(!LIVE)return;const root=$('#s-live'),se=LIVE.session,display=se&&(se.status==='open'||VIEW);renderHeading();if(lessonPending){root.replaceChildren(h('div',{class:'card'},[h('h2',{text:'Сабақ басталды'}),h('p',{class:'sub',text:'Сабақ деректері жүктелуде. Байланыс қалпына келгенде панель өзі жаңарады.'}),btn('Қайта жүктеу',()=>loadLive(true))]));return;}if(!display){const k='empty';if(liveShape!==k){liveShape=k;root.replaceChildren(h('div',{class:'empty-welcome'},[h('div',{class:'task-symbol'},icon('monitor')),h('div',{},[h('h2',{text:'Бүгінгі сабаққа дайынсыз ба?'}),h('p',{text:'Тапсырмалар мен бағалар сабақ басталғаннан кейін осы жерде көрінеді.'})])]),startCard(),se?h('div',{class:'card'},[h('h2',{text:'Соңғы сабақ'}),h('p',{class:'sub',text:tname(se.topic)+' · '+fdate(se.created_at)}),btn('Нәтижесін қарау',()=>selectSession(se.id))]):h('p',{class:'sub',text:'Сабақтарыңыз бен студенттеріңіздің нәтижелері осы жерде сақталады.'}));}return;}const ti=tinfo(se.topic),shape=[se.id,VIEW,se.status,ti.tasks].join('|');if(liveShape!==shape){liveShape=shape;controlShape='';root.replaceChildren(h('div',{class:'live-metrics',id:'liveMetrics'}),h('div',{class:'live-control-grid'},[h('div',{class:'control-panel',id:'taskControls'}),h('div',{class:'entry-panel',id:'entryPanel'})]),makeRoster());if(se.topic==='P8'){const det=h('details',{class:'card',id:'pairDetails'},[h('summary',{text:'Жұптық жұмыс · Сандық'}),h('div',{id:'pairHost'})]);root.append(det);}}updateMetrics();updateControls();updateEntry();updateRoster();if(se.topic==='P8'){const host=$('#pairHost'),det=$('#pairDetails');if(det.open){const signature=JSON.stringify([LIVE.pairs,LIVE.free]);if(host.dataset.sig!==signature&&!host.contains(document.activeElement)){host.dataset.sig=signature;host.replaceChildren(pairCard(se));}}}tickDashboard();}
function updateMetrics(){const all=allStudents(),pres=all.filter(s=>s.present),n=currentTask(),ti=tinfo(LIVE.session.topic),ns=TL(ti);const max=(ti.att||0)+ns.reduce((a,k)=>a+(all[0]?.tasks?.[k]?.max||meta(k).max||0),0)||100;const avg=pres.length?Math.round(pres.reduce((sum,s)=>sum+(s.total||0),0)/pres.length):null;const sent=pres.filter(s=>n?s.tasks?.[n]?.sent:Object.values(s.tasks||{}).some(t=>t.sent)).length;const attention=pres.filter(s=>studentState(s)[1]==='warn').length;const values=[['users','Қатысты',pres.length,all.length],['check',n?n+'-тапсырманы жіберді':'Жауап жіберді',sent,pres.length],['alert','Қате бар',attention,null],['chart','Орташа балл',avg,max]];const host=$('#liveMetrics');values.forEach(([ic,label,value,den],i)=>{let c=host.children[i];if(!c){c=h('div',{class:'metric'+(i===2?' warn':'')},[icon(ic),h('div',{},[h('small'),h('strong')])]);host.append(c);}c.querySelector('small').textContent=label;c.querySelector('strong').replaceChildren(String(value??'—'),den!==null?h('span',{class:'den',text:' / '+den}):'');});}
async function winAction(n,action,minutes){if(winBusy)return;winBusy=true;try{if(action==='start'&&taskState(n)==='done'&&!confirm(n===0?'Қатемен жұмысты қайта ашасыз ба?':n>10?(n-10)+'-тапсырманың қатемен жұмысын қайта ашасыз ба?':n+'-тапсырманы қайта ашасыз ба? Бұрынғы жауаптар сақталады.'))return;const running=Object.keys(LIVE.pywins||{}).map(Number).filter(k=>k!==5&&k!==n&&taskState(k)==='work');if(action==='start'&&running.length&&LIVE.session.topic!=='P12'){if(!confirm('Алдыңғы кезеңді аяқтап, келесі кезеңді бастайсыз ба?'))return;for(const k of running){const end=await api('pywin',{task:k,action:'stop'});if(!end.ok)return;}}const j=await api('pywin',{task:n,action,minutes:minutes||WINMIN[n]});if(j.ok){controlShape='';await loadLive(true);toast(action==='start'?'Кезең басталды. Студент беті өзі жаңарады.':action==='stop'?'Кезең аяқталды. Жауаптар сақталды.':'Уақыт қосылды.');}}finally{winBusy=false;}}
function cfgPanel(){
 const C=LIVE.pycfg,names=C.titles||{},hwBox=h('input',{type:'checkbox',id:'cfgHw','aria-label':'Үй жұмысы бар'}),inputs={},total=h('b',{class:'cfg-total'});hwBox.checked=!!C.hw;
 const sum=()=>{const v=Object.values(inputs).reduce((a,i)=>a+(+i.value||0),0)+(hwBox.checked?25:0);total.textContent='Жиыны: '+Math.round(v*10)/10+' / 100';total.style.color=Math.abs(v-100)<.05?'#16a34a':'#b45309';};
 const fill=(hw,src)=>{Object.keys(inputs).forEach(n=>{inputs[n].value=String(src?src[n]:(hw?C.defaults.withHw:C.defaults.noHw)[n]);});sum();};
 const grid=h('div',{class:'cfg-grid'},Object.keys(C.defaults.noHw).map(Number).map(n=>{const i=h('input',{class:'field',type:'number',min:'0',max:'100',step:'0.5',value:String(C.pts[n]),'aria-label':n+'-тапсырма баллы',on:{input:sum}});inputs[n]=i;return h('label',{class:'cfg-row'},[h('span',{text:n+' · '+(names[n]||taskMeta[LIVE.session.topic]?.[n]?.title||'')}),i,h('span',{class:'sub',text:'балл'})]);}));
 hwBox.onchange=()=>fill(hwBox.checked);
 const save=btn('Сақтау',async()=>{const pts={};Object.keys(inputs).forEach(n=>pts[n]=+inputs[n].value);const j=await api('pycfg',{hw:hwBox.checked,pts});if(j.ok){controlShape='';toast('Ұпай мен үй жұмысы белгісі сақталды. Бағалар қайта есептелді.');await loadLive(true);}},'primary sm');
 sum();
 return h('details',{class:'step-menu cfg-menu'},[h('summary',{text:'Баптау: үй жұмысы және ұпай'}),h('div',{class:'step-settings'},[h('label',{class:'cfg-hw'},[hwBox,h('span',{text:'Үй жұмысы бар (25 балл)'})]),grid,h('div',{class:'row'},[total,h('span',{class:'sp'}),btn('Әдепкі',()=>fill(hwBox.checked),'sm'),save]),h('p',{class:'sub',text:'Белгіні алып тастасаңыз, үй жұмысы жасырылады, ал тапсырмалар 100 балға келтіріледі. Ұпайды өзгерту студенттердің алған баллын пропорционалды қайта есептейді.'})])]);
}
function updateControls(){const host=$('#taskControls'),se=LIVE.session,ti=tinfo(se.topic),open=se.status==='open'&&!VIEW;if(WINT.includes(se.topic)&&WINMIN._t!==se.topic){Object.keys(WINMIN).forEach(k=>delete WINMIN[k]);Object.assign(WINMIN,winDef(),{_t:se.topic});}const key=JSON.stringify([se.id,se.status,VIEW,LIVE.pywins,se.work_until,se.work_started_at,WINT.includes(ti.id)?[...Object.keys(winDef()).map(n=>taskState(n)),JSON.stringify(LIVE.pycfg||null)]:phaseTag()]);if(key===controlShape)return;if(host.contains(document.activeElement)&&document.activeElement.matches('input'))return;controlShape=key;if(!open){host.replaceChildren(h('b',{text:'Сақталған сабақ'}),h('p',{class:'sub',text:fdate(se.created_at)+' · жауаптар мен бағалар сақталған.'}),btn('Архивке оралу',()=>goTab('archive')),btn('Қайта ашу',async()=>{if(!confirm('Сабақты қайта ашасыз ба? Басқа ашық сабақ болса, ол жабылады. Бұрынғы бағалар сақталады.'))return;const j=await api('session/reopen',{id:se.id,minutes:15});if(j.ok){VIEW=0;liveShape='';loadLive(true);}},'sm'));return;}
 if(!WINT.includes(ti.id)){const running=!!se.work_until,inp=h('input',{class:'field task-minutes',type:'number',value:String(WMIN||ti.min),min:'1',max:'240','aria-label':'Жұмыс ұзақтығы',on:{input:e=>{WMIN=+e.target.value||ti.min;wDirty=true;}}});if(!wDirty)inp.value=String(running&&se.work_started_at?Math.max(1,Math.round((se.work_until-se.work_started_at)/60)):ti.min);host.replaceChildren(h('div',{class:'active-task'},[h('span',{class:'task-symbol'},icon('code')),h('div',{class:'task-copy'},[h('b',{text:'Тапсырмаларды орындау'}),h('small',{text:ti.tasks+' тапсырма · '+(ti.att?'қатысым '+ti.att+' балл':'баға тапсырмалардан жиналады')})]),h('b',{class:'task-clock',id:'timer',text:running?'…':'Күтуде'}),h('div',{class:'task-actions'},[inp,h('span',{class:'sub',text:'мин'}),btn(running?'Өзгерту':'Бастау',async()=>{const j=await api('session/work',{minutes:+inp.value||ti.min,...(running?{total:true}:{})});if(j.ok){wDirty=false;controlShape='';loadLive(true);}},'primary sm'),...(running?[btn('+5 минут',async()=>{const j=await api('session/work',{minutes:5,extend:true});if(j.ok)loadLive(true);},'sm'),btn('Аяқтау',async()=>{const j=await api('session/stopwork',{});if(j.ok)loadLive(true);},'sm')]:[])])]),ti.py?h('p',{class:'sub',text:'Жұмыс аяқталған соң қатемен жұмыс уақыты беріледі.'}):'');return;}
 const practiceOnly=false,numbers=[1,2,3,4],activeN=numbers.find(n=>taskState(n)==='work')||(!practiceOnly&&taskState(0)==='work'?0:null),next=numbers.find(n=>taskState(n)==='wait');const finished=practiceOnly&&activeN===null&&next===undefined;const selected=activeN!==null?activeN:next!==undefined?next:0;const m=finished?{title:'Практика аяқталды'}:selected===0?{title:'Қатемен жұмыс',min:10}:meta(selected);const clock=h('b',{class:'task-clock','data-countdown':String(selected),text:finished?'Аяқталды':taskState(selected)==='work'?'…':'Күтуде'});const actions=h('div',{class:'task-actions'});if(activeN!==null)actions.append(btn('+2 минут',()=>winAction(selected,'extend',2),'sm'),btn('Аяқтау',()=>winAction(selected,'stop'),'sm'));else if(!finished){const minutes=h('input',{class:'field task-minutes',type:'number',min:'1',max:'120',value:String(WINMIN[selected]||m.min||5),'aria-label':selected+'-кезеңнің уақыты',on:{input:e=>WINMIN[selected]=Math.max(1,+e.target.value||5)}});actions.append(minutes,h('span',{class:'sub',text:'мин'}),btn('Бастау',()=>winAction(selected,'start',+minutes.value),'primary sm'));}
 const stepStrip=h('div',{class:'step-strip'},numbers.map(n=>h('div',{class:'step-chip '+taskState(n),title:meta(n).title},[h('strong',{text:String(n)}),h('span',{class:'step-text',text:taskState(n)==='work'?'Орындалуда':taskState(n)==='done'?'Аяқталды':'Күтуде'})])));const settings=h('details',{class:'step-menu'},[h('summary',{text:'Кезеңдерді басқару'}),h('div',{class:'step-settings'},(ti.id==='P12'?[...numbers,11,12,13,14]:[...numbers,0]).map(n=>{const it=n===0?{title:'Қатемен жұмыс'}:n>10?{title:'Қатемен жұмыс'}:meta(n);return h('div',{class:'row'},[h('span',{text:(n>10?(n-10)+' · ':n?n+' · ':'')+it.title}),btn(taskState(n)==='work'?'Аяқтау':taskState(n)==='done'?'Қайта ашу':'Бастау',()=>winAction(n,taskState(n)==='work'?'stop':'start'),'sm')]);}))]);host.replaceChildren(stepStrip,h('div',{class:'active-task'},[h('span',{class:'task-symbol'},icon('code')),h('div',{class:'task-copy'},[h('b',{text:(selected?selected+'-тапсырма · ':'')+m.title}),h('small',{text:finished?'4 тапсырма · 100 балл':selected?(m.desc||(selected===1?'15 есеп':selected===2?'4 есеп':'5 есеп'))+' · '+((LIVE.pycfg&&LIVE.pycfg.pts[selected]!==undefined?LIVE.pycfg.pts[selected]:m.max))+' балл':'Қате жауаптарды түзету · 10 минут'})]),clock,actions]),h('div',{class:'task-footer'},[...(ti.id==='P12'?numbers.filter(n=>LIVE.pywins?.[n]).map(n=>taskState(10+n)==='work'?h('span',{class:'row'},[h('span',{class:'sub','data-countdown':String(10+n)}),btn(n+'-түзетуді аяқтау',()=>winAction(10+n,'stop'),'sm')]):btn(n+'-тапсырма: қатемен жұмыс',()=>winAction(10+n,'start',10),'sm')):[btn('Қатемен жұмыс',()=>winAction(0,'start',10),'sm')]),settings,...(LIVE.pycfg?[cfgPanel()]:[]),...(activeN!==null&&next!==undefined?[btn('Келесі тапсырма →',()=>winAction(next,'start',WINMIN[next]),'primary sm')]:[]),h('span',{class:'sub',text:'Әр кезең жеке басталады'})]));}
function phaseTag(){const s=LIVE.session,t=Date.now()/1000+skew;return !s.work_until?'wait':t<=s.work_until?'work':t<=s.work_until+900?'revise':'done';}
function updateEntry(){const host=$('#entryPanel'),se=LIVE.session;let code=host.querySelector('.entry-code');if(!code){host.replaceChildren(h('h2',{text:'Кіру коды'}),h('div',{class:'entry-row'},[h('span',{class:'entry-code'}),btn('Көшіру',async()=>{try{await navigator.clipboard.writeText(LIVE.session.code);toast('Код көшірілді.');}catch{toast('Кодты белгілеңіз де, көшіріп алыңыз.');}},'sm'),h('span',{class:'entry-ttl',id:'dashboardCodeTtl'})]),h('div',{class:'entry-hw'},[icon('file'),h('span',{text:(se.topic==='P4'||(WINT.includes(se.topic)&&LIVE.pycfg&&LIVE.pycfg.hw))?'Үй жұмысы · 25 балл':'Студенттер осы кодпен кіреді'})]));code=host.querySelector('.entry-code');}code.textContent=se.status==='open'&&!VIEW?se.code:'—';}
function tickDashboard(){if(!LIVE)return;const t=Math.floor(Date.now()/1000+skew);document.querySelectorAll('[data-countdown]').forEach(e=>{const w=LIVE.pywins?.[e.dataset.countdown];if(w)e.textContent=mmss(Math.max(0,w.until-t));});const ttl=$('#dashboardCodeTtl');if(ttl)ttl.textContent=LIVE.session?.status==='open'&&!VIEW?mmss(600-t%600)+' кейін жаңарады':'Сақталған сабақ';}
function makeRoster(){const search=h('input',{class:'field',type:'search',placeholder:'Студентті іздеу',value:liveQuery,'aria-label':'Студентті іздеу',on:{input:e=>{liveQuery=e.target.value;updateRoster();}}});const filter=h('select',{class:'field','aria-label':'Студент күйі',on:{change:e=>{STF=e.target.value;updateRoster();}}},[['','Барлығы'],['abs','Кірмегендер'],['sent','Жібергендер'],['prog','Орындауда'],['bad','Қате бар'],['pending','Тексерілуде']].map(([value,text])=>h('option',{value,text,selected:value===STF})));return h('div',{class:'roster-card'},[h('div',{class:'roster-toolbar'},[h('div',{class:'toolbar-title'},[h('h2',{text:'Студенттер'}),h('small',{class:'sub',id:'rosterCount'})]),h('div',{class:'roster-search'},[icon('search'),search]),filter,btn('Экспорт',exportLive,'sm')]),h('div',{class:'roster-scroll',id:'rosterScroll'},[h('table',{class:'t roster-table'},[h('thead',{id:'liveThead'}),h('tbody',{id:'liveTbody'})]),h('div',{class:'roster-empty',id:'rosterEmpty',hidden:true,text:'Іздеу бойынша студент табылмады.'})]),h('div',{class:'roster-footer',text:'Студенттің атын немесе балын басып, жұмысын ашыңыз.'})]);}
function updateRoster(){const body=$('#liveTbody');if(!body)return;const ti=tinfo(LIVE.session.topic),ns=TL(ti),all=allStudents(),n=currentTask(),query=liveQuery.trim().toLocaleLowerCase('kk');const rows=all.filter(s=>(!query||s.name.toLocaleLowerCase('kk').includes(query))&&(STF==='abs'?!s.present:STF==='sent'?s.present&&(n?s.tasks?.[n]?.sent:Object.values(s.tasks||{}).some(t=>t.sent)):STF==='prog'?s.present&&studentState(s)[0]==='Орындауда':STF==='bad'?studentState(s)[1]==='warn':STF==='pending'?Object.values(s.tasks||{}).some(t=>t.pending):true));const headKey=JSON.stringify([ti.id,ns,all[0]?.tasks]);if($('#liveThead').dataset.sig!==headKey){$('#liveThead').dataset.sig=headKey;$('#liveThead').replaceChildren(h('tr',{},[h('th',{class:'student-cell l',text:'Студент'}),h('th',{class:'l',text:'Күйі'}),...ns.map(k=>h('th',{title:meta(k).title,text:(WINT.includes(ti.id)&&k===5?'Үй':k)+' · '+(all[0]?.tasks?.[k]?.max||meta(k).max||'')})),...(ti.ai?[h('th',{text:'ЖИ'})]:[]),h('th',{text:'Барлығы'}),h('th',{text:'',title:'Қосымша әрекеттер'})]));}const keep=new Set();rows.forEach((s,i)=>{const key=String(s.id),sig=JSON.stringify([s,n,LIVE.session.status]);keep.add(key);let tr=body.querySelector('[data-student="'+key+'"]');if(!tr||tr.dataset.sig!==sig){const state=studentState(s),open=()=>openDetail(LIVE.session.id,s.id);const extra=h('details',{},[h('summary',{title:'Қосымша әрекеттер','aria-label':s.name+' · қосымша әрекеттер',text:'···'}),h('div',{class:'row'},[s.present?btn('Құрылғыны босату',async()=>{if(!confirm(s.name+' басқа құрылғыдан қайта кіре алсын ба?'))return;const j=await api('release',{session_id:LIVE.session.id,student_id:s.id});if(j.ok){toast('Құрылғы босатылды.');loadLive(true);}},'sm'):btn('Келді деп белгілеу',async()=>{const j=await api('attendance',{session_id:LIVE.session.id,student_id:s.id,present:true});if(j.ok)loadLive(true);},'sm')])]);const replacement=h('tr',{'data-student':key,'data-sig':sig,class:!s.present?'absent':''},[h('td',{class:'student-cell l'},h('div',{class:'student-name'},[h('span',{class:'student-avatar',text:s.name.split(/\s+/).slice(0,2).map(v=>v[0]).join('')}),h('button',{type:'button',text:s.name,on:{click:open}})])),h('td',{class:'l'},h('span',{class:'state-badge '+state[1],text:state[0]})),...ns.map(k=>{const t=s.tasks?.[k];return h('td',{},t?.sent?h('button',{class:'score-cell',type:'button',title:meta(k).title+' · '+t.pts+' / '+t.max,text:t.pts+(t.pending?'…':''),on:{click:()=>openDetail(LIVE.session.id,s.id,k)}}):'—');}),...(ti.ai?[h('td',{text:s.present&&s.ai_pct?s.ai_pct+'%':'—'})]:[]),h('td',{},s.present?h('span',{class:'score-total',text:String(s.total)}):'—'),h('td',{},extra)]);if(tr){if(!tr.contains(document.activeElement)&&!tr.querySelector('details[open]')){tr.replaceWith(replacement);tr=replacement;}}else{tr=replacement;body.append(tr);}}const at=body.children[i];if(at!==tr)body.insertBefore(tr,at||null);});[...body.children].forEach(tr=>{if(!keep.has(tr.dataset.student))tr.remove();});$('#rosterCount').textContent=all.length+' студент · '+all.filter(s=>s.present).length+' кірді'+(rows.length!==all.length?' · табылғаны '+rows.length:' · бір тізім');$('#rosterEmpty').hidden=!!rows.length;}
function exportLive(){const ti=tinfo(LIVE.session.topic),ns=TL(ti);download('сабақ-'+LIVE.session.id+'.csv',csv([['Топ','Студент','Қатысым',...ns.map(k=>meta(k).title),'Қорытынды'],...allStudents().map(s=>[s.group,s.name,s.present?'иә':'жоқ',...ns.map(k=>s.tasks?.[k]?.sent?s.tasks[k].pts:''),s.present?s.total:''])]));}
let analysisSelected='overview',analysisData=null,analysisFor=0,analysisSig='',analysisBusy=false,analysisFocusOp='',analysisFocusItem=0;
async function renderAnalysis(force=false){
 const root=$('#s-analysis'),se=LIVE?.session;if(!se){root.replaceChildren(h('div',{class:'analysis-empty',text:'Талдау үшін сабақты бастаңыз немесе архивтен таңдаңыз.'}));return;}
 if(!tinfo(se.topic).py){root.replaceChildren(summaryCard(se,allStudents(),tinfo(se.topic)));return;}
 if(analysisFor!==se.id){analysisData=null;analysisSig='';analysisFocusOp='';analysisFocusItem=0;analysisAt=0;root.replaceChildren(h('p',{class:'sub',text:'Нәтижелер жүктелуде…'}));}
 if(analysisBusy||!force&&Date.now()-analysisAt<12000)return;analysisBusy=true;analysisAt=Date.now();
 const j=await api('py_stats?session='+se.id);analysisBusy=false;
 if(!j.ok){if(!analysisData)root.replaceChildren(h('p',{class:'bad',text:'Талдауды жүктеу мүмкін болмады. Барысы бөліміндегі деректер сақталған.'}));return;}
 if(LIVE?.session?.id!==se.id){analysisAt=0;return;}analysisFor=se.id;analysisData=j;const sig=JSON.stringify(j);if(force||sig!==analysisSig||analysisSelected==='python-report'){analysisSig=sig;paintAnalysis();}
}
function paintAnalysis(){
 const root=$('#s-analysis'),d=analysisData;if(!d)return;const scroll=root.querySelector('.analysis-scroll')?.scrollTop||0;
 const tabs=[['overview','Шолу'],...(LIVE.session.topic==='P12'?[['python-report','Журнал және ЖИ']]:[]),...(d.ops?[['ops','Амалдар']]:[]),['items','Есептер'],['students','Студенттер']];
 if(!tabs.some(([v])=>v===analysisSelected))analysisSelected='overview';
 const toolbar=h('div',{class:'analysis-toolbar'},tabs.map(([v,t])=>btn(t,()=>{analysisSelected=v;analysisFocusOp='';analysisFocusItem=0;paintAnalysis();},'sm '+(analysisSelected===v?'primary':''))));
 toolbar.append(h('span',{class:'sp'}),h('span',{class:'sub',text:'Таңдалған сабақ · автоматты жаңарады'}));const content=h('div');root.replaceChildren(toolbar,content);
 const table=(heads,rows)=>h('div',{class:'tw analysis-scroll'},h('table',{class:'t'},[h('thead',{},h('tr',{},heads.map((text,i)=>h('th',{class:i===0?'l':'',text})))),h('tbody',{},rows)]));
 const td=(text,cls='')=>h('td',{class:cls,text:String(text??'—')});
 const ops=(d.ops||[]).filter(o=>o.answers).slice().sort((a,b)=>a.pct-b.pct);
 const peopleFor=op=>{analysisSelected='students';analysisFocusOp=op;analysisFocusItem=0;paintAnalysis();};
 if(analysisSelected==='python-report'){
   const session=LIVE.session, students=allStudents();
   import('./python-report-panel.js?v=1').then(({mountPythonReport})=>{if(content.isConnected&&LIVE?.session?.id===session.id)mountPythonReport(content,{session,students,api,h});}).catch(()=>{content.textContent='Есеп бетін жүктеу мүмкін болмады. Бетті жаңартыңыз.';});
 }else if(analysisSelected==='overview'){
   window.TeacherAnalysis.render(content,d,{h,btn,people:id=>{analysisFocusItem=id;analysisFocusOp='';analysisSelected='students';paintAnalysis();},showItems:()=>{analysisSelected='items';paintAnalysis();}});
 }else if(analysisSelected==='ops'){
   content.append(h('div',{class:'card'},[h('h2',{text:'Қай амалды түсінбеді?'}),h('p',{class:'sub',text:'Дұрыс жауап саны және үлесі. «Студенттер» батырмасы осы амалда қиналғандарды көрсетеді.'}),table(['Амал','Дұрыс жауап','Жиі шатастыру','Студенттер'],(d.ops||[]).map(o=>h('tr',{},[h('td',{class:'l'},[h('b',{class:'analysis-op',text:o.sym}),h('span',{text:' '+o.name})]),td(o.answers?o.correct+'/'+o.answers+' · '+o.pct+'%':'Әлі жауап жоқ'),td(o.mis.map(m=>m.text+' ('+m.n+')').join('; ')||'—','analysis-desc l'),h('td',{},o.weak.length?btn(o.weak.length+' студент',()=>peopleFor(o.op),'sm'):'—')])))]));
 }else if(analysisSelected==='items'){
   const sent=(d.allItems||d.items||[]).filter(i=>i.sent);content.append(h('div',{class:'card'},[h('h2',{text:'Есептер бойынша нәтиже'}),h('p',{class:'sub',text:'Уақыт — алғашқы жіберуге дейінгі уақыттың медианасы. Ол баллды автоматты өзгертпейді.'}),sent.length?table(['Есеп','Жіберген','Алғашқыда дұрыс','Әрекет','Түзетуден өсім','Уақыт','Жиі қате'],sent.map(i=>h('tr',{},[td((i.label||i.task+'.'+i.id%10)+' · '+i.title,'l'),td(i.sent),td(i.firstPass===null?'—':i.firstPass+'%'),td(i.avgTries),td(i.avgGain?'+'+Math.round(i.avgGain*100)+'%':'—'),td(i.medianSecs?mmss(Math.round(i.medianSecs)):'—'),td(i.skills.map(s=>s.name+' ('+s.n+')').join('; ')||'—','l analysis-desc')]))):h('p',{class:'analysis-empty',text:'Код есептері әлі жіберілмеген.'})]));
 }else{
   const op=(d.ops||[]).find(o=>o.op===analysisFocusOp),focus=(d.allItems||[]).find(i=>i.id===analysisFocusItem);let students=d.students||[];if(op)students=students.filter(s=>op.weak.includes(s.name));if(focus)students=students.filter(s=>focus.struggling.some(p=>p.id===s.id));
   content.append(h('div',{class:'card'},[h('div',{class:'row'},[h('h2',{text:focus?focus.label+' · '+focus.title+' — көмек қажет':op?op.sym+' · '+op.name+' амалында қиналғандар':'Студенттер нәтижесі'}),(op||focus)?btn('Барлығын көрсету',()=>{analysisFocusOp='';analysisFocusItem=0;paintAnalysis();},'sm'):'']),students.length?table(['Студент','Жауап/әрекет','Түзеткен есеп','Уақыт','Назар аудару керек'],students.map(s=>h('tr',{},[h('td',{class:'l'},h('button',{class:'score-cell',type:'button',text:s.name,on:{click:()=>openDetail(LIVE.session.id,s.id)}})),td(s.tries),td(s.fixed),td(s.secs===null?'—':mmss(Math.round(s.secs))),td(s.flags.join('; ')||'—','l analysis-desc')]))):h('p',{class:'analysis-empty',text:op?'Бұл амал бойынша көмек қажет студент жоқ.':'Студенттер әлі жауап жібермеген.'})]));
 }
 const area=root.querySelector('.analysis-scroll');if(area)area.scrollTop=scroll;
}

const topicQuestions = window.TeacherLessons.questions;
function setQuestions(){QUESTIONS=topicQuestions[LIVE?.session?.topic]|| (LIVE?.session?.topic==='6'?['Гаусс–Зейдель әдісінің басты ерекшелігі қандай?','Әдіс қандай шартта жинақталады?','Итерацияны қашан тоқтатамыз?']:['Бүгінгі тақырыптың негізгі ұғымын түсіндіріңіз.','Тапсырманы орындауда қандай қате болды және оны қалай түзеттіңіз?','Осы білімді қандай жағдайда қолдануға болады?']);}
async function loadPlan(){const root=$('#s-plan'),topic=LIVE?.session?.topic;if(!topic){root.replaceChildren(h('div',{class:'analysis-empty',text:'Алдымен сабақты таңдаңыз.'}));return;}root.replaceChildren(h('p',{class:'sub',text:'Жоспар жүктелуде…'}));let j;try{j=await(await fetch('/api/plan?all=1',{headers:{Authorization:'Bearer '+TOK}})).json();}catch{j={ok:false};}if(!j.ok){root.replaceChildren(h('p',{class:'bad',text:'Жоспарды жүктеу мүмкін болмады.'}));return;}const plan=j.topics?.find(p=>p.topic===topic);if(!plan){root.replaceChildren(h('div',{class:'card'},[h('h2',{text:tinfo(topic).title}),h('p',{class:'sub',text:'Бұл сабақтың жеке жоспары әлі енгізілмеген. Сабақ материалы мен тапсырмаларын төмендегі сілтемеден қарай аласыз.'}),h('a',{class:'btn',href:tinfo(topic).path,target:'_blank',rel:'noopener',text:'Сабақ материалын ашу'})]));return;}const doc=h('div',{class:'plan-doc'});doc.innerHTML=plan.html;root.replaceChildren(h('div',{class:'card'},[h('h2',{text:plan.title}),doc]));}
let archivePanel;
async function renderArchive(){
  if(!archivePanel) archivePanel=window.createTeacherArchive({
    h,btn,api,subjects:SUBJ,topicInfo:tinfo,topicName:tname,dateText:fdate,
    open:selectSession,
    reopen:async id=>{
      if(!confirm('Бұл сабақты қайта ашасыз ба? Қазіргі ашық сабақ жабылады. Бұрынғы жұмыстар мен бағалар сақталады.'))return false;
      const j=await api('session/reopen',{id,minutes:15});
      if(!j.ok)return false;
      VIEW=0;liveShape='';await loadLive(true);goTab('live');return true;
    },
    changed:async ids=>{
      if(ids.includes(VIEW))VIEW=0;
      SESS.rows=null;SESS.t=0;JOUR=null;HW=null;contextShape='';liveShape='';analysisAt=0;analysisFor=0;
      await loadLive();loadHomeworkBadge();rememberUI();
    },
    notify:toast
  });
  return archivePanel.render($('#s-archive'));
}
function renderRoster(){const root=$('#s-roster');if(!ROSTER.some(g=>String(g.id)===rosterGroup))rosterGroup=String(ROSTER.find(g=>g.id===LIVE?.session?.group_id)?.id||ROSTER[0]?.id||'');const search=h('input',{class:'field',type:'search',placeholder:'Топты іздеу',value:groupQuery,'aria-label':'Топты іздеу'}),directory=h('div',{class:'group-directory-list'}),content=h('div');const paintDirectory=()=>{directory.replaceChildren(...ROSTER.filter(g=>g.name.toLocaleLowerCase('kk').includes(groupQuery.toLocaleLowerCase('kk'))).map(g=>h('button',{type:'button',class:'group-button'+(String(g.id)===rosterGroup?' on':''),on:{click:()=>{rosterGroup=String(g.id);paintDirectory();paintGroup();}}},[h('span',{text:g.name}),h('small',{text:String(g.students.filter(s=>s.active!==false).length)})])));};const paintGroup=()=>{const g=ROSTER.find(g=>String(g.id)===rosterGroup);content.replaceChildren();if(!g){content.append(h('p',{class:'analysis-empty',text:'Алдымен топ қосыңыз.'}));return;}const opts=h('details',{},[h('summary',{text:'Топ әрекеттері'}),h('div',{class:'row'},[btn('Атын өзгерту',async()=>{const name=prompt('Топ атауы',g.name);if(name){const j=await api('groups/'+g.id,{name},'PATCH');if(j.ok)setRoster(j);}},'sm'),btn('Топты жою',async()=>{if(confirm(g.name+' тобын және оның барлық студенттері мен жұмыстарын біржола жоясыз ба?')){const j=await api('groups/'+g.id,null,'DELETE');if(j.ok)setRoster(j);}},'sm danger')])]);const names=h('textarea',{class:'field',rows:'5',placeholder:'Әр жолға бір студенттің аты-жөнін жазыңыз','aria-label':'Қосылатын студенттер'});const tbody=h('tbody',{},g.students.map((s,i)=>h('tr',{class:s.active?'':'absent'},[h('td',{text:String(i+1)}),h('td',{class:'l',text:s.name+(s.active?'':' · жасырылған')}),h('td',{},h('details',{},[h('summary',{text:'Өзгерту'}),h('div',{class:'row'},[btn('Аты',async()=>{const name=prompt('Аты-жөні',s.name);if(name){const j=await api('students/'+s.id,{name},'PATCH');if(j.ok)setRoster(j);}},'sm'),btn(s.active?'Жасыру':'Қайтару',async()=>{const j=await api('students/'+s.id,{active:!s.active},'PATCH');if(j.ok)setRoster(j);},'sm'),btn('Өшіру',async()=>{if(confirm(s.name+' біржола өшірілсін бе? Оның жұмыстары да өшеді.')){const j=await api('students/'+s.id,null,'DELETE');if(j.ok)setRoster(j);}},'sm danger')])]))])));content.append(h('div',{class:'card'},[h('div',{class:'row'},[h('h2',{text:g.name}),h('span',{class:'sp'}),btn('Сабақ бастау',()=>newLesson({g:String(g.id)}),'primary sm'),opts]),h('p',{class:'sub',text:g.students.filter(s=>s.active).length+' белсенді студент'}),h('div',{class:'tw',style:'max-height:55vh'},h('table',{class:'t'},[h('thead',{},h('tr',{},['№','Студент','Әрекет'].map(text=>h('th',{text})))),tbody])),h('details',{class:'roster-add'},[h('summary',{text:'+ Студенттерді қосу'}),names,btn('Тізімді сақтау',async()=>{if(!names.value.trim())return;const j=await api('students',{group_id:g.id,names:names.value});if(j.ok){names.value='';setRoster(j);toast('Студенттер қосылды.');}},'primary')])]));};search.oninput=e=>{groupQuery=e.target.value;paintDirectory();};root.replaceChildren(h('div',{class:'group-layout'},[h('div',{class:'group-directory'},[search,directory,btn('+ Топ қосу',async()=>{const name=prompt('Жаңа топтың атауы')?.trim().slice(0,40);if(name){const j=await api('groups',{name:name.trim()});if(j.ok){const g=j.groups.find(g=>g.name===name.trim());if(g){rosterGroup=String(g.id);rememberStart({...LS,g:String(g.id)});}groupQuery='';setRoster(j);toast('Топ қосылды. Студенттерді қосып немесе сабақ бастай аласыз.');}}},'sm')]),content]));paintDirectory();paintGroup();}
async function loadHomework(){const j=await api('homework');if(!j.ok){if(!HW)$('#s-homework').replaceChildren(h('p',{class:'bad',text:'Үй жұмысын жүктеу мүмкін болмады.'}));return;}HW=j.rows;renderHomework();}
function homeworkReviewView(review){
  const findings=Array.isArray(review.findings)?review.findings:[];
  const box=h('section',{class:'hw-review'+(findings.length?' attention':''),'aria-label':'Оқытушыға тексеру белгілері'},[
    h('b',{text:findings.length?'! Оқытушы нақтыласын':'Оқытушыға: нақты белгі байқалмады'}),
    h('p',{class:'sub',text:findings.length?'Соңғы бағаланған жұмыстағы белгілер. ЖИ қолданғанының дәлелі емес; балл критерий бойынша қойылды.':'Бұл авторлықты растамайды. Жұмыс критерий бойынша бағаланды.'})
  ]);
  findings.slice(0,3).forEach(f=>box.append(h('div',{class:'hw-review-finding'},[
    h('small',{text:f.kind==='outside_lesson'?'Түсінгенін тексеру':'Көрінетін белгі'}),
    h('pre',{text:f.excerpt}),h('p',{text:f.reason}),h('b',{text:'Студенттен сұраңыз:'}),h('p',{text:f.question})
  ])));
  return box;
}
function homeworkUploadView(upload){return h('div',{class:'aibox'},[h('b',{text:upload.status==='queued'?'Фото кезекте, автоматты түрде тексеріледі':upload.status==='checking'?'Жаңа фото тексерілуде':'Жаңа фото сақталды; ЖИ қайта тексеруі қажет'}),h('img',{src:'data:'+upload.mime+';base64,'+upload.photo,alt:'Сақталған үй жұмысы',style:'display:block;max-width:100%;max-height:520px;margin-top:10px'})]);}
function renderHomework(){
  const root=$('#s-homework'),q=h('input',{class:'field',type:'search',placeholder:'Студентті немесе сабақты іздеу',value:homeworkQuery,'aria-label':'Үй жұмысын іздеу'});
  const grp=h('select',{class:'field','aria-label':'Үй жұмысы тобы'},[h('option',{value:'',text:'Барлық топ'}),...[...new Set(HW.map(r=>r.group))].map(n=>h('option',{value:n,text:n,selected:n===homeworkGroup}))]);
  const st=h('select',{class:'field','aria-label':'Тексеру күйі'},[['','Барлығы'],['queued','Кезекте'],['checking','ЖИ тексеруде'],['error','Қайта тексеру қажет'],['review','Оқытушы нақтыласын'],['edited','Оқытушы бағасы'],['ai','ЖИ бағалаған']].map(([value,text])=>h('option',{value,text,selected:value===homeworkStatus}))),cards=h('div',{class:'hw-grid'});
  const paint=()=>{
    const term=homeworkQuery.toLocaleLowerCase('kk');
    const rows=HW.filter(r=>(!homeworkGroup||r.group===homeworkGroup)&&(!term||(r.name+' '+tname(r.topic)).toLocaleLowerCase('kk').includes(term))&&(!homeworkStatus||(homeworkStatus==='review'?r.review_count>0:homeworkStatus==='edited'?r.teacher_score!==null:homeworkStatus==='ai'?r.status==='graded'&&r.teacher_score===null:r.status===homeworkStatus)));
    cards.replaceChildren(...rows.map(r=>{
      const pending=r.status==='queued'||r.status==='checking'||r.status==='error';
      const label=r.status==='queued'?'Кезекте':r.status==='checking'?'ЖИ тексеруде':r.status==='error'?'Қайта тексеру қажет':r.teacher_score!==null?'Оқытушы бағасы':'ЖИ бағалаған';
      const score=r.teacher_score??r.score;
      return h('article',{class:'hw-card'},[h('div',{class:'row'},[h('span',{class:'state-badge '+(r.status==='error'?'warn':pending?'muted':'ok'),text:label}),h('b',{class:'hw-score-label',text:score===null?'Балл күтілуде':(pending?'Алдыңғы баға: ':'')+score+' / 25'})]),h('h3',{text:r.name}),r.review_count?h('p',{class:'hw-review-badge',text:'! Оқытушы нақтыласын · '+r.review_count+(pending?' (алдыңғы жұмыс)':'')}):'',h('p',{class:'sub',text:r.group+' · '+tinfo(r.topic).title}),h('p',{class:'sub',text:fdate(r.at)+' · '+r.attempts+' бағаланған әрекет'}),btn('Сурет пен пікірді ашу',()=>openDetail(r.session_id,r.student_id,5),'sm')]);
    }));
    if(!rows.length)cards.append(h('p',{class:'analysis-empty',text:HW.length?'Іздеу бойынша жұмыс табылмады.':'Әзірге жүктелген үй жұмысы жоқ.'}));
  };
  q.oninput=e=>{homeworkQuery=e.target.value;paint();};grp.onchange=e=>{homeworkGroup=e.target.value;paint();};st.onchange=e=>{homeworkStatus=e.target.value;paint();};
  root.replaceChildren(h('div',{class:'archive-toolbar'},[q,grp,st,btn('Жаңарту',loadHomework)]),cards);paint();
}
const legacyOpenDetail=openDetail;openDetail=async function(sid,stu,task){if(detailDirty&&!confirm('Сақталмаған өзгерістерді тастап, басқа жұмысты ашасыз ба?'))return;detailOrigin=document.activeElement;await legacyOpenDetail(sid,stu);if(!DETAIL)return;decorateDetail(task);$('#panel').focus();};
const legacyPaintDetail=paintDetail;paintDetail=function(j){const key=DETAIL?DETAIL.sid+':'+DETAIL.stu:''; const drafts=lastDetailKey===key?[...document.querySelectorAll('#panel input,#panel textarea')].map((el,i)=>({i,value:el.value,dirty:el.dataset.baseline!==undefined&&el.value!==el.dataset.baseline})).filter(d=>d.dirty):[];legacyPaintDetail(j);lastDetailKey=key;if(j.attempts?.length){const first=$('#panel .p-body>div');const ds=h('div',{class:'box attempt-list'},[h('h3',{text:'Кодтар мен әрекеттер тарихы'})]);j.attempts.forEach(a=>ds.append(h('details',{'data-task':String(a.task)},[h('summary',{text:a.task+'-тапсырма · '+a.title+' · '+a.n+'-әрекет · '+Math.round(a.frac*100)+'%'}),a.code?h('pre',{text:a.code}):'',h('p',{class:'sub',text:(a.detail?.diag||[]).map(d=>d.text).join(' ')||'Қате туралы қосымша хабар жоқ.'})])));first.append(ds);}detailDirty=false;const inputs=[...document.querySelectorAll('#panel input,#panel textarea')];inputs.forEach(el=>el.dataset.baseline=el.value);drafts.forEach(d=>{const el=inputs[d.i];if(el&&el.value!==d.value){el.value=d.value;detailDirty=true;}});decorateDetail();};
function decorateDetail(task){document.querySelector('#panel .detail-task-nav')?.remove();const body=$('#panel .p-body'),left=body?.firstElementChild;if(!left)return;const boxes=[...left.children];const nav=h('div',{class:'detail-task-nav'});const history=boxes.find(b=>b.classList.contains('attempt-list'));nav.append(btn('Барлығы',()=>{boxes.forEach(b=>b.hidden=false);history?.querySelectorAll('details').forEach(d=>d.hidden=false);nav.querySelectorAll('.btn').forEach(b=>b.classList.remove('on'));},'sm'));boxes.forEach((b,i)=>{const title=b.querySelector('h3')?.textContent;if(!title)return;const n=/^(\d+)-тапсырма/.exec(title)?.[1];const btt=btn(n?n+'-тапсырма':'Кодтар',()=>{boxes.forEach(box=>box.hidden=box!==b);if(n&&history){const attempts=[...history.querySelectorAll('details')];attempts.forEach(d=>d.hidden=d.dataset.task!==n);history.hidden=!attempts.some(d=>!d.hidden);}nav.querySelectorAll('.btn').forEach(bt=>bt.classList.toggle('on',bt===btt));},'sm');nav.append(btt);if(task&&+n===+task){btt.click();}});body.before(nav);}
$('#panel').addEventListener('input',e=>{if(e.target.matches('input,textarea,select'))detailDirty=true;});
document.addEventListener('keydown',e=>{const dlg=!$('#newLessonDialog').hidden?$('#newLessonDialog'):!$('#ov').hidden?$('#ov'):!$('#pj').hidden?$('#pj'):null;if(e.key==='Tab'&&dlg){const focus=[...dlg.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);if(!focus.length)return;const first=focus[0],last=focus.at(-1);if(e.shiftKey&&(document.activeElement===first||!dlg.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!dlg.contains(document.activeElement))){e.preventDefault();first.focus();}}});
const closeBase=closeDetail;closeDetail=function(){const was=!!DETAIL;closeBase();if(was&&!DETAIL)detailOrigin?.focus();};
window.addEventListener('beforeunload',e=>{if(detailDirty){e.preventDefault();e.returnValue='';}});
const startBase=start;start=function(){startBase();goTab(TAB);loadHomeworkBadge();};
async function loadHomeworkBadge(){const j=await api('homework');if(j.ok){const badge=$('#hwBadge');const count=j.rows.filter(r=>r.teacher_score===null).length;badge.textContent=String(count);badge.hidden=!count;}}
setInterval(()=>{if(!TOK||document.hidden)return;if(TAB==='homework')loadHomework();else loadHomeworkBadge();},30000);
// Never restore an old student detail, a pending mutation, or a password.
try{const saved=JSON.parse(sessionStorage.getItem('teacher-dashboard-ui')||'{}');if(['live','analysis','wrap','plan','homework','journal','roster','archive','progress'].includes(saved.tab))TAB=saved.tab;VIEW=Number(saved.view)||0;}catch{}
if(TOK)start();

})();
