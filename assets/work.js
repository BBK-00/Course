/* Бақылау жұмысы: 3 тапсырма, әрқайсысы жеке жіберіледі және бірден бағаланады (серверде). Студент сабаққа кіргеннен кейін ғана орындайды.
   CourseWork.mount(host, { topic, key, variants:[[A,b],...], quiz:[[сұрақ,[нұсқалар]],...],
     task2:{ title, text, sample, sampleNote, answers:[{label}], answersTitle }, task3:{ title, text } }) */
(function(){
'use strict';
const { el, fmt, Course } = window.L;
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
window.CourseWork = { mount(host, cfg){
  const NA = cfg.task2.answers.length;
  let D = null, built = '', sec = 0;
  const dkey = me => cfg.key + ':' + me.session.id + ':' + me.student.name;
  const fresh = () => ({ quiz:cfg.quiz.map(() => null), steps:'', ans:Array(NA).fill(''), code:'', out:'', sig:{ paste:0, pasted:0, typed:0, away:0, f:{} } });
  const load = me => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(dkey(me))) || {}); } catch (e) { return fresh(); } };
  const save = () => { try { if (D && D.k) localStorage.setItem(D.k, JSON.stringify(D)); } catch (e) {} };
  document.addEventListener('visibilitychange', () => { const me = window.Join.get(); if (document.hidden && D && me && me.session.work_until && !me.complete){ D.sig.away++; save(); } });

  function field(tag, get, set, fkey, attrs){
    const f = el(tag, Object.assign({ autocomplete:'off', spellcheck:'false' }, attrs));
    f.value = get() || '';
    const st = () => (D.sig.f[fkey] = D.sig.f[fkey] || { paste:0, pasted:0, typed:0, first:0, last:0 });
    f.addEventListener('input', () => { set(f.value); const s = st(), t = Date.now(); if (!s.first) s.first = t; s.last = t; save(); });
    f.addEventListener('keydown', e => { if (e.key.length === 1){ D.sig.typed++; st().typed++; } });
    f.addEventListener('paste', e => { const n = ((e.clipboardData && e.clipboardData.getData('text')) || '').length; D.sig.paste++; D.sig.pasted += n; st().paste++; st().pasted += n; save(); });
    return f;
  }
  const sysView = (A, b) => {
    const v = ['x₁', 'x₂', 'x₃'], rows = el('div', { class:'rows' });
    A.forEach((r, i) => rows.append(el('div', { text:r.map((a, j) => (a < 0 ? (j ? ' − ' : '−') : j ? ' + ' : '') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + v[j]).join('').trim() + ' = ' + fmt(b[i]) })));
    return el('div', { class:'sys' }, [el('span', { class:'brace', text:'{' }), rows]);
  };

  /* ---- Күй: жоғарғы жолақ және әр тапсырманың қорабы ---- */
  let ui = null;
  function build(me){
    host.innerHTML = ''; ui = null;
    const head = el('div', { class:'task' });
    host.append(head);
    if (!me){
      head.append(el('h4', { text:'Жұмысты орындау үшін сабаққа кір' }), el('p', { text:'Оқытушы сабақты бастағанда топты, атыңды таңдап, көрсетілген кодты енгізесің. Қатысымың (40 балл) автоматты түседі.' }));
      const b = el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру' }); b.addEventListener('click', () => window.Join.open());
      head.append(el('div', { class:'stepbar' }, b)); built = ''; return;
    }
    D = load(me); D.k = dkey(me);
    const [A, B] = cfg.variants[me.variant - 1];
    head.append(el('h4', { text:me.student.name + ' · ' + me.student.group }), el('p', { class:'muted', text:'Нұсқа №' + me.variant + ' · қатысым: ' + me.attendance + ' балл' }));
    const clock = el('p', { class:'work-timer', role:'timer' }), status = el('p', { role:'status' }), sum = el('div', { role:'status' });
    head.append(clock, status, sum);
    const tasks = el('div'); host.append(tasks);
    const cards = {}, sends = {};
    function card(n, title, content){
      const c = el('div', { class:'task' }, el('h4', { text:title })); c.append(...content);
      const res = el('div', { class:'score-line', role:'status' }), msg = el('div', { role:'status' });
      const send = el('button', { type:'button', class:'btn primary', text:'📤 ' + n + '-тапсырманы жіберу' }); let armed = false;
      send.addEventListener('click', async () => {
        const me2 = window.Join.get(); if (!me2) return;
        const empty = n === 1 ? D.quiz.includes(null) : n === 2 ? !D.steps.trim() || D.ans.some(v => !String(v).trim()) : !D.code.trim() || !D.out.trim();
        if (empty && !armed){ armed = true; send.textContent = '📤 Иә, солай жіберу'; msg.innerHTML = '<p class="notice">Кейбір өрістер бос. Сонда да жібересің бе? Тағы бір рет бас.</p>'; return; }
        send.disabled = true; msg.innerHTML = n === 1 ? '' : '<p><span class="spinner"></span>ЖИ тексеріп жатыр. Бұл 10–40 секундқа созылуы мүмкін, бетті жаппа.</p>';
        const payload = n === 1 ? { quiz:D.quiz } : n === 2 ? { steps:D.steps, ans:D.ans } : { code:D.code, out:D.out };
        const j = await window.Join.api('submit', { task:n, payload, signals:D.sig });
        if (j.ok){ msg.innerHTML = ''; await window.Join.refresh(); return; }
        send.disabled = false; armed = false; send.textContent = '📤 ' + n + '-тапсырманы жіберу';
        const t = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', time_over:'Уақыт бітті.', closed:'Сабақ жабылған.', already:'Бұл тапсырма жіберіліп қойған.', auth:'Сабаққа қайта кір.' }[j.error] || 'Жіберу мүмкін болмады. Интернетті тексеріп, қайта бас.';
        msg.innerHTML = ''; msg.append(el('p', { class:'errbox', text:t }));
        if (j.error === 'already') window.Join.refresh();
      });
      c.append(res, el('div', { class:'stepbar' }, send), msg);
      cards[n] = { c, res, msg }; sends[n] = send; tasks.append(c); return c;
    }
    /* 1-тапсырма */
    const q = [];
    cfg.quiz.forEach(([qq, opts], i) => {
      const fs = el('fieldset', { class:'wq' }, el('legend', { text:(i + 1) + '. ' + qq }));
      opts.forEach((o, k) => { const r = el('input', { type:'radio', name:cfg.key + 'q' + i, value:k, checked:D.quiz[i] === k }); r.addEventListener('change', () => { D.quiz[i] = k; save(); }); fs.append(el('label', null, [r, ' ' + o])); });
      q.push(fs);
    });
    card(1, '1-тапсырма. Тест', q);
    /* 2-тапсырма */
    const c2 = [el('p', { html:'<b>№' + me.variant + ' нұсқа:</b>' }), sysView(A, B), el('p', { text:cfg.task2.text })];
    if (cfg.task2.sample) c2.push(el('div', { class:'sample' }, [el('b', { text:'Үлгі' }), el('span', { class:'muted', text:' — ' + cfg.task2.sampleNote }), el('pre', { text:cfg.task2.sample })]));
    c2.push(field('textarea', () => D.steps, v => { D.steps = v; }, 'steps', { class:'work-area mono', rows:'12', 'aria-label':'Шешу барысы', placeholder:'Шешу барысын осында жаз...' }));
    const ans = el('div', { class:'submit-grid' });
    cfg.task2.answers.forEach((a, i) => ans.append(el('label', { for:cfg.key + 'a' + i, html:a.label }), field('input', () => D.ans[i], v => { D.ans[i] = v; }, 'a' + i, { type:'text', class:'cf-input', id:cfg.key + 'a' + i })));
    c2.push(el('p', { text:cfg.task2.answersTitle || 'Жауабың:' }), ans);
    card(2, cfg.task2.title, c2);
    /* 3-тапсырма */
    card(3, cfg.task3.title, [el('p', { text:cfg.task3.text }), el('p', { text:'Сенің кодың:' }),
      field('textarea', () => D.code, v => { D.code = v; }, 'code', { class:'work-area mono', rows:'14', 'aria-label':'Бағдарлама коды' }),
      el('div', { class:'submit-grid' }, [el('label', { for:cfg.key + 'o', text:'Нәтиже' }), field('input', () => D.out, v => { D.out = v; }, 'out', { type:'text', class:'cf-input wide', id:cfg.key + 'o', placeholder:'бағдарлама шығарған нәтиже' })])]);
    ui = { clock, status, sum, tasks, cards, sends };
    built = D.k;
  }

  function update(me){
    if (!ui || !me) return;
    const s = me.session, nowS = window.Join.serverNow() / 1000;
    const started = !!s.work_until, left = started ? Math.floor(s.work_until - nowS) : 0;
    const active = s.status === 'open' && started && left > -90;
    ui.tasks.hidden = !started;
    ui.clock.hidden = !started;
    ui.clock.textContent = left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті.';
    ui.clock.classList.toggle('late', left <= 300);
    ui.status.innerHTML = '';
    if (s.status !== 'open') ui.status.append(el('p', { class:'notice', text:'Сабақ жабылған.' }));
    else if (!started) ui.status.append(el('p', { class:'notice', text:'Оқытушы жұмысты бастағанда тапсырмалар ашылады. Бетті жаппа.' }));
    [1, 2, 3].forEach(n => {
      const t = me.tasks[n], c = ui.cards[n];
      c.c.querySelectorAll('input,textarea').forEach(i => { i.disabled = t.sent; });
      ui.sends[n].hidden = t.sent; ui.sends[n].disabled = !active;
      c.res.innerHTML = '';
      if (t.sent) c.res.append(el('div', { class:'score-box' }, [el('div', { text:n + '-тапсырма жіберілді' }), el('div', { class:'big', text:(t.pts === null ? '✓' : t.pts) + ' / ' + t.max }), t.pending ? el('p', { class:'muted', text:'ЖИ бағалауы әлі аяқталған жоқ, балл кейін нақтыланады.' }) : '']));
    });
    ui.sum.innerHTML = '';
    const sent = [1, 2, 3].filter(n => me.tasks[n].sent).length;
    if (sent) ui.sum.append(el('div', { class:'score-box' }, [el('div', { text:me.complete ? 'Жұмыс аяқталды. Жалпы балл (қатысым 40 + тапсырмалар):' : 'Алдын ала жалпы балл (барлық тапсырма жіберілгенде нақтыланады):' }), el('div', { class:'big', text:me.total + ' / 100' })]));
  }

  window.Join.on(me => {
    const k = me ? dkey(me) : '';
    if (k !== built) build(me);
    update(me);
  });
  clearInterval(sec); sec = setInterval(() => update(window.Join.get()), 1000);
  build(window.Join.get());
  Course.register(cfg.sectionId || 'work', { reset(){ build(window.Join.get()); update(window.Join.get()); } });
} };
})();
