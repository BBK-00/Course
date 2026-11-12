/* Логикалық өрнек қозғалтқышы (eval жоқ): салыстыру, not, and, or, жақша, айнымалылар. Python ережесімен: and/or операндты қайтарады,
   тізбекті салыстыру 1 < x < 10 қолданылады. PyBool.steps(src, vars, esc) — қадамдық орындау: жақша → есеп → салыстыру → not → and → or.
   Node-та тексеру үшін module.exports беріледі. */
(function(root){
'use strict';
class BErr extends Error { constructor(kk){ super(kk); this.kk = kk; } }
const truthy = v => (typeof v === 'boolean' ? v : v !== 0);
const fmt = v => (typeof v === 'boolean' ? (v ? 'True' : 'False') : Number.isInteger(v) ? String(v) : String(v));
const L = /[A-Za-z_а-яА-ЯӘәҒғҚқҢңӨөҰұҮүІіҺһ]/;

function tokenize(src){
  const s = String(src), t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c)) { const m = /^\d+(\.\d+)?/.exec(s.slice(i))[0]; i += m.length; t.push({ k:'num', v:parseFloat(m), s:m }); continue; }
    if (L.test(c)) {
      const m = /^[A-Za-z_а-яА-ЯӘәҒғҚқҢңӨөҰұҮүІіҺһ0-9]+/.exec(s.slice(i))[0]; i += m.length;
      if (m === 'and' || m === 'or' || m === 'not') t.push({ k:m }); else if (m === 'True' || m === 'False') t.push({ k:'bool', v:m === 'True' }); else t.push({ k:'id', v:m });
      continue;
    }
    const two = s.slice(i, i + 2);
    if (['<=', '>=', '==', '!=', '//', '**'].includes(two)) { t.push({ k:'op', v:two }); i += 2; continue; }
    if ('<>+-*%'.includes(c)) { t.push({ k:'op', v:c }); i++; continue; }
    if (c === '(' || c === ')') { t.push({ k:c }); i++; continue; }
    if (c === '=') throw new BErr('Теңдікті тексеру үшін == жазылады, бір = таңбасы — айнымалыға мән беру.');
    throw new BErr('«' + c + '» белгісі өрнекте қолданылмайды.');
  }
  return t;
}

let uid = 0;
function parse(src, vars){
  const T = tokenize(src); let p = 0; const V = vars || {};
  if (!T.length) throw new BErr('Өрнек бос.');
  const is = (...k) => T[p] && k.includes(T[p].k);
  const isOp = (...o) => T[p] && T[p].k === 'op' && o.includes(T[p].v);
  const need = () => { throw new BErr('Өрнек толық емес: ' + (T[p - 1] ? '«' + (T[p - 1].s || T[p - 1].v || T[p - 1].k) + '»' : 'басында') + ' белгісінен кейін шарт не сан керек.'); };
  function orE(){ let l = andE(); while (is('or')) { p++; l = { k:'or', l, r:andE(), id:++uid }; } return l; }
  function andE(){ let l = notE(); while (is('and')) { p++; l = { k:'and', l, r:notE(), id:++uid }; } return l; }
  function notE(){ if (is('not')) { p++; return { k:'not', x:notE(), id:++uid }; } return cmpE(); }
  function cmpE(){
    const first = arith(), xs = [first], ops = [];
    while (isOp('<', '>', '<=', '>=', '==', '!=')) { ops.push(T[p++].v); xs.push(arith()); }
    return ops.length ? { k:'cmp', xs, ops, id:++uid } : first;
  }
  function arith(){ let l = term(); while (isOp('+', '-')) { const op = T[p++].v; l = { k:'bin', op, l, r:term(), id:++uid }; } return l; }
  function term(){ let l = unary(); while (isOp('*', '//', '%')) { const op = T[p++].v; l = { k:'bin', op, l, r:unary(), id:++uid }; } return l; }
  function unary(){ if (isOp('-')) { p++; return { k:'neg', x:unary(), id:++uid }; } return pow(); }
  function pow(){ const b = atom(); if (isOp('**')) { p++; return { k:'bin', op:'**', l:b, r:unary(), id:++uid }; } return b; }
  function atom(){
    const tk = T[p]; if (!tk) need();
    if (tk.k === 'num') { p++; return { k:'num', v:tk.v, s:tk.s, id:++uid }; }
    if (tk.k === 'bool') { p++; return { k:'lit', v:tk.v, id:++uid }; }
    if (tk.k === 'id') { p++; if (!(tk.v in V)) throw new BErr('«' + tk.v + '» айнымалысы жоқ. Мұнда ' + (Object.keys(V).join(', ') || 'айнымалы жоқ') + ' қолданылады.'); return { k:'var', name:tk.v, v:V[tk.v], id:++uid }; }
    if (tk.k === '(') { p++; const x = orE(); if (!T[p] || T[p].k !== ')') throw new BErr('Жақшалар саны тең емес: «)» жетіспейді.'); p++; return { k:'par', x, id:++uid }; }
    if (tk.k === ')') throw new BErr('Жақшалар саны тең емес: артық «)» бар.');
    throw new BErr('Мұнда сан, айнымалы не шарт керек, ал «' + (tk.v || tk.k) + '» тұр.');
  }
  const tree = orE();
  if (p < T.length) { const tk = T[p]; throw new BErr(tk.k === 'num' || tk.k === 'id' ? 'Екі мән қатар тұр. Араларына and, or не амал белгісін қой.' : 'Жақшалар саны тең емес: артық «)» бар.'); }
  return tree;
}

const floorDiv = (a, b) => { if (b === 0) throw new BErr('Нөлге бөлуге болмайды.'); return Math.floor(a / b); };
const pmod = (a, b) => { if (b === 0) throw new BErr('Нөлге бөлуге болмайды.'); return a - Math.floor(a / b) * b; };
function arithOp(op, a, b){
  if (typeof a === 'boolean') a = a ? 1 : 0; if (typeof b === 'boolean') b = b ? 1 : 0;
  return op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '//' ? floorDiv(a, b) : op === '%' ? pmod(a, b) : Math.pow(a, b);
}
const cmpOp = (op, a, b) => (op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : op === '>=' ? a >= b : op === '==' ? a === b : a !== b);
const val = n => (n.k === 'num' || n.k === 'lit' || n.k === 'var' ? n.v : n.k === 'par' ? val(n.x) : undefined);

function evalTree(n){
  if (n.k === 'num' || n.k === 'lit' || n.k === 'var') return n.v;
  if (n.k === 'par') return evalTree(n.x);
  if (n.k === 'neg') return -evalTree(n.x);
  if (n.k === 'bin') return arithOp(n.op, evalTree(n.l), evalTree(n.r));
  if (n.k === 'not') return !truthy(evalTree(n.x));
  if (n.k === 'cmp') { const v = n.xs.map(evalTree); for (let i = 0; i < n.ops.length; i++) if (!cmpOp(n.ops[i], v[i], v[i + 1])) return false; return true; }
  if (n.k === 'and') { const l = evalTree(n.l); return truthy(l) ? evalTree(n.r) : l; }
  return (() => { const l = evalTree(n.l); return truthy(l) ? l : evalTree(n.r); })();
}

/* ---- қадамдық орындау ---- */
const isLeaf = n => n.k === 'num' || n.k === 'lit' || (n.k === 'par' && (n.x.k === 'num' || n.x.k === 'lit'));
const lvl = n => (n.k === 'bin' || n.k === 'neg' ? 1 : n.k === 'cmp' ? 2 : n.k === 'not' ? 3 : n.k === 'and' ? 4 : 5);
function plain(n){
  if (n.k === 'num') return n.s !== undefined ? n.s : fmt(n.v);
  if (n.k === 'lit') return fmt(n.v);
  if (n.k === 'var') return n.name;
  if (n.k === 'par') return '(' + plain(n.x) + ')';
  if (n.k === 'neg') return '-' + plain(n.x);
  if (n.k === 'bin') return plain(n.l) + ' ' + n.op + ' ' + plain(n.r);
  if (n.k === 'not') return 'not ' + plain(n.x);
  if (n.k === 'cmp') return n.xs.map(plain).reduce((a, x, i) => a + ' ' + n.ops[i - 1] + ' ' + x);
  return plain(n.l) + ' ' + n.k + ' ' + plain(n.r);
}
function render(n, hot, esc){
  const w = (s, nd) => (nd === hot ? '<span class="p4-hot">' + s + '</span>' : s);
  if (n.k === 'num') return esc(n.s !== undefined && !n.fresh ? n.s : fmt(n.v));
  if (n.k === 'var') return '<span class="p9-var">' + esc(n.name) + '</span>';
  if (n.k === 'lit') { const c = n.fresh ? ' p4-new' : ''; return '<span class="p9-' + (n.v ? 'T' : 'F') + c + '">' + fmt(n.v) + '</span>'; }
  if (n.k === 'par') return '(' + render(n.x, hot, esc) + ')';
  if (n.k === 'neg') return w('-' + render(n.x, hot, esc), n);
  if (n.k === 'bin') return w(render(n.l, hot, esc) + ' ' + esc(n.op) + ' ' + render(n.r, hot, esc), n);
  if (n.k === 'not') return w('<span class="p9-kw">not</span> ' + render(n.x, hot, esc), n);
  if (n.k === 'cmp') return w(n.xs.map(x => render(x, hot, esc)).reduce((a, x, i) => a + ' ' + esc(n.ops[i - 1]) + ' ' + x), n);
  return w(render(n.l, hot, esc) + ' <span class="p9-kw">' + n.k + '</span> ' + render(n.r, hot, esc), n);
}
const REASON = { 1: 'Алдымен арифметика (+, -, *, %, //) орындалады.', 2: 'Салыстыру (<, >, ==) not, and, or-дан бұрын орындалады.', 3: 'not салыстырудан кейін, and-тан бұрын орындалады.', 4: 'and or-дан бұрын орындалады.', 5: 'or ең соңында орындалады.' };
function steps(src, vars, esc){
  const fold = n => {   /* айнымалыны мәнімен ауыстыру */
    if (n.k === 'var') return { k:n.v === true || n.v === false ? 'lit' : 'num', v:n.v, s:String(n.v), id:++uid, fresh:false };
    if (n.k === 'par' || n.k === 'neg' || n.k === 'not') n.x = fold(n.x);
    if (n.k === 'bin' || n.k === 'and' || n.k === 'or') { n.l = fold(n.l); n.r = fold(n.r); }
    if (n.k === 'cmp') n.xs = n.xs.map(fold);
    return n;
  };
  let tree = parse(src, vars); const frames = [];
  evalTree(tree);   /* қателерді бірден ұстау */
  frames.push({ html:render(tree, null, esc), cap:'', level:0 });
  if (JSON.stringify(Object.keys(vars || {})) !== '[]') {
    const usesVar = [];
    (function f(n){ if (n.k === 'var') usesVar.push(n.name); ['x', 'l', 'r'].forEach(k => n[k] && f(n[k])); (n.xs || []).forEach(f); })(tree);
    if (usesVar.length) { tree = fold(tree); frames.push({ html:render(tree, null, esc), cap:'Айнымалылардың мәндері қойылды: ' + [...new Set(usesVar)].map(k => k + ' = ' + fmt(vars[k])).join(', ') + '.', level:0 }); }
  }
  const walk = (n, depth, out) => {
    if (n.k === 'par') { walk(n.x, depth + 1, out); return; }
    ['x', 'l', 'r'].forEach(k => n[k] && walk(n[k], depth, out)); (n.xs || []).forEach(x => walk(x, depth, out));
    let ready = false;
    if (n.k === 'bin') ready = isLeaf(n.l) && isLeaf(n.r); else if (n.k === 'neg' || n.k === 'not') ready = isLeaf(n.x); else if (n.k === 'cmp') ready = n.xs.every(isLeaf); else if (n.k === 'and' || n.k === 'or') ready = isLeaf(n.l) && isLeaf(n.r);
    if (ready) out.push({ n, depth });
  };
  const replace = (n, to) => {
    const go = x => {
      if (x === n) return to;
      ['x', 'l', 'r'].forEach(k => { if (x[k]) x[k] = go(x[k]); }); if (x.xs) x.xs = x.xs.map(go);
      return x;
    };
    const clr = x => { if (x.fresh) x.fresh = false; ['x', 'l', 'r'].forEach(k => x[k] && clr(x[k])); (x.xs || []).forEach(clr); };
    clr(tree); tree = go(tree);
    const un = x => { ['x', 'l', 'r'].forEach(k => { if (x[k]) x[k] = un(x[k]); }); if (x.xs) x.xs = x.xs.map(un); return x.k === 'par' && (x.x.k === 'num' || x.x.k === 'lit') ? x.x : x; };
    tree = un(tree);
  };
  let guard = 0;
  while (!(tree.k === 'num' || tree.k === 'lit') && guard++ < 60) {
    const ready = []; walk(tree, 0, ready); if (!ready.length) break;
    ready.sort((a, b) => b.depth - a.depth || lvl(a.n) - lvl(b.n));
    const pick = ready[0], n = pick.n, res = evalTree(n), isBool = typeof res === 'boolean';
    const lit = isBool ? { k:'lit', v:res, fresh:true, id:++uid } : { k:'num', v:res, fresh:true, id:++uid };
    const why = pick.depth > 0 ? 'Жақша ішіндегі бірінші орындалады.' : REASON[lvl(n)];
    let note = ''; if ((n.k === 'or' || n.k === 'and') && !isBool) note = ' Нәтиже — сан: ' + fmt(res) + '. if ішінде нөл емес сан True деп саналады.';
    frames.push({ html:render(tree, n, esc), cap:plain(n) + ' → ' + fmt(res) + '. ' + why + note, level:pick.depth > 0 ? 1 : lvl(n) + 1 });
    replace(n, lit);
  }
  const final = evalTree(tree);
  tree.fresh = true;
  frames.push({ html:render(tree, null, esc), cap:'Нәтиже: ' + fmt(final) + (typeof final === 'boolean' ? '.' : ' → if үшін ' + (truthy(final) ? 'True (нөл емес сан)' : 'False (нөл)') + '.'), level:0, final:true, value:final });
  return frames;
}
const Api = { BErr, parse, evalTree, steps, fmt, truthy, plain };
if (typeof module === 'object' && module.exports) module.exports = Api; else root.PyBool = Api;
})(typeof window !== 'undefined' ? window : globalThis);
