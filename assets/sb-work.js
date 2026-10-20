/* Scratch практикалық жұмысы: ойынды .sb3 файлы ретінде жүктеу + қысқаша түсіндірме. Блоктар серверде автоматты талданады.
   SbWork.mount(host) — алдымен студент сабаққа кіреді (Join). */
(function(){
'use strict';
const { el } = window.L;
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const ERR = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', time_over:'Жұмыс уақыты бітті.', closed:'Сабақ жабылған немесе бұл тапсырма әзірге ашылмаған.', already:'Жұмыс жіберіліп қойған.', auth:'Сабаққа қайта кіріңіз.',
  bad_file:'Бұл Scratch 3 жобасы емес. Scratch-та «Файл → Компьютерге сақтау» арқылы .sb3 файлын сақтап, сол файлды жүктеңіз.', wait:'Тым жиі. Бір минуттан кейін қайта көріңіз.' };
const TITLE = ['1 · Ойыншыны басқару', '2 · Кедергінің қозғалысы', '3 · Жеңу/ұтылу, анимация, дыбыс, түсіндіру'];

window.SbWork = { mount(host){
  let busy = false, result = null, dup = false, last = '', draft = '';
  const box = el('div', { class:'xl' }); host.append(box);
  const msg = (t, cls) => { const m = box.querySelector('.xl-msg'); if (m){ m.className = 'xl-msg ' + (cls || ''); m.textContent = t || ''; } };

  async function upload(btn, inp, ta){
    const f = inp.files && inp.files[0];
    if (!f){ msg('Алдымен ойынның .sb3 файлын таңдаңыз.', 'bad'); return; }
    if (!/\.sb3$/i.test(f.name)){ msg('Файл .sb3 форматында болуы керек (Scratch 3).', 'bad'); return; }
    if (f.size > 25e6){ msg('Файл тым үлкен (25 МБ-тан аспауы керек). Керексіз дыбыстар мен костюмдерді өшіріңіз.', 'bad'); return; }
    if (ta.value.trim().length < 20){ msg('Үш циклдің қызметін 2–3 сөйлеммен жазыңыз (түсіндіру 10 ұпай).', 'bad'); ta.focus(); return; }
    if (!confirm('Ойынды жібересіз бе? Жібергеннен кейін қайта жіберуге болмайды.')) return;
    btn.disabled = true; busy = true; msg('Ойын тексеріліп жатыр…');
    try {
      const r = await window.Join.raw('sb/upload?e=' + encodeURIComponent(ta.value.trim().slice(0, 700)), { method:'POST', headers:{ 'Content-Type':'application/octet-stream' }, body:f });
      let j = {}; try { j = await r.json(); } catch (e) {}
      if (j.ok){ result = j.sheets; dup = !!j.dup; await window.Join.refresh(); } else { msg(ERR[j.error] || 'Қате болды. Қайта көріңіз.', 'bad'); btn.disabled = false; }
    } catch (e) { msg('Желі қатесі. Қайта көріңіз.', 'bad'); btn.disabled = false; }
    busy = false; if (result) render(true);
  }

  function report(me){
    const out = [el('div', { class:'xl-total' }, [el('b', { text:'Қорытынды балл: ' + me.total + ' / 100' }), el('span', { text:'Қатысым ' + me.attendance + ' + ойын ' + (me.total - me.attendance - (me.bonus || 0)) + (me.bonus ? ' + бонус ' + me.bonus : '') })])];
    if (dup) out.push(el('p', { class:'errbox', text:'Бұл жоба басқа студенттің жобасымен бірдей болып шықты, сондықтан балл қойылмады. Оқытушы тексереді.' }));
    [1, 2, 3].forEach(n => {
      const t = me.tasks[n], it = result && result[n - 1];
      const d = el('details', { class:'xl-sheet' }, [el('summary', { text:TITLE[n - 1] + ' — ' + t.pts + ' / ' + t.max })]);
      if (it) { d.append(el('ul', {}, it.items.map(x => el('li', { class:x.got >= x.max ? 'ok' : x.got > 0 ? 'mid' : 'no', text:(x.got >= x.max ? '✓ ' : x.got > 0 ? '◑ ' : '✗ ') + x.id + '  ' + x.label + ' — ' + x.got + ' / ' + x.max })))); d.open = true; }
      else d.append(el('p', { class:'muted', text:'Толық талдау жіберген кезде ғана көрсетіледі.' }));
      out.push(d);
    });
    out.push(el('p', { class:'muted', text:'Ойын 60 баллдық: қатысым 40 + ойын 60 = 100. Оқытушы нәтижені тексеріп, балды өзгерте алады.' }));
    return out;
  }

  function render(force){
    if (busy) return;
    const me = window.Join.get(), now = Math.floor(window.Join.serverNow() / 1000);
    const key = JSON.stringify(me ? [me.student && me.student.name, me.guest, me.session && me.session.topic, me.session && me.session.work_until, me.tasks && me.tasks[1].sent, me.total, me.session && now > me.session.work_until + 90] : null);
    if (!force && key === last && box.firstChild) return; last = key;
    box.innerHTML = '';
    if (!me){ box.append(el('p', { class:'notice', text:'Практикалық жұмысқа кіру үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.' }), el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру', onclick:() => window.Join.open() }))); return; }
    if (me.guest){ box.append(el('p', { class:'notice', text:'Мұғалім ретінде кірдіңіз. Ойынды студенттер жасайды.' })); return; }
    if (!me.session || me.session.topic !== 'S7'){ box.append(el('p', { class:'notice', text:'Бұл тақырып бойынша сабақ әлі ашылмаған. Оқытушы сабақты бастағанда осы бет жаңарады.' })); return; }
    if (me.tasks[1].sent){ box.append(...report(me)); return; }
    if (!me.session.work_until){ box.append(el('p', { class:'notice', text:'✓ Сабаққа кірдіңіз (қатысым 40 балл). Оқытушы жұмысты бастағанда ойын жасауды бастайсыз. Бет өзі жаңарады.' })); return; }
    if (now > me.session.work_until + 90){ box.append(el('p', { class:'errbox', text:'Жұмыс уақыты бітті.' })); return; }
    const left = Math.max(0, me.session.work_until - now);
    const inp = el('input', { type:'file', accept:'.sb3', 'aria-label':'Ойынның .sb3 файлы' }), up = el('button', { type:'button', class:'btn primary', text:'⬆ Ойынды жіберу' });
    const ta = el('textarea', { class:'cf-input wide', rows:'4', maxlength:'700', placeholder:'Мысалы: «20 рет қайталау» кедергіні 20 қадам жоғары жылжытады. «Әрқашан қайталау» қозғалысты ойын бітпейінше тоқтатпайды. «Шарт орындалғанша қайталау» ойыншы мәреге не кедергіге тигенше күтеді.', 'aria-label':'Үш циклдің қызметі' });
    ta.value = draft; ta.addEventListener('input', () => { draft = ta.value; });
    up.addEventListener('click', () => upload(up, inp, ta));
    box.append(el('p', { class:'xl-timer' + (left < 300 ? ' low' : ''), text:'⏱ Қалған уақыт: ' + mmss(left) }),
      el('ol', { class:'xl-steps' }, [
        el('li', {}, [el('b', { text:'Ойынды Scratch-та жаса. ' }), 'Жоғарыдағы 3 кезеңнің талаптарын орында.']),
        el('li', {}, [el('b', { text:'Сақта. ' }), 'Scratch-та «Файл → Компьютерге сақтау»: .sb3 файлы жүктеледі.']),
        el('li', {}, [el('b', { text:'Түсіндір және жібер. ' }), 'Үш циклдің қызметін жазып, .sb3 файлын таңдап, жібер. Балл бірден шығады.'])]),
      el('label', { class:'cf-label', text:'Үш цикл не үшін қолданылды? (2–3 сөйлем)' }), ta,
      el('div', { class:'xl-up' }, [inp, up]), el('div', { class:'xl-msg', role:'status' }));
  }

  window.Join.on(() => render()); render();
  setInterval(() => { const t = box.querySelector('.xl-timer'), me = window.Join.get(); if (t && me && me.session && me.session.work_until){ const left = Math.max(0, me.session.work_until - Math.floor(window.Join.serverNow() / 1000)); t.textContent = left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті'; t.classList.toggle('low', left < 300); } }, 1000);
} };
})();
