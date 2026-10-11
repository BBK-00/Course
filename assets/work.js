/* Бақылау жұмысы: 3 тапсырма. Әрқайсысының өз «Бастау» батырмасы, өз таймері және өз «Жіберу» батырмасы бар.
   1 — қолмен есептеу (дәптер фотосы), 2 — бағдарлама, 3 — тест. Студент алдымен сабаққа кіреді (Join).
   CourseWork.mount(host, { topic, key, variants:[[A,b],...], task1:{ title, text, sample, sampleNote, answersTitle, answers:[{label}] }, task2:{ title, text }, quiz:[[сұрақ,[нұсқалар]],...] }) */
(function(){
'use strict';
const { el, fmt, Course, copyText } = window.L;
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const ERR = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', time_over:'Жұмыс уақыты бітті.', task_time_over:'Бұл тапсырманың уақыты бітті.', task_not_started:'Алдымен тапсырманы бастау керек.', closed:'Сабақ жабылған.', already:'Бұл тапсырма жіберіліп қойған.', auth:'Сабаққа қайта кір.' };
window.CourseWork = { mount(host, cfg){
  const NA = cfg.task1.answers.length;
  let D = null, built = '', ui = null;
  const dkey = me => cfg.key + ':' + me.session.id + ':' + me.student.name;
  const fresh = () => ({ quiz:cfg.quiz.map(() => null), steps:'', ans:Array(NA).fill(''), code:'', lang:'python', sig:{ paste:0, pasted:0, typed:0, away:0, f:{} } });
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
  /* Фотоны кішірейтіп (≈1600 px, JPEG) base64 етеді */
  async function shrink(file){
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      let side = 1600, q = 0.72, out = '';
      for (let t = 0; t < 6; t++) {
        const k = Math.min(1, side / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        out = c.toDataURL('image/jpeg', q);
        if (out.length < 800000) break;
        side *= 0.8; q = Math.max(0.5, q - 0.05);
      }
      return out.split(',')[1];
    } finally { URL.revokeObjectURL(url); }
  }

  /* ---- Құрылым ---- */
  function build(me){
    host.innerHTML = ''; ui = null; built = '';
    const head = el('div', { class:'task' }); host.append(head);
    if (!me){
      head.append(el('h4', { text:'Жұмысты орындау үшін сабаққа кір' }), el('p', { text:'Оқытушы сабақты бастағанда топты, атыңды таңдап, көрсетілген кодты енгізесің. Қатысымың (40 балл) автоматты түседі.' }));
      const b = el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру' }); b.addEventListener('click', () => window.Join.open());
      head.append(el('div', { class:'stepbar' }, b)); return;
    }
    D = load(me); D.k = dkey(me); D.photo = ''; try { D.photo = localStorage.getItem(D.k + ':photo') || ''; } catch (e) {}
    const [A, B] = cfg.variants[me.variant - 1];
    const status = el('p', { role:'status' }), sum = el('div', { role:'status' });
    head.append(el('h4', { text:me.student.name + ' · ' + me.student.group }), el('p', { class:'muted', text:'Нұсқа №' + me.variant + ' · қатысым: ' + me.attendance + ' балл. Әр тапсырманың өз уақыты бар: «Бастау» батырмасын басқанда уақыт басталады.' }), status, sum);
    const cards = {};
    function card(n, title, intro, body, above){
      const c = el('div', { class:'task' });
      const t = me.tasks[n], tm = el('span', { class:'work-timer', style:'margin:0 0 0 auto', role:'timer' });
      c.append(el('div', { style:'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [el('h4', { text:title, style:'margin:0' }), tm]));
      const pre = el('div'), start = el('button', { type:'button', class:'btn primary', text:'▶ Бастау · ' + t.limit + ' минут' }), smsg = el('div', { role:'status' });
      pre.append(el('p', { text:intro }), el('div', { class:'stepbar' }, start), smsg);
      start.addEventListener('click', async () => { start.disabled = true; const j = await window.Join.api('task/start', { task:n }); if (j.ok) await window.Join.refresh(); else { start.disabled = false; smsg.innerHTML = ''; smsg.append(el('p', { class:'errbox', text:ERR[j.error] || 'Бастау мүмкін болмады. Қайта көр.' })); } });
      const main = el('div'); main.hidden = true; main.append(...body);
      const res = el('div', { role:'status' }), msg = el('div', { role:'status' });
      const send = el('button', { type:'button', class:'btn primary', text:'📤 Жіберу' }); let armed = false;
      send.addEventListener('click', async () => {
        const noPhoto = n === 1 && !D.photo && !D.steps.trim();
        const empty = n === 3 ? D.quiz.includes(null) : n === 1 ? D.ans.some(v => !String(v).trim()) || noPhoto : !D.code.trim();
        if (noPhoto){ msg.innerHTML = ''; msg.append(el('p', { class:'notice', text:'Дәптер фотосын жүкте (немесе шешуді мәтінмен жаз).' })); return; }
        if (empty && !armed){ armed = true; send.textContent = '📤 Иә, солай жіберу'; msg.innerHTML = '<p class="notice">Кейбір өрістер бос. Сонда да жібересің бе? Тағы бір рет бас.</p>'; return; }
        send.disabled = true; msg.innerHTML = n === 3 ? '' : '<p><span class="spinner"></span>ЖИ тексеріп жатыр. Бұл 10–40 секундқа созылуы мүмкін, бетті жаппа.</p>';
        const payload = n === 3 ? { quiz:D.quiz } : n === 1 ? { steps:D.steps, ans:D.ans, photo:D.photo, photo_mime:'image/jpeg' } : { code:D.code, lang:D.lang };
        const j = await window.Join.api('submit', { task:n, payload, signals:D.sig });
        if (j.ok){ msg.innerHTML = ''; await window.Join.refresh(); return; }
        send.disabled = false; armed = false; send.textContent = '📤 Жіберу';
        msg.innerHTML = ''; msg.append(el('p', { class:'errbox', text:ERR[j.error] || 'Жіберу мүмкін болмады. Интернетті тексеріп, қайта бас.' }));
        if (j.error === 'already') window.Join.refresh();
      });
      main.append(el('div', { class:'stepbar' }, send), msg);
      c.append(...(above || []), pre, main, res); host.append(c);
      cards[n] = { c, pre, main, res, send, tm, start };
    }

    /* 1 — қолмен есептеу: үлгі, фото, жауаптар */
    const t1 = cfg.task1, b1 = [el('p', { html:'<b>№' + me.variant + ' нұсқа:</b>' }), sysView(A, B), el('p', { text:t1.text })];
    const pv = el('img', { alt:'Дәптер фотосы', style:'max-width:100%;max-height:340px;border-radius:12px;border:1px solid var(--line);display:none;margin-top:8px' });
    const pmsg = el('div', { role:'status' });
    const fi = el('input', { type:'file', accept:'image/*', style:'display:none' });
    const pick = el('button', { type:'button', class:'btn', text:'📷 Дәптер фотосын жүктеу' });
    pick.addEventListener('click', () => fi.click());
    const show = () => { if (D.photo){ pv.src = 'data:image/jpeg;base64,' + D.photo; pv.style.display = 'block'; pick.textContent = '📷 Фотоны ауыстыру'; } };
    fi.addEventListener('change', async () => {
      if (!fi.files[0]) return; pmsg.innerHTML = '<p><span class="spinner"></span>Фото өңделіп жатыр…</p>';
      try { D.photo = await shrink(fi.files[0]); try { localStorage.setItem(D.k + ':photo', D.photo); } catch (e) {} pmsg.innerHTML = ''; show(); }
      catch (e) { pmsg.innerHTML = ''; pmsg.append(el('p', { class:'errbox', text:'Фотоны оқу мүмкін болмады. Басқа сурет таңда.' })); }
    });
    const fb = el('div', null, [el('p', { html:'<b>Немесе шешуді осында жаз</b> (фото жүктей алмасаң, не қосымша түсініктеме):', style:'margin-top:14px' }), field('textarea', () => D.steps, v => { D.steps = v; }, 'steps', { class:'work-area mono', rows:'10', 'aria-label':'Шешу барысы', placeholder:'Шешу барысын осында жаз...' })]);
    b1.push(el('p', { html:'<b>Дәптерге қолмен жаз</b> және суретке түсіріп жүкте: формулалар, екі итерация, мәндер. Фотоны ЖИ оқып тексереді.' }), el('div', { class:'stepbar' }, pick), fi, pv, pmsg, fb);
    const ans = el('div', { class:'submit-grid' });
    t1.answers.forEach((a, i) => ans.append(el('label', { for:cfg.key + 'a' + i, html:a.label }), field('input', () => D.ans[i], v => { D.ans[i] = v; }, 'a' + i, { type:'text', class:'cf-input', id:cfg.key + 'a' + i })));
    b1.push(el('p', { text:t1.answersTitle || 'Жауабың:' }), ans);
    const det = (title, hint, nodes) => el('details', { class:'help' }, [el('summary', { text:title })].concat(hint ? [el('p', { class:'muted', text:hint })] : [], nodes));
    card(1, '1-тапсырма · ' + t1.title, 'Жүйені қолмен шығарасың. Дәптерге жазып, суретке түсіресің немесе осында жазасың. Қолмен жазғаның сенімді болады.', b1, t1.sample ? [det('📖 Үлгіні көру', t1.sampleNote, [el('pre', { text:t1.sample })])] : []);
    /* 2 — бағдарлама: тіл таңдау, шаблон, сервердe нақты орындау */
    const LANGS = [['python', 'Python'], ['cpp', 'C++'], ['javascript', 'JavaScript'], ['java', 'Java'], ['c', 'C']];
    const lst = (M, o, c) => o + M.map(r => Array.isArray(r) ? o + r.join(', ') + c : r).join(', ') + c;
    const TODO = ['1) s = қалған белгісіздер бойынша қосынды: A[i][j] * x[j], мұнда j != i', '2) жаңа мән: (b[i] - s) / A[i][i]', '3) delta-ны жаңарт (|жаңа - x[i]| ең үлкені) және жаңа мәнді бірден x[i]-ге жаз', '4) тоқтау шарты: delta < eps болса, циклді тоқтат'];
    const TPLS = {
      python: ['A = ' + lst(A, '[', ']'), 'b = ' + lst(B, '[', ']'), 'eps = 0.0001', 'x = [0.0, 0.0, 0.0]          # бастапқы жуықтау', '', 'for k in range(1, 101):', '    delta = 0', '    for i in range(3):', '        # ' + TODO[0], '        s = 0', '        # TODO', '', '        # ' + TODO[1], '        new = 0   # TODO', '', '        # ' + TODO[2], '        # TODO', '', '    # ' + TODO[3], '    # TODO', '', 'print(x[0], x[1], x[2])'].join('\n'),
      cpp: ['#include <iostream>', '#include <cmath>', 'using namespace std;', '', 'int main() {', '    double A[3][3] = ' + lst(A, '{', '}') + ';', '    double b[3] = ' + lst(B, '{', '}') + ';', '    double eps = 0.0001;', '    double x[3] = {0, 0, 0};          // бастапқы жуықтау', '', '    for (int k = 1; k <= 100; k++) {', '        double delta = 0;', '        for (int i = 0; i < 3; i++) {', '            // ' + TODO[0], '            double s = 0;', '            // TODO', '', '            // ' + TODO[1], '            double nw = 0;   // TODO', '', '            // ' + TODO[2], '            // TODO', '        }', '        // ' + TODO[3], '        // TODO', '    }', '    cout << x[0] << " " << x[1] << " " << x[2] << endl;', '    return 0;', '}'].join('\n'),
      javascript: ['const A = ' + lst(A, '[', ']') + ';', 'const b = ' + lst(B, '[', ']') + ';', 'const eps = 0.0001;', 'const x = [0, 0, 0];          // бастапқы жуықтау', '', 'for (let k = 1; k <= 100; k++) {', '    let delta = 0;', '    for (let i = 0; i < 3; i++) {', '        // ' + TODO[0], '        let s = 0;', '        // TODO', '', '        // ' + TODO[1], '        let nw = 0;   // TODO', '', '        // ' + TODO[2], '        // TODO', '    }', '    // ' + TODO[3], '    // TODO', '}', 'console.log(x[0], x[1], x[2]);'].join('\n')
    };
    const tplPre = el('pre'), tplMsg = el('span', { class:'muted', role:'status' });
    const showTpl = () => { tplPre.textContent = TPLS[D.lang] || 'Бұл тіл үшін шаблон жоқ. Python шаблонын үлгі ет.'; };
    const codeTa = field('textarea', () => D.code, v => { D.code = v; }, 'code', { class:'work-area mono', rows:'16', 'aria-label':'Бағдарлама коды', spellcheck:'false' });
    codeTa.addEventListener('keydown', e => { if (e.key === 'Tab'){ e.preventDefault(); const p = codeTa.selectionStart; codeTa.setRangeText('    ', p, codeTa.selectionEnd, 'end'); codeTa.dispatchEvent(new Event('input')); } });
    const sel = el('select', { class:'cf-input', 'aria-label':'Бағдарламалау тілі', style:'width:auto' }, LANGS.map(([v, n]) => el('option', { value:v, text:n, selected:D.lang === v })));
    sel.addEventListener('change', () => { D.lang = sel.value; save(); showTpl(); });
    const copyB = el('button', { type:'button', class:'btn small', text:'📋 Көшіру' }), pasteB = el('button', { type:'button', class:'btn small', text:'⤵ Кодқа қою' });
    copyB.addEventListener('click', () => copyText(TPLS[D.lang] || '', tplMsg));
    pasteB.addEventListener('click', () => { if (!codeTa.value.trim() && TPLS[D.lang]){ codeTa.value = TPLS[D.lang]; codeTa.dispatchEvent(new Event('input')); tplMsg.textContent = 'Қойылды ✓'; } else tplMsg.textContent = 'Код өрісі бос емес.'; setTimeout(() => { tplMsg.textContent = ''; }, 2500); });
    const outBox = el('div', { role:'status' }), runB = el('button', { type:'button', class:'btn', text:'▶ Іске қосу' });
    runB.addEventListener('click', async () => {
      if (!D.code.trim()){ outBox.innerHTML = ''; outBox.append(el('p', { class:'notice', text:'Алдымен код жаз.' })); return; }
      runB.disabled = true; outBox.innerHTML = '<p><span class="spinner"></span>Бағдарлама орындалып жатыр…</p>';
      const j = await window.Join.api('run', { language:D.lang, code:D.code }); runB.disabled = false; outBox.innerHTML = '';
      if (!j.ok){ outBox.append(el('p', { class:'errbox', text:j.error === 'wait' ? 'Тым жиі іске қостың. Бір минут күт.' : 'Іске қосу мүмкін болмады. Қайта көр.' })); return; }
      const r = j.run; outBox.append(el('p', { class:r.ok ? 'success' : 'errbox', style:'margin:8px 0 4px', text:(r.ok ? '✓ Орындалды' : '✕ ' + (r.status || 'Қате')) }), el('pre', { class:'pyout', text:(r.stdout || '(нәтиже шықпады)') + (r.stderr ? '\n' + r.stderr : '') }));
    });
    showTpl();
    card(2, '2-тапсырма · ' + cfg.task2.title, cfg.task2.text.split('. ')[0] + '.', [el('p', { text:cfg.task2.text }),
      det('🧩 Шаблонды көру', 'Көшіріп алып, TODO орындарын толықтыр.', [tplPre, el('div', { class:'stepbar' }, [copyB, pasteB, tplMsg])]),
      el('div', { class:'row2', style:'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0 6px' }, [el('label', { text:'Тіл:' }), sel, runB]),
      codeTa, outBox, el('p', { class:'muted', text:'«Іске қосу» бағдарламаны нақты орындайды. Жіберген кезде сервер оны қайта орындап, нәтижесін автоматты тексереді.' })]);
    /* 3 — тест */
    const q = [];
    cfg.quiz.forEach(([qq, opts], i) => {
      const fs = el('fieldset', { class:'wq' }, el('legend', { text:(i + 1) + '. ' + qq }));
      opts.forEach((o, k) => { const r = el('input', { type:'radio', name:cfg.key + 'q' + i, value:k, checked:D.quiz[i] === k }); r.addEventListener('change', () => { D.quiz[i] = k; save(); }); fs.append(el('label', null, [r, ' ' + o])); });
      q.push(fs);
    });
    card(3, '3-тапсырма · Тест', cfg.quiz.length + ' сұрақ, әрқайсысында бір дұрыс жауап бар.', q);
    ui = { status, sum, cards }; built = D.k;
  }

  function update(me){
    if (!ui || !me) return;
    const s = me.session, nowS = window.Join.serverNow() / 1000, open = s.status === 'open' && !!s.work_until && nowS < s.work_until + 90;
    ui.status.innerHTML = '';
    if (s.status !== 'open') ui.status.append(el('p', { class:'notice', text:'Сабақ жабылған.' }));
    else if (!s.work_until) ui.status.append(el('p', { class:'notice', text:'Оқытушы жұмысты бастағанда тапсырмалар ашылады. Бетті жаппа.' }));
    else if (nowS >= s.work_until + 90) ui.status.append(el('p', { class:'notice', text:'Жұмыс уақыты бітті.' }));
    [1, 2, 3].forEach(n => {
      const t = me.tasks[n], c = ui.cards[n], left = t.started_at ? Math.floor(t.started_at + t.limit * 60 - nowS) : 0, over = t.started_at && left < -45;
      c.pre.hidden = !!t.started_at || t.sent; c.start.disabled = !open;
      c.main.hidden = !t.started_at || t.sent;
      c.tm.hidden = !t.started_at || t.sent;
      c.tm.textContent = left > 0 ? '⏱ ' + mmss(left) : '⏱ Уақыт бітті';
      c.tm.classList.toggle('late', left <= 120);
      c.main.querySelectorAll('input,textarea,button,select').forEach(i => { if (i !== c.send) i.disabled = !!over || t.sent; });
      c.send.disabled = !open || !!over;
      c.res.innerHTML = '';
      if (t.sent) c.res.append(el('div', { class:'score-box' }, [el('div', { text:'Жіберілді' }), el('div', { class:'big', text:(t.pts === null ? '✓' : t.pts) + ' / ' + t.max }), t.pending ? el('p', { class:'muted', text:'ЖИ бағалауы әлі аяқталған жоқ, балл кейін нақтыланады.' }) : '']));
      else if (over) c.res.append(el('p', { class:'notice', text:'Бұл тапсырманың уақыты бітті.' }));
    });
    ui.sum.innerHTML = '';
    if ([1, 2, 3].some(n => me.tasks[n].sent)) ui.sum.append(el('div', { class:'score-box' }, [el('div', { text:me.complete ? 'Жұмыс аяқталды. Жалпы балл (қатысым 40 + тапсырмалар):' : 'Алдын ала жалпы балл (барлық тапсырма жіберілгенде нақтыланады):' }), el('div', { class:'big', text:me.total + ' / 100' })]));
  }

  window.Join.on(me => { const k = me ? dkey(me) : ''; if (k !== built) build(me); update(me); });
  setInterval(() => update(window.Join.get()), 1000);
  build(window.Join.get());
  Course.register(cfg.sectionId || 'work', { reset(){ build(window.Join.get()); update(window.Join.get()); } });
} };
})();
