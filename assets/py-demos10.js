/* Python, 10-тақырып (кірістірілген шарттар): орындалу ізі, else жұбы, and-мен салыстыру, қатені тап, компилятор. PyDemos10.mount({ hero, trace, pair, equiv, bug, play }) */
(function(){
'use strict';
const { el } = window.L, B = window.PyBool, C = window.PyCommon, A = C.A;

const SCENES = [
  { t:'Шарттың ішінде шарт', h:() => A(0, 'p4s-code', '<code>if age &gt;= 18:</code>') + A(1, 'p4s-code', '<code>&nbsp;&nbsp;&nbsp;&nbsp;if ticket:</code>') + A(2, 'p4s-res ok', '<code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;print("Кіре аласың")</code>') },
  { t:'Бірінші қақпа', h:() => '<div class="p4s-row">' + A(0, 'p4s-pill int', 'age ≥ 18<small>True</small>') + A(1, 'p4s-arrow', '→') + A(2, 'p4s-pill int', 'ticket<small>тексеріледі</small>') + '</div>' },
  { t:'Қақпа жабық', h:() => '<div class="p4s-row">' + A(0, 'p4s-pill str', 'age ≥ 18<small>False</small>') + A(1, 'p4s-arrow', '✕') + A(2, 'p4s-bub bad', 'ішкі if<small>тексерілмейді</small>') + '</div>' },
  { t:'Бос орын маңызды', h:() => A(0, 'p4s-code', '<code>if a:<br>&nbsp;&nbsp;&nbsp;&nbsp;if b:<br>&nbsp;&nbsp;&nbsp;&nbsp;else:</code>') + A(1.4, 'p4s-res ok', 'else <b>жақын if</b>-ке жатады') }
];

/* ---------- 1. Орындалу ізі ---------- */
/* түйін: { p:'мәтін' } немесе { c:'шарт', y:[...], n:[...] } */
const PROGS = [
  { name:'Бағалау жүйесі', v:'ball', min:0, max:100, val:75, tree:[{ c:'ball >= 50', y:[{ c:'ball >= 85', y:[{ p:'Үздік' }], n:[{ p:'Жақсы' }] }], n:[{ p:'Қайта тапсыр' }] }] },
  { name:'Жұп па, оң ба', v:'x', min:-9, max:9, val:4, tree:[{ c:'x > 0', y:[{ c:'x % 2 == 0', y:[{ p:'Оң жұп' }], n:[{ p:'Оң тақ' }] }], n:[{ p:'Оң емес' }] }] },
  { name:'Аттракцон', v:'age', min:3, max:30, val:12, tree:[{ c:'age >= 7', y:[{ c:'age <= 17', y:[{ p:'Билет жеңілдікпен' }], n:[{ p:'Толық билет' }] }], n:[{ p:'Кіруге болмайды' }] }] }
];
function flatten(nodes, d, out){
  nodes.forEach(n => {
    if (n.p !== undefined) { out.push({ d, t:'print("' + n.p + '")', n }); return; }
    const me = { d, t:'if ' + n.c + ':', n, kind:'if' }; out.push(me);
    flatten(n.y, d + 1, out);
    if (n.n && n.n.length) { out.push({ d, t:'else:', n, kind:'else' }); flatten(n.n, d + 1, out); }
  });
  return out;
}
function runTree(nodes, vars, hit, lines, chk){
  nodes.forEach(n => {
    if (n.p !== undefined) { const i = lines.findIndex(l => l.n === n && l.t.startsWith('print')); hit.add(i); chk.out = n.p; return; }
    const ifi = lines.findIndex(l => l.n === n && l.kind === 'if'), elsei = lines.findIndex(l => l.n === n && l.kind === 'else');
    hit.add(ifi);
    const r = B.evalTree(B.parse(n.c, vars)); chk.log.push({ c:n.c, r:!!r });
    if (r) runTree(n.y, vars, hit, lines, chk); else if (n.n && n.n.length) { hit.add(elsei); runTree(n.n, vars, hit, lines, chk); }
  });
}
function trace(host){
  let k = 0, val = PROGS[0].val;
  const tabs = el('div', { class:'pl-tabs2', role:'tablist' }), codeBox = el('div'), rng = el('input', { type:'range', 'aria-label':'Мән' }), xv = el('output', { class:'p9-xv' }), log = el('div', { class:'p9-conds' }), out = el('div', { class:'p4-term' });
  function paint(){
    const P = PROGS[k];
    tabs.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === k));
    rng.min = P.min; rng.max = P.max; rng.value = val; xv.textContent = P.v + ' = ' + val;
    const lines = flatten(P.tree, 0, []), hit = new Set(), chk = { log:[], out:'' };
    runTree(P.tree, { [P.v]: val }, hit, lines, chk);
    codeBox.innerHTML = ''; const box = el('div', { class:'p9-code' });
    box.append(el('div', { class:'p9-ln run' }, [el('i', { text:'1' }), el('code', { text:P.v + ' = ' + val })]));
    lines.forEach((l, i) => box.append(el('div', { class:'p9-ln ' + (hit.has(i) ? 'run' : 'skip') }, [el('i', { text:String(i + 2) }), el('code', { text:'    '.repeat(l.d) + l.t })])));
    codeBox.append(box);
    log.innerHTML = ''; chk.log.forEach((s, i) => log.append(el('div', { class:'p9-cd ' + (s.r ? 'T' : 'F') }, [el('code', { text:(i + 1) + '. ' + s.c }), el('b', { text:s.r ? 'True' : 'False' })])));
    out.innerHTML = ''; out.append(el('small', { text:'ЭКРАНҒА ШЫҒАДЫ' }), el('pre', { class:'good', text:chk.out }));
  }
  PROGS.forEach((P, i) => tabs.append(el('button', { type:'button', role:'tab', text:P.name, onclick:() => { k = i; val = PROGS[i].val; paint(); } })));
  rng.addEventListener('input', () => { val = +rng.value; paint(); });
  host.append(tabs, el('div', { class:'p9-xrow' }, [rng, xv]), el('div', { class:'p9-pair' }, [codeBox, el('div', {}, [el('h4', { class:'p4-h', text:'Қай шарттар тексерілді' }), log, out])]), el('p', { class:'p4-note', text:'Жасыл жолдар орындалды, күңгірт жолдар өткізіліп кетті. Ішкі if тек сыртқы шарт ақиқат болғанда тексеріледі.' }));
  paint();
}

/* ---------- 2. else қай if-ке жатады ---------- */
function pair(host){
  let sh = 1;
  const a = el('button', { type:'button', class:'btn', text:'else ішкі if-ке жатады' }), b = el('button', { type:'button', class:'btn', text:'else сыртқы if-ке жатады' });
  const code = el('div'), box = el('div', { class:'p4-term' }), cap = el('p', { class:'p4-cap', 'aria-live':'polite' });
  const cases = {
    1: { lines:['x = 20', 'if x > 10:', '    if x > 50:', '        print("үлкен")', '    else:', '        print("орташа")'], pr:'орташа', cap:'else ішкі if-пен бір деңгейде тұр, сондықтан x > 50 жалған болғанда орындалады. x = 20 үшін «орташа» шығады.' },
    2: { lines:['x = 20', 'if x > 10:', '    if x > 50:', '        print("үлкен")', 'else:', '    print("кіші")'], pr:'', cap:'else сыртқы if-пен бір деңгейде тұр, сондықтан x > 10 жалған болғанда ғана орындалады. x = 20 үшін ештеңе шықпайды.' }
  };
  function paint(){
    const c = cases[sh]; a.classList.toggle('primary', sh === 1); b.classList.toggle('primary', sh === 2);
    code.innerHTML = ''; code.append(C.codeView(c.lines));
    code.querySelectorAll('.p9-ln').forEach((ln, i) => { const t = c.lines[i]; ln.classList.toggle('run', /^( *)(else:)/.test(t)); });
    box.innerHTML = ''; box.append(el('small', { text:'ЭКРАНҒА ШЫҒАДЫ' }), el('pre', { class:'good', text:c.pr || '(ештеңе шықпайды)' }));
    cap.textContent = c.cap;
  }
  a.onclick = () => { sh = 1; paint(); }; b.onclick = () => { sh = 2; paint(); };
  host.append(el('div', { class:'p9-run' }, [a, b]), code, box, cap, el('p', { class:'p9-tip', html:'<b>Ереже:</b> else өзімен бірдей орыннан басталатын if-ке жатады. Бос орын (шегініс) — Python үшін жол мағынасы.' }));
  paint();
}

/* ---------- 3. Кірістірілген шарт және and ---------- */
function equiv(host){
  let x = 12, y = 5;
  const mk = (n, g, s) => { const o = el('output', { text:n + ' = ' + g() }), m = el('button', { type:'button', class:'p4-step', text:'−', 'aria-label':n + ' азайту' }), p = el('button', { type:'button', class:'p4-step', text:'+', 'aria-label':n + ' көбейту' }); m.onclick = () => { s(g() - 1); paint(); }; p.onclick = () => { s(g() + 1); paint(); }; return { o, box:el('div', { class:'p9-stp' }, [m, o, p]) }; };
  const mx = mk('x', () => x, v => { x = Math.max(-20, v); }), my = mk('y', () => y, v => { y = Math.max(-20, v); });
  const l = el('div'), r = el('div'), res = el('p', { class:'p4-cap', 'aria-live':'polite' });
  function paint(){
    mx.o.textContent = 'x = ' + x; my.o.textContent = 'y = ' + y;
    const A_ = x > 0, B_ = y > 0, lt = ['if x > 0:', '    if y > 0:', '        print("екеуі де оң")'], rt = ['if x > 0 and y > 0:', '    print("екеуі де оң")'];
    l.innerHTML = ''; r.innerHTML = '';
    const cl = C.codeView(lt); cl.querySelectorAll('.p9-ln').forEach((ln, i) => ln.classList.add(i === 0 || (i === 1 && A_) || (i === 2 && A_ && B_) ? 'run' : 'skip'));
    const cr = C.codeView(rt); cr.querySelectorAll('.p9-ln').forEach((ln, i) => ln.classList.add(i === 0 || (i === 1 && A_ && B_) ? 'run' : 'skip'));
    l.append(el('h4', { class:'p4-h', text:'Кірістірілген' }), cl); r.append(el('h4', { class:'p4-h', text:'and арқылы' }), cr);
    res.textContent = (A_ && B_ ? 'Екеуі де «екеуі де оң» деп жазады.' : 'Екеуі де ештеңе шығармайды.') + ' Нәтиже бірдей, ал and қысқа. Ішкі if-тің else бөлімі бөлек қажет болғанда ғана кірістіру ыңғайлы.';
  }
  host.append(el('div', { class:'p9-sel' }, [mx.box, my.box]), el('div', { class:'p9-pair' }, [l, r]), res); paint();
}

const BUGS = [
  { name:'Шегініс', goal:'Жасы 18 және одан үлкен болса, билет бар-жоғын тексеру керек.', want:'Билетті көрсет', code:['age = 20', 'if age >= 18:', 'if age >= 18:', '    print("Билетті көрсет")'], bug:[2], fix:['age = 20', 'if age >= 18:', '    if True:', '    print("Билетті көрсет")'], bad:'IndentationError: expected an indented block', good:'Билетті көрсет', hint:'if жолынан кейінгі жол қай жерден басталуы керек?', why:'if-тен кейінгі жол ішке (4 бос орын) жазылады. Онсыз Python қай код шартқа жататынын біле алмайды.' },
  { name:'else жұбы', goal:'Баға 50-ден төмен болса, «Қайта тапсыр» шығу керек (ball = 30).', want:'Қайта тапсыр', code:['ball = 30', 'if ball >= 50:', '    if ball >= 85:', '        print("Үздік")', '    else:', '        print("Жақсы")', '    print("Қайта тапсыр")'], bug:[6], fix:['ball = 30', 'if ball >= 50:', '    if ball >= 85:', '        print("Үздік")', '    else:', '        print("Жақсы")', 'else:', '    print("Қайта тапсыр")'], bad:'(ештеңе шықпайды)', good:'Қайта тапсыр', hint:'«Қайта тапсыр» қай шарт жалған болғанда шығуы керек? Ол үшін сыртқы if-ке жұп else қажет.', why:'Сыртқы if-тің else бөлімі сыртқы деңгейде (шегіністің сол жағында) тұрады, сонда ball < 50 болғанда орындалады.' },
  { name:'Қос нүкте', goal:'x оң және жұп болса, «оң жұп» шығу керек (x = 4).', want:'оң жұп', code:['x = 4', 'if x > 0:', '    if x % 2 == 0', '        print("оң жұп")'], bug:[2], fix:['x = 4', 'if x > 0:', '    if x % 2 == 0:', '        print("оң жұп")'], bad:'SyntaxError: expected \':\'', good:'оң жұп', hint:'Ішкі if жолы да қос нүктемен аяқталады.', why:'Әр if, elif, else жолының соңында қос нүкте тұрады, ішкі if-те де.' }
];
/* қате 1: екі жол бірдей көрінбеуі үшін анық мысал */
BUGS[0].code = ['age = 20', 'if age >= 18:', 'print("Билетті көрсет")'];
BUGS[0].fix = ['age = 20', 'if age >= 18:', '    print("Билетті көрсет")'];
BUGS[0].bug = [2];

function mount(h){
  if (h.hero) C.hero(h.hero, SCENES);
  trace(h.trace); pair(h.pair); equiv(h.equiv); C.bugFinder(h.bug, BUGS, '🎉 Үш қатенің бәрін таптың. Енді тапсырмаларда өзің түзетесің.');
  if (h.play) C.compiler(h.play, 'ball = int(input("Баға: "))\nif ball >= 50:\n    if ball >= 85:\n        print("Үздік")\n    else:\n        print("Жақсы")\nelse:\n    print("Қайта тапсыр")\n');
}
window.PyDemos10 = { mount, SCENES };
})();
