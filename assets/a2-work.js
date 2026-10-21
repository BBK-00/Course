/* АКТ · 2: төрт тапсырма сайттың өзінде орындалады, әрқайсысы өз «Жіберу» батырмасымен жеке жіберіліп, бірден бағаланады.
   A2Work.mountTask(host, n) — әр тапсырманың жіберу бөлімі, A2Work.mountTimer(host) — ортақ 60 минуттық таймер.
   Студент алдымен сабаққа кіреді (Join). Жауаптар жоба ретінде құрылғыда сақталады, уақыт біткенде жіберілмегені өздігінен жіберіледі. */
(function(){
'use strict';
const { el } = window.L;
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const ELEMS = [['cpu', 'Процессор'], ['ram', 'Жедел жад'], ['ssd', 'SSD'], ['mb', 'Аналық тақша'], ['os', 'Операциялық жүйе'], ['drv', 'Драйвер'], ['br', 'Браузер'], ['av', 'Антивирус']];
const ERR = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', time_over:'Жұмыс уақыты бітті.', closed:'Сабақ жабылған немесе бұл тапсырма әзірге ашылмаған.', already:'Бұл тапсырма жіберіліп қойған.', auth:'Сабаққа қайта кіріңіз.' };
const NAME = ['', '1-тапсырма', '2-тапсырма', '3-тапсырма', '4-тапсырма'];
const KEY = 'a2draft2';
/* Жауаптар жоба ретінде құрылғыда сақталады; 1–3-тапсырмалардың виджеттері де осы нысанға жазады */
const st = (() => { let d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} return Object.assign({ t1:{}, t2:{ sw:{}, g:['', '', ''] }, t3:['', '', '', '', ''], types:{}, funcs:{}, pairs:[{ a:'', b:'', t:'' }, { a:'', b:'', t:'' }] }, d && d.types ? d : {}); })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
window.A2Draft = { st, save };
const payload = n => n === 1 ? { t1:st.t1 } : n === 2 ? { t2:st.t2 } : n === 3 ? { t3:st.t3 } : { types:st.types, funcs:st.funcs, pairs:st.pairs };
const filled = n => { const p = payload(n); return JSON.stringify(p).replace(/[{}\[\]":,\s]|null|false|true|"a":|"b":|"t":/g, '').length > 6 && (n !== 2 || Object.keys(st.t2.sw).length || st.t2.g.some(x => x)); };

const boxes = [], timers = [], results = {}; let busy = {}, auto = false;
const me = () => window.Join.get();
const nowS = () => Math.floor(window.Join.serverNow() / 1000);

async function submit(n, btn, silent){
  if (busy[n]) return;
  if (!silent && !confirm(NAME[n] + ' жауабын жібересіз бе? Жібергеннен кейін өзгертуге болмайды.')) return;
  busy[n] = true; if (btn) btn.disabled = true; msg(n, 'Тексеріліп жатыр…');
  try {
    const j = await window.Join.api('a2/submit', { task:n, ...payload(n) });
    if (j.ok){ results[n] = { items:j.items, pts:j.pts, dup:j.dup }; await window.Join.refresh(); const m = me(); if (m && m.tasks && [1, 2, 3, 4].every(k => m.tasks[k] && m.tasks[k].sent)) { try { localStorage.removeItem(KEY); } catch (e) {} } }
    else { msg(n, ERR[j.error] || 'Қате болды. Қайта көріңіз.', 'bad'); if (btn) btn.disabled = false; }
  } catch (e) { msg(n, 'Желі қатесі. Қайта көріңіз.', 'bad'); if (btn) btn.disabled = false; }
  busy[n] = false; renderAll(true);
}
function msg(n, t, cls){ const b = boxes.find(x => x.n === n), m = b && b.box.querySelector('.xl-msg'); if (m){ m.className = 'xl-msg ' + (cls || ''); m.textContent = t || ''; } }

const sel = (opts, val, on, label) => { const s = el('select', { class:'a2sel', 'aria-label':label }, opts.map(([v, t]) => el('option', { value:v, text:t }))); s.value = val || ''; s.addEventListener('change', () => on(s.value)); return s; };
function form(){
  const rows = ELEMS.map(([id, name]) => {
    const ty = sel([['', '— таңда —'], ['hw', 'Аппараттық'], ['sw', 'Программалық']], st.types[id], v => { st.types[id] = v; save(); }, name + ': түрі');
    const fn = el('input', { type:'text', class:'a2in', maxlength:'200', placeholder:'Қызметін қысқаша жаз', value:st.funcs[id] || '', 'aria-label':name + ': қызметі' });
    fn.addEventListener('input', () => { st.funcs[id] = fn.value; save(); });
    return el('tr', {}, [el('th', { scope:'row', text:name }), el('td', {}, ty), el('td', {}, fn)]);
  });
  const table = el('table', { class:'a2tb' }, [el('thead', {}, el('tr', {}, [el('th', { text:'Атауы' }), el('th', { text:'Түрі' }), el('th', { text:'Қызметі' })])), el('tbody', {}, rows)]);
  const opts = [['', '— таңда —'], ...ELEMS];
  const pairs = [0, 1].map(i => {
    const p = st.pairs[i];
    const a = sel(opts, p.a, v => { p.a = v; save(); }, i + 1 + '-мысал: бірінші элемент'), b = sel(opts, p.b, v => { p.b = v; save(); }, i + 1 + '-мысал: екінші элемент');
    const t = el('textarea', { class:'a2in', rows:'2', maxlength:'300', placeholder:'Олар қалай бірге жұмыс істейді? Бір сөйлеммен жаз.', 'aria-label':i + 1 + '-мысал: түсініктеме' }); t.value = p.t || '';
    t.addEventListener('input', () => { p.t = t.value; save(); });
    return el('div', { class:'a2pair' }, [el('b', { text:(i + 1) + '-мысал' }), el('div', { class:'a2row' }, [a, el('span', { text:'↔' }), b]), t]);
  });
  return [table, el('h4', { class:'a2h', text:'Өзара байланысқа 2 мысал келтір' }), el('p', { class:'muted', text:'Әр мысалда бір аппараттық және бір программалық элементті таңда, екі мысалдағы жұп әртүрлі болсын.' }), ...pairs];
}

function lock(card, box, on){
  if (!card) return;
  card.querySelectorAll('input,select,textarea,button').forEach(x => { if (!box.contains(x)) x.disabled = !!on; });
  card.classList.toggle('a2done', !!on);
}

function renderBox(b, force){
  const m = me(), now = nowS(), n = b.n, box = b.box;
  const key = JSON.stringify(m ? [m.student && m.student.name, m.guest, m.session && m.session.topic, m.session && m.session.work_until, m.tasks && m.tasks[n] && m.tasks[n].sent, m.tasks && m.tasks[n] && m.tasks[n].pts, m.session && now > m.session.work_until + 90] : null);
  if (!force && key === b.last && box.firstChild) return; b.last = key;
  box.innerHTML = '';
  const card = box.closest('.tsk');
  if (!m){ lock(card, box, false); box.append(el('p', { class:'notice', text:'Жауапты жіберу үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.' }), el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру', onclick:() => window.Join.open() }))); return; }
  if (m.guest){ box.append(el('p', { class:'notice', text:'Мұғалім ретінде кірдіңіз. Тапсырманы студенттер орындайды.' })); return; }
  if (!m.session || m.session.topic !== 'A2'){ box.append(el('p', { class:'notice', text:'Бұл тақырып бойынша сабақ әлі ашылмаған. Оқытушы сабақты бастағанда осы бет жаңарады.' })); return; }
  const t = m.tasks && m.tasks[n];
  if (t && t.sent){
    lock(card, box, true);
    const r = results[n];
    box.append(el('div', { class:'xl-total' }, [el('b', { text:'✓ ' + NAME[n] + ' жіберілді: ' + t.pts + ' / ' + t.max + ' балл' })]));
    if (r && r.dup) box.append(el('p', { class:'errbox', text:'Жауаптарың басқа студенттің жұмысымен бірдей болып шықты, сондықтан балл қойылмады. Оқытушы тексереді.' }));
    if (r && r.items) box.append(el('details', { class:'xl-sheet' }, [el('summary', { text:'Талдау: қай жауап дұрыс, қайсысы қате' }), el('ul', {}, r.items.map(x => el('li', { class:x.got >= x.max ? 'ok' : x.got > 0 ? 'mid' : 'no', text:(x.got >= x.max ? '✓ ' : x.got > 0 ? '◑ ' : '✗ ') + x.label + ' — ' + x.got + ' / ' + x.max })))]));
    return;
  }
  if (!m.session.work_until){ lock(card, box, false); box.append(el('p', { class:'notice', text:'✓ Сабаққа кірдіңіз (қатысым 30 балл). Оқытушы жұмысты бастағанда осы жерде «Жіберу» батырмасы ашылады. Бет өзі жаңарады.' })); return; }
  if (now > m.session.work_until + 90){ lock(card, box, true); box.append(el('p', { class:'errbox', text:'Жұмыс уақыты бітті, бұл тапсырма жіберілмеді.' })); return; }
  lock(card, box, false);
  const up = el('button', { type:'button', class:'btn primary', text:'⬆ ' + NAME[n] + ' жауабын жіберу' });
  up.addEventListener('click', () => submit(n, up, false));
  box.append(el('div', { class:'xl-up' }, [up]), el('div', { class:'xl-msg', role:'status' }), el('p', { class:'muted', text:'Жауабың осы құрылғыда сақталып тұрады. Жібергеннен кейін бұл тапсырманы өзгертуге болмайды.' }));
}

function tick(){
  const m = me(), act = m && !m.guest && m.session && m.session.topic === 'A2' && m.session.work_until;
  timers.forEach(t => {
    if (!m || m.guest || !m.session || m.session.topic !== 'A2'){ t.textContent = '⏱ Тапсырмалар оқытушы жұмысты бастағанда ашылады. Жалпы уақыт — 60 минут.'; t.className = 'xl-timer'; return; }
    if (!m.session.work_until){ t.textContent = '✓ Сабаққа кірдіңіз. Оқытушы жұмысты бастағанда таймер басталады.'; t.className = 'xl-timer'; return; }
    const left = Math.max(0, m.session.work_until - nowS()), sent = [1, 2, 3, 4].filter(k => m.tasks && m.tasks[k] && m.tasks[k].sent).length;
    t.textContent = (left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті') + ' · Жіберілген: ' + sent + ' / 4 · Қазіргі балл: ' + m.total + ' / 100';
    t.className = 'xl-timer' + (left < 300 ? ' low' : '');
  });
  if (act && m.session.work_until - nowS() <= 0 && !auto){ auto = true; [1, 2, 3, 4].forEach(n => { if (m.tasks && m.tasks[n] && !m.tasks[n].sent && filled(n)) submit(n, null, true); }); }
  boxes.forEach(b => renderBox(b, false));
}
function renderAll(force){ boxes.forEach(b => renderBox(b, force)); tick(); }

window.A2Work = {
  mountTask(host, n){ const box = el('div', { class:'xl a2sub' }); if (n === 4) host.append(...form()); host.append(box); const b = { n, box, last:'' }; boxes.push(b); renderBox(b, true); },
  mountTimer(host){ const t = el('p', { class:'xl-timer', role:'timer' }); host.append(t); timers.push(t); tick(); }
};
window.Join.on(() => renderAll(false));
setInterval(tick, 1000);
})();
