/* Сабаққа кіру: топ + аты + сабақ коды. Тіркелу жоқ. Аты бір құрылғыға бекітіледі, қатысым (40 балл) автоматты түседі.
   Join.get() — ағымдағы күй (студент, нұсқа, таймер, ұпайлар), Join.on(fn) — өзгерісті тыңдау, Join.api(path, body) — токенмен сұрау. */
(function(){
'use strict';
const { el } = window.L;
const TK = 'bbk-join-token', DK = 'bbk-device';
const S = { token:'', me:null, open:false, topic:'', fns:[], skew:0 };
try { S.token = localStorage.getItem(TK) || ''; } catch (e) {}
const device = () => { let d = ''; try { d = localStorage.getItem(DK); if (!d){ d = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(DK, d); } } catch (e) {} return d || 'nolocal'; };
const emit = () => S.fns.forEach(f => { try { f(S.me); } catch (e) {} });
async function api(path, body){
  const r = await fetch('/api/' + path, { method:body ? 'POST' : 'GET', headers:{ 'Content-Type':'application/json', ...(S.token ? { Authorization:'Bearer ' + S.token } : {}) }, body:body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) {}
  return { status:r.status, ...j };
}
async function refresh(){
  if (!S.token){ S.me = null; emit(); chip(); return; }
  const j = await api('me');
  if (j.ok){ S.me = j; S.skew = j.now * 1000 - Date.now(); }
  else if (j.status === 401 || j.error === 'auth'){ S.token = ''; S.me = null; try { localStorage.removeItem(TK); } catch (e) {} }
  emit(); chip();
}
async function check(){ const j = await api('public/roster'); S.open = !!j.open; S.topic = j.topic || ''; chip(); }

/* Жоғарғы панельдегі батырма */
let btn;
function chip(){
  if (!btn) return;
  if (S.me){ btn.textContent = '✓ ' + S.me.student.name; btn.className = 'join-chip on'; btn.title = S.me.student.group + ' · қатысым ' + S.me.attendance + ' балл'; }
  else { btn.textContent = S.open ? '🔑 Сабаққа кіру' : '🔒 Сабақ жабық'; btn.className = 'join-chip' + (S.open ? ' go' : ''); btn.title = ''; }
}

/* Терезе */
function dialog(){
  const box = el('div', { class:'modal-box', role:'dialog', 'aria-modal':'true', 'aria-label':'Сабаққа кіру' });
  const ov = el('div', { class:'modal' }, box);
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.addEventListener('keydown', function esc(e){ if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', esc); } });
  document.body.append(ov);
  return { box, close };
}
async function openJoin(){
  const { box, close } = dialog();
  box.append(el('h3', { text:'Сабаққа кіру' }));
  if (S.me){
    box.append(el('p', { html:'<b>' + S.me.student.name + '</b> · ' + S.me.student.group }), el('p', { class:'muted', text:'Нұсқаң: №' + S.me.variant + '. Қатысымың белгіленді: ' + S.me.attendance + ' балл.' }));
    const out = el('button', { type:'button', class:'btn ghost', text:'Шығу (басқа құрылғыға ауысу үшін оқытушыға айт)' });
    out.addEventListener('click', () => { S.token = ''; S.me = null; try { localStorage.removeItem(TK); } catch (e) {} emit(); chip(); close(); });
    box.append(el('div', { class:'stepbar' }, [el('button', { type:'button', class:'btn primary', text:'Жабу', onclick:close }), out]));
    return;
  }
  const info = el('p', { text:'Тексеріп жатыр…' }); box.append(info);
  const r = await api('public/roster');
  if (!r.open){ info.className = 'notice'; info.textContent = 'Сабақ әзірге ашылмаған. Оқытушы сабақты бастағанда кіре аласың.'; box.append(el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn', text:'Жабу', onclick:close }))); return; }
  info.textContent = 'Топты, атыңды таңда және оқытушы көрсеткен кодты енгізіп, «Кіру» батырмасын бас.';
  if (!r.groups.length){ info.className = 'notice'; info.textContent = 'Студенттер тізімі әлі жасалмаған. Оқытушыға айт.'; return; }
  const gs = el('select', { class:'cf-input wide', id:'jg', 'aria-label':'Топ' }, r.groups.map(g => el('option', { value:g.id, text:g.name })));
  const ns = el('select', { class:'cf-input wide', id:'jn', 'aria-label':'Аты-жөні' });
  const fill = () => { ns.innerHTML = ''; const g = r.groups.find(x => String(x.id) === gs.value); g.students.forEach(s => ns.append(el('option', { value:s.id, text:(s.present ? '✓ ' : '') + s.name }))); };
  gs.addEventListener('change', fill); fill();
  const code = el('input', { class:'cf-input wide', id:'jc', type:'text', inputmode:'numeric', maxlength:'4', autocomplete:'off', placeholder:'4 таңбалы код' });
  const msg = el('div', { role:'status' }), go = el('button', { type:'button', class:'btn primary', text:'Кіру' });
  box.append(el('div', { class:'submit-grid' }, [el('label', { for:'jg', text:'Топ' }), gs, el('label', { for:'jn', text:'Аты-жөні' }), ns, el('label', { for:'jc', text:'Код' }), code]), el('div', { class:'stepbar' }, [go, el('button', { type:'button', class:'btn ghost', text:'Бас тарту', onclick:close })]), msg);
  const submit = async () => {
    go.disabled = true; msg.innerHTML = '';
    const j = await api('join', { student_id:Number(ns.value), code:code.value.trim(), device:device() });
    go.disabled = false;
    if (j.ok){ S.token = j.token; try { localStorage.setItem(TK, S.token); } catch (e) {} await refresh(); close(); return; }
    const t = { bad_code:'Код дұрыс емес.', taken:'Бұл атпен басқа құрылғыдан кірілген. Оқытушыға айт, ол босатады.', wait:'Қате көп болды. 1 минуттан кейін қайта көр.', no_session:'Сабақ жабылған.', bad_request:'Барлық өрісті толтыр.' }[j.error] || 'Кіру мүмкін болмады. Қайта көр.';
    msg.append(el('p', { class:'errbox', text:t }));
  };
  go.addEventListener('click', submit); code.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  code.focus();
}

window.Join = {
  get: () => S.me, on(fn){ S.fns.push(fn); }, refresh, open:openJoin, api,
  serverNow: () => Date.now() + S.skew,
  mount(){
    const bar = document.querySelector('.topbar-in');
    if (!bar) return;
    btn = el('button', { type:'button', class:'join-chip' }); btn.addEventListener('click', openJoin); bar.append(btn); chip();
    refresh(); check();
    setInterval(() => { if (document.hidden) return; if (S.token) refresh(); else check(); }, 6000);
  }
};
})();
