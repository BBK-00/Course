/* Python, 4-тақырып (арифметикалық операторлар, типтерді түрлендіру): калькулятор, орындалу реті, int/float/str, input(), қатені тап.
   Қозғалыс тек студент әрекетіне жауап ретінде жүреді (Алға/Артқа не батырма). PyDemos4.mount({ hero, ops, order, conv, inp, rules, err }).
   Бірінші блок — Python ережесімен жұмыс істейтін өрнек қозғалтқышы (eval жоқ); Node-та тексеру үшін module.exports беріледі. */
(function(root){
'use strict';

/* ---------- Өрнек қозғалтқышы ---------- */
class PyErr extends Error { constructor(kind, kk){ super(kk); this.kind = kind; this.kk = kk; } }
const I = v => ({ t:'int', v:BigInt(v) }), F = v => ({ t:'float', v });
const isInt = x => x.t === 'int';
const num = x => isInt(x) ? Number(x.v) : x.v;

/* Python repr(float): -4 < decpt <= 16 болса жай жазу, әйтпесе 1e+16 түрінде */
function fmtFloat(x){
  if (x === Infinity) return 'inf'; if (x === -Infinity) return '-inf'; if (x !== x) return 'nan';
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  const sign = x < 0 ? '-' : '', m = /^(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(Math.abs(x).toExponential());
  const digits = m[1] + (m[2] || ''), e = parseInt(m[3], 10), decpt = e + 1;
  if (decpt > 16 || decpt < -3) return sign + m[1] + (m[2] ? '.' + m[2] : '') + 'e' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
  if (decpt <= 0) return sign + '0.' + '0'.repeat(-decpt) + digits;
  if (digits.length <= decpt) return sign + digits + '0'.repeat(decpt - digits.length) + '.0';
  return sign + digits.slice(0, decpt) + '.' + digits.slice(decpt);
}
const fmt = x => isInt(x) ? x.v.toString() : fmtFloat(x.v);

/* CPython float_divmod ережесі */
function fdiv(a, b){
  if (b === 0) throw new PyErr('ZeroDivisionError', 'Нөлге бөлуге болмайды.');
  let mod = a % b, div = (a - mod) / b;
  if (mod) { if ((b < 0) !== (mod < 0)) { mod += b; div -= 1; } } else mod = b < 0 ? -0 : 0;
  let fl; if (div) { fl = Math.floor(div); if (div - fl > 0.5) fl += 1; } else fl = (a / b) < 0 || Object.is(a / b, -0) ? -0 : 0;
  return { fl, mod };
}

/* x ** n (n = 2..16) дәл бүтін арифметикамен: C-дағы pow сияқты дұрыс дөңгелектенеді (Math.pow соңғы разрядта қателесуі мүмкін) */
function powFloatInt(x, n){
  const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4), ex = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo), e = -1074;
  if (ex) { mant |= 1n << 52n; e = ex - 1075; }
  const E = e * n; if (E < -1000 || E > 900) return Math.pow(x, n);
  const r = Number(mant ** BigInt(n)) * Math.pow(2, E);
  return x < 0 && n % 2 ? -r : r;
}
const fpow = (x, y) => y === 0.5 ? Math.sqrt(x) : Number.isInteger(y) && y >= 2 && y <= 16 && isFinite(x) && x !== 0 ? powFloatInt(x, y) : Math.pow(x, y);

function binop(op, a, b){
  if (isInt(a) && isInt(b)) {
    const x = a.v, y = b.v;
    if (op === '+') return { t:'int', v:x + y }; if (op === '-') return { t:'int', v:x - y }; if (op === '*') return { t:'int', v:x * y };
    if (op === '/') { if (y === 0n) throw new PyErr('ZeroDivisionError', 'Нөлге бөлуге болмайды.'); return F(Number(x) / Number(y)); }
    if (op === '//' || op === '%') {
      if (y === 0n) throw new PyErr('ZeroDivisionError', 'Нөлге бөлуге болмайды.');
      let q = x / y, r = x % y; if (r !== 0n && ((r < 0n) !== (y < 0n))) { q -= 1n; r += y; }
      return { t:'int', v:op === '//' ? q : r };
    }
    if (op === '**') {
      if (y >= 0n) { if ((x > 1n || x < -1n) && y > 4000n) throw new PyErr('OverflowError', 'Нәтиже тым үлкен.'); return { t:'int', v:x ** y }; }
      if (x === 0n) throw new PyErr('ZeroDivisionError', '0-ді теріс дәрежеге шығаруға болмайды.');
      return F(Math.pow(Number(x), Number(y)));
    }
  }
  const x = num(a), y = num(b);
  if (op === '+') return F(x + y); if (op === '-') return F(x - y); if (op === '*') return F(x * y);
  if (op === '/') { if (y === 0) throw new PyErr('ZeroDivisionError', 'Нөлге бөлуге болмайды.'); return F(x / y); }
  if (op === '//') return F(fdiv(x, y).fl);
  if (op === '%') return F(fdiv(x, y).mod);
  if (op === '**') {
    if (x === 0 && y < 0) throw new PyErr('ZeroDivisionError', '0-ді теріс дәрежеге шығаруға болмайды.');
    if (x < 0 && !Number.isInteger(y)) throw new PyErr('ComplexResult', 'Теріс санның бөлшек дәрежесі кешенді сан береді. Бұл сабақтан тыс.');
    const r = fpow(x, y); if (!isFinite(r) && isFinite(x) && isFinite(y)) throw new PyErr('OverflowError', 'Нәтиже тым үлкен.'); return F(r);
  }
  throw new PyErr('SyntaxError', 'Белгісіз амал.');
}

function tokenize(src){
  const s = String(src), t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
      const m = /^(\d+\.\d*|\.\d+|\d+)/.exec(s.slice(i))[0];
      if (/^0\d/.test(m)) throw new PyErr('SyntaxError', 'Сан нөлден басталмайды: ' + m + '.');
      i += m.length;
      if (/[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүІіҺһ_]/.test(s[i] || '')) throw new PyErr('SyntaxError', 'Көбейту белгісі міндетті: ' + m + ' * x деп жазылады, ' + m + 'x емес.');
      t.push({ k:'num', v:m.includes('.') ? F(parseFloat(m)) : I(m), s:m }); continue;
    }
    const two = s.slice(i, i + 2);
    if (two === '**' || two === '//') { t.push({ k:'op', v:two }); i += 2; continue; }
    if ('+-*/%'.includes(c)) { t.push({ k:'op', v:c }); i++; continue; }
    if (c === '(' || c === ')') { t.push({ k:c }); i++; continue; }
    if (c === ',') throw new PyErr('SyntaxError', 'Ондық бөлшек үтірмен емес, нүктемен жазылады: 3.5.');
    if (c === '^') throw new PyErr('SyntaxError', 'Python-да ^ дәреже емес. Дәреже үшін ** жазылады: 2 ** 3.');
    if (/[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүІіҺһ_]/.test(c)) throw new PyErr('SyntaxError', 'Мұнда тек сандар мен амал белгілері жазылады.');
    throw new PyErr('SyntaxError', '«' + c + '» белгісі өрнекте қолданылмайды.');
  }
  return t;
}

let uid = 0;
function parse(src){
  const T = tokenize(src); let p = 0;
  if (!T.length) throw new PyErr('SyntaxError', 'Өрнек бос.');
  const isOp = (...o) => T[p] && T[p].k === 'op' && o.includes(T[p].v);
  const need = () => { throw new PyErr('SyntaxError', 'Өрнек толық емес: амал белгісінен кейін сан не жақша керек.'); };
  function expr(){ let l = term(); while (isOp('+', '-')) { const op = T[p++].v; l = { k:'bin', op, l, r:term(), id:++uid }; } return l; }
  function term(){ let l = factor(); while (isOp('*', '/', '//', '%')) { const op = T[p++].v; l = { k:'bin', op, l, r:factor(), id:++uid }; } return l; }
  function factor(){ if (isOp('+', '-')) { const op = T[p++].v; return { k:'neg', op, x:factor(), id:++uid }; } return power(); }
  function power(){ const b = atom(); if (isOp('**')) { p++; return { k:'bin', op:'**', l:b, r:factor(), id:++uid }; } return b; }
  function atom(){
    const tk = T[p]; if (!tk) need();
    if (tk.k === 'num') { p++; return { k:'num', v:tk.v, s:tk.s, id:++uid }; }
    if (tk.k === '(') { p++; const x = expr(); if (!T[p] || T[p].k !== ')') throw new PyErr('SyntaxError', 'Жақшалар саны тең емес: «)» жетіспейді.'); p++; return { k:'par', x, id:++uid }; }
    if (tk.k === ')') throw new PyErr('SyntaxError', 'Жақшалар саны тең емес: артық «)» бар.');
    throw new PyErr('SyntaxError', 'Екі амал қатар тұр: ' + tk.v + ' алдында сан не жақша керек.');
  }
  const tree = expr();
  if (p < T.length) {
    const tk = T[p];
    if (tk.k === '(') throw new PyErr('TypeError', 'Көбейту белгісі міндетті: 2(3 + 4) емес, 2 * (3 + 4) деп жазылады.');
    if (tk.k === 'num') throw new PyErr('SyntaxError', 'Екі сан қатар тұр. Араларына амал белгісін қой.');
    throw new PyErr('SyntaxError', 'Жақшалар саны тең емес: артық «)» бар.');
  }
  return tree;
}

function evalTree(n){
  if (n.k === 'num') return n.v;
  if (n.k === 'par') return evalTree(n.x);
  if (n.k === 'neg') { const x = evalTree(n.x); return n.op === '-' ? (isInt(x) ? { t:'int', v:-x.v } : F(-x.v)) : x; }
  return binop(n.op, evalTree(n.l), evalTree(n.r));
}

/* ---- қадамдық орындау: жақша ішіндегі → дәреже → унарлық минус → * / // % → + - ---- */
const isVal = n => n.k === 'num' || (n.k === 'par' && n.x.k === 'num');
const valOf = n => n.k === 'par' ? n.x.v : n.v;
const LEVEL = n => n.k === 'neg' || n.op === '**' ? 2 : ['*', '/', '//', '%'].includes(n.op) ? 3 : 4;
function plain(n){
  if (n.k === 'num') return n.s !== undefined ? n.s : fmt(n.v);
  if (n.k === 'par') return '(' + plain(n.x) + ')';
  if (n.k === 'neg') return n.op + plain(n.x);
  return plain(n.l) + ' ' + n.op + ' ' + plain(n.r);
}
function render(n, hot, esc){
  const w = (s, nd) => nd === hot ? '<span class="p4-hot">' + s + '</span>' : s;
  if (n.k === 'num') { const s = n.s !== undefined && !n.fresh ? n.s : fmt(n.v); return n.fresh ? '<span class="p4-new">' + esc(s) + '</span>' : esc(s); }
  if (n.k === 'par') return '(' + render(n.x, hot, esc) + ')';
  if (n.k === 'neg') return w(esc(n.op) + render(n.x, hot, esc), n);
  return w(render(n.l, hot, esc) + ' ' + esc(n.op) + ' ' + render(n.r, hot, esc), n);
}
function steps(src, esc){
  const fold = n => {
    if (n.k === 'neg' && n.x.k === 'num') { const v = n.x.v; return { k:'num', v:n.op === '-' ? (isInt(v) ? { t:'int', v:-v.v } : F(-v.v)) : v, s:n.op + n.x.s, id:++uid }; }
    if (n.k === 'neg' || n.k === 'par') n.x = fold(n.x);
    if (n.k === 'bin') { n.l = fold(n.l); n.r = fold(n.r); }
    return n;
  };
  let tree = fold(parse(src)); const frames = [];
  const walk = (n, depth, out, parent) => {
    if (n.k === 'par') { walk(n.x, depth + 1, out, n); return; }
    if (n.k === 'bin') { walk(n.l, depth, out, n); walk(n.r, depth, out, n); }
    if (n.k === 'neg') walk(n.x, depth, out, n);
    if (n.k === 'bin' && isVal(n.l) && isVal(n.r)) out.push({ n, depth, parent });
    if (n.k === 'neg' && isVal(n.x)) out.push({ n, depth, parent });
  };
  const replace = (n, withN) => {
    const go = x => {
      if (x === n) return withN;
      if (x.k === 'par') { x.x = go(x.x); return x; }
      if (x.k === 'neg') { x.x = go(x.x); return x; }
      if (x.k === 'bin') { x.l = go(x.l); x.r = go(x.r); return x; }
      return x;
    };
    const clr = x => { if (x.k === 'num') x.fresh = false; else if (x.k === 'par' || x.k === 'neg') clr(x.x); else if (x.k === 'bin') { clr(x.l); clr(x.r); } };
    clr(tree); tree = go(tree);
    /* бір санды жақшаны алып тастау (теріс сан болса, жақша қалады) */
    const un = (x, top) => {
      if (x.k === 'par') { x.x = un(x.x, false); if (x.x.k === 'num' && (top || !(isInt(x.x.v) ? x.x.v.v < 0n : x.x.v.v < 0 || Object.is(x.x.v.v, -0)))) { const r = x.x; return r; } return x; }
      if (x.k === 'neg') { x.x = un(x.x, false); return x; }
      if (x.k === 'bin') { x.l = un(x.l, false); x.r = un(x.r, false); return x; }
      return x;
    };
    tree = un(tree, true);
  };
  frames.push({ html:render(tree, null, esc), cap:'', level:0, plain:plain(tree) });
  let guard = 0;
  while (tree.k !== 'num' && guard++ < 60) {
    const ready = []; walk(tree, 0, ready, null);
    if (!ready.length) break;
    ready.sort((a, b) => b.depth - a.depth || LEVEL(a.n) - LEVEL(b.n));
    const pick = ready[0], n = pick.n;
    const lvl = LEVEL(n), res = evalTree(n), txt = plain(n);
    let why = '';
    if (pick.depth > 0) why = 'Жақша ішіндегі амал бірінші орындалады.';
    else if (n.k === 'neg') why = 'Унарлық минус дәрежеден кейін қолданылады.';
    else if (n.op === '**') why = 'Дәреже жақшадан кейінгі ең жоғары басымдыққа ие.';
    else if (lvl === 3) why = '* / // % бір деңгейде тұр, сондықтан солдан оңға орындалады.';
    else why = '+ және - ең соңында, солдан оңға орындалады.';
    let note = '';
    if (n.k === 'bin' && n.op === '/') note = ' Бөлу нәтижесі әрқашан float.';
    if (n.k === 'bin' && n.op === '//' && isInt(res) && res.v < 0n) note = ' Бүтін бөлу төмен қарай дөңгелектейді: −3.5 емес, −4.';
    frames.push({ html:render(tree, n, esc), cap:(n.k === 'neg' ? 'Минус таңбасы ' + plain(n.x) + ' санына қолданылды' : txt) + ' = ' + fmt(res) + '. ' + why + note, level:pick.depth > 0 ? 1 : lvl });
    const lit = { k:'num', v:res, fresh:true, id:++uid }; replace(n, lit);
  }
  const fin = evalTree(tree);
  if (tree.k === 'num') tree.fresh = true;
  frames.push({ html:render(tree, null, esc), cap:'Нәтиже: ' + fmt(fin) + ' (' + fin.t + ').', level:0, final:true, value:fin });
  return frames;
}

/* калькулятор: екі сан берілгенде жеті амалдың нәтижесі */
function calc(a, op, b){ return binop(op, a, b); }
const Engine = { PyErr, parse, evalTree, steps, fmt, fmtFloat, binop, calc, tokenize, I, F, plain };

/* ---------- int / float / str түрлендіру (Python ережесімен) ---------- */
const pyRepr = s => { const q = s.includes("'") && !s.includes('"') ? '"' : "'"; return q + s.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n') + q; };
const INT_RE = /^\s*[+-]?\d+(_\d+)*\s*$/, FLT_RE = /^\s*[+-]?(\d+(_\d+)*(\.(\d+(_\d+)*)?)?|\.\d+(_\d+)*)([eE][+-]?\d+(_\d+)*)?\s*$/, SPEC_RE = /^\s*[+-]?(inf|infinity|nan)\s*$/i;
function parseLit(text){
  const s = String(text).trim();
  if (!s) throw new PyErr('SyntaxError', 'Мән енгіз.');
  if (/^(".*"|'.*')$/.test(s)) return { t:'str', v:s.slice(1, -1) };
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)$/.test(s)) { const neg = s[0] === '-', b = s.replace(/^[+-]/, ''); const v = b.includes('.') ? F(parseFloat(b)) : I(b); return neg ? (isInt(v) ? { t:'int', v:-v.v } : F(-v.v)) : v; }
  throw new PyErr('SyntaxError', 'Мән сан немесе тырнақтағы мәтін болуы керек: 25, 3.9 не "25".');
}
function convert(fn, x){
  const show = v => v.t === 'str' ? pyRepr(v.v) : fmt(v);
  if (fn === 'str') return { t:'str', v:x.t === 'str' ? x.v : fmt(x) };
  if (fn === 'int') {
    if (x.t === 'int') return x;
    if (x.t === 'float') return { t:'int', v:BigInt(Math.trunc(x.v)) };
    if (INT_RE.test(x.v)) return { t:'int', v:BigInt(x.v.replace(/[\s_]/g, '')) };
    throw new PyErr('ValueError', 'invalid literal for int() with base 10: ' + pyRepr(x.v));
  }
  if (x.t !== 'str') return F(num(x));
  if (FLT_RE.test(x.v)) return F(parseFloat(x.v.replace(/[\s_]/g, '')));
  if (SPEC_RE.test(x.v)) { const t = x.v.trim().toLowerCase().replace(/^[+-]/, ''), neg = x.v.trim()[0] === '-'; return F(t === 'nan' ? NaN : neg ? -Infinity : Infinity); }
  throw new PyErr('ValueError', 'could not convert string to float: ' + pyRepr(x.v));
}
Engine.parseLit = parseLit; Engine.convert = convert; Engine.pyRepr = pyRepr;
Engine.show = v => v.t === 'str' ? pyRepr(v.v) : fmt(v);

/* abs(), int(), round() — Python ережесімен. round(): тең жартыда жұп санға (round(2.5) = 2), round(x, n) — n таңбаға дейін */
const halfEven = m => { const f = Math.floor(m), d = m - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : (f % 2 === 0 ? f : f + 1); };
Engine.pyAbs = x => (isInt(x) ? { t:'int', v:x.v < 0n ? -x.v : x.v } : F(Math.abs(x.v)));
Engine.pyInt = x => (isInt(x) ? x : { t:'int', v:BigInt(Math.trunc(x.v)) });
/* ондық жолдағы дәл мән бойынша дөңгелектеу (Python сияқты): тең жартыда жұп санға */
function roundDec(v, nd) {
  const neg = v < 0 || Object.is(v, -0), str = Math.abs(v).toFixed(Math.min(100, nd + 30)), dot = str.indexOf('.'), ip = str.slice(0, dot), fp = str.slice(dot + 1), keep = fp.slice(0, nd), rest = fp.slice(nd);
  let n = BigInt(ip + keep); const up = rest[0] > '5' || (rest[0] === '5' && /[1-9]/.test(rest.slice(1))) || (rest[0] === '5' && n % 2n === 1n);
  if (up) n += 1n;
  let d = n.toString().padStart(nd + 1, '0'); const r = parseFloat(nd ? d.slice(0, -nd) + '.' + d.slice(-nd) : d);
  return neg ? -r : r;
}
Engine.pyRound = (x, nd) => {
  if (nd === undefined) return isInt(x) ? x : { t:'int', v:BigInt(halfEven(x.v)) };
  if (isInt(x)) { if (nd >= 0) return x; const p = 10n ** BigInt(-nd), q = x.v / p, r = x.v % p, a2 = (r < 0n ? -r : r) * 2n, up = a2 > p || (a2 === p && (q % 2n !== 0n)); return { t:'int', v:(q + (up ? (x.v < 0n ? -1n : 1n) : 0n)) * p }; }
  if (nd >= 0) return F(roundDec(x.v, nd));
  const p = Math.pow(10, -nd), r = halfEven(x.v / p) * p; return F(r === 0 && (x.v < 0 || Object.is(x.v, -0)) ? -0 : r);
};

if (typeof module === 'object' && module.exports) module.exports = Engine; else root.PyEngine4 = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
