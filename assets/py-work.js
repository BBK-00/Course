/* Python сабағының практикасы: әр есеп жеке жіберіледі, бірден нақты орындалып тексеріледі (әр тест жағдайы бөлек).
   Қате болса, студент түсініктемені оқып, кодты түзетіп қайта жібере алады: жоғалтқан баллдың бір бөлігі қайтады.
   PyWork.mount({ tasks, timer, summary }) — тапсырмалар, таймер және қорытынды орындары.
   Код редакторы: CodeEditor (қою өшірулі). Жоба құрылғыда студент пен сабаққа байланысты сақталады. */
(function(){
'use strict';
const { el } = window.L;
const J = () => window.Join;
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.floor(Math.max(0, s)) % 60).padStart(2, '0');
const ERR = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', time_over:'Жұмыс уақыты бітті.', closed:'Сабақ жабылған.', wait:'Тым жиі жіберіп жатырсың. Бірнеше секундтан кейін қайта көр.', full:'Бұл есеп толық дұрыс.', no_tries:'Түзету әрекеттері бітті.', runner:'Бағдарламаны іске қосатын қызмет жауап бермеді. Бірнеше секундтан кейін қайта көр.', auth:'Сабаққа қайта кіріңіз.', bad_request:'Алдымен кодты жаз.', hint_limit:'Кеңес саны бітті (сабақта 6).', ai:'Кеңес беретін қызмет жауап бермеді. Түсініктемені қайта оқып көр.', no_attempt:'Алдымен есепті жіберу керек.', nothing:'Жіберуге болатын есеп жоқ.', no_pair:'Оқытушы әлі жұп құрған жоқ.', already:'Сандық ашылып қойған.' };
const CHIP = { none:['Жіберілмеген', ''], full:['✓ Толық дұрыс', 'ok'], fixed:['✓ Түзетілді', 'ok'], part:['Қатемен жұмыс', 'mid'], zero:['Қатемен жұмыс', 'bad'] };

let D = null, root = null, hosts = {}, items = {}, taskBars = {}, quizBox = null, busy = {}, polling = 0, tick = 0, away = 0, opened = {};
document.addEventListener('visibilitychange', () => { if (document.hidden) away++; });
const me = () => J().get();
const nowS = () => Math.floor(J().serverNow() / 1000);
const phase = () => { if (!D || !D.ready) return 'wait'; const t = nowS(); return t <= D.work_until + 45 ? 'work' : t <= D.revise_until + 45 ? 'revise' : 'over'; };
const maxTotal = () => Object.values((D && D.scores) || {}).reduce((a, x) => a + x.max, 0) || 100;
const fmt = v => typeof v === 'number' ? String(v) : '«' + v + '»';
const keyOf = id => { const m = me(); return 'pydraft|' + (m && m.session ? m.session.id : 0) + '|' + (m && m.student ? m.student.name : '') + '|' + id; };
const load = id => { try { return localStorage.getItem(keyOf(id)); } catch (e) { return null; } };
const save = (id, v) => { try { localStorage.setItem(keyOf(id), v); } catch (e) {} };

function status(it, s){
  if (!s || !s.done) return CHIP.none;
  if (s.f1 >= 1) return CHIP.full;
  if (s.best >= 1) return CHIP.fixed;
  return s.best > 0 ? CHIP.part : CHIP.zero;
}

/* ---------- Нәтиже панелі ---------- */
function resultBox(it, s, extra){
  const box = el('div', { class:'py-res', role:'status' });
  if (!s || !s.done) return box;
  const left = s.canRevise && phase() !== 'over';
  box.append(el('div', { class:'py-score' }, [el('b', { text:(it.kind === 'quiz' ? (s.f1 >= 1 ? 'Дұрыс' : 'Қате') : s.passed + ' / ' + s.total + ' тест өтті') }), el('span', { text:' · ' + s.pts + ' / ' + it.max + ' балл' })]));
  if (s.syntax) box.append(el('p', { class:'py-syn', text:'Бағдарлама іске қосылмады: синтаксис қатесі бар.' }));
  if ((s.cases || []).length && s.best < 1){
    const bad = s.cases.filter(c => !c.ok);
    if (bad.length){
      const ul = el('ul', { class:'py-cases' });
      bad.slice(0, 4).forEach(c => {
        const exp = c.exp && c.exp.length ? c.exp.map(fmt).join(' және ') : 'ештеңе шықпауы керек', got = c.err ? 'қате: ' + c.err : (c.got ? '«' + c.got + '»' : 'ештеңе шықпады');
        ul.append(el('li', { html:'Енгізу: <code>' + (c.in.length ? c.in.join(' ; ') : '—') + '</code> → күтілген: <b>' + exp + '</b>; сенің бағдарламаң: <b>' + got + '</b>' }));
      });
      box.append(el('div', { class:'py-sub' }, [el('b', { text:'Қай жерде қате:' }), ul]));
    }
  }
  if ((s.diag || []).length && s.best < 1) box.append(el('div', { class:'py-diag' }, [el('b', { text:'💡 Қатені былай түсінуге болады:' }), el('ul', {}, s.diag.map(d => el('li', { text:d.text })))]));
  if (extra && extra.explain && s.best < 1) box.append(el('p', { class:'py-diag', text:'💡 ' + extra.explain }));
  if (s.best < 1 && it.kind === 'quiz' && s.revLeft === 0) box.append(el('p', { class:'py-note', text:'Бұл сұрақты қайта жауап беру әрекеті бітті.' }));
  if (s.best >= 1 && s.f1 < 1) box.append(el('p', { class:'py-ok', text:'✓ Қатені түзеттің. Жоғалтқан баллдың бір бөлігі қайтарылды.' }));
  if (left) box.append(el('p', { class:'py-rev', text:'🔁 Қатемен жұмыс: түзетіп қайта жібер. Жоғалтқан баллдың ' + (it.kind === 'quiz' ? '50' : '70') + '%-ын қайтара аласың. Қалған әрекет: ' + s.revLeft + '.' }));
  return box;
}

/* ---------- Есеп карточкасы (код және қатені түзету) ---------- */
function codeCard(it, opt){
  const card = el('div', { class:'py-item', id:'pyi' + it.id }), st = { typed:0, assist:0, pasted:0, paste:0, tpl:0 };
  const head = el('h4', {}, [el('span', { text:it.title }), el('span', { class:'pt', text:it.max + ' балл' }), el('span', { class:'py-chip' })]);
  const text = el('div', { class:'py-text', html:it.text });
  if (it.sample) text.append(el('p', { class:'py-sample', html:'<b>Мысал.</b> Енгізу: <code>' + it.sample.in.join(' ; ') + '</code> → шығыс: <code>' + it.sample.out + '</code>' }));
  const edHost = el('div', { class:'py-ed' });
  const stdin = el('textarea', { class:'py-stdin', rows:'2', 'aria-label':'Сынақ енгізуі', placeholder:'Сынақ енгізуі: әр жол — бір input() үшін' });
  const out = el('pre', { class:'py-out', hidden:true });
  const bRun = el('button', { type:'button', class:'btn', text:'▶ Орындау' }), bSend = el('button', { type:'button', class:'btn primary', text:'✓ Тексеруге жіберу' }), bHint = el('button', { type:'button', class:'btn ghost', text:'💡 Кеңес алу', hidden:true });
  const msg = el('div', { class:'xl-msg', role:'status' }), res = el('div'), hint = el('div');
  card.append(head, text, edHost, el('div', { class:'py-tools' }, [stdin]), el('div', { class:'stepbar' }, [bRun, bSend, bHint]), out, msg, res, hint);
  const ed = window.CodeEditor.create(edHost, { lang:'python', stats:st, onChange:v => { save(it.id, v); } });
  const last = items[it.id] && items[it.id].state, saved = load(it.id);
  ed.setValue(saved !== null ? saved : (last && last.code) || it.starter || '# Жауабыңды осы жерде жаз\n', saved === null && !(last && last.code));
  ed.ta.addEventListener('focus', () => { if (!opened[it.id]){ opened[it.id] = 1; J().api('py/open', { item:it.id }); } });
  const o = items[it.id];
  Object.assign(o, { card, ed, st, bSend, bHint, msg, res, head, hint, stdin, bRun, single:!!(opt && opt.single) });
  bRun.addEventListener('click', async () => {
    bRun.disabled = true; out.hidden = false; out.textContent = 'Орындалып жатыр…';
    const j = await J().api('run', { code:ed.getValue(), language:'python', stdin:stdin.value });
    bRun.disabled = false;
    if (!j.ok){ out.textContent = ERR[j.error] || 'Орындау мүмкін болмады.'; return; }
    const r = j.run || {}; out.textContent = (r.stdout || '') + (r.stderr ? (r.stdout ? '\n' : '') + 'Қате:\n' + r.stderr : '') || '(шығыс жоқ)';
  });
  bSend.hidden = !(opt && opt.single);   /* бірінші жіберу — тапсырманың соңындағы батырма; бұл батырма тек түзетіп қайта жіберу үшін (жұптық кеңес есебінде бірінші жіберу де осы жерде) */
  if (opt && opt.single) bHint.textContent = '🧠 ЖИ-көмек';
  bSend.addEventListener('click', () => submit(it, { code:ed.getValue(), signals:{ ...st, away } }));
  bHint.addEventListener('click', async () => {
    bHint.disabled = true; hint.innerHTML = ''; hint.append(el('p', { class:'py-note', text:'Кеңес дайындалып жатыр…' }));
    const j = await J().api('py/hint', { item:it.id }); bHint.disabled = false; hint.innerHTML = '';
    hint.append(j.ok ? el('div', { class:'py-hint' }, [el('b', { text:'💡 Кеңес' }), el('p', { text:j.hint }), el('small', { text:'Қалған кеңес: ' + j.left })]) : el('p', { class:'errbox', text:ERR[j.error] || 'Кеңес алу мүмкін болмады.' }));
  });
  return card;
}

/* ---------- Тапсырманы бүтін жіберу: барлық есеп бір сұраныспен тексеріледі ---------- */
function taskBar(t){
  const btn = el('button', { type:'button', class:'btn primary' }), msg = el('div', { class:'xl-msg', role:'status' });
  taskBars[t.n] = { t, btn, msg };
  btn.addEventListener('click', () => {
    const codes = {}, sig = { typed:0, assist:0, pasted:0, paste:0, tpl:0 }; let k = 0;
    t.items.forEach(it => {
      const o = items[it.id]; if (o.state && o.state.done) return;
      const code = o.ed.getValue(); if (!code.replace(/#.*$/gm, '').trim()) return;
      codes[it.id] = code; k++; Object.keys(sig).forEach(x => { sig[x] += o.st[x] || 0; });
    });
    if (!k){ msg.className = 'xl-msg bad'; msg.textContent = 'Алдымен кодты жаз.'; return; }
    if (!confirm(t.n + '-тапсырманың ' + k + ' есебін жібересің бе? Негізгі баға қойылады. Қате болса, түсініктемені оқып, кейін түзетіп қайта жібере аласың.')) return;
    submit(null, { codes, signals:{ ...sig, away } }, msg, btn, 't' + t.n);
  });
  return el('div', { class:'py-taskbar' }, [el('div', { class:'stepbar' }, btn), el('p', { class:'py-note', text:'Барлық есепті орындап болған соң жібер. «▶ Орындау» арқылы әр есепті алдын ала сынауға болады.' }), msg]);
}

/* ---------- Тест ---------- */
function quizCard(task){
  const card = el('div', { class:'py-item py-quiz' }), qs = {};
  const send = el('button', { type:'button', class:'btn primary', text:'✓ Тестті жіберу' }), msg = el('div', { class:'xl-msg', role:'status' });
  task.items.forEach(q => {
    const box = el('div', { class:'mq' }), pick = { v:null }, fb = el('div', { class:'py-fb' }), re = el('button', { type:'button', class:'btn sm', text:'Қайта жауап беру', hidden:true });
    box.append(el('p', { text:(task.items.indexOf(q) + 1) + '. ' + q.q + (q.diff ? '  [' + q.diff + ']' : '') }));
    if (q.code) box.append(el('pre', { class:'py-qcode', text:q.code }));
    const btns = q.opts.map(op => { const b = el('button', { type:'button', text:op.t }); b.addEventListener('click', () => { if (b.disabled) return; pick.v = op.i; btns.forEach(x => x.classList.toggle('sel', x === b)); }); box.append(b); return b; });
    box.append(fb, re);
    re.addEventListener('click', () => { if (pick.v === null){ fb.textContent = 'Алдымен жауапты таңда.'; return; } submit(q, { choice:pick.v }, msg); });
    qs[q.id] = { box, pick, fb, re, btns, q };
    items[q.id].q = qs[q.id];
    card.append(box);
  });
  send.addEventListener('click', () => {
    const quiz = {}; let miss = 0;
    task.items.forEach(q => { const s = items[q.id].state; if (s && s.done) return; if (qs[q.id].pick.v === null) miss++; else quiz[q.id] = qs[q.id].pick.v; });
    if (miss){ msg.className = 'xl-msg bad'; msg.textContent = 'Барлық сұраққа жауап таңда (' + miss + ' сұрақ қалды).'; return; }
    if (!Object.keys(quiz).length) return;
    if (!confirm('Тестті жібересің бе? Қате жауапты кейін бір рет түзетуге болады.')) return;
    submit(null, { quiz }, msg, send);
  });
  card.append(el('div', { class:'stepbar' }, send), msg);
  card._send = send; card._msg = msg; return card;
}

/* ---------- Жіберу ---------- */
async function submit(it, body, msgEl, btn, keyArg){
  const key = it ? it.id : (keyArg || 'quiz');
  if (busy[key]) return; busy[key] = true;
  const o = it ? items[it.id] : null, msg = msgEl || (o && o.msg), b = btn || (o && o.bSend);
  if (b) b.disabled = true; if (msg){ msg.className = 'xl-msg'; msg.textContent = 'Нақты орындалып, тексерілуде…'; }
  let j; try { j = await J().api('py/submit', it ? { item:it.id, ...body } : body); } catch (e) { j = { ok:false, error:'net' }; }
  busy[key] = false;
  if (!j.ok){ if (msg){ msg.className = 'xl-msg bad'; msg.textContent = ERR[j.error] || 'Желі қатесі. Қайта көр.'; } if (b) b.disabled = false; paint(); return; }
  j.results.forEach(r => { const o2 = items[r.item]; if (o2){ o2.state = r; o2.explain = r.explain; } });
  D.total = j.total; D.scores = j.scores;
  if (msg){ msg.className = 'xl-msg ok'; msg.textContent = 'Тексерілді.'; }
  paint(); if (it) { const t = items[it.id].card.querySelector('.py-res'); if (t) t.scrollIntoView({ block:'nearest', behavior:'smooth' }); }
  if (D.pair && D.pair.has) refreshPair();
}

/* ---------- Жұптық «Сандық»: жұпты оқытушы құрады; сандық және төрт кеңес ---------- */
let pairTimer = 0, chestUi = null, hintUi = [];
async function refreshPair(){
  const j = await J().api('py/data'); if (!j.ok || !j.ready || !D) return;
  if (j.pair && j.pair.has && !(D.pair && D.pair.has)){ D = null; loadData(); return; }
  D.pair = j.pair; D.total = j.total; D.scores = j.scores;
  Object.keys(j.state || {}).forEach(id => { if (items[id]) items[id].state = j.state[id]; });
  paint();
}
function chestPanel(){
  const C = D.pair.chest, chip = el('span', { class:'py-chip' }), msg = el('div', { class:'xl-msg', role:'status' }), info = el('p', { class:'py-note' }), win = el('p', { class:'py-ok' });
  const send = async (k, inp, go) => {
    const v = inp.value.trim(); if (!v){ msg.className = 'xl-msg bad'; msg.textContent = 'Жауапты жазыңдар.'; return; }
    go.disabled = true; msg.className = 'xl-msg'; msg.textContent = 'Тексерілуде…';
    const r = await J().api('py/chest', { riddle:k, answer:v }); go.disabled = false;
    if (!r.ok){ msg.className = 'xl-msg bad'; msg.textContent = r.error === 'wait' ? 'Келесі болжамға дейін 10 секунд күтіңіздер.' : (ERR[r.error] || 'Қате. Қайта көріңдер.'); return; }
    D.pair = r.pair; D.total = r.total; D.scores = r.scores; paint();
    if (!r.good){ msg.className = 'xl-msg bad'; msg.textContent = 'Жауап дұрыс емес. Қате жауап сыйлықтан 1 балл алады. Ойланыңдар немесе кеңес алыңдар.'; }
    else if (!r.pair.chest.open){ msg.className = 'xl-msg ok'; msg.textContent = (k + 1) + '-сұрақтың жауабы дұрыс! Екінші сұрақты да тауып, сандықты ашыңдар.'; }
  };
  const ui = C.riddles.map((R, k) => {
    const inp = el('input', { type:'text', maxlength:'60', class:'cf-input py-ans', placeholder:'Жауабың', autocomplete:'off', 'aria-label':(k + 1) + '-сұрақтың жауабы' });
    const go = el('button', { type:'button', class:'btn primary', text:'Тексеру' }), st = el('span', { class:'py-chip' });
    const body = [el('div', { class:'py-rtop' }, [el('b', { text:'❓ ' + (k + 1) + '-сұрақ' }), st])];
    if (R.lines) body.push(el('div', { class:'py-riddle' }, R.lines.map(t => el('p', { text:t }))));
    if (R.img) body.push(el('img', { class:'py-rimg', src:R.img, alt:R.alt || '' }));
    body.push(el('p', { class:'py-text', text:R.ask }));
    const form = el('div', { class:'py-codebox' }, [inp, go]); body.push(form);
    go.addEventListener('click', () => send(k, inp, go));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(k, inp, go); });
    return { card:el('div', { class:'py-rcard' }, body), inp, go, st, form };
  });
  chestUi = { chip, msg, info, win, ui };
  return el('div', { class:'py-chest' }, [el('h4', {}, [el('span', { text:'🧰 Сандық' }), el('span', { class:'pt', text:C.max + ' балл' }), chip]), el('p', { class:'py-text', text:C.intro }), ...ui.map(u => u.card), msg, info, win]);
}
function paintChest(){
  if (!chestUi || !D.pair || !D.pair.chest) return;
  const C = D.pair.chest, u = chestUi, ph = phase(), live = ph === 'work' || ph === 'revise';
  u.chip.textContent = C.open ? '🔓 ашылды' : '🔒 жабық'; u.chip.className = 'py-chip ' + (C.open ? 'ok' : '');
  u.ui.forEach((r, k) => { const done = C.riddles[k].solved; r.form.hidden = done; r.go.disabled = !live; r.st.textContent = done ? '✓ жауабы табылды' : 'жауап күтілуде'; r.st.className = 'py-chip ' + (done ? 'ok' : ''); r.card.classList.toggle('done', done); });
  u.info.hidden = C.open; u.info.textContent = 'Қазіргі сыйлық: ' + C.now + ' / ' + C.max + ' балл (кеңес: ' + C.used + ', қате жауап: ' + C.tries + '). Әр кеңес 2 балл, әр қате жауап 1 балл алады.';
  u.win.hidden = !C.open; u.win.textContent = C.open ? '🎉 Сандық ашылды! Сыйлық: ' + C.pts + ' / ' + C.max + ' балл (кеңес: ' + C.used + ', қате жауап: ' + C.tries + ').' : '';
  if (C.open) u.msg.textContent = '';
}
function quizOne(q){
  const card = el('div', { class:'py-item py-quiz' }), box = el('div', { class:'mq' }), pick = { v:null }, fb = el('div', { class:'py-fb' });
  const re = el('button', { type:'button', class:'btn sm', text:'Қайта жауап беру', hidden:true }), go = el('button', { type:'button', class:'btn primary', text:'✓ Жауап беру' }), msg = el('div', { class:'xl-msg', role:'status' });
  box.append(el('p', { text:q.q }));
  if (q.code) box.append(el('pre', { class:'py-qcode', text:q.code }));
  const btns = q.opts.map(op => { const b = el('button', { type:'button', text:op.t }); b.addEventListener('click', () => { if (b.disabled) return; pick.v = op.i; btns.forEach(x => x.classList.toggle('sel', x === b)); }); box.append(b); return b; });
  box.append(fb, re);
  const send = () => { if (pick.v === null){ msg.className = 'xl-msg bad'; msg.textContent = 'Алдымен жауапты таңда.'; return; } submit(q, { choice:pick.v }, msg); };
  re.addEventListener('click', send); go.addEventListener('click', send);
  items[q.id].q = { box, pick, fb, re, go, btns, q, sig:'' };
  card.append(box, el('div', { class:'stepbar' }, go), msg);
  return card;
}
const TAGS = { code:'Код', test:'Тест', bug:'Қатені тап', trace:'Нәтижені тап' };
function hintSlot(it, i){
  const chip = el('span', { class:'py-chip' }), txt = el('div', { class:'py-hint', hidden:true });
  hintUi[i] = { chip, txt };
  return el('div', { class:'py-hcard' }, [el('div', { class:'py-htop' }, [el('b', { text:'💡 Кеңес · ' + (i < 2 ? 1 : 2) + '-сұраққа · ' + (TAGS[it.tag] || '') }), el('span', { class:'pt', text:it.max + ' балл' }), chip]), txt, it.kind === 'quiz' ? quizOne(it) : codeCard(it, { single:true })]);
}
function paintHints(){
  if (!D.pair || !D.pair.hints) return;
  D.pair.hints.forEach((h, i) => { const u = hintUi[i]; if (!u) return; u.txt.hidden = !h.got; u.txt.textContent = h.got ? '🔑 ' + h.text : ''; u.chip.textContent = h.got ? '✓ кеңес ашылды' : '🔒 жабық'; u.chip.className = 'py-chip ' + (h.got ? 'ok' : ''); });
}
function pairSection(sec, t){
  const P = D.pair;
  if (!P || !P.has){ sec.append(el('div', { class:'py-pairbox' }, [el('b', { text:'⏳ Жұп күтілуде' }), el('p', { class:'py-note', text:'Оқытушы жұптарды құрып жатыр. Жұбың белгілі болғанда бет өзі жаңарады (8 секунд сайын тексеріледі).' })])); return; }
  sec.append(el('p', { class:'py-note', text:P.solo ? '👤 Жеке орындап жатырсың.' : '👥 Жұбың: ' + P.partner.name + '. Нәтиже екеуіңе де ортақ: серіктесің шешкен кеңес сенде де ашылады. Кеңес есептерін бөліп алуға болады.' }));
  sec.append(chestPanel(), el('p', { class:'py-note', text:'Жауапты білмесеңдер, кеңес алыңдар. Кеңес есебін дұрыс шешсеңдер, кеңес мәтіні ашылады. Есептерді бөліп алуға болады.' }));
  t.items.forEach((it, i) => { if (i % 2 === 0) sec.append(el('h4', { class:'a2h', text:(i / 2 + 1) + '-сұраққа арналған кеңестер' })); sec.append(hintSlot(it, i)); });
}

/* ---------- Көрсету ---------- */
function paint(){
  if (!D || !D.ready) return;
  paintChest(); paintHints();
  const ph = phase();
  Object.values(items).forEach(o => {
    const it = o.it, s = o.state;
    if (it.kind === 'quiz'){ paintQuiz(o, ph); return; }
    const [t, cls] = status(it, s); const chip = o.head.querySelector('.py-chip'); chip.textContent = t; chip.className = 'py-chip ' + cls;
    const can = s && s.done ? (s.canRevise && ph !== 'wait' && ph !== 'over') : ph === 'work';
    o.bSend.hidden = o.single ? !!(s && s.best >= 1) : !(s && s.done && s.best < 1);
    o.bSend.disabled = !can || !!busy[it.id];
    o.bSend.textContent = s && s.done ? '↻ Түзетіп қайта жіберу (қалды ' + (s ? s.revLeft : 0) + ')' : '✓ Тексеруге жіберу';
    o.bHint.hidden = !(s && s.done && s.best < 1);
    o.ed.setDisabled(!(ph === 'work' || (s && s.done && s.canRevise && ph === 'revise')) );
    o.res.innerHTML = ''; o.res.append(resultBox(it, s));
  });
  Object.values(taskBars).forEach(tb => { const n = tb.t.n, left = tb.t.items.filter(i => !(items[i.id].state && items[i.id].state.done)).length; tb.btn.disabled = !(ph === 'work' && left) || !!busy['t' + n]; tb.btn.textContent = left ? '✓ ' + n + '-тапсырманы жіберу' + (left < tb.t.items.length ? ' (қалған ' + left + ' есеп)' : '') : '✓ ' + n + '-тапсырма жіберілді'; });
  paintBar();
}
function paintQuiz(o, ph){
  const q = o.q, s = o.state, it = o.it, sig = ph + '|' + (s && s.done ? s.tries + ':' + s.best + ':' + (s.choice !== undefined ? s.choice : '') : '');
  if (q.sig === sig) return; q.sig = sig;   /* 8 секундтық жаңартуда таңдалған нұсқа ысырылмауы үшін */
  q.fb.innerHTML = ''; q.re.hidden = true; if (q.go) q.go.hidden = !!(s && s.done);
  if (s && s.done){
    q.btns.forEach(b => { b.disabled = true; });
    const chosen = s.choice !== undefined ? s.choice : null;
    q.btns.forEach((b, i) => { const op = q.q.opts[i]; b.classList.toggle('sel', op.i === chosen); b.classList.toggle('no', op.i === chosen && s.best < 1 && s.f1 < 1); b.classList.toggle('ok', op.i === chosen && s.f1 >= 1); });
    q.fb.append(resultBox(it, s, { explain:o.explain }));
    if (s.canRevise && ph !== 'over' && ph !== 'wait'){ q.btns.forEach(b => { b.disabled = false; b.classList.remove('sel'); }); q.re.hidden = false; q.pick.v = null; }
  } else { q.btns.forEach(b => { b.disabled = ph !== 'work'; }); if (q.go) q.go.disabled = ph !== 'work'; }
}
let barEl = null;
function paintBar(){
  if (!barEl || !D) return;
  const ph = phase(), t = nowS(), left = ph === 'work' ? D.work_until - t : ph === 'revise' ? D.revise_until - t : 0;
  const label = ph === 'work' ? '⏱ Жұмыс: ' + mmss(left) : ph === 'revise' ? '🔁 Қатемен жұмыс: ' + mmss(left) : ph === 'over' ? 'Уақыт бітті' : 'Күтіңіз';
  const tot = barEl.querySelector('.py-bar-t'), sc = barEl.querySelector('.py-bar-s');
  tot.textContent = label; tot.className = 'py-bar-t' + (ph === 'work' && left <= 300 ? ' late' : ph === 'revise' ? ' rev' : '');
  sc.textContent = 'Жиыны: ' + (Math.round((D.total || 0) * 10) / 10) + ' / ' + maxTotal();
  barEl.querySelector('.py-bar-p').innerHTML = '';
  Object.keys(D.scores || {}).forEach(n => { const x = D.scores && D.scores[n]; barEl.querySelector('.py-bar-p').append(el('span', { class:'py-pill' + (x && x.sent ? ' on' : ''), text:n + ': ' + (x && x.sent ? Math.round(x.pts * 10) / 10 : 0) + '/' + (x ? x.max : '') })); });
  if (ph !== D._ph){ D._ph = ph; if (ph === 'revise' || ph === 'over') loadSummary(); }
}

/* ---------- Құру ---------- */
function build(){
  hosts.tasks.innerHTML = ''; items = {}; chestUi = null; hintUi = [];
  D.tasks.forEach(t => t.items.forEach(it => { items[it.id] = { it, state:D.state[it.id] }; }));
  barEl = el('div', { class:'py-bar', role:'status' }, [el('div', { class:'py-bar-t' }), el('div', { class:'py-bar-s' }), el('div', { class:'py-bar-p' })]);
  hosts.tasks.append(barEl);
  const info = { 1:'Берілген есептерге Python кодын жаз. Әр есеп жеке тексеріледі.', 2:'Күрделірек есептер. Кірістірілген шарттарды қолдан.', 3:'Кодта қате бар. Қатені тауып түзет.', 4:'5 сұрақ. Бір жауап таңда.' };
  D.tasks.forEach(t => {
    const sec = el('div', { class:'tsk' + (t.n === 2 ? ' main' : '') }, [el('h3', {}, [el('span', { class:'num', text:String(t.n) }), t.title, el('span', { class:'pt', text:t.items.reduce((a, i) => a + i.max, 0) + ' балл' })]), el('p', { class:'muted', text:t.info || info[t.n] })]);
    if (t.pair) pairSection(sec, t);
    else if (t.items[0].kind === 'quiz') sec.append(quizCard(t));
    else { t.items.forEach(it => sec.append(codeCard(it))); sec.append(taskBar(t)); }
    hosts.tasks.append(sec);
  });
  paint(); clearInterval(tick); tick = setInterval(() => { if (!document.hidden) { paintBar(); const p = phase(); if (p !== lastPh){ lastPh = p; paint(); } } }, 1000);
}
let lastPh = '';

async function loadData(){
  const m = me();
  if (!m){ hosts.tasks.innerHTML = ''; hosts.tasks.append(el('p', { class:'notice', text:'Тапсырмаларды көру үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.' }), el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру', onclick:() => J().open() }))); D = null; return; }
  if (m.guest){ hosts.tasks.innerHTML = ''; hosts.tasks.append(el('p', { class:'notice', text:'Мұғалім ретінде кірдіңіз. Тапсырмаларды студенттер орындайды.' })); return; }
  if (!m.session || m.session.topic !== (hosts.topic || 'P7')){ hosts.tasks.innerHTML = ''; hosts.tasks.append(el('p', { class:'notice', text:'Бұл тақырып бойынша сабақ әлі ашылмаған. Оқытушы сабақты бастағанда осы бет жаңарады.' })); D = null; return; }
  const who = m.student.name + '|' + m.session.id;
  if (D && D.ready && D.who === who){ paint(); return; }
  const j = await J().api('py/data');
  if (!j.ok){ hosts.tasks.innerHTML = ''; hosts.tasks.append(el('p', { class:'errbox', text:ERR[j.error] || 'Тапсырмаларды жүктеу мүмкін болмады.' })); return; }
  if (!j.ready){
    D = null; hosts.tasks.innerHTML = ''; hosts.tasks.append(el('p', { class:'notice', text:'✓ Сабаққа кірдіңіз. Оқытушы жұмысты бастағанда тапсырмалар осы жерде ашылады. Бет өзі жаңарады.' }));
    clearTimeout(polling); polling = setTimeout(loadData, 4000); return;
  }
  const first = !D || D.who !== who; D = j; D.who = who;
  if (first || !hosts.tasks.querySelector('.py-bar')) build(); else { Object.keys(j.state).forEach(id => { if (items[id]) items[id].state = j.state[id]; }); paint(); }
}

/* ---------- Қорытынды: дағдылар, уақыт, қайталау ---------- */
async function loadSummary(){
  if (!hosts.summary) return;
  if (!me()){ hosts.summary.innerHTML = ''; hosts.summary.append(el('p', { class:'notice', text:'Нәтижеңді көру үшін алдымен сабаққа кіріңіз.' }), el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру', onclick:() => J().open() }))); return; }
  const j = await J().api('py/summary'); if (!j.ok) return;
  const box = hosts.summary; box.innerHTML = '';
  const mm = s => s === null ? '—' : mmss(s);
  box.append(el('div', { class:'py-total' }, [el('b', { text:'Жиыны: ' + (Math.round(j.total * 10) / 10) + ' / ' + Object.values(j.scores || {}).reduce((a, x) => a + x.max, 0) }), el('span', { text:' (қатемен жұмыс есепке алынған)' })]));
  const done = j.rows.filter(r => r.done);
  if (!done.length){ box.append(el('p', { class:'muted', text:'Әлі есеп жіберілген жоқ.' })); return; }
  box.append(el('div', { class:'tbwrap' }, el('table', { class:'tb' }, [el('thead', {}, el('tr', {}, ['Есеп', 'Балл', 'Әрекет', 'Бірінші әрекет', 'Уақыт'].map(t => el('th', { text:t })))), el('tbody', {}, j.rows.map(r => el('tr', {}, [el('td', { text:r.task + '.' + (r.k || (r.id % 10)) + ' ' + r.title }), el('td', { text:r.done ? (Math.round(r.pts * 10) / 10) + ' / ' + r.max : '—' }), el('td', { text:r.done ? String(r.tries) : '—' }), el('td', { text:r.done ? Math.round(r.f1 * 100) + '%' : '—' }), el('td', { text:mm(r.secs) })])))])));
  const rep = j.skills.filter(s => s.state === 'repeat'), fx = j.skills.filter(s => s.state === 'fixed'), okk = j.skills.filter(s => s.state === 'ok');
  const list = (arr, cls, ico) => arr.map(s => el('li', { class:cls }, [el('b', { text:ico + ' ' + s.name }), el('p', { text:s.tip })]));
  if (rep.length) box.append(el('h4', { class:'a2h', text:'Қайталауға тұрады' }), el('ul', { class:'py-skills' }, list(rep, 'bad', '⚠')));
  if (fx.length) box.append(el('h4', { class:'a2h', text:'Қатемен жұмыс арқылы түзеттің' }), el('ul', { class:'py-skills' }, list(fx, 'mid', '↻')));
  if (okk.length) box.append(el('h4', { class:'a2h', text:'Жақсы меңгердің' }), el('ul', { class:'py-skills compact' }, okk.map(s => el('li', { class:'ok', text:'✓ ' + s.name }))));
  if (!rep.length && !fx.length) box.append(el('p', { class:'py-ok', text:'Бәрін қатесіз орындадың. Тамаша!' }));
}

window.PyWork = {
  mount(h){
    hosts = h; root = h.tasks;
    J().on(() => loadData());
    clearInterval(pairTimer); pairTimer = setInterval(() => { if (document.hidden || !D || !D.pair) return; if (!D.pair.has){ J().api('py/data').then(j => { if (j.ok && j.pair && j.pair.has){ D = null; loadData(); } }); } else if (!D.pair.solo && phase() !== 'over') refreshPair(); }, 8000);
    if (h.summaryBtn) h.summaryBtn.addEventListener('click', loadSummary);
    loadData();
  }
};
})();
