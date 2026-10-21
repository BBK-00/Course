/* АКТ · 2: 4-тапсырма (70 балл) сайттың өзінде орындалады: түрі, қызметі, өзара байланыс мысалдары.
   A2Work.mount(host) — алдымен студент сабаққа кіреді (Join). Жауаптар құрылғыда сақталып тұрады, уақыт бітерде өздігінен жіберіледі. */
(function(){
'use strict';
const { el } = window.L;
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const ELEMS = [['cpu', 'Процессор', true], ['ram', 'Жедел жад', true], ['ssd', 'SSD', true], ['mb', 'Аналық тақша', true], ['os', 'Операциялық жүйе', false], ['drv', 'Драйвер', false], ['br', 'Браузер', false], ['av', 'Антивирус', false]];
const ERR = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', time_over:'Жұмыс уақыты бітті.', closed:'Сабақ жабылған немесе бұл тапсырма әзірге ашылмаған.', already:'Жұмыс жіберіліп қойған.', auth:'Сабаққа қайта кіріңіз.' };
const TITLE = ['1–3-тапсырмалар (12 + 12 + 6)', '4-тапсырма: түрі және қызметі (16 + 16)', '4-тапсырма: өзара байланыс мысалдары (2 × 4)'];
const KEY = 'a2draft';
/* Жауаптар жоба ретінде құрылғыда сақталады; 1–3-тапсырмалардың виджеттері де осы нысанға жазады */
const st = (() => { let d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} d = d && d.types ? d : {}; return Object.assign({ t1:{}, t2:{ sw:{}, g:['', '', ''] }, t3:['', '', '', '', ''], types:{}, funcs:{}, pairs:[{ a:'', b:'', t:'' }, { a:'', b:'', t:'' }] }, d); })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
window.A2Draft = { st, save };

window.A2Work = { mount(host){
  let busy = false, result = null, dup = false, last = '', auto = false;
  const box = el('div', { class:'xl' }); host.append(box);
  const msg = (t, cls) => { const m = box.querySelector('.xl-msg'); if (m){ m.className = 'xl-msg ' + (cls || ''); m.textContent = t || ''; } };

  async function submit(btn, silent){
    if (busy) return;
    if (!silent && !confirm('Жауаптарды жібересіз бе? Жібергеннен кейін қайта жіберуге болмайды.')) return;
    busy = true; if (btn) btn.disabled = true; msg('Тексеріліп жатыр…');
    try {
      const j = await window.Join.api('a2/submit', st);
      if (j.ok){ result = j.sheets; dup = !!j.dup; try { localStorage.removeItem(KEY); } catch (e) {} await window.Join.refresh(); }
      else { msg(ERR[j.error] || 'Қате болды. Қайта көріңіз.', 'bad'); if (btn) btn.disabled = false; }
    } catch (e) { msg('Желі қатесі. Қайта көріңіз.', 'bad'); if (btn) btn.disabled = false; }
    busy = false; if (result) render(true);
  }

  function report(me){
    const out = [el('div', { class:'xl-total' }, [el('b', { text:'Қорытынды балл: ' + me.total + ' / 100' }), el('span', { text:'Қатысым ' + me.attendance + ' + тапсырмалар ' + (me.total - me.attendance - (me.bonus || 0)) + (me.bonus ? ' + бонус ' + me.bonus : '') })])];
    if (dup) out.push(el('p', { class:'errbox', text:'Жауаптарың басқа студенттің жұмысымен бірдей болып шықты, сондықтан балл қойылмады. Оқытушы тексереді.' }));
    [1, 2, 3].forEach(n => {
      const t = me.tasks[n], it = result && result[n - 1];
      const d = el('details', { class:'xl-sheet' }, [el('summary', { text:TITLE[n - 1] + ' — ' + t.pts + ' / ' + t.max })]);
      if (it){ d.append(el('ul', {}, it.items.map(x => el('li', { class:x.got >= x.max ? 'ok' : x.got > 0 ? 'mid' : 'no', text:(x.got >= x.max ? '✓ ' : x.got > 0 ? '◑ ' : '✗ ') + x.label + ' — ' + x.got + ' / ' + x.max })))); d.open = n >= 2; }
      else d.append(el('p', { class:'muted', text:'Толық талдау жіберген кезде ғана көрсетіледі.' }));
      out.push(d);
    });
    out.push(el('p', { class:'muted', text:'Қызметін жауап мәтініндегі негізгі сөздер бойынша автоматты тексереді. Оқытушы нәтижені қарап, балды өзгерте алады.' }));
    return out;
  }

  const sel = (opts, val, on, label) => { const s = el('select', { class:'a2sel', 'aria-label':label }, opts.map(([v, t]) => el('option', { value:v, text:t }))); s.value = val || ''; s.addEventListener('change', () => on(s.value)); return s; };

  function form(){
    const rows = ELEMS.map(([id, name]) => {
      const ty = sel([['', '— таңда —'], ['hw', 'Аппараттық'], ['sw', 'Программалық']], st.types[id], v => { st.types[id] = v; save(); }, name + ': түрі');
      const fn = el('input', { type:'text', class:'a2in', maxlength:'200', placeholder:'Қызметін қысқаша жаз', value:st.funcs[id] || '', 'aria-label':name + ': қызметі' });
      fn.addEventListener('input', () => { st.funcs[id] = fn.value; save(); });
      return el('tr', {}, [el('th', { scope:'row', text:name }), el('td', {}, ty), el('td', {}, fn)]);
    });
    const table = el('table', { class:'a2tb' }, [el('thead', {}, el('tr', {}, [el('th', { text:'Атауы' }), el('th', { text:'Түрі' }), el('th', { text:'Қызметі' })])), el('tbody', {}, rows)]);
    const opts = [['', '— таңда —'], ...ELEMS.map(([id, n]) => [id, n])];
    const pairs = [0, 1].map(i => {
      const p = st.pairs[i];
      const a = sel(opts, p.a, v => { p.a = v; save(); }, i + 1 + '-мысал: бірінші элемент'), b = sel(opts, p.b, v => { p.b = v; save(); }, i + 1 + '-мысал: екінші элемент');
      const t = el('textarea', { class:'a2in', rows:'2', maxlength:'300', placeholder:'Олар қалай бірге жұмыс істейді? Бір сөйлеммен жаз.', 'aria-label':i + 1 + '-мысал: түсініктеме' }); t.value = p.t || '';
      t.addEventListener('input', () => { p.t = t.value; save(); });
      return el('div', { class:'a2pair' }, [el('b', { text:(i + 1) + '-мысал' }), el('div', { class:'a2row' }, [a, el('span', { text:'↔' }), b]), t]);
    });
    return [table, el('h4', { class:'a2h', text:'Өзара байланысқа 2 мысал келтір' }), el('p', { class:'muted', text:'Әр мысалда бір аппараттық және бір программалық элементті таңда, екі мысалдағы жұп әртүрлі болсын.' }), ...pairs];
  }

  function render(force){
    if (busy) return;
    const me = window.Join.get(), now = Math.floor(window.Join.serverNow() / 1000);
    const key = JSON.stringify(me ? [me.student && me.student.name, me.guest, me.session && me.session.topic, me.session && me.session.work_until, me.tasks && me.tasks[1].sent, me.total, me.session && now > me.session.work_until + 90] : null);
    if (!force && key === last && box.firstChild) return; last = key;
    box.innerHTML = '';
    if (!me){ box.append(el('p', { class:'notice', text:'Практикалық жұмысқа кіру үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.' }), el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру', onclick:() => window.Join.open() }))); return; }
    if (me.guest){ box.append(el('p', { class:'notice', text:'Мұғалім ретінде кірдіңіз. Тапсырманы студенттер орындайды.' })); return; }
    if (!me.session || me.session.topic !== 'A2'){ box.append(el('p', { class:'notice', text:'Бұл тақырып бойынша сабақ әлі ашылмаған. Оқытушы сабақты бастағанда осы бет жаңарады.' })); return; }
    if (me.tasks[1].sent){ box.append(...report(me)); return; }
    if (!me.session.work_until){ box.append(el('p', { class:'notice', text:'✓ Сабаққа кірдіңіз (қатысым 30 балл). Оқытушы жұмысты бастағанда жіберу бөлімі осы жерде ашылады. Бет өзі жаңарады.' })); return; }
    if (now > me.session.work_until + 90){ box.append(el('p', { class:'errbox', text:'Жұмыс уақыты бітті.' })); return; }
    const left = Math.max(0, me.session.work_until - now);
    const up = el('button', { type:'button', class:'btn primary', text:'⬆ 1–4 тапсырманың жауаптарын жіберу' });
    up.addEventListener('click', () => submit(up, false));
    box.append(el('p', { class:'xl-timer' + (left < 300 ? ' low' : ''), text:'⏱ Қалған уақыт: ' + mmss(left) }), ...form(),
      el('div', { class:'xl-up' }, [up]), el('div', { class:'xl-msg', role:'status' }), el('p', { class:'muted', text:'Алдыңғы 1–3 тапсырманың жауаптары да осымен бірге жіберіледі. Жауаптарың осы құрылғыда сақталып тұрады, уақыт біткенде толтырғаның өздігінен жіберіледі.' }));
  }

  window.Join.on(() => render()); render();
  setInterval(() => {
    const me = window.Join.get(); if (!me || !me.session || !me.session.work_until || me.guest || me.session.topic !== 'A2') return;
    const left = Math.max(0, me.session.work_until - Math.floor(window.Join.serverNow() / 1000)), t = box.querySelector('.xl-timer');
    if (t){ t.textContent = left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті'; t.classList.toggle('low', left < 300); }
    if (left <= 0 && t && !auto && !busy && me.tasks && !me.tasks[1].sent){ auto = true; submit(box.querySelector('.xl-up button'), true); }
  }, 1000);
} };
})();
