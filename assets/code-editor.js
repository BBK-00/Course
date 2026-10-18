/* Кодты сайттың өзінде жазуға арналған редактор (VS Code үлгісінде): синтаксис түсі, жол нөмірлері, автотолтыру кеңестері
   (мысалы «fo» деп жазсаң, «for» ұсынылады), жақшаны автожабу, абзацты автоматты қалдыру.
   Қою (Ctrl+V) және сүйреп әкелу өшірілген: әрекеттер санап қойылады (stats). Тіл: python, cpp, javascript, java, c.
   CodeEditor.create(host, { lang, value, stats, onChange, onBlocked }) → { getValue, setValue, setLang, setDisabled, focus, root } */
(function(){
'use strict';
const { el, esc } = window.L;
const NL = '\n';

const LANG = {
  python: {
    kw:'and as assert break class continue def del elif else except finally for from global if import in is lambda not or pass raise return try while with yield True False None'.split(' '),
    fn:'print range len abs max min sum round int float str list input enumerate zip sorted pow sqrt bool tuple dict set map'.split(' '),
    snip:[['for', 'for i in range($0):' + NL + '    '], ['while', 'while $0:' + NL + '    '], ['if', 'if $0:' + NL + '    '], ['elif', 'elif $0:' + NL + '    '], ['else', 'else:' + NL + '    $0'], ['def', 'def $0():' + NL + '    ']],
    mem:{ math:'sqrt pow floor ceil fabs pi exp log sin cos'.split(' '), '*':'append pop sort format join split insert extend index count reverse copy'.split(' ') },
    com:/#.*$/gm, str:/("""[\s\S]*?"""|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g
  },
  javascript: {
    kw:'break case class const continue default else false for function if in let new null of return switch true typeof undefined var while'.split(' '),
    fn:'console parseFloat parseInt Math Number String Array Object isNaN'.split(' '),
    snip:[['for', 'for (let i = 0; i < $0; i++) {' + NL + '    ' + NL + '}'], ['while', 'while ($0) {' + NL + '    ' + NL + '}'], ['if', 'if ($0) {' + NL + '    ' + NL + '}'], ['function', 'function $0() {' + NL + '    ' + NL + '}'], ['log', 'console.log($0);']],
    mem:{ Math:'abs round floor ceil pow sqrt max min PI'.split(' '), console:['log'], '*':'length push pop toFixed map join slice reduce'.split(' ') },
    com:/\/\/.*$|\/\*[\s\S]*?\*\//gm, str:/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/g
  },
  cpp: {
    kw:'auto bool break char class const continue double else false float for if int long namespace return std string struct true using void while include endl cout cin vector'.split(' '),
    fn:'sqrt pow abs fabs printf scanf setprecision fixed'.split(' '),
    snip:[['for', 'for (int i = 0; i < $0; i++) {' + NL + '    ' + NL + '}'], ['while', 'while ($0) {' + NL + '    ' + NL + '}'], ['if', 'if ($0) {' + NL + '    ' + NL + '}'], ['cout', 'cout << $0 << endl;'], ['main', 'int main() {' + NL + '    $0' + NL + '    return 0;' + NL + '}']],
    mem:{ std:'cout cin endl vector string setprecision fixed sqrt pow'.split(' '), '*':'size push_back length'.split(' ') },
    com:/\/\/.*$|\/\*[\s\S]*?\*\//gm, str:/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g
  },
  c: {
    kw:'break char const continue double else float for if int long return struct void while include'.split(' '),
    fn:'printf scanf sqrt pow fabs abs'.split(' '),
    snip:[['for', 'for (int i = 0; i < $0; i++) {' + NL + '    ' + NL + '}'], ['while', 'while ($0) {' + NL + '    ' + NL + '}'], ['if', 'if ($0) {' + NL + '    ' + NL + '}'], ['printf', 'printf("$0\\n");'], ['main', 'int main() {' + NL + '    $0' + NL + '    return 0;' + NL + '}']],
    mem:{ '*':[] },
    com:/\/\/.*$|\/\*[\s\S]*?\*\//gm, str:/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g
  },
  java: {
    kw:'boolean break char class continue double else false final float for if int long new null public return static String void while true'.split(' '),
    fn:'System Math println printf print'.split(' '),
    snip:[['for', 'for (int i = 0; i < $0; i++) {' + NL + '    ' + NL + '}'], ['while', 'while ($0) {' + NL + '    ' + NL + '}'], ['if', 'if ($0) {' + NL + '    ' + NL + '}'], ['sout', 'System.out.println($0);'], ['main', 'public static void main(String[] args) {' + NL + '    $0' + NL + '}']],
    mem:{ Math:'abs round floor ceil pow sqrt max min PI'.split(' '), out:'println printf print'.split(' '), System:['out'], '*':['length'] },
    com:/\/\/.*$|\/\*[\s\S]*?\*\//gm, str:/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g
  }
};
const BRACE = { python:false, javascript:true, cpp:true, c:true, java:true };
const NUM = /\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/gi;
const PAIRS = { '(':')', '[':']', '{':'}', '"':'"', "'":"'" }, CLOSERS = ')]}"\'';

/* Түстеу: барлық белгілерді бір реттік өту арқылы табамыз */
function highlight(src, lang){
  const L = LANG[lang] || LANG.python, spans = [];
  const take = (re, cls) => { re.lastIndex = 0; let m; while ((m = re.exec(src))){ if (m[0] === ''){ re.lastIndex++; continue; } spans.push([m.index, m.index + m[0].length, cls]); } };
  take(L.com, 'c'); take(L.str, 's'); take(NUM, 'n');
  take(new RegExp('\\b(' + L.kw.join('|') + ')\\b', 'g'), 'k');
  take(/\b[A-Za-z_]\w*(?=\()/g, 'f');
  if (lang === 'cpp' || lang === 'c') take(/^\s*#\w+/gm, 'k');
  spans.sort((a, b) => a[0] - b[0] || (b[1] - b[0]) - (a[1] - a[0]));
  let out = '', pos = 0;
  spans.forEach(([a, b, c]) => { if (a < pos) return; out += esc(src.slice(pos, a)) + '<span class="ce-' + c + '">' + esc(src.slice(a, b)) + '</span>'; pos = b; });
  return out + esc(src.slice(pos)) + NL;
}

function create(host, o){
  o = o || {};
  const stats = o.stats || { typed:0, assist:0, pasted:0, paste:0, tpl:0 };
  let lang = o.lang || 'python', prev = '', disabled = false, items = [], sel = 0, popStart = 0, progr = false, cwCache = 0;
  const root = el('div', { class:'ce', role:'group', 'aria-label':'Код редакторы' });
  const gut = el('pre', { class:'ce-gut', 'aria-hidden':'true' }), hl = el('pre', { class:'ce-hl', 'aria-hidden':'true' });
  const ta = el('textarea', { class:'ce-ta', spellcheck:'false', autocomplete:'off', autocapitalize:'off', autocorrect:'off', 'aria-label':'Бағдарлама коды', wrap:'off' });
  const pop = el('div', { class:'ce-pop', role:'listbox', hidden:true });
  const wrap = el('div', { class:'ce-wrap' }, [hl, ta, pop]);
  root.append(gut, wrap); host.append(root);

  const lineStart = (v, p) => v.lastIndexOf(NL, p - 1) + 1;
  const idents = () => { const L = LANG[lang], known = new Set(L.kw.concat(L.fn)); return [...new Set(ta.value.match(/[A-Za-z_]\w*/g) || [])].filter(w => !known.has(w) && w.length > 1); };
  const sync = () => { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; };
  const paint = () => {
    const v = ta.value; hl.innerHTML = highlight(v, lang);
    const n = v.split(NL).length; if (gut.dataset.n !== String(n)){ gut.dataset.n = String(n); gut.textContent = Array.from({ length:n }, (_, i) => i + 1).join(NL); }
    sync();
  };
  const changed = () => { paint(); if (o.onChange) o.onChange(ta.value); };

  /* бағдарламалы енгізу: терілген емес, редактор көмегі ретінде есептеледі */
  function insert(text, s, e){
    progr = true; ta.focus();
    if (s !== undefined) ta.setSelectionRange(s, e === undefined ? s : e);
    let ok = false; try { ok = document.execCommand('insertText', false, text); } catch (x) { ok = false; }
    if (!ok){ const a = ta.selectionStart, b = ta.selectionEnd; ta.setRangeText(text, a, b, 'end'); stats.assist += text.length; }
    progr = false; prev = ta.value; changed();
  }

  /* ---- Кеңестер ---- */
  function context(){
    const v = ta.value, p = ta.selectionStart, line = v.slice(lineStart(v, p), p);
    const m = /([A-Za-z_]\w*)$/.exec(line), word = m ? m[1] : '', before = line.slice(0, line.length - word.length);
    const dot = /(?:([A-Za-z_]\w*)(?:\.|::)|(?:\.|::))$/.exec(before);
    if (!m && !(dot && !/\d\.$/.test(before))) return null;
    const quotes = (line.match(/"/g) || []).length % 2 || (line.match(/'/g) || []).length % 2;
    if (quotes || (lang === 'python' ? /#/.test(line) : /\/\//.test(line))) return null;
    return { word, start:p - word.length, member:dot ? (dot[1] || '') : null, L:LANG[lang] };
  }
  function suggest(force){
    const c = context(); if (!c || (!c.word && c.member === null && !force)){ closePop(); return; }
    const w = c.word.toLowerCase(), L = c.L, list = [];
    const add = (label, kind, text, detail, snippet) => { if (label.toLowerCase().startsWith(w) && label !== c.word) list.push({ label, kind, text, detail, snippet }); };
    if (c.member !== null) (L.mem[c.member] || L.mem['*'] || []).forEach(m => add(m, 'm', m, 'мүше'));
    else {
      L.snip.forEach(([l, t]) => add(l, 's', t, 'үлгі', true));
      L.kw.forEach(k => { if (!L.snip.some(s => s[0] === k)) add(k, 'k', k, 'кілт сөз'); });
      L.fn.forEach(f => add(f, 'f', f, 'функция'));
      idents().forEach(i => add(i, 'v', i, 'айнымалы'));
    }
    const rank = { s:0, k:1, f:2, m:2, v:3 }, seen = new Set();
    items = list.filter(x => { const k = x.label + x.kind; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => rank[a.kind] - rank[b.kind] || a.label.length - b.label.length || a.label.localeCompare(b.label)).slice(0, 8);
    if (!items.length){ closePop(); return; }
    sel = 0; popStart = c.start; drawPop(c.word.length);
  }
  const ICON = { s:'⟨⟩', k:'K', f:'ƒ', m:'·', v:'x' };
  function measure(cs){
    if (cwCache) return cwCache;
    const s = el('span', { style:'position:absolute;visibility:hidden;white-space:pre;font:' + cs.font, text:'M'.repeat(40) }); root.append(s);
    cwCache = s.getBoundingClientRect().width / 40 || 8; s.remove(); return cwCache;
  }
  function drawPop(n){
    pop.innerHTML = '';
    items.forEach((it, i) => {
      const row = el('div', { class:'ce-it' + (i === sel ? ' on' : ''), role:'option' }, [el('span', { class:'ce-ic ce-i' + it.kind, text:ICON[it.kind] }), el('span', { class:'ce-lb', html:'<b>' + esc(it.label.slice(0, n)) + '</b>' + esc(it.label.slice(n)) }), el('span', { class:'ce-dt', text:it.detail })]);
      row.addEventListener('mousedown', e => { e.preventDefault(); sel = i; accept(); });
      pop.append(row);
    });
    const v = ta.value, p = ta.selectionStart, row = v.slice(0, p).split(NL).length - 1, col = p - lineStart(v, p);
    const cs = getComputedStyle(ta), lh = parseFloat(cs.lineHeight) || 21, cw = measure(cs);
    let left = parseFloat(cs.paddingLeft) + (col - n) * cw - ta.scrollLeft, top = parseFloat(cs.paddingTop) + (row + 1) * lh - ta.scrollTop;
    pop.hidden = false;
    left = Math.max(4, Math.min(left, wrap.clientWidth - pop.offsetWidth - 4));
    if (top + pop.offsetHeight > wrap.clientHeight + 40 && row * lh - ta.scrollTop > pop.offsetHeight) top = parseFloat(cs.paddingTop) + row * lh - ta.scrollTop - pop.offsetHeight;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  function closePop(){ items = []; pop.hidden = true; }
  function accept(){
    const it = items[sel]; if (!it) return;
    const e = ta.selectionStart, v = ta.value, indent = /^[ \t]*/.exec(v.slice(lineStart(v, popStart), popStart))[0];
    closePop();
    if (it.snippet){
      const i = it.text.indexOf('$0'), ind = t => t.split(NL).join(NL + indent), before = ind(i < 0 ? it.text : it.text.slice(0, i)), after = i < 0 ? '' : ind(it.text.slice(i + 2));
      insert(before + after, popStart, e);
      const pos = popStart + before.length; ta.setSelectionRange(pos, pos);
    } else {
      let text = it.text, caret = text.length;
      if (it.kind === 'f' && v[e] !== '('){ text += '()'; caret = text.length - 1; }
      insert(text, popStart, e); const pos = popStart + caret; ta.setSelectionRange(pos, pos);
    }
  }

  /* ---- Пернетақта ---- */
  const UNIT = '    ';
  ta.addEventListener('keydown', e => {
    if (disabled) return;
    if (items.length && !pop.hidden){
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; const c = context(); drawPop(c ? c.word.length : 0); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)){ e.preventDefault(); accept(); return; }
      if (e.key === 'Escape'){ e.preventDefault(); closePop(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === ' '){ e.preventDefault(); suggest(true); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (e.key === 'Tab'){
      e.preventDefault();
      if (e.shiftKey || (s !== en && v.slice(s, en).includes(NL))){
        const ls = lineStart(v, s), block = v.slice(ls, en), out = e.shiftKey ? block.replace(/^( {1,4}|\t)/gm, '') : block.replace(/^/gm, UNIT);
        insert(out, ls, en); ta.setSelectionRange(ls, ls + out.length);
      } else insert(UNIT);
      return;
    }
    if (e.key === 'Enter'){
      e.preventDefault();
      const line = v.slice(lineStart(v, s), s), ind = /^[ \t]*/.exec(line)[0], t = line.trimEnd();
      const more = (lang === 'python' ? t.endsWith(':') : t.endsWith('{')) ? UNIT : '';
      if (BRACE[lang] && t.endsWith('{') && v[s] === '}'){ insert(NL + ind + UNIT + NL + ind); const p = s + 1 + ind.length + UNIT.length; ta.setSelectionRange(p, p); }
      else insert(NL + ind + more);
      return;
    }
    if (e.key.length === 1 && s === en){
      if (CLOSERS.includes(e.key) && v[s] === e.key){ e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
      if (e.key in PAIRS){
        const nx = v[s], pv = v[s - 1] || '', isq = e.key === '"' || e.key === "'";
        if ((!nx || /[\s)\]};,]/.test(nx)) && !(isq && /\w/.test(pv))){ e.preventDefault(); insert(e.key + PAIRS[e.key]); ta.setSelectionRange(s + 1, s + 1); return; }
      }
    }
    if (e.key === 'Backspace' && s === en && s > 0 && PAIRS[v[s - 1]] === v[s]){ e.preventDefault(); insert('', s - 1, s + 1); }
  });
  ta.addEventListener('input', () => {
    const v = ta.value, d = v.length - prev.length;
    if (d > 0){ if (progr) stats.assist += d; else stats.typed += d; }
    prev = v; changed();
    if (!progr) suggest(false);
  });
  ta.addEventListener('keyup', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) closePop(); });
  ta.addEventListener('click', closePop);
  ta.addEventListener('blur', () => setTimeout(closePop, 120));
  ta.addEventListener('scroll', () => { sync(); closePop(); });
  /* қою да, сүйреп әкелу де өшірулі */
  const blocked = (n, why) => { stats.paste++; stats.pasted += n; if (o.onBlocked) o.onBlocked(n, why); };
  ta.addEventListener('paste', e => { e.preventDefault(); blocked(((e.clipboardData && e.clipboardData.getData('text')) || '').length, 'paste'); });
  ta.addEventListener('drop', e => { e.preventDefault(); blocked(((e.dataTransfer && e.dataTransfer.getData('text')) || '').length, 'drop'); });
  ta.addEventListener('dragover', e => e.preventDefault());
  ta.addEventListener('beforeinput', e => {
    if (progr) return;
    if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop' || e.inputType === 'insertFromYank'){ e.preventDefault(); blocked((e.data || '').length || 1, e.inputType); }
    else if (e.inputType === 'insertText' && (e.data || '').length > 30){ e.preventDefault(); blocked(e.data.length, 'big'); }
  });

  function setValue(v, asTemplate){ ta.value = v; prev = v; if (asTemplate) stats.tpl = v.length; closePop(); paint(); if (o.onChange) o.onChange(v); }
  function setLang(l, tpl){ lang = LANG[l] ? l : 'python'; cwCache = 0; if (tpl !== undefined) setValue(tpl, true); else paint(); }
  function setDisabled(d){ disabled = !!d; ta.disabled = !!d; root.classList.toggle('off', !!d); if (d) closePop(); }
  lang = LANG[lang] ? lang : 'python';
  if (o.value !== undefined) setValue(o.value); else paint();
  prev = ta.value;
  return { root, ta, getValue:() => ta.value, setValue, setLang, setDisabled, focus:() => ta.focus(), stats };
}

window.CodeEditor = { create, highlight, LANG };
})();
