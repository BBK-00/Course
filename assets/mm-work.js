/* АКТ · 13: куиз-презентацияны жүктеу (.pptx + сол презентацияның PDF-і). Құрылымды сервер .pptx-тен оқиды, дизайнды жасанды интеллект PDF бойынша бағалайды.
   MmWork.mount(host) — алдымен студент сабаққа кіреді (Join). */
(function(){
'use strict';
const { el } = window.L;
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const ERR = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', time_over:'Жұмыс уақыты бітті.', closed:'Сабақ жабылған немесе бұл тапсырма әзірге ашылмаған.', already:'Жұмыс жіберіліп қойған.', auth:'Сабаққа қайта кіріңіз.',
  bad_pptx:'.pptx файлы ашылмады. Презентацияны PowerPoint-те «Файл → Басқаша сақтау → PowerPoint презентациясы (.pptx)» арқылы сақтаңыз. Canva-дан «Жүктеу → PowerPoint» таңдаңыз.',
  no_author:'Бірінші слайдқа өз аты-жөніңді жазу керек (немесе жазылған аты жүйедегі атыңа ұқсамайды).', need_both:'.pptx файлы керек.', too_big:'Файл тым үлкен: .pptx 60 МБ-тан, PDF 14 МБ-тан аспауы керек. Үлкен сурет, аудио мен бейнелерді қысыңыз.',
  bad_pdf:'PDF файлы дұрыс емес. «Файл → Экспорттау → PDF» арқылы сақтаңыз.', ai_busy:'Дизайнды тексеретін жасанды интеллект қазір бос емес. Жұмысың жіберілген жоқ, 1 минуттан кейін қайта жібер.', wait:'Тым жиі. Бір минуттан кейін қайта көріңіз.' };
const TITLE = ['1 · Сұрақ пен жауап (10 × 2)', '2 · Медиа жұмыс істейді (10 × 3)', '3 · Рәсімдеу, дизайн (10 × 2)'];

window.MmWork = { mount(host){
  let busy = false, result = null, dup = false, summary = '', last = '';
  const box = el('div', { class:'xl' }); host.append(box);
  const msg = (t, cls) => { const m = box.querySelector('.xl-msg'); if (m){ m.className = 'xl-msg ' + (cls || ''); m.textContent = t || ''; } };

  async function upload(btn, a){
    const pp = a.files && a.files[0];
    if (!pp){ msg('Алдымен презентацияның .pptx файлын таңдаңыз.', 'bad'); return; }
    if (!/\.pptx$/i.test(pp.name)){ msg('Файл .pptx форматында болуы керек.', 'bad'); return; }
    if (pp.size > 60e6){ msg(ERR.too_big, 'bad'); return; }
    if (!confirm('Куизді жібересіз бе? Жібергеннен кейін қайта жіберуге болмайды.')) return;
    btn.disabled = true; busy = true; msg('Куиз тексеріліп жатыр. Бұл бір минутқа дейін созылуы мүмкін, бетті жаппаңыз…');
    try {
      const fd = new FormData(); fd.append('pptx', pp);
      const r = await window.Join.raw('mm/upload', { method:'POST', body:fd });
      let j = {}; try { j = await r.json(); } catch (e) {}
      if (j.ok){ result = j.sheets; dup = !!j.dup; summary = j.summary || ''; await window.Join.refresh(); } else { msg(ERR[j.error] || 'Қате болды. Қайта көріңіз.', 'bad'); btn.disabled = false; }
    } catch (e) { msg('Желі қатесі. Қайта көріңіз.', 'bad'); btn.disabled = false; }
    busy = false; if (result) render(true);
  }

  function report(me){
    const out = [el('div', { class:'xl-total' }, [el('b', { text:'Қорытынды балл: ' + me.total + ' / 100' }), el('span', { text:'Қатысым ' + me.attendance + ' + куиз ' + (me.total - me.attendance - (me.bonus || 0)) + (me.bonus ? ' + бонус ' + me.bonus : '') })])];
    if (dup) out.push(el('p', { class:'errbox', text:'Бұл презентация басқа студенттің жұмысымен бірдей болып шықты, сондықтан балл қойылмады. Оқытушы тексереді.' }));
    if (summary) out.push(el('p', { class:'notice', text:'Дизайн туралы: ' + summary }));
    [1, 2, 3].forEach(n => {
      const t = me.tasks[n], it = result && result[n - 1];
      const d = el('details', { class:'xl-sheet' }, [el('summary', { text:TITLE[n - 1] + ' — ' + t.pts + ' / ' + t.max })]);
      if (it) { d.append(el('ul', {}, it.items.map(x => el('li', { class:x.got >= x.max ? 'ok' : x.got > 0 ? 'mid' : 'no', text:(x.got >= x.max ? '✓ ' : x.got > 0 ? '◑ ' : '✗ ') + x.label + ' — ' + x.got + ' / ' + x.max })))); d.open = n === 3; }
      else d.append(el('p', { class:'muted', text:'Толық талдау жіберген кезде ғана көрсетіледі.' }));
      out.push(d);
    });
    out.push(el('p', { class:'muted', text:'Рәсімдеуге 2 балл тек слайд өте әдемі және оның барлық талабы орындалғанда ғана беріледі. Оқытушы нәтижені тексеріп, балды өзгерте алады.' }));
    return out;
  }

  function render(force){
    if (busy) return;
    const me = window.Join.get(), now = Math.floor(window.Join.serverNow() / 1000);
    const key = JSON.stringify(me ? [me.student && me.student.name, me.guest, me.session && me.session.topic, me.session && me.session.work_until, me.tasks && me.tasks[1].sent, me.total, me.session && now > me.session.work_until + 90] : null);
    if (!force && key === last && box.firstChild) return; last = key;
    box.innerHTML = '';
    if (!me){ box.append(el('p', { class:'notice', text:'Практикалық жұмысқа кіру үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.' }), el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру', onclick:() => window.Join.open() }))); return; }
    if (me.guest){ box.append(el('p', { class:'notice', text:'Мұғалім ретінде кірдіңіз. Куизді студенттер жасайды.' })); return; }
    if (!me.session || me.session.topic !== 'A13'){ box.append(el('p', { class:'notice', text:'Бұл тақырып бойынша сабақ әлі ашылмаған. Оқытушы сабақты бастағанда осы бет жаңарады.' })); return; }
    if (me.tasks[1].sent){ box.append(...report(me)); return; }
    if (!me.session.work_until){ box.append(el('p', { class:'notice', text:'✓ Сабаққа кірдіңіз (қатысым 30 балл). Оқытушы жұмысты бастағанда куиз жасауды бастайсыз. Бет өзі жаңарады.' })); return; }
    if (now > me.session.work_until + 90){ box.append(el('p', { class:'errbox', text:'Жұмыс уақыты бітті.' })); return; }
    const left = Math.max(0, me.session.work_until - now);
    const a = el('input', { type:'file', accept:'.pptx', 'aria-label':'Презентация (.pptx)' }), up = el('button', { type:'button', class:'btn primary', text:'⬆ Куизді жіберу' });
    up.addEventListener('click', () => upload(up, a));
    box.append(el('p', { class:'xl-timer' + (left < 300 ? ' low' : ''), text:'⏱ Қалған уақыт: ' + mmss(left) }),
      el('ol', { class:'xl-steps' }, [
        el('li', {}, [el('b', { text:'Куизді жаса. ' }), '10 тапсырма = 10 слайд. Бірінші слайдқа өз аты-жөніңді жаз.']),
        el('li', {}, [el('b', { text:'Сақта. ' }), '.pptx форматында («Файл → Сақтау»). Медиа файлдар презентацияның ішінде болуы керек. Canva-дан «Жүктеу → PowerPoint».']),
        el('li', {}, [el('b', { text:'Жібер. ' }), '.pptx файлын таңдап, жібер. Құрылымды автоматты тексереді, дизайнды жасанды интеллект қатаң бағалайды (бір минутқа дейін).'])]),
      el('label', { class:'cf-label', text:'Презентация (.pptx)' }), el('div', { class:'xl-up' }, [a, up]), el('div', { class:'xl-msg', role:'status' }));
  }

  window.Join.on(() => render()); render();
  setInterval(() => { const t = box.querySelector('.xl-timer'), me = window.Join.get(); if (t && me && me.session && me.session.work_until){ const left = Math.max(0, me.session.work_until - Math.floor(window.Join.serverNow() / 1000)); t.textContent = left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті'; t.classList.toggle('low', left < 300); } }, 1000);
} };
})();
