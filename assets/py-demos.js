/* Python сабағының түсіндіру бөлімі: қадамдық 3D блок-схема, жазылу құрылымы, салыстыру амалдарының аударылатын карточкалары,
   интерактивті мысалдар және жиі қателер. Барлық қозғалысты студент өзі басқарады (Алға/Артқа), өздігінен ойнамайды.
   PyDemos.mount({ flow, syntax, ops, ex, err }) */
(function(){
'use strict';
const { el, esc } = window.L;
const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. Қадамдық блок-схема ---------- */
const LINES = ['age = int(input())', 'if age >= 18:', '    print("Кіруге рұқсат")', 'print("Бағдарлама аяқталды")'];
function flow(host){
  let A = 20, s = 0;
  const tok = el('div', { class:'pl-token', 'aria-hidden':'true' });
  const N = (id, cls, x, y, html) => el('div', { class:'pl-node ' + cls, id:'pn' + id, style:'left:' + x + 'px;top:' + y + 'px', html });
  const nodes = [N(0, 'oval', 100, 8, '<b>Басы</b>'), N(1, 'rect', 75, 74, '<span>age = int(input())</span>'), N(2, 'dia', 105, 140, '<span>age &gt;= 18?</span>'), N(3, 'rect', 75, 252, '<span>print("Кіруге рұқсат")</span>'), N(4, 'oval', 100, 336, '<b>Соңы</b>')];
  const svg = '<svg class="pl-wires" viewBox="0 0 340 390" aria-hidden="true"><defs><marker id="plar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#64748b"/></marker></defs>'
    + '<g stroke="#64748b" stroke-width="2.4" fill="none" marker-end="url(#plar)"><path d="M170 46V70"/><path d="M170 112V136"/><path d="M170 238V250"/><path d="M170 290V332"/><path d="M236 190H300V350H236" /></g>'
    + '<text x="180" y="247" class="pl-w y">Иә</text><text x="262" y="184" class="pl-w n">Жоқ</text></svg>';
  const scene = el('div', { class:'pl-scene' }, [el('div', { html:svg }), ...nodes, tok]);
  const stage = el('div', { class:'pl-stage' }, scene);
  const code = el('pre', { class:'pl-code', 'aria-label':'Бағдарлама коды' }, LINES.map((l, i) => el('span', { class:'pl-ln', 'data-i':String(i), html:'<i>' + (i + 1) + '</i>' + esc(l) + '\n' })));
  const term = el('pre', { class:'pl-term', 'aria-live':'polite' });
  const expl = el('div', { class:'pl-expl' });
  const range = el('input', { type:'range', min:'5', max:'40', value:String(A), 'aria-label':'Жас' }), val = el('b', { class:'pl-val' });
  const quick = [17, 18, 25].map(v => el('button', { type:'button', class:'pl-chipbtn', text:String(v), onclick:() => { A = v; range.value = v; s = 0; draw(); } }));
  const bBack = el('button', { type:'button', class:'btn', text:'← Артқа' }), bNext = el('button', { type:'button', class:'btn primary', text:'Алға →' }), bReset = el('button', { type:'button', class:'btn ghost', text:'↺ Қайта' });
  const POS = [[116, 27], [62, 93], [126, 190], null, [116, 355]];
  function draw(){
    const ok = A >= 18; val.textContent = 'age = ' + A;
    const p = s === 3 ? (ok ? [62, 271] : [300, 271]) : POS[s];
    tok.style.transform = 'translate3d(' + (p[0] - 14) + 'px,' + (p[1] - 14) + 'px,46px)';
    nodes.forEach((n, i) => { n.classList.toggle('on', (s === i) || (s === 3 && i === 3 && ok)); n.classList.toggle('done', s > i && !(i === 3 && !ok)); n.classList.toggle('skip', i === 3 && s >= 3 && !ok); });
    nodes[2].classList.toggle('yes', s >= 2 && ok); nodes[2].classList.toggle('no', s >= 2 && !ok);
    code.querySelectorAll('.pl-ln').forEach((l, i) => l.classList.toggle('hl', (s === 1 && i === 0) || (s === 2 && i === 1) || (s === 3 && ok && i === 2) || (s === 4 && i === 3)));
    const out = []; if (s >= 3 && ok) out.push('Кіруге рұқсат'); if (s >= 4) out.push('Бағдарлама аяқталды');
    term.textContent = '> ' + (out.length ? out.join('\n> ') : '…');
    const T = [
      ['Бағдарлама басталады.', 'Python код жолдарын жоғарыдан төмен қарай ретімен орындайды.', 'Алдымен бірінші жол орындалады.'],
      ['age айнымалысына ' + A + ' саны жазылады.', 'Шартты тексеру үшін алдымен жасты білу керек.', 'input() мәтін қабылдайды, int() оны санға айналдырады.'],
      ['Шарт тексеріледі: ' + A + ' >= 18.', 'if операторы бағдарламаның жалғасын шартқа байланысты таңдайды.', A + ' санын 18-мен салыстырады. Нәтиже: ' + (ok ? 'True (ақиқат).' : 'False (жалған).')],
      ok ? ['Шарт ақиқат, сондықтан print орындалады.', 'if ішіндегі шегініс жолдары тек шарт True болғанда жұмыс істейді.', 'Экранға «Кіруге рұқсат» шығады.'] : ['Шарт жалған, сондықтан print өткізіледі.', 'Шарт False болса, if ішіндегі жолдар орындалмайды.', 'Бағдарлама шегіністі өткізіп, келесі жолға өтеді.'],
      ['Соңғы жол орындалады.', 'Шегініссіз жазылған жол if-ке жатпайды, сондықтан ол әрқашан орындалады.', 'Экранға «Бағдарлама аяқталды» шығады.']
    ][s];
    expl.innerHTML = '';
    [['ҚАЗІР', T[0]], ['НЕГЕ ОРЫНДАЛАДЫ', T[1]], ['ҚАЛАЙ ОРЫНДАЛАДЫ', T[2]]].forEach(([k, v]) => expl.append(el('div', { class:'pl-ex' }, [el('span', { class:'pl-tag', text:k }), el('p', { text:v })])));
    if (A === 18) expl.append(el('p', { class:'pl-tip', text:'Шекаралық мән: 18 шартқа кіреді, өйткені >= «үлкен не тең» дегенді білдіреді.' }));
    bBack.disabled = s === 0; bNext.disabled = s === 4;
    host.querySelector('.pl-count').textContent = (s + 1) + ' / 5';
  }
  range.addEventListener('input', () => { A = +range.value; s = 0; draw(); });
  bNext.addEventListener('click', () => { if (s < 4){ s++; draw(); } }); bBack.addEventListener('click', () => { if (s > 0){ s--; draw(); } }); bReset.addEventListener('click', () => { s = 0; draw(); });
  /* тінтуір қозғалғанда сахна еңкейеді (үш өлшемді әсер) */
  if (!still) stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); scene.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 16 + 'deg'); scene.style.setProperty('--rx', (14 - ((e.clientY - r.top) / r.height - .5) * 10) + 'deg'); });
  stage.addEventListener('pointerleave', () => { scene.style.removeProperty('--ry'); scene.style.removeProperty('--rx'); });
  host.append(el('div', { class:'pl-flowgrid' }, [stage, el('div', { class:'pl-side' }, [
    el('div', { class:'pl-input' }, [el('label', { text:'Жасты таңда:' }), range, val, el('div', { class:'pl-quick' }, [el('span', { text:'Тез таңдау:' }), ...quick])]),
    code, term, expl,
    el('div', { class:'stepbar' }, [bBack, bNext, bReset, el('span', { class:'pl-count' })])
  ])]));
  draw();
}

/* ---------- 2. Жазылу құрылымы ---------- */
function syntax(host){
  const P = [
    ['if', 'Кілт сөз: «егер» дегенді білдіреді. Шартты тексеруді бастайды.'],
    ['age >= 18', 'Шарт: True немесе False нәтиже беретін өрнек.'],
    [':', 'Қос нүкте: шарт аяқталғанын көрсетеді. Оны ұмытпа.'],
    ['    print("Рұқсат")', 'Шегініс (4 бос орын): осы жол if-ке жататынын көрсетеді. Шарт True болғанда ғана орындалады.']
  ];
  const info = el('div', { class:'pl-sy-info', role:'status' }), parts = [];
  const line = el('div', { class:'pl-sy-code' });
  const mk = (i, txt) => { const b = el('button', { type:'button', class:'pl-sy-p', 'data-k':String(i), text:txt }); b.addEventListener('click', () => pick(i)); b.addEventListener('mouseenter', () => pick(i)); parts[i] = b; return b; };
  const pick = i => { parts.forEach((b, j) => b.classList.toggle('on', i === j)); info.innerHTML = '<b>' + esc(P[i][0].trim()) + '</b> — ' + esc(P[i][1]); };
  line.append(mk(0, 'if'), ' ', mk(1, 'age >= 18'), mk(2, ':'), el('br'), mk(3, '    print("Рұқсат")'));
  host.append(el('div', { class:'pl-sy' }, [line, info])); pick(0);
}

/* ---------- 3. Салыстыру амалдары ---------- */
function ops(host){
  const O = [['==', 'тең', '5 == 5', 'True'], ['!=', 'тең емес', '5 != 5', 'False'], ['>', 'үлкен', '7 > 3', 'True'], ['<', 'кіші', '2 < 1', 'False'], ['>=', 'үлкен не тең', '18 >= 18', 'True'], ['<=', 'кіші не тең', '9 <= 4', 'False']];
  const g = el('div', { class:'pl-flips' });
  O.forEach(([s, n, ex, r]) => {
    const b = el('button', { type:'button', class:'pl-flip', 'aria-label':s + ' — ' + n + '. Мысалды көру үшін бас.' }, el('span', { class:'pl-fi' }, [
      el('span', { class:'pl-ff' }, [el('b', { class:'pl-op', text:s }), el('small', { text:n })]),
      el('span', { class:'pl-fb ' + (r === 'True' ? 'ok' : 'bad') }, [el('code', { text:ex }), el('b', { text:r })])]));
    b.addEventListener('click', () => b.classList.toggle('on')); g.append(b);
  });
  host.append(g, el('div', { class:'pl-warn' }, [el('b', { text:'!' }), el('span', { html:'<b>Есіңде болсын.</b> Бір <code>=</code> таңбасы айнымалыға мән береді (<code>x = 5</code>). Салыстыру үшін екі <code>==</code> жазылады (<code>x == 5</code>).' })]));
}

/* ---------- 4. Интерактивті мысалдар ---------- */
const EX = [
  { name:'Жас тексеру', code:['age = int(input())', 'if age >= 18:', '    print("Кіруге рұқсат")'], inputs:[['age', 'Жас', 20, 0, 120]],
    run:v => { const ok = v[0] >= 18; return { lines:ok ? [0, 1, 2] : [0, 1], out:ok ? ['Кіруге рұқсат'] : [], gates:[ok], note:ok ? v[0] + ' >= 18 шарты True, сондықтан print орындалды.' : v[0] + ' >= 18 шарты False, сондықтан print орындалмады.' }; } },
  { name:'Жұп сан', code:['n = int(input())', 'if n % 2 == 0:', '    print("Жұп сан")'], inputs:[['n', 'Сан', 8, -50, 99]],
    run:v => { const ok = v[0] % 2 === 0; return { lines:ok ? [0, 1, 2] : [0, 1], out:ok ? ['Жұп сан'] : [], gates:[ok], note:'n % 2 — санды 2-ге бөлгендегі қалдық. ' + v[0] + ' % 2 = ' + (((v[0] % 2) + 2) % 2) + (ok ? ', қалдық 0, сан жұп.' : ', қалдық 0 емес, сан жұп емес.') }; } },
  { name:'Кірістірілген if', code:['balance = int(input())', 'amount = int(input())', 'if amount > 0:', '    if amount <= balance:', '        print("Қалдық:", balance - amount)'], inputs:[['balance', 'Қалдық', 5000, 0, 20000], ['amount', 'Сома', 2000, -500, 25000]],
    run:v => { const a = v[1] > 0, b = a && v[1] <= v[0]; return { lines:b ? [0, 1, 2, 3, 4] : a ? [0, 1, 2, 3] : [0, 1, 2], out:b ? ['Қалдық: ' + (v[0] - v[1])] : [], gates:[a, b], note:!a ? 'Бірінші шарт False: ішкі if тексерілмейді де.' : !b ? 'Бірінші шарт True, ал екінші шарт False: print орындалмады.' : 'Екі шарт та True, сондықтан print орындалды.' }; } }
];
function ex(host){
  const tabs = el('div', { class:'pl-tabs2', role:'tablist' }), body = el('div', { class:'pl-exbody' });
  let cur = 0; const vals = EX.map(e => e.inputs.map(i => i[2]));
  function draw(){
    const E = EX[cur], v = vals[cur], r = E.run(v);
    tabs.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === cur); b.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
    body.innerHTML = '';
    const code = el('pre', { class:'pl-code' }, E.code.map((l, i) => el('span', { class:'pl-ln' + (r.lines.includes(i) ? ' hl' : ' dim'), html:'<i>' + (i + 1) + '</i>' + esc(l) + '\n' })));
    const ins = el('div', { class:'pl-ins' }, E.inputs.map((inp, k) => { const n = el('input', { type:'number', value:String(v[k]), min:String(inp[3]), max:String(inp[4]), 'aria-label':inp[1], class:'cf-input' }); n.addEventListener('input', () => { const x = parseInt(n.value, 10); if (!isNaN(x)){ vals[cur][k] = x; const keep = n; draw(); const nn = body.querySelectorAll('.pl-ins input')[k]; if (nn){ nn.focus(); nn.setSelectionRange(nn.value.length, nn.value.length); } } }); return el('label', {}, [inp[1] + ' (' + inp[0] + '): ', n]); }));
    const gates = el('div', { class:'pl-gates', 'aria-hidden':'true' });
    if (r.gates.length === 2) gates.append(el('div', { class:'pl-gate ' + (r.gates[0] ? 'ok' : 'no') }, [el('small', { text:'amount > 0 — ' + (r.gates[0] ? 'True' : 'False') }), el('div', { class:'pl-gate in ' + (r.gates[1] ? 'ok' : r.gates[0] ? 'no' : 'off') }, el('small', { text:r.gates[0] ? 'amount <= balance — ' + (r.gates[1] ? 'True' : 'False') : 'тексерілмейді' }))]));
    body.append(el('div', { class:'pl-exgrid' }, [el('div', {}, [ins, code]), el('div', {}, [el('pre', { class:'pl-term' }, '> ' + (r.out.length ? r.out.join('\n> ') : '(ештеңе шықпайды)')), gates, el('p', { class:'pl-note', text:r.note })])]));
  }
  EX.forEach((e, i) => tabs.append(el('button', { type:'button', role:'tab', text:e.name, onclick:() => { cur = i; draw(); } })));
  host.append(tabs, body); draw();
}

/* ---------- 5. Жиі қателер ---------- */
function err(host){
  const E = [
    ['Қос нүкте ұмытылған', 'if age >= 18\n    print("Иә")', 'if age >= 18:\n    print("Иә")', 'Шарттың соңына қос нүкте қойылады.'],
    ['Шегініс жоқ', 'if age >= 18:\nprint("Иә")', 'if age >= 18:\n    print("Иә")', 'if-ке жататын жол 4 бос орынға ығады.'],
    ['= орнына ==', 'if age = 18:\n    print("Иә")', 'if age == 18:\n    print("Иә")', 'Салыстыру үшін екі == жазылады.'],
    ['Санға айналмаған', 'age = input()\nif age >= 18:\n    print("Иә")', 'age = int(input())\nif age >= 18:\n    print("Иә")', 'input() мәтін береді. Санмен салыстыру үшін int() керек.']
  ];
  const g = el('div', { class:'pl-flips pl-errs' });
  E.forEach(([t, bad, good, why]) => {
    const b = el('button', { type:'button', class:'pl-flip', 'aria-label':t + '. Дұрыс нұсқасын көру үшін бас.' }, el('span', { class:'pl-fi' }, [
      el('span', { class:'pl-ff bad' }, [el('b', { text:'✗ ' + t }), el('pre', { text:bad })]),
      el('span', { class:'pl-fb ok' }, [el('b', { text:'✓ Дұрысы' }), el('pre', { text:good }), el('small', { text:why })])]));
    b.addEventListener('click', () => b.classList.toggle('on')); g.append(b);
  });
  host.append(g);
}

window.PyDemos = { mount(h){ flow(h.flow); syntax(h.syntax); ops(h.ops); ex(h.ex); err(h.err); } };
})();
