/* АКТ · Excel жұмысы: жеке файлды жүктеп алу → толтыру → жүктеу. Балл серверде автоматты есептеледі.
   XlWork.mount(host) — алдымен студент сабаққа кіреді (Join). */
(function(){
'use strict';
const { el } = window.L;
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const ERR = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', time_over:'Жұмыс уақыты бітті.', closed:'Сабақ жабылған немесе бұл тапсырма әзірге ашылмаған.', already:'Жұмыс жіберіліп қойған.', auth:'Сабаққа қайта кіріңіз.',
  not_yours:'Бұл файл сіздікі емес немесе бастапқы деректер өзгерген. Тек өз файлыңызды жүктеңіз (аты мен «ID» жолын, бастапқы сандарды өзгертпеңіз).',
  bad_file:'Бұл дұрыс Excel (.xlsx) файлы емес. Файлды Excel-де «.xlsx» ретінде сақтап жүктеңіз.', wait:'Тым жиі. Бір минуттан кейін қайта көріңіз.' };
const TITLE = ['1-лист · Оңай', '2-лист · Орташа', '3-лист · Күрделі'];

window.XlWork = { mount(host){
  let busy = false, result = null, note = '', last = '';
  const box = el('div', { class:'xl' }); host.append(box);
  const err = c => ERR[c] || 'Қате болды. Қайта көріңіз.';
  const msg = (t, cls) => { note = ''; const m = box.querySelector('.xl-msg'); if (m){ m.className = 'xl-msg ' + (cls || ''); m.textContent = t || ''; } };

  async function download(btn, me){
    btn.disabled = true; msg('Файл дайындалуда…');
    try {
      const r = await window.Join.raw('xl/file');
      if (!r.ok){ let j = {}; try { j = await r.json(); } catch (e) {} msg(err(j.error), 'bad'); btn.disabled = false; return; }
      const a = el('a', { href:URL.createObjectURL(await r.blob()), download:'АКТ-10-Excel-' + me.student.name.replace(/\s+/g, '_') + '.xlsx' });
      document.body.append(a); a.click(); a.remove(); msg('Файл жүктелді. Excel-де ашып, тапсырмаларды орындаңыз (нұсқаулық әр листтің оң жағында).', 'ok');
    } catch (e) { msg('Желі қатесі. Қайта көріңіз.', 'bad'); }
    btn.disabled = false;
  }
  async function upload(btn, inp){
    const f = inp.files && inp.files[0];
    if (!f){ msg('Алдымен орындалған Excel файлын таңдаңыз.', 'bad'); return; }
    if (!/\.xlsx$/i.test(f.name)){ msg('Файл .xlsx форматында болуы керек.', 'bad'); return; }
    if (f.size > 3e6){ msg('Файл тым үлкен (3 МБ-тан аспауы керек).', 'bad'); return; }
    if (!confirm('Жұмысты жібересіз бе? Жібергеннен кейін қайта жіберуге болмайды.')) return;
    btn.disabled = true; busy = true; msg('Жұмыс тексеріліп жатыр…');
    try {
      const r = await window.Join.raw('xl/upload', { method:'POST', headers:{ 'Content-Type':'application/octet-stream' }, body:f });
      let j = {}; try { j = await r.json(); } catch (e) {}
      if (j.ok){ result = j.sheets; await window.Join.refresh(); } else { msg(err(j.error), 'bad'); btn.disabled = false; }
    } catch (e) { msg('Желі қатесі. Қайта көріңіз.', 'bad'); btn.disabled = false; }
    busy = false; if (result) render();
  }

  function head(me){
    const left = Math.max(0, me.session.work_until - Math.floor(window.Join.serverNow() / 1000));
    return el('p', { class:'xl-timer' + (left < 300 ? ' low' : ''), text:left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті' });
  }
  function report(me){
    const out = [el('div', { class:'xl-total' }, [el('b', { text:'Қорытынды балл: ' + me.total + ' / 100' }), el('span', { text:'Қатысым ' + me.attendance + ' + тапсырма ' + (me.total - me.attendance - (me.bonus || 0)) + (me.bonus ? ' + бонус ' + me.bonus : '') })])];
    [1, 2, 3].forEach(n => {
      const t = me.tasks[n], it = result && result[n - 1];
      const d = el('details', { class:'xl-sheet' }, [el('summary', { text:TITLE[n - 1] + ' — ' + t.pts + ' / ' + t.max })]);
      if (it) d.append(el('ul', {}, it.items.map(x => el('li', { class:x.got >= x.max ? 'ok' : x.got > 0 ? 'mid' : 'no', text:(x.got >= x.max ? '✓ ' : x.got > 0 ? '◑ ' : '✗ ') + x.id + '  ' + x.label + ' — ' + x.got + ' / ' + x.max }))));
      else d.append(el('p', { class:'muted', text:'Толық талдау жіберген кезде ғана көрсетіледі.' }));
      if (it) d.open = true;
      out.push(d);
    });
    out.push(el('p', { class:'muted', text:'Оқытушы нәтижені тексеріп, балды өзгерте алады. Баллдар оқытушы панелінде де көрінеді.' }));
    return out;
  }

  function render(){
    if (busy) return;
    const me = window.Join.get(), now = Math.floor(window.Join.serverNow() / 1000);
    const key = JSON.stringify(me ? [me.student && me.student.name, me.guest, me.session && me.session.topic, me.session && me.session.work_until, me.tasks && me.tasks[1].sent, me.total, me.session && now > me.session.work_until + 90] : null);
    if (key === last && box.firstChild) return; last = key;
    box.innerHTML = '';
    if (!me){ box.append(el('p', { class:'notice', text:'Практикалық жұмысқа кіру үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.' }), el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру', onclick:() => window.Join.open() }))); return; }
    if (me.guest){ box.append(el('p', { class:'notice', text:'Мұғалім ретінде кірдіңіз. Excel жұмысын студенттер орындайды.' })); return; }
    if (!me.session || me.session.topic !== '10'){ box.append(el('p', { class:'notice', text:'Бұл тақырып бойынша сабақ әлі ашылмаған. Оқытушы сабақты бастағанда осы бет жаңарады.' })); return; }
    if (me.tasks[1].sent){ box.append(...report(me)); return; }
    if (!me.session.work_until){ box.append(el('p', { class:'notice', text:'✓ Сабаққа кірдіңіз (қатысым 40 балл). Оқытушы жұмысты бастағанда файл жүктеп алуға болады. Бет өзі жаңарады.' })); return; }
    const over = Math.floor(window.Join.serverNow() / 1000) > me.session.work_until + 90;
    if (over){ box.append(el('p', { class:'errbox', text:'Жұмыс уақыты бітті.' })); return; }
    const dl = el('button', { type:'button', class:'btn primary', text:'⬇ Excel файлын жүктеп алу' }), inp = el('input', { type:'file', accept:'.xlsx', 'aria-label':'Орындалған Excel файлы' }), up = el('button', { type:'button', class:'btn primary', text:'⬆ Жұмысты жіберу' });
    dl.addEventListener('click', () => download(dl, me)); up.addEventListener('click', () => upload(up, inp));
    box.append(head(me),
      el('ol', { class:'xl-steps' }, [
        el('li', {}, [el('b', { text:'Файлды жүктеп ал. ' }), 'Ішінде 3 лист бар: оңай (15 мин), орташа (20 мин), күрделі (25 мин). Сандар тек сіздікі, басқа студенттің файлы сәйкес келмейді.']),
        el('li', {}, [el('b', { text:'Excel-де орында. ' }), 'Сары ұяшықтарға формула жазыңыз. Нұсқаулық әр листтің оң жағында (K бағанында).']),
        el('li', {}, [el('b', { text:'.xlsx ретінде сақтап, жүктеп жібер. ' }), 'Жіберілген соң жұмыс бірден тексеріліп, балл шығады.'])]),
      el('div', { class:'stepbar' }, dl),
      el('div', { class:'xl-up' }, [inp, up]),
      el('div', { class:'xl-msg', role:'status', text:note }));
  }

  window.Join.on(() => render()); render();
  setInterval(() => { const t = box.querySelector('.xl-timer'); const me = window.Join.get(); if (t && me && me.session && me.session.work_until){ const left = Math.max(0, me.session.work_until - Math.floor(window.Join.serverNow() / 1000)); t.textContent = left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті'; t.classList.toggle('low', left < 300); } }, 1000);
} };
})();
