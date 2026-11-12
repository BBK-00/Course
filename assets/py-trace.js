/* for … in range(…) циклінің қадамдық моделі (12-тақырып). Нақты Python орындалмайды: шектеулі ішкі жиын, бірақ нәтижесі Python-мен салыстырылып тексеріледі.
   Қолдау: name = / += -= *= //= %= өрнек; print(өрнек, …); for v in range(…): (іштей кірістірілген де); if шарт: … else: …; салыстыру (== != < > <= >=) және and, or, not; өрнекте + - * / // % ** ( ), сан, мәтін, str().
   PyTrace.run(src) → { ok, frames, vars, out } немесе { ok:false, line, msg }. Кадр: { line, cap, vars:[{n,v,ch}], out:[…], tape:{ var, vals, pos, line }|null, loops, kind }. */
(function(){
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const MAX_FRAMES = 700, MAX_ITER = 200;
class PErr extends Error { constructor(line, msg){ super(msg); this.line = line; this.kk = msg; } }

/* ---------- Мәнді жазу ---------- */
const isStr = v => typeof v === 'string';
function fmt(v){
  if (isStr(v)) return v;
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number' && !Number.isInteger(v)) { const s = String(v); return s; }
  if (typeof v === 'number' && v._f) return v.toFixed(1);
  return String(v);
}
const F = x => ({ f: x });   /* float белгісі: 5.0 деп шығару үшін */
const isF = v => v && typeof v === 'object' && 'f' in v;
const num = v => (isF(v) ? v.f : v);
const truthy = v => (isStr(v) ? v.length > 0 : isF(v) ? v.f !== 0 : typeof v === 'boolean' ? v : v !== 0);
const show = v => (typeof v === 'boolean' ? (v ? 'True' : 'False') : isStr(v) ? '«' + v + '»' : isF(v) ? (Number.isInteger(v.f) ? v.f.toFixed(1) : String(v.f)) : String(v));
const text = v => (isStr(v) ? v : show(v));

/* ---------- Токендер ---------- */
function tokenize(src, ln){
  const t = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) { let j = i; while (j < src.length && /[\d.]/.test(src[j])) j++; t.push({ t: 'num', v: src.slice(i, j) }); i = j; continue; }
    if (/[A-Za-z_Ѐ-ӿ]/.test(c)) { let j = i; while (j < src.length && /[\wЀ-ӿ]/.test(src[j])) j++; t.push({ t: 'name', v: src.slice(i, j) }); i = j; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; } if (j >= src.length) throw new PErr(ln, ln + '-жол: тырнақ жабылмаған.'); t.push({ t: 'str', v: src.slice(i + 1, j).replace(/\\n/g, '\n').replace(/\\(.)/g, '$1') }); i = j + 1; continue; }
    const two = src.slice(i, i + 2);
    if (['//', '**', '==', '!=', '<=', '>='].includes(two)) { t.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/%(),<>'.includes(c)) { t.push({ t: 'op', v: c }); i++; continue; }
    throw new PErr(ln, ln + '-жол: «' + c + '» белгісін бұл демо түсінбейді.');
  }
  return t;
}

/* ---------- Өрнек талдағышы ---------- */
function parseExpr(toks, ln, allowComma){
  let p = 0;
  const peek = () => toks[p], eat = v => { const k = toks[p]; if (k && k.t === 'op' && k.v === v) { p++; return true; } return false; };
  function atom(){
    const k = toks[p++];
    if (!k) throw new PErr(ln, ln + '-жол: өрнек аяқталмай қалды.');
    if (k.t === 'num') return { k: 'num', v: /\./.test(k.v) ? F(parseFloat(k.v)) : parseInt(k.v, 10) };
    if (k.t === 'str') return { k: 'str', v: k.v };
    if (k.t === 'name') {
      if (eat('(')) { const args = []; if (!eat(')')) { do { args.push(orE()); } while (eat(',')); if (!eat(')')) throw new PErr(ln, ln + '-жол: жақша жабылмаған.'); } return { k: 'call', f: k.v, args }; }
      return { k: 'var', n: k.v };
    }
    if (k.t === 'op' && k.v === '(') { const e = orE(); if (!eat(')')) throw new PErr(ln, ln + '-жол: жақша жабылмаған.'); return { k: 'par', a: e }; }
    throw new PErr(ln, ln + '-жол: «' + k.v + '» осы жерде орынсыз.');
  }
  function unary(){ if (eat('-')) return { k: 'neg', a: unary() }; if (eat('+')) return unary(); return pow(); }
  function pow(){ const a = atom(); if (eat('**')) return { k: 'bin', o: '**', a, b: unary() }; return a; }
  function mul(){ let a = unary(); for (;;) { const k = peek(); if (k && k.t === 'op' && ['*', '/', '//', '%'].includes(k.v)) { p++; a = { k: 'bin', o: k.v, a, b: unary() }; } else return a; } }
  function add(){ let a = mul(); for (;;) { const k = peek(); if (k && k.t === 'op' && ['+', '-'].includes(k.v)) { p++; a = { k: 'bin', o: k.v, a, b: mul() }; } else return a; } }
  const isName = w => { const k = toks[p]; return k && k.t === 'name' && k.v === w; };
  function cmpE(){ const a = add(), k = peek(); if (k && k.t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(k.v)) { p++; return { k: 'cmp', o: k.v, a, b: add() }; } return a; }
  function notE(){ if (isName('not')) { p++; return { k: 'not', a: notE() }; } return cmpE(); }
  function andE(){ let a = notE(); while (isName('and')) { p++; a = { k: 'and', a, b: notE() }; } return a; }
  function orE(){ let a = andE(); while (isName('or')) { p++; a = { k: 'or', a, b: andE() }; } return a; }
  const out = [orE()];
  while (allowComma && eat(',')) out.push(orE());
  if (p < toks.length) throw new PErr(ln, ln + '-жол: «' + toks[p].v + '» осы жерде орынсыз. Қос нүкте, үтір не жақшаны тексер.');
  return allowComma ? out : out[0];
}

/* ---------- Есептеу ---------- */
const floorDiv = (a, b) => Math.floor(a / b), pymod = (a, b) => a - b * Math.floor(a / b);
function ev(n, env, ln){
  switch (n.k) {
    case 'num': case 'str': return n.v;
    case 'par': return ev(n.a, env, ln);
    case 'var': if (!env.has(n.n)) throw new PErr(ln, ln + '-жол: «' + n.n + '» айнымалысы әлі жасалмаған. Оны қолданбай тұрып мән беру керек.'); return env.get(n.n);
    case 'neg': { const v = ev(n.a, env, ln); if (isStr(v)) throw new PErr(ln, ln + '-жол: мәтінге минус қоюға болмайды.'); return isF(v) ? F(-v.f) : -v; }
    case 'call': {
      if (n.f === 'str' && n.args.length === 1) return text(ev(n.args[0], env, ln)).replace(/^«|»$/g, '');
      throw new PErr(ln, ln + '-жол: «' + n.f + '()» функциясын бұл демо білмейді.');
    }
    case 'not': return !truthy(ev(n.a, env, ln));
    case 'and': { const a = ev(n.a, env, ln); return truthy(a) ? ev(n.b, env, ln) : a; }
    case 'or': { const a = ev(n.a, env, ln); return truthy(a) ? a : ev(n.b, env, ln); }
    case 'cmp': {
      const a = ev(n.a, env, ln), b = ev(n.b, env, ln);
      if (isStr(a) !== isStr(b)) { if (n.o === '==') return false; if (n.o === '!=') return true; throw new PErr(ln, ln + '-жол: мәтін мен санды «' + n.o + '» арқылы салыстыруға болмайды.'); }
      const x = isStr(a) ? a : num(a), y = isStr(b) ? b : num(b);
      switch (n.o) { case '==': return x === y; case '!=': return x !== y; case '<': return x < y; case '>': return x > y; case '<=': return x <= y; default: return x >= y; }
    }
    case 'bin': {
      const a = ev(n.a, env, ln), b = ev(n.b, env, ln), sa = isStr(a), sb = isStr(b);
      if (n.o === '+') { if (sa && sb) return a + b; if (sa || sb) throw new PErr(ln, ln + '-жол: мәтін мен санды қосуға болмайды. Санды str(…) арқылы мәтінге айналдыр.'); }
      else if (n.o === '*' && (sa || sb)) { if (sa && sb) throw new PErr(ln, ln + '-жол: екі мәтінді көбейтуге болмайды.'); const s = sa ? a : b, k = num(sa ? b : a); if (!Number.isInteger(k)) throw new PErr(ln, ln + '-жол: мәтінді бүтін санға ғана көбейтуге болады.'); return k > 0 ? s.repeat(Math.min(k, 200)) : ''; }
      else if (sa || sb) throw new PErr(ln, ln + '-жол: мәтінмен «' + n.o + '» амалы жұмыс істемейді.');
      const x = num(a), y = num(b), fl = isF(a) || isF(b);
      if ((n.o === '/' || n.o === '//' || n.o === '%') && y === 0) throw new PErr(ln, ln + '-жол: нөлге бөлуге болмайды.');
      let r;
      switch (n.o) { case '+': r = x + y; break; case '-': r = x - y; break; case '*': r = x * y; break; case '/': return F(x / y); case '//': r = floorDiv(x, y); break; case '%': r = pymod(x, y); break; case '**': r = Math.pow(x, y); if (!Number.isInteger(r) || y < 0) return F(r); break; }
      return fl ? F(r) : r;
    }
  }
  return 0;
}
/* өрнекті айнымалы мәндерімен жазу: s + i → 3 + 4 */
function sub(n, env){
  switch (n.k) {
    case 'num': return isF(n.v) ? String(n.v.f) : String(n.v);
    case 'str': return '«' + n.v + '»';
    case 'par': return '(' + sub(n.a, env) + ')';
    case 'var': return env.has(n.n) ? show(env.get(n.n)) : n.n;
    case 'neg': return '-' + sub(n.a, env);
    case 'call': return n.f + '(' + n.args.map(a => sub(a, env)).join(', ') + ')';
    case 'bin': return sub(n.a, env) + ' ' + n.o + ' ' + sub(n.b, env);
    case 'cmp': return sub(n.a, env) + ' ' + n.o + ' ' + sub(n.b, env);
    case 'and': return sub(n.a, env) + ' and ' + sub(n.b, env);
    case 'or': return sub(n.a, env) + ' or ' + sub(n.b, env);
    case 'not': return 'not ' + sub(n.a, env);
  }
  return '';
}
const isPlainVar = n => n.k === 'var' || n.k === 'num' || n.k === 'str';

/* ---------- Жолдарды блокқа жинау ---------- */
function stripComment(s){ let q = ''; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '\\') i++; else if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '#') return s.slice(0, i); } return s; }
function parseProgram(src){
  const raw = String(src).replace(/\r/g, '').replace(/\t/g, '    ').split('\n'), L = [];
  raw.forEach((r, i) => { const t = stripComment(r).replace(/\s+$/, ''); if (t.trim()) L.push({ ln: i + 1, i, ind: t.length - t.trimStart().length, s: t.trim() }); });
  let p = 0;
  function block(ind){
    const out = [];
    while (p < L.length && L[p].ind >= ind) {
      const l = L[p];
      if (l.ind > ind) throw new PErr(l.ln, l.ln + '-жол: бұл жолдың шегінісі артық. Алдыңғы жол қос нүктемен аяқталмаған.');
      p++;
      const hm = l.s.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)\s*(:?)$/);
      if (/^for\b/.test(l.s)) {
        if (!hm) throw new PErr(l.ln, l.ln + '-жол: бұл демо тек «for i in range(…):» түрін қолдайды.');
        if (!hm[3]) throw new PErr(l.ln, l.ln + '-жол: for жолының соңында қос нүкте (:) жоқ.');
        if (p >= L.length || L[p].ind <= l.ind) throw new PErr(l.ln, l.ln + '-жол: for-дан кейін шегінген жол (цикл денесі) керек. Денесін 4 бос орынмен ішке жаз.');
        const argToks = tokenize(hm[2], l.ln), args = []; let cur = [], depth = 0;
        argToks.forEach(t => { if (t.t === 'op' && t.v === '(') depth++; if (t.t === 'op' && t.v === ')') depth--; if (t.t === 'op' && t.v === ',' && depth === 0) { args.push(cur); cur = []; } else cur.push(t); });
        if (cur.length || args.length) args.push(cur);
        if (!args.length || args.length > 3 || args.some(a => !a.length)) throw new PErr(l.ln, l.ln + '-жол: range() ішінде 1, 2 не 3 сан болуы керек.');
        out.push({ t: 'for', ln: l.ln, i: l.i, name: hm[1], args: args.map(a => parseExpr(a, l.ln)), argSrc: hm[2].trim(), body: block(L[p].ind) });
        continue;
      }
      if (/^if\b/.test(l.s)) {
        const im = l.s.match(/^if\s+(.+?)\s*(:?)$/);
        if (!im) throw new Error('if');
        if (!im[2]) throw new PErr(l.ln, l.ln + '-жол: if жолының соңында қос нүкте (:) жоқ.');
        if (p >= L.length || L[p].ind <= l.ind) throw new PErr(l.ln, l.ln + '-жол: if-тен кейін шегінген жол керек. Шарт орындалғанда істейтін жолды 4 бос орынмен ішке жаз.');
        const cond = parseExpr(tokenize(im[1], l.ln), l.ln), body = block(L[p].ind); let other = null;
        if (p < L.length && L[p].ind === l.ind && /^else\s*:?$/.test(L[p].s)) {
          const el = L[p]; if (!/:$/.test(el.s)) throw new PErr(el.ln, el.ln + '-жол: else жолының соңында қос нүкте (:) жоқ.');
          p++; if (p >= L.length || L[p].ind <= l.ind) throw new PErr(el.ln, el.ln + '-жол: else-тен кейін шегінген жол керек.'); other = block(L[p].ind);
        }
        out.push({ t: 'if', ln: l.ln, i: l.i, cond, src: im[1], body, other });
        continue;
      }
      const pm = l.s.match(/^print\s*\((.*)\)$/);
      if (pm) { out.push({ t: 'print', ln: l.ln, i: l.i, args: pm[1].trim() ? parseExpr(tokenize(pm[1], l.ln), l.ln, true) : [] }); continue; }
      const am = l.s.match(/^([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/\/=|%=|=)\s*(.+)$/);
      if (am) { out.push({ t: 'assign', ln: l.ln, i: l.i, name: am[1], op: am[2], expr: parseExpr(tokenize(am[3], l.ln), l.ln) }); continue; }
      throw new PErr(l.ln, l.ln + '-жол: «' + l.s.slice(0, 40) + '» жолын бұл демо түсінбейді. Қолдау: айнымалыға мән беру, print(…) және for … in range(…).');
    }
    return out;
  }
  const first = L.length ? L[0].ind : 0, prog = block(first);
  if (p < L.length) throw new PErr(L[p].ln, L[p].ln + '-жол: шегініс дұрыс емес.');
  return prog;
}

/* ---------- Орындау және кадрлар ---------- */
function run(src){
  try {
    const prog = parseProgram(src), env = new Map(), out = [], frames = [], loops = []; let tape = null;
    const snap = ch => [...env.entries()].map(([n, v]) => ({ n, v: fmt(isF(v) ? (Number.isInteger(v.f) ? v.f.toFixed(1) : v.f) : v), raw: v, ch: !!ch && ch.includes(n) }));
    const tp = () => (tape ? { var: tape.name, vals: tape.vals.slice(), pos: tape.pos, line: tape.i, args: tape.args } : null);
    const add = (st, cap, kind, ch, extra) => { if (frames.length >= MAX_FRAMES) throw new PErr(st.ln, 'Демо үшін бағдарлама тым ұзын: кадр саны ' + MAX_FRAMES + '-ден асты. Қайталау санын азайт.'); frames.push({ line: st.i, cap, kind, vars: snap(ch), out: out.slice(), tape: tp(), depth: loops.length, n: loops.length ? loops[loops.length - 1].pos + 1 : 0, ...(extra || {}) }); };
    const execBlock = body => body.forEach(st => {
      if (st.t === 'assign') {
        let v = ev(st.expr, env, st.ln); const before = env.get(st.name);
        if (st.op !== '=') { if (!env.has(st.name)) throw new PErr(st.ln, st.ln + '-жол: «' + st.name + '» айнымалысы әлі жасалмаған, оған ' + st.op + ' қолдануға болмайды.'); const op = st.op.slice(0, -1); v = ev({ k: 'bin', o: op, a: { k: 'var', n: st.name }, b: st.expr }, env, st.ln); }
        const expl = st.op === '=' ? sub(st.expr, env) : sub({ k: 'bin', o: st.op.slice(0, -1), a: { k: 'var', n: st.name }, b: st.expr }, env);
        env.set(st.name, v);
        const shown = show(v);
        add(st, st.name + ' = ' + (isPlainVar(st.expr) && st.op === '=' ? shown : expl + ' = ' + shown) + '. «' + st.name + '» қорабына ' + shown + ' түсті.', 'assign', [st.name]);
      } else if (st.t === 'if') {
        const ok = truthy(ev(st.cond, env, st.ln));
        add(st, 'Шарт тексеріледі: ' + st.src + '. Мәндерімен: ' + sub(st.cond, env) + ' → ' + (ok ? 'True' : 'False') + '. ' + (ok ? 'Шарт орындалды, if денесі орындалады.' : st.other ? 'Шарт орындалмады, else денесі орындалады.' : 'Шарт орындалмады, if денесі өткізіліп жіберіледі.'), 'cond', undefined, { cond: ok });
        if (ok) execBlock(st.body); else if (st.other) execBlock(st.other);
      } else if (st.t === 'print') {
        const vals = st.args.map(a => ev(a, env, st.ln)), line = vals.map(text).join(' '); out.push(line);
        add(st, 'print: экранға ' + (line === '' ? 'бос жол' : '«' + line + '»') + ' шықты.', 'print');
      } else {
        const a = st.args.map(x => ev(x, env, st.ln));
        if (a.some(x => isStr(x) || isF(x) || !Number.isInteger(x))) throw new PErr(st.ln, st.ln + '-жол: range() ішінде бүтін сан болуы керек.');
        const [s0, e0, k0] = a.length === 1 ? [0, a[0], 1] : [a[0], a[1], a.length === 3 ? a[2] : 1];
        if (k0 === 0) throw new PErr(st.ln, st.ln + '-жол: range() қадамы 0 бола алмайды, робот орнында тұрып қалар еді.');
        const vals = []; if (k0 > 0) for (let v = s0; v < e0; v += k0) vals.push(v); else for (let v = s0; v > e0; v += k0) vals.push(v);
        if (vals.length > MAX_ITER) throw new PErr(st.ln, st.ln + '-жол: демо үшін цикл тым ұзақ (' + vals.length + ' қайталау). ' + MAX_ITER + '-ден аспасын.');
        const lp = { name: st.name, vals, pos: -1, i: st.i, args: [s0, e0, k0] }; loops.push(lp); tape = lp;
        add(st, 'for жолы оқылды. range(' + (a.length === 1 ? a[0] : a.join(', ')) + ') ' + (vals.length ? 'мына сандарды береді: ' + (vals.length > 12 ? vals.slice(0, 10).join(', ') + ', … ' + vals[vals.length - 1] : vals.join(', ')) + '. Барлығы ' + vals.length + ' сан.' : 'бос: сан жоқ, сондықтан цикл бір рет те орындалмайды.'), 'for');
        vals.forEach((v, idx) => {
          lp.pos = idx; env.set(st.name, v);
          add(st, st.name + ' = ' + v + '. Бұл ' + (idx + 1) + '-қайталау: робот келесі санға өтті.', 'iter', [st.name]);
          execBlock(st.body);
        });
        lp.pos = vals.length;
        if (vals.length) add(st, 'Сандар таусылды, ' + e0 + ' енді кірмейді. Цикл аяқталды: барлығы ' + vals.length + ' қайталау. ' + st.name + ' мәні ' + vals[vals.length - 1] + ' болып қалды.', 'end');
        loops.pop();
      }
    });
    if (prog.length) { const f = prog[0]; frames.push({ line: f.i, cap: 'Бағдарлама басталады. Python жолдарды жоғарыдан төмен қарай бір-бірлеп оқиды.', kind: 'start', vars: [], out: [], tape: null, depth: 0, n: 0 }); }
    execBlock(prog);
    const last = frames[frames.length - 1]; if (last) last.done = true;
    return { ok: true, frames, out, vars: Object.fromEntries([...env.entries()].map(([n, v]) => [n, isF(v) ? v.f : v])), lines: String(src).replace(/\r/g, '').split('\n') };
  } catch (e) {
    if (e instanceof PErr) return { ok: false, line: e.line, msg: e.kk };
    return { ok: false, line: 0, msg: 'Бағдарламаны түсіне алмадық: ' + (e && e.message) };
  }
}

/* range мәндері: python-мен бірдей */
function rangeVals(start, stop, step){ if (step === 0) return null; const o = []; if (step > 0) for (let v = start; v < stop && o.length < 500; v += step) o.push(v); else for (let v = start; v > stop && o.length < 500; v += step) o.push(v); return o; }

const PRESETS = [
  { id: 'hello', name: 'Сәлем × 5', code: 'for i in range(5):\n    print("Сәлем")' },
  { id: 'sq', name: 'Квадраттар', code: 'for i in range(1, 6):\n    print(i * i)' },
  { id: 'sum', name: 'Қосынды', code: 's = 0\nfor i in range(1, 6):\n    s = s + i\nprint(s)' },
  { id: 'down', name: 'Кері санау', code: 'for i in range(5, 0, -1):\n    print(i)\nprint("Бастадық!")' },
  { id: 'even', name: 'Жұп сандар', code: 'for i in range(2, 11, 2):\n    print(i)' },
  { id: 'tab', name: 'Көбейту кестесі', code: 'for i in range(1, 6):\n    print(3, "*", i, "=", 3 * i)' },
  { id: 'prod', name: 'Көбейтінді', code: 'p = 1\nfor i in range(1, 6):\n    p = p * i\nprint(p)' },
  { id: 'star', name: 'Жұлдызшалар', code: 'for i in range(1, 5):\n    print("*" * i)' }
];

G.PyTrace = { run, rangeVals, PRESETS, parseProgram, fmt };
})();
