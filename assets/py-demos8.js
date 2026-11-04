/* Python, 8-тақырып (if–else, elif): бір ортақ тренажер + ереже + қателер.
   Қозғалыс тек студент әрекетіне жауап ретінде жүреді (батырма немесе слайдер). PyDemos8.mount({ lab, syntax, err }) */
(function(){
'use strict';
const { el, esc } = window.L;
const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const MODES = [
  { id:'ife', name:'if–else', title:'Емтихан нәтижесі', val:62, quick:[30, 50, 80],
    code:['score = int(input())', 'if score >= 50:', '    print("Өттіңіз")', 'else:', '    print("Өтпедіңіз")'],
    gates:[{ kw:'if', thr:50, hdr:1, body:2, out:'Өттіңіз' }, { kw:'else', thr:null, hdr:3, body:4, out:'Өтпедіңіз' }] },
  { id:'eli', name:'if–elif–else', title:'Баға қою', val:75, quick:[95, 75, 55, 30],
    code:['score = int(input())', 'if score >= 90:', '    print("5")', 'elif score >= 70:', '    print("4")', 'elif score >= 50:', '    print("3")', 'else:', '    print("2")'],
    gates:[{ kw:'if', thr:90, hdr:1, body:2, out:'5' }, { kw:'elif', thr:70, hdr:3, body:4, out:'4' }, { kw:'elif', thr:50, hdr:5, body:6, out:'3' }, { kw:'else', thr:null, hdr:7, body:8, out:'2' }] }
];
const LH = 32;
const NS = 'http://www.w3.org/2000/svg';
const sv = (t, a, k) => { const e = document.createElementNS(NS, t); for (const n in a) e.setAttribute(n, a[n]); (k || []).forEach(c => e.append(c)); return e; };
const stxt = (x, y, s, cls) => { const e = sv('text', { x, y, class:cls || '' }); e.textContent = s; return e; };

function trace(M, v){
  const ev = [{ t:'in', line:0, edges:['start'] }]; let hit = -1;
  for (let i = 0; i < M.gates.length; i++){
    const g = M.gates[i], ok = g.thr === null || v >= g.thr;
    ev.push({ t:'chk', line:g.hdr, g:i, ok, edges:[i === 0 ? 'in0' : 'no' + (i - 1)] });
    if (ok){ hit = i; ev.push({ t:'run', line:g.body, g:i, edges:g.thr === null ? [] : ['yes' + i] }); break; }
  }
  ev.push({ t:'end', line:-1, edges:['out' + hit] });
  return { ev, hit };
}
function caption(M, v, e, hit){
  const g = e.g !== undefined ? M.gates[e.g] : null;
  if (e.t === 'in') return 'score айнымалысына ' + v + ' саны жазылды.';
  if (e.t === 'chk') return g.thr === null ? 'Алдыңғы шарттардың бәрі False болды, сондықтан else орындалады.' : v + ' >= ' + g.thr + ' — ' + (e.ok ? 'True. Схемада «Иә» жолымен өтеді.' : 'False. Схемада «Жоқ» жолымен келесіге өтеді.');
  if (e.t === 'run') return 'Экранға «' + g.out + '» шығады.';
  return M.gates[hit].thr === null ? 'Бірде-бір шарт орындалмады, сондықтан else жұмыс істеді. Нәтиже: «' + M.gates[hit].out + '».' : 'Бірінші True шарт табылды (' + v + ' >= ' + M.gates[hit].thr + '). Қалған блоктар тексерілмей өткізілді. Нәтиже: «' + M.gates[hit].out + '».';
}

/* блок-схема: код бағдарламасына сәйкес SVG салады */
function chart(M){
  const n = M.gates.filter(g => g.thr !== null).length, cy = i => 190 + i * 110, ye = 190 + (n - 1) * 110 + 90, yend = ye + 70, H = yend + 34;
  const svg = sv('svg', { class:'p8-svg', viewBox:'0 0 460 ' + H, role:'img', 'aria-label':'Блок-схема' });
  const mk = (id, c) => sv('marker', { id, viewBox:'0 0 10 10', refX:'8', refY:'5', markerWidth:'7', markerHeight:'7', orient:'auto' }, [sv('path', { d:'M0 0L10 5L0 10z', fill:c })]);
  svg.append(sv('defs', {}, [mk('p8a', '#94a3b8'), mk('p8-ok', '#16a34a'), mk('p8-no', '#ef4444'), mk('p8-in', '#6366f1')]));
  const edges = {};
  const E = (id, d, kind) => { const base = sv('path', { d, class:'eb', 'marker-end':'url(#p8a)' }), ov = sv('path', { d, class:'ov ' + kind, pathLength:'1' }); edges[id] = { base, ov }; svg.append(base, ov); };
  E('start', 'M130 46V73', 'in'); E('in0', 'M130 111V152', 'in');
  for (let i = 0; i < n; i++){ E('no' + i, 'M130 ' + (cy(i) + 38) + 'V' + (cy(i) + 72), 'no'); E('yes' + i, 'M205 ' + cy(i) + 'H235', 'ok'); E('out' + i, 'M365 ' + cy(i) + 'H420V' + yend + 'H190', 'ok'); }
  E('out' + n, 'M130 ' + (ye + 18) + 'V' + (yend - 18), 'ok');
  for (let i = 0; i < n; i++){ svg.append(stxt(214, cy(i) - 8, 'Иә', 'yl'), stxt(140, cy(i) + 58, 'Жоқ', 'nl')); }
  const nodes = {}, G = (cls, l, kids) => { const g = sv('g', { class:'nd ' + cls, 'data-l':l }, kids); svg.append(g); return g; };
  nodes.start = G('', '', [sv('rect', { x:70, y:10, width:120, height:36, rx:18 }), stxt(130, 33, 'Басы', 'b')]);
  nodes.inp = G('', '0', [sv('polygon', { points:'49,73 225,73 211,111 35,111' }), stxt(130, 96, 'score = int(input())', 'm')]);
  nodes.dia = []; nodes.act = [];
  for (let i = 0; i < n; i++){
    const g = M.gates[i];
    nodes.dia.push(G('', String(g.hdr), [sv('polygon', { points:'130,' + (cy(i) - 38) + ' 205,' + cy(i) + ' 130,' + (cy(i) + 38) + ' 55,' + cy(i) }), stxt(130, cy(i) + 4, 'score >= ' + g.thr + '?', 'm')]));
    nodes.act.push(G('', String(g.body), [sv('rect', { x:235, y:cy(i) - 18, width:130, height:36, rx:8 }), stxt(300, cy(i) + 4, 'print("' + g.out + '")', 'm')]));
  }
  const eg = M.gates[n];
  nodes.act.push(G('', eg.hdr + ' ' + eg.body, [sv('rect', { x:65, y:ye - 18, width:130, height:36, rx:8 }), stxt(130, ye + 4, 'print("' + eg.out + '")', 'm')]));
  nodes.end = G('', '', [sv('rect', { x:70, y:yend - 18, width:120, height:36, rx:18 }), stxt(130, yend + 5, 'Соңы', 'b')]);
  const tok = sv('g', { class:'p8-tok', transform:'translate(130,28)' }, [sv('circle', { r:15, class:'halo' }), sv('circle', { r:8, class:'core' })]); svg.append(tok);
  const center = e => !e ? [130, 28] : e.t === 'in' ? [130, 92] : e.t === 'end' ? [130, yend] : (e.g < n ? (e.t === 'chk' ? [130, cy(e.g)] : [300, cy(e.g)]) : [130, ye]);
  return { svg, edges, nodes, tok, center, n };
}

function lab(host){
  let mi = 0, v = MODES[0].val, k = 0, gen = 0, playing = false, C, T = trace(MODES[0], v), tp = [130, 28];
  const modeBtns = el('div', { class:'p8-modes', role:'tablist', 'aria-label':'Конструкция' });
  const range = el('input', { type:'range', min:'0', max:'100', 'aria-label':'score мәні' });
  const big = el('output', { class:'p8-big' });
  const minus = el('button', { type:'button', class:'p8-step', 'aria-label':'Азайту', text:'−' }), plus = el('button', { type:'button', class:'p8-step', 'aria-label':'Көбейту', text:'+' });
  const quick = el('div', { class:'p8-quick' });
  const barHl = el('div', { class:'p8-hl', 'aria-hidden':'true' }), codeBox = el('div', { class:'p8-lines' });
  const editor = el('div', { class:'p8-editor' }, [el('div', { class:'p8-ehead' }, [el('i'), el('i'), el('i'), el('span', { text:'main.py' })]), el('div', { class:'p8-ebody' }, [barHl, codeBox])]);
  const screen = el('div', { class:'p8-screen' }, [el('small', { text:'ЭКРАНҒА ШЫҒАДЫ' }), el('b', { class:'p8-out', text:'…' })]);
  const chartBox = el('div', { class:'p8-chart' });
  const cap = el('p', { class:'p8-cap', 'aria-live':'polite' });
  const bNext = el('button', { type:'button', class:'btn primary', text:'Қадам →' }), bPlay = el('button', { type:'button', class:'btn', text:'▶ Қадамдап көрсету' }), bReset = el('button', { type:'button', class:'btn ghost', text:'↺ Басынан' });
  const prog = el('div', { class:'p8-prog' }, el('span'));
  const M = () => MODES[mi];
  const setTok = (x, y) => { tp = [x, y]; C.tok.setAttribute('transform', 'translate(' + x + ',' + y + ')'); };

  function build(){
    const m = M(); C = chart(m);
    chartBox.innerHTML = ''; chartBox.append(C.svg);
    codeBox.innerHTML = '';
    m.code.forEach((l, i) => { const ln = el('div', { class:'p8-ln', 'data-i':String(i) }, [el('i', { text:String(i + 1) }), el('code', { text:l }), el('em')]); ln.addEventListener('mouseenter', () => hov(i, true)); ln.addEventListener('mouseleave', () => hov(i, false)); codeBox.append(ln); });
    C.svg.querySelectorAll('[data-l]').forEach(g => { const ls = g.getAttribute('data-l').split(' ').filter(Boolean).map(Number); g.addEventListener('mouseenter', () => ls.forEach(i => codeBox.children[i].classList.add('hov'))); g.addEventListener('mouseleave', () => ls.forEach(i => codeBox.children[i].classList.remove('hov'))); });
    quick.innerHTML = ''; quick.append(el('span', { text:'Тез таңдау:' }));
    m.quick.forEach(q => quick.append(el('button', { type:'button', class:'pl-chipbtn', text:String(q), onclick:() => { v = q; sync(); } })));
    modeBtns.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === mi); b.setAttribute('aria-selected', i === mi ? 'true' : 'false'); });
  }
  function hov(i, on){ C.svg.querySelectorAll('[data-l]').forEach(g => { if (g.getAttribute('data-l').split(' ').includes(String(i))) g.classList.toggle('hov', on); }); }

  function paint(place){
    const m = M(); T = trace(m, v);
    const ev = T.ev, upto = ev.slice(0, k), cur = k > 0 ? ev[k - 1] : null, fin = k >= ev.length;
    barHl.style.opacity = cur && cur.line >= 0 ? '1' : '0';
    if (cur && cur.line >= 0) barHl.style.transform = 'translateY(' + cur.line * LH + 'px)';
    codeBox.querySelectorAll('.p8-ln').forEach((ln, i) => {
      const e = upto.find(x => x.line === i);
      ln.classList.toggle('on', !!cur && cur.line === i);
      ln.classList.toggle('dim', fin && i > 0 && !upto.some(x => x.line === i));
      const mark = ln.querySelector('em'); mark.textContent = e && e.t === 'chk' ? (e.ok ? 'True' : 'False') : e && e.t === 'run' ? '✓' : ''; mark.className = e && e.t === 'chk' ? (e.ok ? 'ok' : 'no') : e && e.t === 'run' ? 'ok' : '';
    });
    const on = new Set(); upto.forEach(e => e.edges.forEach(id => on.add(id)));
    Object.keys(C.edges).forEach(id => { C.edges[id].ov.classList.toggle('on', on.has(id)); C.edges[id].ov.classList.toggle('arr', on.has(id)); });
    const st = (g, s, c) => { g.setAttribute('class', 'nd' + (s ? ' st-' + s : '') + (c ? ' cur' : '')); };
    const N = C.nodes;
    st(N.start, k > 0 ? 'done' : '', false);
    st(N.inp, k > 1 ? 'done' : k === 1 ? 'true' : '', k === 1);
    N.dia.forEach((g, i) => { const c = upto.find(x => x.t === 'chk' && x.g === i); st(g, c ? (c.ok ? 'true' : 'false') : (fin && i > T.hit ? 'skip' : ''), !!cur && cur.t === 'chk' && cur.g === i); });
    N.act.forEach((g, i) => { const r = upto.some(x => x.t === 'run' && x.g === i), c = upto.some(x => x.t === 'chk' && x.g === i && i === m.gates.length - 1); st(g, r ? 'run' : (fin && i !== T.hit ? 'skip' : ''), !!cur && ((cur.t === 'run' && cur.g === i) || (cur.t === 'chk' && cur.g === i && i === m.gates.length - 1))); });
    st(N.end, fin ? 'done' : '', false);
    const ran = upto.find(x => x.t === 'run');
    screen.classList.toggle('on', !!ran); screen.querySelector('.p8-out').textContent = ran ? m.gates[ran.g].out : '…';
    cap.textContent = cur ? caption(m, v, cur, T.hit) : 'Схема кодпен бірге жұмыс істейді. «Қадам →» не «▶» батырмасын бас. Мәнді өзгертсең, нәтиже бірден жаңарады.';
    prog.firstChild.style.width = Math.round(k / ev.length * 100) + '%';
    big.textContent = v; range.value = v;
    bNext.disabled = fin; bReset.disabled = k === 0;
    if (place){ const c = C.center(cur); setTok(c[0], c[1]); }
  }
  /* белгішені схема жолымен жүргізу */
  function anim(fn, D, done, my){ const t0 = performance.now(); const f = now => { if (my !== gen) return; const p = D ? Math.min(1, (now - t0) / D) : 1; fn(p); if (p < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); }
  function travel(e, cb){
    const my = ++gen, list = e.edges.slice();
    const next = () => {
      if (my !== gen) return;
      if (!list.length){ cb(); return; }
      const E = C.edges[list.shift()], L = E.base.getTotalLength(), a = E.base.getPointAtLength(0), from = tp.slice();
      anim(p => setTok(from[0] + (a.x - from[0]) * p, from[1] + (a.y - from[1]) * p), still ? 0 : 160, () => {
        E.ov.classList.add('on');
        anim(p => { const pt = E.base.getPointAtLength(L * p); setTok(pt.x, pt.y); }, still ? 0 : 520, () => { E.ov.classList.add('arr'); next(); }, my);
      }, my);
    };
    next();
  }
  function halt(){ gen++; playing = false; bPlay.textContent = '▶ Қадамдап көрсету'; }
  function sync(){ halt(); k = trace(M(), v).ev.length; paint(true); }
  function advance(done){ T = trace(M(), v); const e = T.ev[k]; travel(e, () => { k++; paint(!e.edges.length); if (!e.edges.length) { const c = C.center(e); setTok(c[0], c[1]); } done && done(); }); }
  function play(){
    if (playing){ halt(); paint(true); return; }
    halt(); k = 0; paint(true); playing = true; bPlay.textContent = '❚❚ Тоқтату';
    const run = () => { if (!playing) return; if (k >= trace(M(), v).ev.length){ halt(); return; } advance(() => setTimeout(run, still ? 100 : 320)); };
    run();
  }
  MODES.forEach((m, i) => modeBtns.append(el('button', { type:'button', role:'tab', text:m.name, onclick:() => { halt(); mi = i; v = m.val; build(); sync(); } })));
  range.addEventListener('input', () => { v = +range.value; sync(); });
  minus.addEventListener('click', () => { v = Math.max(0, v - 1); sync(); }); plus.addEventListener('click', () => { v = Math.min(100, v + 1); sync(); });
  bNext.addEventListener('click', () => { if (playing) halt(); if (k >= trace(M(), v).ev.length){ k = 0; paint(true); } advance(); });
  bPlay.addEventListener('click', play);
  bReset.addEventListener('click', () => { halt(); k = 0; paint(true); });

  host.append(modeBtns,
    el('div', { class:'p8-input' }, [el('div', { class:'p8-val' }, [el('span', { text:'score =' }), big]), minus, range, plus, quick]),
    el('div', { class:'p8-grid' }, [el('div', { class:'p8-lcol' }, [editor, screen]), el('div', { class:'p8-side' }, [el('h4', { text:'Блок-схема' }), chartBox])]),
    prog, cap, el('div', { class:'stepbar' }, [bNext, bPlay, bReset]));
  build(); sync();
}


/* ---------- Жазылу ережесі ---------- */
function syntax(host){
  const S = (c, t) => '<span class="' + c + '">' + t + '</span>';
  const CODES = [
    ['if', [S('k', 'if') + ' ' + S('c', 'x > 0') + S('p', ':'), S('i', '    ') + 'print("Оң")']],
    ['if–else', [S('k', 'if') + ' ' + S('c', 'x > 0') + S('p', ':'), S('i', '    ') + 'print("Оң")', S('k', 'else') + S('p', ':'), S('i', '    ') + 'print("Оң емес")']],
    ['if–elif–else', [S('k', 'if') + ' ' + S('c', 'x > 0') + S('p', ':'), S('i', '    ') + 'print("Оң")', S('k', 'elif') + ' ' + S('c', 'x < 0') + S('p', ':'), S('i', '    ') + 'print("Теріс")', S('k', 'else') + S('p', ':'), S('i', '    ') + 'print("Нөл")']]
  ];
  const LEG = [['k', 'Кілт сөз', 'if, elif, else. Олар әрқашан сол жақ шетте, бір тік сызықта тұрады.'], ['c', 'Шарт', 'True не False беретін өрнек. else-те шарт жазылмайды.'], ['p', 'Қос нүкте', 'if, elif, else үшеуінің де соңында тұрады.'], ['i', 'Шегініс', 'Блок ішіндегі жол 4 бос орынға ығады.']];
  const cards = el('div', { class:'p8-codes' });
  CODES.forEach(([n, ls]) => cards.append(el('div', { class:'p8-cc' }, [el('h4', { text:n }), el('pre', { class:'p8-code', html:ls.join('\n') })])));
  const info = el('p', { class:'p8-legnote', role:'status' });
  const legend = el('div', { class:'p8-legend' });
  const pick = i => { cards.dataset.hl = LEG[i][0]; legend.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', i === j)); info.innerHTML = '<b>' + LEG[i][1] + '.</b> ' + esc(LEG[i][2]); };
  LEG.forEach(([c, t], i) => legend.append(el('button', { type:'button', class:'p8-lg ' + c, text:t, onclick:() => pick(i) })));
  const rules = el('ul', { class:'p8-rules' }, [
    'if әрқашан бірінші және бір-ақ рет жазылады.', 'elif қанша болса да қоюға болады. Python-да «else if» деп жазылмайды.', 'else тек соңында және бір-ақ рет тұрады. Ол міндетті емес.', 'Шарттарды қатаңынан бастап реттейді: 90, 70, 50.'
  ].map(t => el('li', { text:t })));
  host.append(legend, info, cards, rules); pick(0);
}

/* ---------- Қатені тап ---------- */
const BUGS = [
  { name:'else', code:['x = int(input())', 'if x > 0:', '    print("Оң")', 'else x <= 0:', '    print("Оң емес")'], bug:[3], fix:['x = int(input())', 'if x > 0:', '    print("Оң")', 'else:', '    print("Оң емес")'],
    inp:'-3', bad:'SyntaxError: invalid syntax', good:'Оң емес', hint:'Қате терминалда синтаксис қатесі деп тұр. else жолына мұқият қара.', why:'else-те шарт жазылмайды. Ол «алдыңғылардың бәрі False болса» дегенді білдіреді, сондықтан тек else: жазылады.' },
  { name:'else if', code:['x = int(input())', 'if x > 0:', '    print("Оң")', 'else if x < 0:', '    print("Теріс")'], bug:[3], fix:['x = int(input())', 'if x > 0:', '    print("Оң")', 'elif x < 0:', '    print("Теріс")'],
    inp:'-3', bad:'SyntaxError: invalid syntax', good:'Теріс', hint:'Python-да екінші шартты жазу үшін бір ғана сөз бар.', why:'Python-да «else if» жоқ. «Әйтпесе егер» дегенді бір сөзбен elif деп жазады.' },
  { name:'Шарттар реті', code:['score = int(input())', 'if score >= 50:', '    print("3")', 'elif score >= 90:', '    print("5")'], bug:[1, 3], fix:['score = int(input())', 'if score >= 90:', '    print("5")', 'elif score >= 50:', '    print("3")'],
    inp:'95', bad:'3', good:'5', hint:'95 балл үшін «5» шығуы керек еді. Қай шарт бірінші тексеріліп тұр?', why:'95 >= 50 бірінші тексеріледі және True болады, сондықтан elif-ке жетпейді. Шарттарды қатаңынан бастап жазу керек: 90, содан кейін 50.' },
  { name:'Бөлек if', code:['score = int(input())', 'if score >= 90:', '    print("5")', 'if score >= 70:', '    print("4")'], bug:[3], fix:['score = int(input())', 'if score >= 90:', '    print("5")', 'elif score >= 70:', '    print("4")'],
    inp:'95', bad:'5\n4', good:'5', hint:'Бір балға екі баға шықты. Екінші блок бірінші блокқа тәуелді емес пе?', why:'Бөлек if әрқайсысы өз алдына тексеріледі: 95 >= 90 де, 95 >= 70 де True. Біріншісі орындалған соң қалғаны өткізілу үшін elif қолданылады.' },
  { name:'Шегініс', code:['x = int(input())', 'if x > 0:', '    print("Оң")', '    else:', '    print("Оң емес")'], bug:[3], fix:['x = int(input())', 'if x > 0:', '    print("Оң")', 'else:', '    print("Оң емес")'],
    inp:'4', bad:'SyntaxError: invalid syntax', good:'Оң', hint:'else сөзі қай жолмен бір тік сызықта тұруы керек?', why:'else — if-тің жұбы, сондықтан ол if-пен бір тік сызықта тұрады. Шегініс тек блок ішіндегі жолдарға қойылады.' }
];
function err(host){
  let cur = 0; const done = new Set(), wrong = BUGS.map(() => 0);
  const tabs = el('div', { class:'pl-tabs2', role:'tablist' }), body = el('div', { class:'p8-dbg' }), score = el('span', { class:'p8-score' });
  function draw(){
    const B = BUGS[cur], solved = done.has(cur);
    tabs.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === cur); b.classList.toggle('ok', done.has(i)); b.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
    score.textContent = 'Табылды: ' + done.size + ' / ' + BUGS.length;
    const code = el('div', { class:'p8-bcode', role:'group', 'aria-label':'Код. Қате жолды бас.' });
    (solved ? B.fix : B.code).forEach((l, i) => {
      const fixedLine = solved && B.fix[i] !== B.code[i];
      const row = el(solved ? 'div' : 'button', { class:'p8-bl' + (fixedLine ? ' fixed' : ''), 'aria-label':'Жол ' + (i + 1) + ': ' + l }, [el('i', { text:String(i + 1) }), el('code', { text:l })]);
      if (!solved) row.addEventListener('click', () => pick(i, row));
      code.append(row);
    });
    const res = solved ? B.good : B.bad, isErr = !solved && /Error/.test(B.bad);
    const term = el('div', { class:'p8-bterm' + (solved ? ' good' : ' bad') }, [el('small', { text:'ТЕРМИНАЛ · енгізу: ' + B.inp }), el('pre', { text:'> ' + res.split('\n').join('\n> ') }), el('span', { class:'p8-tag', text:solved ? '✓ Дұрыс нәтиже' : isErr ? '✗ Қате: бағдарлама іске қосылмады' : '✗ Нәтиже қате' })]);
    const msg = el('p', { class:'p8-bmsg', role:'status' });
    if (solved) { msg.className += ' ok'; msg.innerHTML = '<b>Дұрыс!</b> ' + esc(B.why); }
    else if (wrong[cur] >= 2) { msg.className += ' hint'; msg.textContent = 'Кеңес: ' + B.hint; }
    else msg.textContent = 'Терминалдағы нәтижеге қарап, қате жолды бас.';
    body.innerHTML = ''; body.append(el('div', { class:'p8-bgrid' }, [el('div', {}, [code]), el('div', {}, [term])]), msg);
    if (solved && done.size < BUGS.length) body.append(el('button', { type:'button', class:'btn primary', text:'Келесі қате →', onclick:() => { cur = BUGS.findIndex((_, i) => i > cur && !done.has(i)); if (cur < 0) cur = BUGS.findIndex((_, i) => !done.has(i)); draw(); } }));
    if (done.size === BUGS.length && solved) body.append(el('p', { class:'p8-all', text:'🎉 Бес қатенің бәрін таптың. Енді тапсырмаларда осындай кодтарды өзің түзетесің.' }));
  }
  function pick(i, row){
    const B = BUGS[cur];
    if (B.bug.includes(i)) { done.add(cur); draw(); return; }
    wrong[cur]++; row.classList.add('miss'); setTimeout(() => row.classList.remove('miss'), 700);
    const m = body.querySelector('.p8-bmsg'); m.textContent = wrong[cur] >= 2 ? 'Кеңес: ' + B.hint : 'Бұл жол дұрыс. Терминалдағы нәтижеге қайта қара.'; m.className = 'p8-bmsg' + (wrong[cur] >= 2 ? ' hint' : ' no');
  }
  BUGS.forEach((b, i) => tabs.append(el('button', { type:'button', role:'tab', text:(i + 1) + '. ' + b.name, onclick:() => { cur = i; draw(); } })));
  host.append(el('div', { class:'p8-bhead' }, [tabs, score]), body); draw();
}


window.PyDemos8 = { mount(h){ lab(h.lab); syntax(h.syntax); err(h.err); } };
})();
