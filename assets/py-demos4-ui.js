/* Python, 4-тақырып: беттің интерфейсі (калькулятор, орындалу реті, int/float/str, input(), ережелер, қатені тап, hero).
   Қозғалыс тек студент әрекетіне жауап ретінде жүреді (Алға/Артқа не батырма). Қозғалтқыш: py-demos4.js (window.PyEngine4).
   PyDemos4.mount({ hero, ops, order, conv, inp, rules, err }) */
(function(){
'use strict';
const { el, esc } = window.L, E = window.PyEngine4;
const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const typeChip = t => el('span', { class:'p4-ty ' + t, text:t });

/* ---------- 1. Операторлар кестесі + калькулятор ---------- */
const OPS = [
  ['+', 'Қосу', 'Сандарды қосады', 'Екі санның қосындысы.'],
  ['-', 'Азайту', 'Сандарды азайтады', 'Бірінші саннан екінші санды алады.'],
  ['*', 'Көбейту', 'Сандарды көбейтеді', 'Көбейту белгісі жұлдызша. Х әрпі не нүкте емес.'],
  ['/', 'Бөлу', 'Сандарды бөледі', 'Нәтиже әрқашан float: 10 / 2 = 5.0, бөлінсе де.'],
  ['//', 'Бүтін бөлу', 'Бөлудің бүтін бөлігін алады', 'Нәтиже төмен қарай дөңгелектенеді: -7 // 2 = -4, -3 емес.'],
  ['%', 'Қалдық', 'Бөлуден қалған қалдықты алады', 'n % 2 == 0 болса, сан жұп. Қалдық бөлгіштің белгісін алады: -7 % 2 = 1.'],
  ['**', 'Дәреже', 'Санның дәрежесін есептейді', 'Python-да дәреже ** арқылы жазылады. ^ белгісі басқа іс жасайды.']
];
function ops(host){
  let sel = 3;
  const ia = el('input', { type:'text', inputmode:'decimal', value:'10', 'aria-label':'a саны', autocomplete:'off', maxlength:'12' }), ib = el('input', { type:'text', inputmode:'decimal', value:'3', 'aria-label':'b саны', autocomplete:'off', maxlength:'12' });
  const quick = el('div', { class:'p4-quick' }, el('span', { text:'Тез таңдау:' }));
  [['10', '3'], ['10', '2'], ['7', '2'], ['-7', '2'], ['5', '0'], ['2.5', '2']].forEach(([x, y]) => quick.append(el('button', { type:'button', class:'pl-chipbtn', text:x + ' және ' + y, onclick:() => { ia.value = x; ib.value = y; run(); } })));
  const msg = el('p', { class:'p4-msg', role:'status' }), tip = el('p', { class:'p4-tip', role:'status' }), body = el('tbody');
  const th = t => el('th', { text:t });
  const table = el('table', { class:'p4-table' }, [el('thead', {}, el('tr', {}, [th('Оператор'), th('Атауы'), th('Не істейді'), th('Мысал'), th('Нәтиже')])), body]);
  function run(){
    body.innerHTML = '';
    let x, y;
    try { x = E.parseLit(ia.value); y = E.parseLit(ib.value); if (x.t === 'str' || y.t === 'str') throw 0; }
    catch (e) { msg.textContent = 'a және b орнына сан енгіз: 10, -7 не 2.5.'; msg.className = 'p4-msg no'; tip.textContent = ''; return; }
    msg.textContent = ''; msg.className = 'p4-msg';
    OPS.forEach(([op, name, what], i) => {
      let r, err = '';
      try { r = E.binop(op, x, y); } catch (e) { err = e.kind; }
      const tr = el('tr', { class:i === sel ? 'on' : '', tabindex:'0' }, [
        el('td', {}, el('span', { class:'p4-op o' + i, text:op })), el('td', { class:'nm', text:name }), el('td', { class:'wh', text:what }),
        el('td', {}, el('code', { text:'print(a ' + op + ' b)' })),
        el('td', {}, err ? el('code', { class:'p4-er', text:err }) : [el('code', { class:'p4-rs', text:E.fmt(r) }), typeChip(r.t)])]);
      tr.addEventListener('click', () => { sel = i; run(); });
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = i; run(); } });
      body.append(tr);
    });
    tip.innerHTML = '<b>' + esc(OPS[sel][0]) + ' · ' + esc(OPS[sel][1]) + '.</b> ' + esc(OPS[sel][3]);
  }
  ia.addEventListener('input', run); ib.addEventListener('input', run);
  host.append(el('div', { class:'p4-ins' }, [el('label', {}, [el('span', { text:'a =' }), ia]), el('label', {}, [el('span', { text:'b =' }), ib])]), quick, msg, el('div', { class:'p4-twrap' }, table), tip);
  run();
}

/* ---------- 2. Орындалу реті ---------- */
const LADDER = [['1', 'Жақша ()', 'Ең алдымен жақша ішіндегі есеп орындалады.'], ['2', 'Дәреже **', 'Келесі: дәрежеге шығару. Одан кейін унарлық минус (-x).'], ['3', 'Көбейту *, бөлу /, бүтін бөлу //, қалдық %', 'Төртеуі бір деңгейде: солдан оңға қарай.'], ['4', 'Қосу +, азайту -', 'Ең соңында: солдан оңға қарай.']];
const PRESETS = ['10 - (1 + 2) ** 2 * 3 // 4 + 7 % 4', '2 + 3 * 4', '(2 + 3) * 4', '2 * 7 // 2', '10 - 4 - 3', '100 - 5 * 2 ** 2', '2 ** 3 ** 2', '-3 ** 2', '7 // 2 * 2 + 7 % 2'];
function order(host){
  let fr = [], k = 0;
  const ladder = el('ol', { class:'p4-ladder' }), rows = [];
  LADDER.forEach(([n, t, d]) => { const li = el('li', {}, [el('b', { text:n }), el('div', {}, [el('strong', { text:t }), el('small', { text:d })])]); rows.push(li); ladder.append(li); });
  const note = el('p', { class:'p4-note', html:'Бір деңгейдегі амалдар солдан оңға орындалады. Тек <code>**</code> оңнан солға: <code>2 ** 3 ** 2</code> = <code>2 ** 9</code> = 512.' });
  const expr = el('div', { class:'p4-expr', 'aria-live':'polite' }), cap = el('p', { class:'p4-cap', 'aria-live':'polite' }), prog = el('div', { class:'p4-prog' }, el('span'));
  const msg = el('p', { class:'p4-msg', role:'status' }), codeLine = el('div', { class:'p4-codeline' });
  const inp = el('input', { type:'text', value:PRESETS[0], 'aria-label':'Өз өрнегің', autocomplete:'off', spellcheck:'false', maxlength:'60' });
  const bPrev = el('button', { type:'button', class:'btn', text:'← Артқа' }), bNext = el('button', { type:'button', class:'btn primary', text:'Алға →' }), bReset = el('button', { type:'button', class:'btn ghost', text:'↺ Басынан' });
  const chips = el('div', { class:'p4-chips' });
  function paint(){
    const f = fr[k]; expr.innerHTML = f.html;
    rows.forEach((r, i) => r.classList.toggle('on', f.level === i + 1));
    cap.textContent = f.final ? f.cap + ' Тип: ' + f.value.t + (f.value.t === 'float' ? ' (нүктесі бар сан).' : ' (бүтін сан).') : (f.cap || 'Өрнек дайын. «Алға» батырмасын бас: Python қай амалды бірінші орындайтынын көресің.');
    prog.firstChild.style.width = Math.round(k / (fr.length - 1) * 100) + '%';
    bPrev.disabled = k === 0; bNext.disabled = k >= fr.length - 1; bReset.disabled = k === 0;
  }
  function load(src){
    msg.className = 'p4-msg'; msg.textContent = '';
    try { E.evalTree(E.parse(src)); fr = E.steps(src, esc); k = 0; codeLine.textContent = 'print(' + src.trim() + ')'; paint(); }
    catch (e) {
      fr = []; codeLine.textContent = ''; expr.innerHTML = ''; cap.textContent = ''; rows.forEach(r => r.classList.remove('on')); prog.firstChild.style.width = '0';
      bPrev.disabled = bNext.disabled = bReset.disabled = true; msg.className = 'p4-msg no'; msg.textContent = (e.kind ? e.kind + ': ' : '') + (e.kk || 'Өрнекті түсінбедім.');
    }
  }
  PRESETS.forEach(p => chips.append(el('button', { type:'button', class:'pl-chipbtn', text:p, onclick:() => { inp.value = p; load(p); } })));
  bPrev.addEventListener('click', () => { if (k > 0) { k--; paint(); } });
  bNext.addEventListener('click', () => { if (k < fr.length - 1) { k++; paint(); } });
  bReset.addEventListener('click', () => { k = 0; paint(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') load(inp.value); });
  host.append(el('div', { class:'p4-ordgrid' }, [
    el('div', {}, [el('h4', { class:'p4-h', text:'Орындалу тәртібі' }), ladder, note]),
    el('div', {}, [el('h4', { class:'p4-h', text:'Қадамдап көру' }), chips,
      el('div', { class:'p4-own' }, [inp, el('button', { type:'button', class:'btn', text:'Көр', onclick:() => load(inp.value) })]), msg,
      codeLine, el('div', { class:'p4-stage' }, [expr]), prog, cap, el('div', { class:'stepbar' }, [bPrev, bNext, bReset])])]));
  load(PRESETS[0]);
}

/* ---------- 3. Типтерді түрлендіру ---------- */
/* ---------- Қысқартылған меншіктеу амалдары: a += b ---------- */
const AUG = [
  ['=', 'a = b', 'a = b', 'a-ға b мәні жазылады.'], ['+', 'a = (a + b)', 'a += b', 'a-ға b қосылып, нәтиже a-ға қайта жазылады.'], ['-', 'a = (a - b)', 'a -= b', 'a-дан b азайтылады.'],
  ['*', 'a = (a * b)', 'a *= b', 'a b-ға көбейтіледі.'], ['/', 'a = (a / b)', 'a /= b', 'a b-ға бөлінеді, нәтиже әрқашан бөлшек (float).'], ['%', 'a = (a % b)', 'a %= b', 'a-ның b-ға бөлгендегі қалдығы a-ға жазылады.'],
  ['//', 'a = (a // b)', 'a //= b', 'a-ның b-ға бөлгендегі бүтін бөлігі a-ға жазылады.'], ['**', 'a = (a ** b)', 'a **= b', 'a b-ші дәрежеге шығарылады.']
];
function aug(host){
  let sel = 1;
  const ia = el('input', { type:'text', inputmode:'decimal', value:'10', 'aria-label':'a бастапқы мәні', autocomplete:'off', maxlength:'12' }), ib = el('input', { type:'text', inputmode:'decimal', value:'3', 'aria-label':'b мәні', autocomplete:'off', maxlength:'12' });
  const msg = el('p', { class:'p4-msg', role:'status' }), tip = el('p', { class:'p4-tip', role:'status' }), body = el('tbody');
  const th = t => el('th', { text:t });
  const table = el('table', { class:'p4-table' }, [el('thead', {}, el('tr', {}, [th('№'), th('Таңба'), th('Толық жазылуы'), th('Қысқа жазылуы'), th('Нәтиже: a')])), body]);
  function run(){
    body.innerHTML = '';
    let x, y;
    try { x = E.parseLit(ia.value); y = E.parseLit(ib.value); if (x.t === 'str' || y.t === 'str') throw 0; }
    catch (e) { msg.textContent = 'a және b орнына сан енгіз: 10, -7 не 2.5.'; msg.className = 'p4-msg no'; tip.textContent = ''; return; }
    msg.textContent = ''; msg.className = 'p4-msg';
    AUG.forEach(([op, full, short], i) => {
      let r, err = '';
      try { r = op === '=' ? y : E.binop(op, x, y); } catch (e) { err = e.kind; }
      const tr = el('tr', { class:i === sel ? 'on' : '', tabindex:'0' }, [
        el('td', { text:String(i + 1) }), el('td', {}, el('span', { class:'p4-op o' + (i % 7), text:op === '=' ? '=' : op + '=' })), el('td', {}, el('code', { text:full })), el('td', {}, el('code', { class:'p4-rs', text:short })),
        el('td', {}, err ? el('code', { class:'p4-er', text:err }) : [el('code', { text:'a = ' + E.fmt(r) }), typeChip(r.t)])]);
      tr.addEventListener('click', () => { sel = i; run(); });
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = i; run(); } });
      body.append(tr);
    });
    tip.innerHTML = '<b>' + esc(AUG[sel][2]) + '</b> — бұл <code>' + esc(AUG[sel][1]) + '</code> дегенмен бірдей. ' + esc(AUG[sel][3]);
  }
  ia.addEventListener('input', run); ib.addEventListener('input', run);
  host.append(el('div', { class:'p4-ins' }, [el('label', {}, [el('span', { text:'a =' }), ia]), el('label', {}, [el('span', { text:'b =' }), ib])]), msg, el('div', { class:'p4-twrap' }, table), tip);
  run();
}

/* ---------- abs(), int(), round() ---------- */
const NF = [
  { f:'abs', name:'abs()', note:'abs(x) — санның модулі, яғни таңбасыз мәні: abs(-7.5) = 7.5, abs(4) = 4.' },
  { f:'int', name:'int()', note:'int(x) бөлшек бөлігін кесіп тастайды, дөңгелектемейді: int(3.9) = 3, int(-3.9) = -3. Нәтиже — бүтін сан.' },
  { f:'round', name:'round()', note:'round(x) бүтін санға дөңгелектейді. Дәл ортасында жұп санға: round(2.5) = 2, round(3.5) = 4. round(x, n) — n таңбаға дейін дөңгелектейді, нәтиже бөлшек (float).' }
];
function nfun(host){
  let m = 2;
  const tabs = el('div', { class:'pl-tabs2', role:'tablist' }), term = el('div', { class:'p4-term', 'aria-live':'polite' }), msg = el('p', { class:'p4-msg', role:'status' }), note = el('p', { class:'p4-tip' });
  const inp = el('input', { type:'text', inputmode:'decimal', value:'2.5', 'aria-label':'Сан', autocomplete:'off', maxlength:'14' }), dig = el('input', { type:'text', inputmode:'numeric', value:'', 'aria-label':'Таңба саны (n)', autocomplete:'off', maxlength:'3', style:'width:5em' });
  const digBox = el('label', { class:'p4-lbl' }, [el('span', { text:'n (таңба саны, бос қалдыруға болады): ' }), dig]);
  const quick = el('div', { class:'p4-quick' }, el('span', { text:'Мәнді таңда:' }));
  ['-7.5', '3.9', '-3.9', '2.5', '3.5', '3.14159', '10'].forEach(v => quick.append(el('button', { type:'button', class:'pl-chipbtn', text:v, onclick:() => { inp.value = v; run(); } })));
  function run(){
    const N = NF[m]; digBox.hidden = N.f !== 'round'; term.innerHTML = ''; msg.className = 'p4-msg'; msg.textContent = ''; note.textContent = N.note;
    tabs.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === m); b.setAttribute('aria-selected', i === m ? 'true' : 'false'); });
    let x; try { x = E.parseLit(inp.value); if (x.t === 'str') throw 0; } catch (e) { msg.className = 'p4-msg no'; msg.textContent = 'Сан енгіз: 3.9, -7.5 не 10.'; return; }
    let nd; if (N.f === 'round' && dig.value.trim() !== '') { if (!/^-?\d{1,2}$/.test(dig.value.trim()) || Math.abs(+dig.value) > 10) { msg.className = 'p4-msg no'; msg.textContent = 'n — бүтін сан, -10-нан 10-ға дейін.'; return; } nd = +dig.value.trim(); }
    const call = N.f + '(' + E.fmt(x) + (nd !== undefined ? ', ' + nd : '') + ')', r = N.f === 'abs' ? E.pyAbs(x) : N.f === 'int' ? E.pyInt(x) : E.pyRound(x, nd);
    term.append(el('small', { text:'print(' + call + ')' }), el('pre', { class:'good', text:E.fmt(r) }), el('span', { class:'p4-tg', text:'✓ Нәтиже типі: ' + r.t }));
    if (N.f === 'round' && nd === undefined && x.t === 'float' && Math.abs(x.v % 1) === 0.5) { msg.className = 'p4-msg hint'; msg.textContent = 'Дәл ортасында Python жұп санға дөңгелектейді: ' + E.fmt(x) + ' → ' + E.fmt(r) + '.'; }
  }
  NF.forEach((N, i) => tabs.append(el('button', { type:'button', role:'tab', text:N.name, onclick:() => { m = i; run(); } })));
  inp.addEventListener('input', run); dig.addEventListener('input', run);
  host.append(tabs, el('div', { class:'p4-own' }, [el('label', { class:'p4-lbl', text:'Сан:' }), inp]), digBox, quick, term, msg, note);
  run();
}

const CONV_ERR = { int:'int() тек бүтін санға ұқсас мәтінді айналдырады: «25», « 7 ». «3.5» не «abc» айналмайды.', float:'float() «1.75», «3» сияқты мәтінді айналдырады. Үтірлі «1,5» не әріпті «abc» айналмайды.' };
function conv(host){
  const cards = el('div', { class:'p4-cv3' }, [
    ['int()', 'бүтін санға айналдырады', 'print(int("25"))  → 25', 'ci'], ['float()', 'бөлшек санға айналдырады', 'print(float("1.75"))  → 1.75', 'cf'], ['str()', 'мәтінге айналдырады', 'print(str(25))  → 25', 'cs']
  ].map(([n, d, ex, c]) => el('div', { class:'p4-cv ' + c }, [el('b', { text:n }), el('span', { text:d }), el('code', { text:ex })])));
  const inp = el('input', { type:'text', value:'"25"', 'aria-label':'Мән', autocomplete:'off', spellcheck:'false', maxlength:'30' });
  let fn = 'int';
  const quick = el('div', { class:'p4-quick' }, el('span', { text:'Мәнді таңда:' }));
  ['"25"', '"1.75"', '3.9', '"3.5"', '"abc"', '25'].forEach(v => quick.append(el('button', { type:'button', class:'pl-chipbtn', text:v, onclick:() => { inp.value = v; apply(fn); } })));
  const term = el('div', { class:'p4-term', 'aria-live':'polite' }), why = el('p', { class:'p4-msg', role:'status' }), btns = el('div', { class:'p4-fnb' });
  function apply(f){
    fn = f; btns.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.f === f));
    let x; term.innerHTML = ''; why.className = 'p4-msg'; why.textContent = '';
    try { x = E.parseLit(inp.value); } catch (e) { term.append(el('pre', { class:'bad', text:e.kk })); return; }
    term.append(el('small', { text:'print(' + f + '(' + E.show(x) + '))' }));
    try {
      const r = E.convert(f, x);
      term.append(el('pre', { class:'good', text:E.show(r) }), el('span', { class:'p4-tg', text:'✓ Нәтиже типі: ' + r.t }));
      if (f === 'int' && x.t === 'float') { why.className = 'p4-msg hint'; why.textContent = 'int() бөлшек бөлікті кесіп тастайды: 3.9 → 3. Дөңгелектемейді.'; }
      if (f === 'str') { why.className = 'p4-msg hint'; why.textContent = 'Нәтиже енді мәтін: 25 пен «25» бірдей емес. Мәтінмен есептеуге болмайды.'; }
    } catch (e) {
      term.append(el('pre', { class:'bad', text:e.kind + ': ' + e.message }), el('span', { class:'p4-tg bad', text:'✗ Қате: бағдарлама тоқтады' }));
      why.className = 'p4-msg no'; why.textContent = CONV_ERR[f] || '';
    }
  }
  [['int', 'int()'], ['float', 'float()'], ['str', 'str()']].forEach(([f, t]) => btns.append(el('button', { type:'button', class:'btn', text:t, 'data-f':f, onclick:() => apply(f) })));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') apply(fn); });
  host.append(cards, el('div', { class:'p4-own' }, [el('label', { class:'p4-lbl', text:'Мән:' }), inp]), quick, btns, term, why);
  apply('int');
}

/* ---------- 4. input() және типтер ---------- */
const INP = [
  { name:'Түрлендірусіз', fn:null, ask:'Жасыңды енгіз: ', v:'age', def:'15' },
  { name:'int()', fn:'int', ask:'Жасыңды енгіз: ', v:'age', def:'15' },
  { name:'float()', fn:'float', ask:'Бойыңды енгіз: ', v:'height', def:'1.75' }
];
function inputDemo(host){
  let m = 0;
  const tabs = el('div', { class:'pl-tabs2', role:'tablist' }), edit = el('div', { class:'p4-edit' }), term = el('div', { class:'p4-term' }), msg = el('p', { class:'p4-msg', role:'status' });
  const inp = el('input', { type:'text', value:INP[0].def, 'aria-label':'Пайдаланушы енгізген мән', autocomplete:'off', spellcheck:'false', maxlength:'20' });
  const T = { none:'input() әрқашан мәтін (str) береді. «15» — сан емес, мәтін. Сондықтан age * 2 мәтінді екі рет қайталады, ал age + 1 қате берді.', int:'int() мәтінді бүтін санға айналдырды. Енді есеп дұрыс шығады.', float:'float() мәтінді бөлшек санға айналдырды. Бой, салмақ сияқты мәндер үшін қолданылады.' };
  function paint(){
    const P = INP[m], code = [P.v + ' = ' + (P.fn ? P.fn + '(' : '') + 'input("' + P.ask + '")' + (P.fn ? ')' : ''), 'print(type(' + P.v + '))', 'print(' + P.v + ' * 2)', 'print(' + P.v + ' + 1)'];
    const out = [P.ask + inp.value]; let bad = -1, val = { t:'str', v:inp.value }, text = T[P.fn || 'none'];
    try {
      if (P.fn) val = E.convert(P.fn, { t:'str', v:inp.value });
      out.push("<class '" + val.t + "'>");
      if (val.t === 'str') { out.push(val.v.repeat(2)); bad = 3; out.push('TypeError: can only concatenate str (not "int") to str'); }
      else { out.push(E.fmt(E.binop('*', val, E.I(2)))); out.push(E.fmt(E.binop('+', val, E.I(1)))); }
    } catch (e) { bad = 0; out.push(e.kind + ': ' + e.message); text = CONV_ERR[P.fn]; }
    edit.innerHTML = '';
    code.forEach((l, i) => edit.append(el('div', { class:'p4-el' + (i === bad ? ' bad' : '') }, [el('i', { text:String(i + 1) }), el('code', { text:l })])));
    term.innerHTML = ''; term.append(el('small', { text:'ТЕРМИНАЛ' }), el('pre', { class:bad >= 0 ? 'bad' : 'good', text:out.join('\n') }));
    msg.className = 'p4-msg ' + (bad >= 0 ? 'no' : 'ok'); msg.textContent = text;
    tabs.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === m); b.setAttribute('aria-selected', i === m ? 'true' : 'false'); });
  }
  INP.forEach((P, i) => tabs.append(el('button', { type:'button', role:'tab', text:P.name, onclick:() => { m = i; inp.value = P.def; paint(); } })));
  inp.addEventListener('input', paint);
  host.append(tabs, el('div', { class:'p4-own' }, [el('label', { class:'p4-lbl', text:'Пайдаланушы енгізеді:' }), inp]), el('div', { class:'p4-icols' }, [edit, term]), msg);
  paint();
}

/* ---------- 5. Жазылу ережелері ---------- */
const frac = (n, d) => '<span class="p4-frac"><i>' + n + '</i><i>' + d + '</i></span>';
const RULES = [
  { t:'Көбейту белгісі міндетті', m:'<span class="p4-m">2x + 1</span>', ok:'2 * x + 1', no:'2x + 1', n:'Математикада белгі түсіріліп жазылады, Python-да жоқ.' },
  { t:'Бөлшек жолға жазылады', m:'<span class="p4-m">' + frac('a + b', 'c + d') + '</span>', ok:'(a + b) / (c + d)', no:'a + b / c + d', n:'Алым мен бөлім жақшаға алынады.' },
  { t:'Дәреже екі жұлдызша', m:'<span class="p4-m">x<sup>2</sup></span>', ok:'x ** 2', no:'x ^ 2', n:'^ белгісі дәреже емес, басқа амал.' },
  { t:'Ондық бөлшек нүктемен', m:'<span class="p4-m">3,5 · 2</span>', ok:'3.5 * 2', no:'3,5 * 2', n:'Үтір бөлшекті емес, мәндерді бөледі.' }
];
function rules(host){
  const g = el('div', { class:'p4-rules' });
  RULES.forEach((r, i) => g.append(el('div', { class:'p4-rule' }, [el('b', {}, [el('span', { class:'ic', text:String(i + 1) }), r.t]), el('div', { class:'p4-rm', html:r.m }),
    el('div', { class:'p4-rok' }, [el('span', { text:'Python:' }), el('code', { text:r.ok })]), el('div', { class:'p4-rno' }, [el('span', { text:'Қате:' }), el('code', { text:r.no })]), el('small', { text:r.n })])));
  host.append(g);
}

/* ---------- 6. Қатені тап ---------- */
const BUGS = [
  { name:'Көбейту', goal:'x = 5 болғанда, 2 * x + 1 өрнегінің мәнін шығару керек.', want:'11', code:['x = 5', 'print(2x + 1)'], bug:[1], fix:['x = 5', 'print(2 * x + 1)'], bad:'SyntaxError: invalid decimal literal', good:'11', hint:'Терминал сан мен әріптің қатар жазылғанын көрсетіп тұр.', why:'Python-да көбейту белгісі міндетті: 2 * x. Математикадағыдай 2x деп жазуға болмайды.' },
  { name:'Орташа', goal:'6 мен 9 сандарының орташа арифметикалығын шығару керек.', want:'7.5', code:['a = 6', 'b = 9', 'print(a + b / 2)'], bug:[2], fix:['a = 6', 'b = 9', 'print((a + b) / 2)'], bad:'10.5', good:'7.5', hint:'6 мен 9-дың орташасы 7.5 болуы керек. Бөлу қосудан бұрын орындалады.', why:'Бөлу қосудан бұрын орындалады, сондықтан a + (b / 2) шықты. Қосындыны бөлу үшін жақша қою керек: (a + b) / 2.' },
  { name:'Дәреже', goal:'2 санының үшінші дәрежесін шығару керек.', want:'8', code:['print(2 ^ 3)'], bug:[0], fix:['print(2 ** 3)'], bad:'1', good:'8', hint:'2-нің үшінші дәрежесі 8 болуы керек. Python ^ белгісін қалай түсінеді?', why:'Python-да ^ дәреже емес, басқа амал (разрядтық XOR). Дәреже екі жұлдызшамен жазылады: 2 ** 3.' },
  { name:'input()', goal:'Пайдаланушы жасын енгізеді (мысалы, 15). Бағдарлама жасқа 1 қосып, нәтижені шығаруы керек.', want:'16', code:['age = input("Жасың: ")', 'print(age + 1)'], bug:[0], fix:['age = int(input("Жасың: "))', 'print(age + 1)'], inp:'15', bad:'TypeError: can only concatenate str (not "int") to str', good:'16', hint:'input() қандай типті мән береді? Қосу үшін сан керек.', why:'input() әрқашан мәтін (str) береді. Мәтінге 1 қосуға болмайды. Алдымен int(input(...)) арқылы санға айналдыру керек.' },
  { name:'Үтір', goal:'3.5 санын 2-ге көбейтіп, нәтижені шығару керек.', want:'7.0', code:['print(3,5 * 2)'], bug:[0], fix:['print(3.5 * 2)'], bad:'3 10', good:'7.0', hint:'Нәтижеде екі сан шықты. Үтір не істеп тұр?', why:'Үтір print()-ке екі бөлек мән бергенін білдіреді: 3 және 5 * 2. Бөлшектің бөлігі нүктемен жазылады: 3.5.' }
];
function err(host){
  let cur = 0; const done = new Set(), wrong = BUGS.map(() => 0);
  const tabs = el('div', { class:'pl-tabs2', role:'tablist' }), body = el('div'), score = el('span', { class:'p4-score' });
  function draw(){
    const B = BUGS[cur], solved = done.has(cur);
    tabs.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === cur); b.classList.toggle('ok', done.has(i)); b.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
    score.textContent = 'Табылды: ' + done.size + ' / ' + BUGS.length;
    const code = el('div', { class:'p4-bcode', role:'group', 'aria-label':'Код. Қате жолды бас.' });
    (solved ? B.fix : B.code).forEach((l, i) => {
      const fx = solved && B.fix[i] !== B.code[i];
      const row = el(solved ? 'div' : 'button', { class:'p4-bl' + (fx ? ' fixed' : ''), 'aria-label':'Жол ' + (i + 1) + ': ' + l }, [el('i', { text:String(i + 1) }), el('code', { text:l })]);
      if (!solved) { row.type = 'button'; row.addEventListener('click', () => pick(i, row)); }
      code.append(row);
    });
    const res = solved ? B.good : B.bad, isErr = !solved && /Error/.test(B.bad);
    const term = el('div', { class:'p4-bterm' + (solved ? ' good' : ' bad') }, [el('small', { text:'ТЕРМИНАЛ' + (B.inp ? ' · енгізу: ' + B.inp : '') }), el('pre', { text:'> ' + res }), solved ? null : el('small', { class:'p4-want', text:'Күтілген нәтиже: ' + B.want }), el('span', { class:'p4-tag', text:solved ? '✓ Дұрыс нәтиже' : isErr ? '✗ Қате: бағдарлама іске қосылмады' : '✗ Нәтиже қате' })]);
    const msg = el('p', { class:'p4-msg', role:'status' });
    if (solved) { msg.className += ' ok'; msg.innerHTML = '<b>Дұрыс!</b> ' + esc(B.why); }
    else if (wrong[cur] >= 2) { msg.className += ' hint'; msg.textContent = 'Кеңес: ' + B.hint; }
    else msg.textContent = 'Міндетті оқып, шыққан нәтижені күтілгенмен салыстыр. Қате жолды бас.';
    body.innerHTML = ''; body.append(el('p', { class:'p4-goal', html:'<b>Міндет:</b> ' + esc(B.goal) }), el('div', { class:'p4-bgrid' }, [code, term]), msg);
    if (solved && done.size < BUGS.length) body.append(el('button', { type:'button', class:'btn primary', text:'Келесі қате →', onclick:() => { cur = BUGS.findIndex((_, i) => i > cur && !done.has(i)); if (cur < 0) cur = BUGS.findIndex((_, i) => !done.has(i)); draw(); } }));
    if (done.size === BUGS.length && solved) body.append(el('p', { class:'p4-all', text:'🎉 Бес қатенің бәрін таптың. Енді тапсырмаларда осындай жағдайларды өзің шешесің.' }));
  }
  function pick(i, row){
    const B = BUGS[cur];
    if (B.bug.includes(i)) { done.add(cur); draw(); return; }
    wrong[cur]++; row.classList.add('miss'); setTimeout(() => row.classList.remove('miss'), 700);
    const m = body.querySelector('.p4-msg'); m.textContent = wrong[cur] >= 2 ? 'Кеңес: ' + B.hint : 'Бұл жол дұрыс. Терминалдағы нәтижеге қайта қара.'; m.className = 'p4-msg' + (wrong[cur] >= 2 ? ' hint' : ' no');
  }
  BUGS.forEach((b, i) => tabs.append(el('button', { type:'button', role:'tab', text:(i + 1) + '. ' + b.name, onclick:() => { cur = i; draw(); } })));
  host.append(el('div', { class:'p4-bhead' }, [tabs, score]), body); draw();
}

/* ---------- Hero: қысқа анимация (Алға/Артқа, автоойнатусыз) ---------- */
const A = (i, c, h) => '<div class="p4a ' + c + '" style="--i:' + i + '">' + h + '</div>';
const SCENES = [
  { t:'Тәртіп маңызды', h:() => A(0, 'p4s-code', '<code>print(2 + 3 * 4)</code>') + '<div class="p4s-row">' + A(1, 'p4s-bub bad', '<s>20</s><small>солдан оңға қоссақ</small>') + A(2.4, 'p4s-bub ok', '<b>14</b><small>көбейту бұрын орындалады</small>') + '</div>' },
  { t:'Жеті амал', h:() => '<div class="p4s-ops">' + OPS.map(([o, n], i) => A(i * 0.45, 'p4s-op', '<b>' + esc(o) + '</b><small>' + n + '</small>')).join('') + '</div>' },
  { t:'Бөлудің үш түрі', h:() => '<div class="p4s-sl">' + [0, 1, 2, 3, 4, 5, 6].map(i => '<span class="p4a sl' + (i === 6 ? ' left' : '') + '" style="--i:' + i * 0.2 + '">🍕</span>').join('') + '</div><div class="p4s-eq">' + A(1.6, '', '<code>print(7 / 2)</code> → <b>3.5</b>') + A(2.4, '', '<code>print(7 // 2)</code> → <b>3</b><small>толық үлес</small>') + A(3.2, '', '<code>print(7 % 2)</code> → <b>1</b><small>артық қалғаны</small>') + '</div>' },
  { t:'input() әрқашан мәтін', h:() => A(0, 'p4s-code', '<code>age = input()</code>') + '<div class="p4s-row">' + A(1, 'p4s-typed', '15') + A(1.7, 'p4s-arrow', '→') + A(2.2, 'p4s-pill str', '"15"<small>str</small>') + '</div>' + A(3.2, 'p4s-res bad', '<code>print(age + 1)</code> → TypeError') },
  { t:'int() санға айналдырады', h:() => A(0, 'p4s-code', '<code>age = int(input())</code>') + '<div class="p4s-row">' + A(1, 'p4s-typed', '15') + A(1.7, 'p4s-arrow', '→') + A(2.2, 'p4s-pill int', '15<small>int</small>') + '</div>' + A(3.2, 'p4s-res ok', '<code>print(age + 1)</code> → <b>16</b>') }
];
function hero(host){
  let k = 0;
  const stage = el('div', { class:'p4s-stage' }), ttl = el('b', { class:'p4s-ttl' }), cnt = el('span', { class:'p4s-cnt' }), dots = el('div', { class:'p4s-dots', 'aria-hidden':'true' });
  const bP = el('button', { type:'button', class:'p4s-btn', text:'←', 'aria-label':'Артқа' }), bN = el('button', { type:'button', class:'p4s-btn', text:'Алға →' });
  SCENES.forEach(() => dots.append(el('i')));
  function paint(){
    const S = SCENES[k]; stage.innerHTML = '<div class="p4s' + (still ? ' still' : '') + '">' + S.h() + '</div>';
    ttl.textContent = S.t; cnt.textContent = (k + 1) + ' / ' + SCENES.length;
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === k));
    bP.disabled = k === 0; bN.textContent = k === SCENES.length - 1 ? '↺ Басынан' : 'Алға →';
  }
  bP.addEventListener('click', () => { if (k > 0) { k--; paint(); } });
  bN.addEventListener('click', () => { k = k === SCENES.length - 1 ? 0 : k + 1; paint(); });
  host.append(el('div', { class:'p4s-top' }, [ttl, cnt]), stage, el('div', { class:'p4s-bar' }, [bP, dots, bN]));
  paint();
}

/* Тапсырманың үлгісі: сабаққа кірмей де көрінеді (оқытушы мен студент алдын ала қарай алады). Нақты есептер әр студентке әртүрлі беріледі. */
const SAMPLE = ['print(10 + 25)', 'print(12 + 7 + 30)', 'print(50 - 18)', 'print(15 - 40)', 'print(6 * 7)', 'print(14 * 5)', 'print(9 / 2)', 'print(18 / 3)', 'print(17 // 5)', 'print(46 // 7)', 'print(23 % 4)', 'print(30 % 6)', 'print(3 % 8)', 'print(5 ** 2)', 'print(2 ** 4)'];
function preview(host){
  const list = el('div', { class:'py-item py-anslist' }), ins = [];
  const send = el('button', { type:'button', class:'btn primary', text:'✓ Жауаптарды жіберу' }), msg = el('div', { class:'xl-msg', role:'status' });
  SAMPLE.forEach((c, i) => {
    const inp = el('input', { type:'text', class:'cf-input py-ans-in', autocomplete:'off', autocapitalize:'off', spellcheck:'false', maxlength:'20', placeholder:'жауабың', 'aria-label':(i + 1) + '-есептің жауабы (үлгі)' });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); if (ins[i + 1]) ins[i + 1].focus(); } });
    ins.push(inp);
    list.append(el('div', { class:'py-ans-row' }, [el('b', { class:'py-ans-n', text:String(i + 1) }), el('code', { class:'py-ans-code', text:c }), el('span', { class:'py-ans-arrow', 'aria-hidden':'true', text:'→' }), inp, el('span', { class:'py-ans-mark', 'aria-hidden':'true' })]));
  });
  list.append(el('div', { class:'stepbar' }, send), msg);
  send.addEventListener('click', () => { msg.className = 'xl-msg bad'; msg.textContent = 'Бұл тапсырманың үлгісі, жауап жіберілмейді. Жіберу үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.'; });
  host.append(
    el('p', { class:'notice', text:'👀 Алдын ала қарау: сабақ басталғанда студентке дәл осындай бет шығады. Үлгіде жауап жіберілмейді.' }),
    el('div', { class:'py-bar', role:'status' }, [el('div', { class:'py-bar-t', text:'Оқытушы тапсырманы бастағанда ол ашылады' }), el('div', { class:'py-bar-s', text:'Жиыны: 0 / 100' }), el('div', { class:'py-bar-p' }, [el('span', { class:'py-pill', text:'1: 0/15' }), el('span', { class:'py-pill', text:'2: 0/30' }), el('span', { class:'py-pill', text:'3: 0/20' }), el('span', { class:'py-pill', text:'4: 0/10' }), el('span', { class:'py-pill', text:'5: 0/25' })])]),
    el('div', { class:'tsk' }, [el('h3', {}, [el('span', { class:'num', text:'1' }), 'Экранға не шығады?', el('span', { class:'pt', text:'15 балл' })]),
      el('p', { class:'muted', text:'15 қысқа есеп. Әр кодты оқып, экранға шығатын нәтижені жаз. Тек нәтиже жазылады: print жазбайсың. Бөлшек санды нүктемен жаз. Уақыт аз (7 минут): есептер ойша шығады, қағаз бен калькулятор керек емес.' }),
      list]));
  preview2(host);
}

/* 2-тапсырма үлгісі: сервердің ашық үлгі жинағынан (студенттерге берілетін нұсқалардан бөлек) */
async function preview2(host){
  let j; try { const r = await fetch('/api/py/sample'); j = await r.json(); } catch (e) { return; }
  if (!j || !j.ok || !j.tasks || !window.CodeEditor) return;
  const hwNote = el('div', { class:'tsk locked' }, [el('h3', {}, [el('span', { class:'num', text:'5' }), 'Үй жұмысы: «Студент визитқасы»', el('span', { class:'pt', text:'25 балл' })]), el('p', { class:'muted', text:'Пайдаланушыдан Аты, Жасы, Қаласы, Мамандығы, Сүйікті пәні сұрап, әдемі етіп шығаратын бағдарлама жаз. Дәптерге жазып фотосын (не скриншотын) жібересің. Сабаққа кірген соң әрқашан ашық.' })]);
  const NLC = String.fromCharCode(10), DEMO = 'Бұл үлгі: орындау үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.';
  const bar = (t, n) => {
    const b = el('button', { type:'button', class:'btn primary', text:'✓ ' + n + '-тапсырманы жіберу' }), m = el('div', { class:'xl-msg', role:'status' });
    b.addEventListener('click', () => { m.className = 'xl-msg bad'; m.textContent = 'Бұл үлгі, жауап жіберілмейді. Жіберу үшін оқытушы көрсеткен кодпен сабаққа кіріңіз.'; });
    return el('div', { class:'py-taskbar' }, [el('div', { class:'stepbar' }, b), el('p', { class:'py-note', text:t }), m]);
  };
  const head = (t, n) => el('div', { class:'tsk' }, [el('h3', {}, [el('span', { class:'num', text:String(n) }), t.title, el('span', { class:'pt', text:t.items.reduce((a, i) => a + i.max, 0) + ' балл' })]), el('p', { class:'muted', text:t.info })]);
  j.tasks.forEach(t => {
    if (t.n < 2) return;
    const sec = head(t, t.n);
    if (t.items[0].kind === 'quiz') {
      const card = el('div', { class:'py-item py-quiz' });
      t.items.forEach((q, qi) => {
        const box = el('div', { class:'mq' }), btns = [];
        box.append(el('p', { text:(qi + 1) + '. ' + q.q }));
        if (q.code) box.append(el('pre', { class:'py-qcode', text:q.code }));
        q.opts.forEach(op => { const b = el('button', { type:'button', text:op.t }); b.addEventListener('click', () => btns.forEach(x => x.classList.toggle('sel', x === b))); btns.push(b); box.append(b); });
        card.append(box);
      });
      card.append(bar('Барлық сұраққа жауап таңдап, жібер.', t.n)); sec.append(card); host.append(sec); return;
    }
    t.items.forEach(it => {
      const hd = el('h4', {}, [el('span', { text:it.title }), el('span', { class:'pt', text:it.max + ' балл' })]), text = el('div', { class:'py-text', html:it.text });
      const fg = it.fig && window.PyFig ? window.PyFig.make(it.fig) : null; if (fg) text.append(fg);
      if (it.formula) { const fm = document.createElement('div'); fm.className = 'pf-formula'; fm.innerHTML = '<b>Формула:</b> '; fm.append(it.formula); text.append(fm); }
      if (it.sample) text.append(el('p', { class:'py-sample', html:'<b>Мысал.</b> Енгізу: <code>' + esc(it.sample.in.join(' ; ')) + '</code> → шығыс: <code>' + esc(it.sample.out).split(NLC).join(' ; ') + '</code>' }));
      const edHost = el('div', { class:'py-ed' }), st = el('div', { class:'py-con-st' }), card = el('div', { class:'py-item' }), bRun = el('button', { type:'button', class:'btn', text:'▶ Орындау' });
      bRun.addEventListener('click', () => { st.textContent = DEMO; });
      card.append(hd, text, edHost, el('div', { class:'stepbar' }, [bRun]), el('div', { class:'py-con' }, [el('div', { class:'py-con-head' }, [el('i'), el('i'), el('i'), el('span', { text:'Консоль' })]), el('div', { class:'py-con-body' }), st]));
      sec.append(card);
      window.CodeEditor.create(edHost, { lang:'python' }).setValue('# Жауабыңды осы жерде жаз' + NLC, true);
    });
    sec.append(bar('Барлық есепті орындап болған соң жібер. «▶ Орындау» арқылы әр есепті алдын ала сынауға болады.', t.n));
    host.append(sec);
  });
  host.append(hwNote);
}

window.PyDemos4 = { mount(h){ if (h.preview) preview(h.preview); if (h.hero) hero(h.hero); ops(h.ops); order(h.order); if (h.aug) aug(h.aug); conv(h.conv); if (h.nfun) nfun(h.nfun); inputDemo(h.inp); rules(h.rules); err(h.err); } };
})();
