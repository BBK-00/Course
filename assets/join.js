/* Сабаққа кіру: студент (топ + аты + код) немесе мұғалім (аты-жөнін өзі жазады + код). Тіркелу жоқ.
   Студентке қатысым (40 балл) автоматты түседі, аты бір құрылғыға бекітіледі. Қонақ мұғалімге тек сабақты көру ашылады.
   Join.mount({ gate:true }) — сабақ беті кодсыз жабық тұрады.
   Join.get() — ағымдағы күй, Join.on(fn) — өзгерісті тыңдау, Join.api(path, body) — токенмен сұрау. */
(function(){
'use strict';
const { el } = window.L;
const TK = 'bbk-join-token', DK = 'bbk-device';
const S = { token:'', me:null, open:false, topic:'', fns:[], skew:0, gate:false };
try { S.token = localStorage.getItem(TK) || ''; } catch (e) {}
const device = () => { let d = ''; try { d = localStorage.getItem(DK); if (!d){ d = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(DK, d); } } catch (e) {} return d || 'nolocal'; };
const emit = () => S.fns.forEach(f => { try { f(S.me); } catch (e) {} });
async function api(path, body){
  const r = await fetch('/api/' + path, { method:body ? 'POST' : 'GET', headers:{ 'Content-Type':'application/json', ...(S.token ? { Authorization:'Bearer ' + S.token } : {}) }, body:body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) {}
  return { status:r.status, ...j };
}
const saveToken = t => { S.token = t; try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) {} };
async function refresh(){
  if (!S.token){ S.me = null; sync(); return; }
  const j = await api('me');
  if (j.ok){ S.me = j; S.skew = j.now * 1000 - Date.now(); }
  else if (j.status === 401 || j.error === 'auth'){ saveToken(''); S.me = null; }
  sync();
}
async function check(){ const j = await api('public/roster'); const was = S.open; S.open = !!j.open; S.topic = j.topic || ''; if (S.gate && gateBox && was !== S.open) renderGate(); chip(); }
function sync(){ emit(); chip(); if (S.gate) lock(!S.me); }

/* Жоғарғы панельдегі батырма */
let btn;
function chip(){
  if (!btn) return;
  if (S.me){ btn.textContent = '✓ ' + S.me.student.name + (S.me.guest ? ' · мұғалім' : ''); btn.className = 'join-chip on'; btn.title = S.me.guest ? 'Қонақ мұғалім' : S.me.student.group + ' · қатысым ' + S.me.attendance + ' балл'; }
  else { btn.textContent = S.open ? '🔑 Сабаққа кіру' : '🔒 Сабақ жабық'; btn.className = 'join-chip' + (S.open ? ' go' : ''); btn.title = ''; }
}

/* Кіру формасы (терезеде де, қақпада да бір) */
async function buildForm(box, onDone, onCancel){
  box.innerHTML = '';
  const info = el('p', { text:'Тексеріп жатыр…' }); box.append(info);
  const r = await api('public/roster'); S.open = !!r.open;
  if (!r.open){ info.className = 'notice'; info.textContent = 'Сабақ әзірге ашылмаған. Оқытушы сабақты бастағанда кіре аласың. Бет өзі тексеріп тұрады.'; if (onCancel) box.append(el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn', text:'Жабу', onclick:onCancel }))); return; }
  let role = 'student';
  const tabs = el('div', { class:'role-tabs' }), form = el('div');
  const bS = el('button', { type:'button', class:'on', text:'🎓 Студент' }), bT = el('button', { type:'button', text:'👩‍🏫 Мұғалім' });
  tabs.append(bS, bT);
  const code = el('input', { class:'cf-input wide', id:'jc', type:'text', inputmode:'numeric', maxlength:'4', autocomplete:'off', placeholder:'4 таңбалы код' });
  const msg = el('div', { role:'status' }), go = el('button', { type:'button', class:'btn primary', text:'Кіру' });
  const gs = el('select', { class:'cf-input wide', id:'jg', 'aria-label':'Топ' }, r.groups.map(g => el('option', { value:g.id, text:g.name })));
  const ns = el('select', { class:'cf-input wide', id:'jn', 'aria-label':'Аты-жөні' });
  const fill = () => { ns.innerHTML = ''; const g = r.groups.find(x => String(x.id) === gs.value); if (g) g.students.forEach(s => ns.append(el('option', { value:s.id, text:(s.present ? '✓ ' : '') + s.name }))); };
  gs.addEventListener('change', fill); fill();
  const nm = el('input', { class:'cf-input wide', id:'jt', type:'text', autocomplete:'name', placeholder:'Аты-жөніңізді жазыңыз' });
  const paint = () => {
    bS.classList.toggle('on', role === 'student'); bT.classList.toggle('on', role === 'teacher'); msg.innerHTML = '';
    form.innerHTML = '';
    if (role === 'student'){
      if (!r.groups.length){ form.append(el('p', { class:'notice', text:'Студенттер тізімі әлі жасалмаған. Оқытушыға айт.' })); return; }
      form.append(el('div', { class:'submit-grid' }, [el('label', { for:'jg', text:'Топ' }), gs, el('label', { for:'jn', text:'Аты-жөні' }), ns, el('label', { for:'jc', text:'Код' }), code]));
    } else form.append(el('div', { class:'submit-grid' }, [el('label', { for:'jt', text:'Аты-жөні' }), nm, el('label', { for:'jc', text:'Код' }), code]), el('p', { class:'muted', text:'Мұғалім ретінде сабақты көре аласыз. Тапсырмаларды студенттер орындайды.' }));
  };
  bS.addEventListener('click', () => { role = 'student'; paint(); }); bT.addEventListener('click', () => { role = 'teacher'; paint(); });
  info.textContent = 'Кім екеніңді таңда және оқытушы көрсеткен кодты енгізіп, «Кіру» батырмасын бас.';
  box.append(tabs, form, el('div', { class:'stepbar' }, [go].concat(onCancel ? [el('button', { type:'button', class:'btn ghost', text:'Бас тарту', onclick:onCancel })] : [])), msg); paint();
  const submit = async () => {
    go.disabled = true; msg.innerHTML = '';
    const j = role === 'student' ? await api('join', { student_id:Number(ns.value), code:code.value.trim(), device:device() }) : await api('join_guest', { name:nm.value, code:code.value.trim() });
    go.disabled = false;
    if (j.ok){ saveToken(j.token); await refresh(); if (onDone) onDone(); return; }
    const t = { bad_code:'Код дұрыс емес.', taken:'Бұл атпен басқа құрылғыдан кірілген. Оқытушыға айт, ол босатады.', wait:'Қате көп болды. 1 минуттан кейін қайта көр.', no_session:'Сабақ жабылған.', bad_request:role === 'teacher' ? 'Аты-жөніңізді толық жазыңыз.' : 'Барлық өрісті толтыр.' }[j.error] || 'Кіру мүмкін болмады. Қайта көр.';
    msg.append(el('p', { class:'errbox', text:t }));
  };
  go.addEventListener('click', submit); code.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

/* Терезе (кіргеннен кейін профиль, кіру үшін форма) */
function dialog(){
  const box = el('div', { class:'modal-box', role:'dialog', 'aria-modal':'true', 'aria-label':'Сабаққа кіру' });
  const ov = el('div', { class:'modal' }, box);
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.addEventListener('keydown', function esc(e){ if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', esc); } });
  document.body.append(ov);
  return { box, close };
}
function openJoin(){
  const { box, close } = dialog();
  box.append(el('h3', { text:'Сабаққа кіру' }));
  if (S.me){
    box.append(el('p', { html:'<b>' + S.me.student.name + '</b> · ' + S.me.student.group }), el('p', { class:'muted', text:S.me.guest ? 'Қонақ мұғалім ретінде кірдіңіз.' : 'Нұсқаң: №' + S.me.variant + '. Қатысымың белгіленді: ' + S.me.attendance + ' балл.' }));
    const out = el('button', { type:'button', class:'btn ghost', text:S.me.guest ? 'Шығу' : 'Шығу (басқа құрылғыға ауысу үшін оқытушыға айт)' });
    out.addEventListener('click', () => { saveToken(''); S.me = null; sync(); close(); });
    box.append(el('div', { class:'stepbar' }, [el('button', { type:'button', class:'btn primary', text:'Жабу', onclick:close }), out]));
    return;
  }
  const holder = el('div'); box.append(holder); buildForm(holder, close, close);
}

/* Қақпа: сабақ беті кодсыз жабық */
let gateBox = null, gateOv = null;
function renderGate(){ if (gateBox) buildForm(gateBox.body, null, null); }
function openGate(){
  if (gateOv) return;
  const body = el('div'); gateBox = { body };
  gateOv = el('div', { class:'modal gate' }, el('div', { class:'modal-box' }, [el('h3', { text:'🔒 Сабақ жабық' }), el('p', { class:'muted', text:'6-тақырып: Гаусс–Зейдель әдісі. Сабаққа оқытушы көрсеткен кодпен кіресің.' }), body]));
  document.body.append(gateOv); renderGate();
}
function lock(on){
  document.body.classList.toggle('locked', on);
  if (on) openGate(); else if (gateOv){ gateOv.remove(); gateOv = null; gateBox = null; }
}

window.Join = {
  get: () => S.me, on(fn){ S.fns.push(fn); }, refresh, open:openJoin, api,
  serverNow: () => Date.now() + S.skew,
  mount(o){
    S.gate = !!(o && o.gate);
    const bar = document.querySelector('.topbar-in');
    if (bar){ btn = el('button', { type:'button', class:'join-chip' }); btn.addEventListener('click', openJoin); bar.append(btn); chip(); }
    if (S.gate) document.body.classList.add('locked');
    refresh(); check();
    setInterval(() => { if (document.hidden) return; if (S.token) refresh(); else check(); }, 6000);
  }
};
})();
