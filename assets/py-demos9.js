/* Python, 9-тақырып (құрамды шарттар: and, or, not): ақиқат кестесі, шартты қадамдап тексеру, координата ширегі, қатені тап, hero, компилятор.
   Қозғалыс тек студент әрекетіне жауап. PyDemos9.mount({ hero, truth, expr, plane, bug, play }) */
(function(){
'use strict';
const { el, esc } = window.L, B = window.PyBool, C = window.PyCommon, A = C.A;

/* ---------- Hero ---------- */
const SCENES = [
  { t:'Бір шарт жеткіліксіз', h:() => A(0, 'p4s-code', '<code>жас ≥ 7 және жас ≤ 17</code>') + '<div class="p4s-row">' + A(1, 'p4s-bub bad', '<s>жас ≥ 7</s><small>тек бір шарт: 30 жас та өтеді</small>') + A(2.2, 'p4s-bub ok', '<b>екеуі де</b><small>7-ден 17-ге дейін ғана</small>') + '</div>' },
  { t:'and — және', h:() => A(0, 'p4s-code', '<code>x &gt; 10 and x &lt; 20</code>') + '<div class="p4s-row">' + A(1, 'p4s-pill int', 'True<small>x &gt; 10</small>') + A(1.6, 'p4s-arrow', 'and') + A(2.2, 'p4s-pill int', 'True<small>x &lt; 20</small>') + '</div>' + A(3.2, 'p4s-res ok', '<b>True</b> · екеуі де ақиқат') },
  { t:'or — немесе', h:() => A(0, 'p4s-code', '<code>x &lt; 5 or x &gt; 10</code>') + '<div class="p4s-row">' + A(1, 'p4s-pill str', 'False<small>x &lt; 5</small>') + A(1.6, 'p4s-arrow', 'or') + A(2.2, 'p4s-pill int', 'True<small>x &gt; 10</small>') + '</div>' + A(3.2, 'p4s-res ok', '<b>True</b> · біреуі жеткілікті') },
  { t:'not — емес', h:() => A(0, 'p4s-code', '<code>not (3 &gt; 5)</code>') + '<div class="p4s-row">' + A(1, 'p4s-pill str', 'False<small>3 &gt; 5</small>') + A(1.6, 'p4s-arrow', '→ not →') + A(2.4, 'p4s-pill int', 'True') + '</div>' },
  { t:'if ішінде', h:() => A(0, 'p4s-code', '<code>if age &gt;= 7 and age &lt;= 17:</code>') + A(1.2, 'p4s-res ok', '<code>print("Оқушы билеті")</code>') }
];

/* ---------- 1. Ақиқат кестесі: кілттер мен шам ---------- */
const ROWS = [[true, true], [true, false], [false, false], [false, true]];
function truth(host){
  let op = 'and', a = true, b = true;
  const tabs = el('div', { class:'pl-tabs2', role:'tablist' }), lamp = el('div', { class:'p9-lamp' }), sw = el('div', { class:'p9-sws' }), rule = el('p', { class:'p4-tip' }), body = el('tbody');
  const th = t => el('th', { text:t });
  const table = el('table', { class:'p4-table p9-tt' }, [el('thead', {}, el('tr', {}, [th('A'), th('B'), th('not A'), th('A and B'), th('A or B')])), body]);
  const T = v => el('span', { class:'p9-tf ' + (v ? 'T' : 'F'), text:v ? 'True' : 'False' });
  const RULE = { and: 'and (және): екі шарт та True болғанда ғана нәтиже True. Екі кілт қатар жалғанған: екеуі де қосулы болса, шам жанады.', or: 'or (немесе): шарттардың кемінде біреуі True болса, нәтиже True. Екі кілт қатар емес: біреуі қосулы болса да, шам жанады.', not: 'not (емес): мәнді керісінше өзгертеді. A = True болса, not A = False, және керісінше. Мұнда тек A қолданылады.' };
  const calc = () => (op === 'and' ? a && b : op === 'or' ? a || b : !a);
  function paint(){
    tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.op === op));
    const r = calc(); lamp.className = 'p9-lamp ' + (r ? 'on' : 'off'); lamp.innerHTML = '<span class="bulb">' + (r ? '💡' : '⚫') + '</span><b>' + (op === 'not' ? 'not A' : 'A ' + op + ' B') + ' = ' + (r ? 'True' : 'False') + '</b>';
    sw.innerHTML = '';
    [['A', a, () => { a = !a; paint(); }], ...(op === 'not' ? [] : [['B', b, () => { b = !b; paint(); }]])].forEach(([n, v, f]) => sw.append(el('button', { type:'button', class:'p9-sw ' + (v ? 'on' : 'off'), 'aria-pressed':String(v), onclick:f }, [el('b', { text:n }), el('span', { text:v ? 'True' : 'False' })])));
    rule.textContent = RULE[op]; body.innerHTML = '';
    ROWS.forEach(([x, y]) => { const hit = x === a && y === b; body.append(el('tr', { class:hit ? 'on' : '' }, [el('td', {}, T(x)), el('td', {}, T(y)), el('td', {}, T(!x)), el('td', {}, T(x && y)), el('td', {}, T(x || y))])); });
  }
  [['and', 'and · және'], ['or', 'or · немесе'], ['not', 'not · емес']].forEach(([k, t]) => tabs.append(el('button', { type:'button', role:'tab', 'data-op':k, text:t, onclick:() => { op = k; paint(); } })));
  host.append(tabs, el('div', { class:'p9-stage' }, [sw, lamp]), rule, el('div', { class:'p4-twrap' }, table));
  paint();
}

/* ---------- 2. Шартты қадамдап тексеру ---------- */
const LAD = [['1', 'Жақша ( )', 'Жақша ішіндегі бірінші орындалады.'], ['2', 'Арифметика', '+, -, *, %, // — салыстырудан бұрын.'], ['3', 'Салыстыру', '<, >, <=, >=, ==, != — not, and, or-дан бұрын.'], ['4', 'not', 'Салыстырудан кейін.'], ['5', 'and', 'or-дан бұрын.'], ['6', 'or', 'Ең соңында.']];
const PRE = ['x > 10 and x < 20', 'x < 5 or x > 10', 'not (x > 5)', 'x > 0 and x % 2 == 0', 'True or False and False', 'x == 1 or 2'];
function expr(host){
  let fr = [], k = 0, x = 15;
  const rows = [], ladder = el('ol', { class:'p4-ladder' });
  LAD.forEach(([n, t, d]) => { const li = el('li', {}, [el('b', { text:n }), el('div', {}, [el('strong', { text:t }), el('small', { text:d })])]); rows.push(li); ladder.append(li); });
  const note = el('p', { class:'p4-note', html:'Реті: <b>салыстыру → not → and → or</b>. Күмән болса, жақша қой: <code>a or (b and c)</code>.' });
  const inp = el('input', { type:'text', value:PRE[0], 'aria-label':'Шарт', autocomplete:'off', spellcheck:'false', maxlength:'70' });
  const rng = el('input', { type:'range', min:'-5', max:'30', value:String(x), 'aria-label':'x мәні' }), xv = el('output', { class:'p9-xv', text:'x = ' + x });
  const expr_ = el('div', { class:'p4-expr', 'aria-live':'polite' }), cap = el('p', { class:'p4-cap', 'aria-live':'polite' }), prog = el('div', { class:'p4-prog' }, el('span')), msg = el('p', { class:'p4-msg', role:'status' });
  const bPrev = el('button', { type:'button', class:'btn', text:'← Артқа' }), bNext = el('button', { type:'button', class:'btn primary', text:'Алға →' }), bReset = el('button', { type:'button', class:'btn ghost', text:'↺ Басынан' });
  const codeLine = el('div', { class:'p4-codeline' });
  function paint(){
    const f = fr[k]; expr_.innerHTML = f.html;
    rows.forEach((r, i) => r.classList.toggle('on', f.level === i + 1));
    cap.textContent = f.final ? f.cap : (f.cap || 'Шарт дайын. «Алға» батырмасын бас: Python қай жерден бастап тексеретінін көресің.');
    prog.firstChild.style.width = Math.round(k / (fr.length - 1) * 100) + '%';
    bPrev.disabled = k === 0; bNext.disabled = k >= fr.length - 1; bReset.disabled = k === 0;
  }
  function load(){
    msg.className = 'p4-msg'; msg.textContent = ''; const src = inp.value;
    try { fr = B.steps(src, { x }, esc); k = 0; codeLine.textContent = 'x = ' + x + '\nif ' + src.trim() + ':'; paint(); }
    catch (e) { fr = []; codeLine.textContent = ''; expr_.innerHTML = ''; cap.textContent = ''; rows.forEach(r => r.classList.remove('on')); prog.firstChild.style.width = '0'; bPrev.disabled = bNext.disabled = bReset.disabled = true; msg.className = 'p4-msg no'; msg.textContent = e.kk || 'Өрнекті түсінбедім.'; }
  }
  const chips = el('div', { class:'p4-chips' }); PRE.forEach(p => chips.append(el('button', { type:'button', class:'pl-chipbtn', text:p, onclick:() => { inp.value = p; load(); } })));
  rng.addEventListener('input', () => { x = +rng.value; xv.textContent = 'x = ' + x; load(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') load(); });
  bPrev.addEventListener('click', () => { if (k > 0) { k--; paint(); } }); bNext.addEventListener('click', () => { if (k < fr.length - 1) { k++; paint(); } }); bReset.addEventListener('click', () => { k = 0; paint(); });
  host.append(el('div', { class:'p4-ordgrid' }, [
    el('div', {}, [el('h4', { class:'p4-h', text:'Орындалу тәртібі' }), ladder, note]),
    el('div', {}, [el('h4', { class:'p4-h', text:'Қадамдап көру' }), chips, el('div', { class:'p9-xrow' }, [rng, xv]), el('div', { class:'p4-own' }, [inp, el('button', { type:'button', class:'btn', text:'Көр', onclick:load })]), msg, codeLine, el('div', { class:'p4-stage' }, [expr_]), prog, cap, el('div', { class:'stepbar' }, [bPrev, bNext, bReset])])]));
  load();
}

/* ---------- 3. Координата ширегі ---------- */
function plane(host){
  let px = 3, py = 2;
  const S = 11, N = 5, cell = 28, size = S * cell, svgNS = 'http://www.w3.org/2000/svg';
  const sv = (t, a, kids) => { const e = document.createElementNS(svgNS, t); for (const n in a) e.setAttribute(n, a[n]); (kids || []).forEach(c => e.append(c)); return e; };
  const svg = sv('svg', { viewBox:'0 0 ' + size + ' ' + size, class:'p9-plane', role:'img', 'aria-label':'Координаталық жазықтық. Нүктені таңда.' });
  const X = v => (v + N) * cell + cell / 2, Y = v => (N - v) * cell + cell / 2;
  const quad = [['q1', 1, 1], ['q2', -1, 1], ['q3', -1, -1], ['q4', 1, -1]];
  quad.forEach(([id, sx, sy]) => svg.append(sv('rect', { x:sx > 0 ? X(0) + cell / 2 : 0, y:sy > 0 ? 0 : Y(0) + cell / 2, width:size / 2 - cell / 2 + (0), height:size / 2 - cell / 2, class:'p9-q ' + id, 'data-q':id })));
  for (let i = -N; i <= N; i++) { svg.append(sv('line', { x1:X(i), y1:0, x2:X(i), y2:size, class:'p9-g' }), sv('line', { x1:0, y1:Y(i), x2:size, y2:Y(i), class:'p9-g' })); }
  svg.append(sv('line', { x1:0, y1:Y(0), x2:size, y2:Y(0), class:'p9-ax' }), sv('line', { x1:X(0), y1:0, x2:X(0), y2:size, class:'p9-ax' }));
  const dot = sv('circle', { r:9, class:'p9-dot' }), lab = sv('text', { class:'p9-lab' }); svg.append(dot, lab);
  const tbl = el('div', { class:'p9-conds' }), code = C.codeView(['x = ' + px, 'y = ' + py, 'if x > 0 and y > 0:', '    print("1-ширек")', 'elif x < 0 and y > 0:', '    print("2-ширек")', 'elif x < 0 and y < 0:', '    print("3-ширек")', 'elif x > 0 and y < 0:', '    print("4-ширек")', 'else:', '    print("нүкте осьте жатыр")'], 'p9-quadcode'), out = el('div', { class:'p4-term' });
  const sel = el('div', { class:'p9-sel', 'aria-label':'x және y таңдау' });
  const mk = (n, get, set) => { const out_ = el('output', { text:n + ' = ' + get() }), mn = el('button', { type:'button', class:'p4-step', text:'−', 'aria-label':n + ' азайту' }), pl = el('button', { type:'button', class:'p4-step', text:'+', 'aria-label':n + ' көбейту' }); mn.onclick = () => { set(Math.max(-N, get() - 1)); paint(); }; pl.onclick = () => { set(Math.min(N, get() + 1)); paint(); }; return { out_, box:el('div', { class:'p9-stp' }, [mn, out_, pl]) }; };
  const mx = mk('x', () => px, v => { px = v; }), my = mk('y', () => py, v => { py = v; });
  sel.append(mx.box, my.box);
  svg.addEventListener('click', e => { const r = svg.getBoundingClientRect(), k = size / r.width; px = Math.max(-N, Math.min(N, Math.round(((e.clientX - r.left) * k - cell / 2) / cell) - N)); py = Math.max(-N, Math.min(N, N - Math.round(((e.clientY - r.top) * k - cell / 2) / cell))); paint(); });
  function paint(){
    dot.setAttribute('cx', X(px)); dot.setAttribute('cy', Y(py)); lab.setAttribute('x', X(px) + 12); lab.setAttribute('y', Y(py) - 10); lab.textContent = '(' + px + '; ' + py + ')';
    mx.out_.textContent = 'x = ' + px; my.out_.textContent = 'y = ' + py;
    const t = [['x > 0 and y > 0', px > 0 && py > 0], ['x < 0 and y > 0', px < 0 && py > 0], ['x < 0 and y < 0', px < 0 && py < 0], ['x > 0 and y < 0', px > 0 && py < 0]];
    const hit = t.findIndex(r => r[1]); svg.querySelectorAll('.p9-q').forEach((q, i) => q.classList.toggle('on', i === hit));
    tbl.innerHTML = ''; t.forEach(([c, v], i) => tbl.append(el('div', { class:'p9-cd ' + (v ? 'T' : 'F') }, [el('code', { text:c }), el('b', { text:v ? 'True' : 'False' })])));
    const lines = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; const act = new Set([0, 1, 2]); let printed = '';
    if (hit >= 0) { for (let i = 0; i <= hit; i++) act.add(2 + i * 2); act.add(3 + hit * 2); printed = (hit + 1) + '-ширек'; } else { [4, 6, 8, 10, 11].forEach(i => act.add(i)); printed = 'нүкте осьте жатыр'; }
    code.querySelectorAll('.p9-ln').forEach((ln, i) => { ln.classList.toggle('run', act.has(i)); ln.classList.toggle('skip', !act.has(i)); const c = ln.querySelector('code'); if (i === 0) c.textContent = 'x = ' + px; if (i === 1) c.textContent = 'y = ' + py; });
    out.innerHTML = ''; out.append(el('small', { text:'ЭКРАНҒА ШЫҒАДЫ' }), el('pre', { class:'good', text:printed }));
  }
  host.append(el('div', { class:'p9-planegrid' }, [el('div', {}, [svg, el('p', { class:'p4-note', text:'Нүктені жазықтықта бас не төмендегі +/− батырмаларын қолдан.' })]), el('div', {}, [sel, tbl, code, out])]));
  paint();
}

/* ---------- 4. Қатені тап ---------- */
const BUGS = [
  { name:'Қос нүкте', goal:'x > 0 және y > 0 болса «оң ширек» шығару керек.', want:'оң ширек', code:['x = 3', 'y = 4', 'if x > 0 and y > 0', '    print("оң ширек")'], bug:[2], fix:['x = 3', 'y = 4', 'if x > 0 and y > 0:', '    print("оң ширек")'], bad:'SyntaxError: expected \':\'', good:'оң ширек', hint:'Қате if жолында. Әр if жолының соңында не тұруы керек?', why:'if, elif және else жолдары қос нүктемен аяқталады, құрамды шартта да солай: if x > 0 and y > 0:' },
  { name:'Орындалмайтын шарт', goal:'Сан 10-нан кіші немесе 100-ден үлкен болса «шеткі» шығару керек (x = 5).', want:'шеткі', code:['x = 5', 'if x < 10 and x > 100:', '    print("шеткі")', 'else:', '    print("ортада")'], bug:[1], fix:['x = 5', 'if x < 10 or x > 100:', '    print("шеткі")', 'else:', '    print("ортада")'], bad:'ортада', good:'шеткі', hint:'Сан бір мезгілде 10-нан кіші де, 100-ден үлкен де бола ала ма?', why:'«Немесе» мағынасында or қолданылады. and шарты ешқашан орындалмайды, өйткені екі аралық қиылыспайды.' },
  { name:'Әрқашан ақиқат', goal:'Жасы 18-ден 65-ке дейін болса «жұмыс жасы» шығару керек (age = 80 болса, «басқа» шығу керек).', want:'басқа', code:['age = 80', 'if age >= 18 or age <= 65:', '    print("жұмыс жасы")', 'else:', '    print("басқа")'], bug:[1], fix:['age = 80', 'if age >= 18 and age <= 65:', '    print("жұмыс жасы")', 'else:', '    print("басқа")'], bad:'жұмыс жасы', good:'басқа', hint:'80 саны үшін екі шарттың қайсысы ақиқат? Аралық үшін екеуі де бір мезгілде керек.', why:'Аралықты тексергенде and қолданылады. or-да кез келген сан біреуін қанағаттандырады, сондықтан шарт әрқашан True болады.' }
];

function mount(h){
  if (h.hero) C.hero(h.hero, SCENES);
  truth(h.truth); plane(h.plane); C.bugFinder(h.bug, BUGS, '🎉 Үш қатенің бәрін таптың. Енді тапсырмаларда осыларды өзің түзетесің.');
  if (h.play) C.compiler(h.play, 'x = int(input("x = "))\nif x > 10 and x < 20:\n    print("иә")\nelse:\n    print("жоқ")\n');
}
window.PyDemos9 = { mount, SCENES };
})();
