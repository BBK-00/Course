/* Бақылау жұмысы: тест + қолмен есептеу + бағдарлама → Google Sheets (ЖИ бағалайды, балл студент экранына шығады).
   CourseWork.mount(host, { topic, key, limit, variants:[[A,b],...], quiz:[[сұрақ,[нұсқалар]],...],
     task2:{ title, text, sample, answers:[{label}] }, task3:{ title, text } }) */
(function(){
'use strict';
const { el, $, fmt, Course } = window.L;
window.CourseWork = { mount(host, cfg){
  const CFG = window.COURSE_CONFIG || {}, KEY = cfg.key, LIMIT = cfg.limit || 40, NA = cfg.task2.answers.length;
  const fresh = () => ({ id:'', name:'', group:'', variant:1, start:0, sent:0, score:null, quiz:cfg.quiz.map(() => null), steps:'', ans:Array(NA).fill(''), code:'', out:'', sig:{ paste:0, pasted:0, typed:0, away:0, f:{} } });
  let W = fresh(), timer = 0;
  try{ W = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); }catch(e){}
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(W)); }catch(e){} };
  document.addEventListener('visibilitychange', () => { if (document.hidden && W.start && !W.sent){ W.sig.away++; save(); } });
  /* Өріс: мәнді сақтайды, әр өріс бойынша көшіру/теру/уақытты санайды */
  function field(tag, get, set, fkey, attrs){
    const f = el(tag, Object.assign({ autocomplete:'off', spellcheck:'false' }, attrs));
    f.value = get() || '';
    const st = () => (W.sig.f[fkey] = W.sig.f[fkey] || { paste:0, pasted:0, typed:0, first:0, last:0 });
    f.addEventListener('input', () => { set(f.value); const s = st(), t = Date.now() - W.start; if (!s.first) s.first = t; s.last = t; save(); });
    f.addEventListener('keydown', e => { if (e.key.length === 1){ W.sig.typed++; st().typed++; } });
    f.addEventListener('paste', e => { const n = ((e.clipboardData && e.clipboardData.getData('text')) || '').length; W.sig.paste++; W.sig.pasted += n; st().paste++; st().pasted += n; save(); });
    return f;
  }
  const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const sysView = (A, b) => {
    const v = ['x', 'y', 'z'], rows = el('div', { class:'rows' });
    A.forEach((r, i) => rows.append(el('div', { text:r.map((a, j) => (a < 0 ? (j ? ' − ' : '−') : j ? ' + ' : '') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + v[j]).join('').trim() + ' = ' + fmt(b[i]) })));
    return el('div', { class:'sys' }, [el('span', { class:'brace', text:'{' }), rows]);
  };
  function render(){
    clearInterval(timer); host.innerHTML = '';
    if (W.sent){
      const box = el('div', { class:'score-box' });
      if (W.score !== null && W.score !== '' && W.score !== undefined) box.append(el('div', { text:'Сенің балың' }), el('div', { class:'big', text:W.score + ' / 100' }), el('p', { class:'muted', text:'Жұмысың тексерілді және оқытушыға жіберілді.' }));
      else box.append(el('div', { class:'big', text:'✓' }), el('p', { text:'Жұмысың қабылданды. Балл кейін қойылады.' }));
      host.append(box);
      const again = el('button', { type:'button', class:'btn small ghost', text:'Жаңа жұмыс бастау' });
      let armed = false;
      again.addEventListener('click', () => { if (!armed){ armed = true; again.textContent = 'Растау: жаңа жұмыс бастау'; return; } W = fresh(); save(); render(); });
      host.append(again);
      return;
    }
    const head = el('div', { class:'task' }, el('h4', { text:'Жұмысты бастау' }));
    head.append(el('p', { text:'Аты-жөніңді, тобыңды және нұсқаңды таңда. «Бастау» батырмасын басқанда ' + LIMIT + ' минуттық уақыт басталады.' }));
    const nm = field('input', () => W.name, v => { W.name = v; }, 'name', { type:'text', class:'cf-input wide', id:KEY + 'n' });
    const gr = field('input', () => W.group, v => { W.group = v; }, 'group', { type:'text', class:'cf-input wide', id:KEY + 'g' });
    const vs = el('select', { id:KEY + 'v', class:'cf-input wide' });
    cfg.variants.forEach((v, q) => vs.append(el('option', { value:q + 1, text:'№' + (q + 1) + ' нұсқа', selected:q + 1 === W.variant })));
    vs.addEventListener('change', () => { W.variant = +vs.value; save(); });
    head.append(el('div', { class:'submit-grid' }, [el('label', { for:KEY + 'n', text:'Аты-жөні' }), nm, el('label', { for:KEY + 'g', text:'Тобы' }), gr, el('label', { for:KEY + 'v', text:'Нұсқа' }), vs]));
    host.append(head);
    if (!W.start){
      const go = el('button', { type:'button', class:'btn primary', text:'▶ Бастау' }), msg = el('div', { role:'status' });
      go.addEventListener('click', () => {
        if (!W.name.trim() || !W.group.trim()){ msg.innerHTML = '<p class="notice">Аты-жөніңді және тобыңды жаз.</p>'; return; }
        W.start = Date.now(); W.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); save(); render();
      });
      head.append(el('div', { class:'stepbar' }, go), msg);
      return;
    }
    [nm, gr, vs].forEach(x => { x.disabled = true; });
    const clock = el('p', { class:'work-timer', role:'timer' }); head.append(clock);
    const tick = () => { const left = LIMIT * 60 - Math.floor((Date.now() - W.start) / 1000); clock.textContent = left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті. Жұмысыңды тапсыр.'; clock.classList.toggle('late', left <= 300); };
    tick(); timer = setInterval(tick, 1000);
    const [A, b] = cfg.variants[W.variant - 1];

    const t1 = el('div', { class:'task' }, el('h4', { text:'1-тапсырма. Тест' }));
    cfg.quiz.forEach(([q, opts], i) => {
      const fs = el('fieldset', { class:'wq' }, el('legend', { text:(i + 1) + '. ' + q }));
      opts.forEach((o, k) => { const r = el('input', { type:'radio', name:KEY + 'q' + i, value:k, checked:W.quiz[i] === k }); r.addEventListener('change', () => { W.quiz[i] = k; save(); }); fs.append(el('label', null, [r, ' ' + o])); });
      t1.append(fs);
    });
    host.append(t1);

    const t2 = el('div', { class:'task' }, el('h4', { text:cfg.task2.title }));
    t2.append(el('p', { html:'<b>№' + W.variant + ' нұсқа:</b>' }), sysView(A, b), el('p', { text:cfg.task2.text }));
    if (cfg.task2.sample) t2.append(el('div', { class:'sample' }, [el('b', { text:'Үлгі' }), el('span', { class:'muted', text:' — ' + cfg.task2.sampleNote }), el('pre', { text:cfg.task2.sample })]));
    t2.append(field('textarea', () => W.steps, v => { W.steps = v; }, 'steps', { class:'work-area mono', rows:'12', 'aria-label':'Шешу барысы', placeholder:'Шешу барысын осында жаз...' }));
    const ans = el('div', { class:'submit-grid' });
    cfg.task2.answers.forEach((a, i) => ans.append(el('label', { for:KEY + 'a' + i, html:a.label }), field('input', () => W.ans[i], v => { W.ans[i] = v; }, 'a' + i, { type:'text', class:'cf-input', id:KEY + 'a' + i })));
    t2.append(el('p', { text:cfg.task2.answersTitle || 'Жауабың:' }), ans);
    host.append(t2);

    const t3 = el('div', { class:'task' }, el('h4', { text:cfg.task3.title }));
    t3.append(el('p', { text:cfg.task3.text }), el('p', { text:'Сенің кодың:' }),
      field('textarea', () => W.code, v => { W.code = v; }, 'code', { class:'work-area mono', rows:'14', 'aria-label':'Бағдарлама коды' }),
      el('div', { class:'submit-grid' }, [el('label', { for:KEY + 'o', text:'Нәтиже' }), field('input', () => W.out, v => { W.out = v; }, 'out', { type:'text', class:'cf-input wide', id:KEY + 'o', placeholder:'бағдарлама шығарған нәтиже' })]));
    host.append(t3);

    const t4 = el('div', { class:'task' }, el('h4', { text:'Жұмысты тапсыру' }));
    const send = el('button', { type:'button', class:'btn primary', text:'📤 Жұмысты тапсыру' }), out = el('div', { role:'status' });
    t4.append(el('p', { text:'Жұмысты бір рет қана тапсыруға болады. Тапсырмас бұрын барлық өрісті тексер.' }), el('div', { class:'stepbar' }, send), out);
    host.append(t4);
    const payload = () => ({ id:W.id, topic:cfg.topic, name:W.name.trim(), group:W.group.trim(), variant:W.variant, quiz:W.quiz, steps:W.steps, ans:W.ans,
      code:W.code, out:W.out, minutes:Math.round((Date.now() - W.start) / 6000) / 10, sig:W.sig, ua:navigator.userAgent.slice(0, 120) });
    let armed = false;
    send.addEventListener('click', async () => {
      const empty = W.quiz.includes(null) || !W.steps.trim() || W.ans.some(v => !String(v).trim()) || !W.code.trim() || !W.out.trim();
      if (empty && !armed){ armed = true; send.textContent = '📤 Иә, солай тапсыру'; out.innerHTML = '<p class="notice">Кейбір өрістер бос. Сонда да тапсырасың ба? Тағы бір рет бас.</p>'; return; }
      if (!CFG.submitUrl){ out.innerHTML = '<p class="notice">Онлайн тапсыру әлі бапталмаған.</p>'; return; }
      send.disabled = true; out.innerHTML = '<p><span class="spinner"></span>Жұмысың тексеріліп жатыр. Бұл 10–40 секундқа созылуы мүмкін, бетті жаппа.</p>';
      const body = JSON.stringify(payload());
      let score = null, delivered = false;
      for (let t = 0; t < 2 && !delivered; t++){
        try{
          const r = await fetch(CFG.submitUrl, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body });
          const j = await r.json(); delivered = true; score = j && j.total !== undefined ? j.total : null;
        }catch(e){ await new Promise(res => setTimeout(res, 3000)); }
      }
      if (!delivered){
        try{ await fetch(CFG.submitUrl, { method:'POST', mode:'no-cors', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body }); delivered = true; }
        catch(e){ send.disabled = false; out.innerHTML = '<p class="errbox">Жіберу мүмкін болмады. Интернетті тексеріп, қайта бас.</p>'; return; }
      }
      W.sent = Date.now(); W.score = score; save(); render();
    });
  }
  render();
  Course.register(cfg.sectionId || 'work', { reset(){ render(); } });
} };
})();
