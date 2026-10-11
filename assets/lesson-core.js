/* Сандық әдістер — сабақ беттеріне ортақ модульдер (сыртқы кітапханасыз) */
(function(){
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function el(tag, props, kids){
  const e = document.createElement(tag);
  if (props) for (const k in props){
    const v = props[k];
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  if (kids !== undefined && kids !== null) (Array.isArray(kids) ? kids : [kids]).forEach(c => { if (c !== null && c !== undefined) e.append(c); });
  return e;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const sub = n => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[+d]);
const supS = n => String(n).replace(/-/g, '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
/* Сан форматы: ондық үтір, Unicode минус, кіші сандар ғылыми жазумен */
function fmt(x, dg){
  dg = dg === undefined ? 4 : dg;
  if (typeof x === 'string') return x;
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
  if (Math.abs(x) < 1e-12) return '0';
  if (Math.abs(x) < Math.pow(10, -dg) || Math.abs(x) >= 1e9){
    const p = x.toExponential(1).split('e');
    return p[0].replace(/\.0$/, '').replace('-', '−').replace('.', ',') + '·10' + supS(+p[1]);
  }
  const m = Math.pow(10, dg); let r = Math.round(x * m) / m; if (r === 0) r = 0;
  return String(r).replace('-', '−').replace('.', ',');
}
const fmtP = (x, dg) => (x < 0 ? '(' + fmt(x, dg) + ')' : fmt(x, dg));
function parseNum(raw){
  let s = (raw === null || raw === undefined) ? '' : String(raw).trim();
  if (!s) return { ok:false, message:'Өріс бос. Жауапты енгізіп, «Тексер» бас.' };
  s = s.replace(/[−‒–—]/g, '-').replace(/\s+/g, '').replace(/,/g, '.');
  const NUM = /^[+-]?(\d+(\.\d*)?|\.\d+)$/, bad = { ok:false, message:'Бұл санға ұқсамайды. Мысалы: 2, −1,5, 0,5 немесе 1/2 деп жаз.' };
  const p = s.split('/');
  if (p.length === 1) return NUM.test(s) ? { ok:true, value:parseFloat(s) } : bad;
  if (p.length === 2 && NUM.test(p[0]) && NUM.test(p[1])){
    const d = parseFloat(p[1]);
    return d === 0 ? { ok:false, message:'Нөлге бөлуге болмайды.' } : { ok:true, value:parseFloat(p[0]) / d };
  }
  return bad;
}
const restartClass = (n, c) => { n.classList.remove(c); void n.offsetWidth; n.classList.add(c); };

/* Анимация: жылдамдық, reduced motion, тоқтатуға болатын күту */
const Anim = {
  speed:1, reduced:!!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
  d(ms){ return this.reduced ? 0 : ms / this.speed; },
  setSpeed(s){ this.speed = s; document.documentElement.style.setProperty('--spd', String(s)); }
};
const CANCEL = { cancelled:true };
class Runner{
  constructor(){ this.id = 0; }
  cancel(){ this.id++; }
  start(){
    const id = ++this.id, self = this;
    return { get alive(){ return self.id === id; },
      wait: ms => new Promise((res, rej) => { const t = Anim.d(ms), done = () => (self.id === id ? res() : rej(CANCEL)); if (t <= 0) Promise.resolve().then(done); else setTimeout(done, t); }) };
  }
}
/* Қадамдық ойнатқыш: apply(s) — s-қадамның соңғы күйі; animate(s, ctx) — (s−1)→s өтуі. Оқытушы басқарады. */
class Stepper{
  constructor(o){
    this.o = o; this.s = 0; this.count = o.count; this.runner = new Runner();
    if (o.barHost){
      this.prevBtn = el('button', { type:'button', class:'btn small', text:'← Артқа' });
      this.cnt = el('span', { class:'stepcount', 'aria-live':'polite' });
      this.nextBtn = el('button', { type:'button', class:'btn small primary', text:'Алға →' });
      this.resetBtn = el('button', { type:'button', class:'btn small ghost', text:'↺', 'aria-label':'Басынан бастау' });
      o.barHost.append(el('div', { class:'stepbar' }, [this.prevBtn, this.cnt, this.nextBtn, this.resetBtn]));
      this.prevBtn.addEventListener('click', () => this.prev());
      this.nextBtn.addEventListener('click', () => this.next());
      this.resetBtn.addEventListener('click', () => this.reset());
    }
  }
  init(){ this.o.apply(0); this.ui(); }
  atEnd(){ return this.s >= this.count - 1; }
  async next(){
    if (this.atEnd()) return;
    this.runner.cancel(); this.o.apply(this.s);
    const target = ++this.s; this.ui();
    const ctx = this.runner.start();
    try{ if (this.o.animate) await this.o.animate(target, ctx); }
    catch(e){ if (e !== CANCEL) console.error(e); return; }
    if (ctx.alive) this.o.apply(target);
  }
  prev(){ if (this.s <= 0) return; this.runner.cancel(); this.s--; this.o.apply(this.s); this.ui(); }
  reset(){ this.runner.cancel(); this.s = 0; this.o.apply(0); this.ui(); }
  ui(){
    if (this.cnt){ this.cnt.textContent = 'Қадам ' + (this.s + 1) + ' / ' + this.count; this.prevBtn.disabled = this.s === 0; this.nextBtn.disabled = this.atEnd(); }
    Course.update();
  }
}
class ExplainPanel{
  constructor(host){
    this.root = el('div', { class:'explain', 'aria-live':'polite' });
    const blk = (cls, tag) => { const p = el('p'); this.root.append(el('div', { class:'ex-block ' + cls }, [el('span', { class:'ex-tag', text:tag }), p])); return p; };
    this.now = blk('now', 'ҚАЗІР'); this.why = blk('why', 'НЕГЕ ОРЫНДАЛАДЫ'); this.how = blk('how', 'ҚАЛАЙ ОРЫНДАЛАДЫ');
    this.calc = el('div', { class:'ex-calc' }); this.after = el('p', { class:'ex-after' });
    this.root.append(this.calc, this.after); host.append(this.root);
  }
  set(t){
    this.now.innerHTML = t.now || ''; this.why.innerHTML = t.why || ''; this.how.innerHTML = t.how || '';
    this.calc.innerHTML = ''; (t.calc ? [].concat(t.calc) : []).forEach(l => this.calc.append(el('span', { class:'ln', text:l })));
    this.after.innerHTML = t.after || '';
  }
  addLine(text){ $$('.ln.cur', this.calc).forEach(x => x.classList.remove('cur')); const l = el('span', { class:'ln cur fade-in', text }); this.calc.append(l); return l; }
}
/* Тексеру өрісі: 1-қате → кеңес, 2-қате → нақтырақ кеңес + амалы, 3-қате немесе «Жауапты көрсет» → жауап */
class Check{
  constructor(host, o){
    this.o = o; this.errors = 0; this.done = false;
    const id = 'cf' + Math.random().toString(36).slice(2, 8);
    this.root = el('div', { class:'cf' });
    this.input = el('input', { id, type:'text', class:'cf-input', autocomplete:'off', spellcheck:'false', placeholder:'жауап' });
    this.btn = el('button', { type:'button', class:'btn small', text:'Тексер' });
    this.badge = el('span', { class:'cf-badge' });
    this.fb = el('div', { class:'cf-fb', role:'status' });
    this.show = el('button', { type:'button', class:'btn small ghost', text:'Жауапты көрсет', hidden:true });
    this.root.append(el('label', { class:'cf-label', for:id, html:o.label }), el('div', { class:'cf-row' }, [this.input, this.btn, this.badge]), this.fb, this.show);
    this.btn.addEventListener('click', () => this.check());
    this.input.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); this.check(); } });
    this.show.addEventListener('click', () => this.reveal());
    host.append(this.root);
  }
  say(h, cls){ this.fb.innerHTML = h; this.fb.className = 'cf-fb' + (cls ? ' ' + cls : ''); }
  check(){
    if (this.done) return;
    const p = parseNum(this.input.value);
    if (!p.ok){ this.say(p.message, 'muted'); return; }
    if (Math.abs(p.value - this.o.expected) <= (this.o.tol || 1e-6)){ this.ok(false); return; }
    this.errors++; this.root.classList.add('bad'); this.badge.textContent = 'Қате ✕'; restartClass(this.input, 'shake');
    if (this.errors === 1){ this.say(this.o.hints[0]); this.show.hidden = false; }
    else if (this.errors === 2) this.say(this.o.hints[1] + (this.o.how ? '<br><span class="mono">' + esc(this.o.how) + '</span>' : ''));
    else this.reveal();
  }
  reveal(){ this.input.value = fmt(this.o.expected, this.o.dg || 4); this.ok(true); }
  ok(shown){
    this.done = true; this.input.readOnly = true; this.btn.disabled = true; this.show.hidden = true;
    this.root.classList.remove('bad'); this.root.classList.add('ok');
    this.badge.textContent = shown ? 'Жауап көрсетілді' : 'Дұрыс ✓';
    this.say(shown && this.o.how ? '<span class="mono">' + esc(this.o.how) + '</span>' : (this.o.success || ''));
    if (this.o.onCorrect) this.o.onCorrect(shown);
  }
}
/* Python syntax highlighting */
function highlightPy(src){
  const re = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(def|for|in|if|else|elif|return|raise|break|while|and|or|not|None|True|False|import|from|as)\b|\b(len|range|sum|max|abs|print|float|ValueError|RuntimeError)\b|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))){
    const cls = m[1] ? 't-com' : m[2] ? 't-str' : m[3] ? 't-kw' : m[4] ? 't-fn' : 't-num';
    out += esc(src.slice(last, m.index)) + '<span class="' + cls + '">' + esc(m[0]) + '</span>';
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
class CodeView{
  constructor(host, o){
    const lines = o.code.split('\n');
    this.root = el('div', { class:'code', role:'region', 'aria-label':o.label || 'Python коды' });
    const pre = el('pre'), code = el('code'); this.lineEls = {};
    lines.forEach((t, i) => { const ln = el('span', { class:'cl', html:'<span class="lnum">' + (i + 1) + '</span>' + highlightPy(t) }); code.append(ln); this.lineEls[i + 1] = ln; });
    pre.append(code); this.root.append(pre); host.append(this.root);
  }
  highlight(ns){ Object.values(this.lineEls).forEach(l => l.classList.remove('hl')); (ns || []).forEach(n => this.lineEls[n] && this.lineEls[n].classList.add('hl')); }
}
function copyText(text, msgEl){
  const ok = () => { msgEl.textContent = 'Көшірілді ✓'; setTimeout(() => { msgEl.textContent = ''; }, 2500); };
  const fallback = () => { try{ const ta = el('textarea', { style:'position:fixed;left:-9999px' }); ta.value = text; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok(); }catch(e){ msgEl.textContent = 'Көшіру мүмкін болмады.'; } };
  try{ navigator.clipboard.writeText(text).then(ok, fallback); }catch(e){ fallback(); }
}

/* Курс беті: шапка, навигация, прогресс, төменгі басқару панелі, пернетақта */
const Course = {
  secs:{}, sections:[], section:'hero', ready:false,
  init(o){
    this.sections = o.sections;
    const nav = el('ol', { class:'nav-list' });
    this.links = {};
    o.sections.forEach(s => { const a = el('a', { href:'#' + s.id }, [el('span', { class:'nn', text:String(s.n) }), el('span', { class:'nl', text:s.title })]); nav.append(el('li', null, a)); this.links[s.id] = a; });
    this.fill = el('div', { class:'progress-fill' }); this.ptext = el('span', { class:'progress-text', text:'0 / ' + o.sections.length });
    const head = el('header', { class:'topbar' }, [
      el('div', { class:'topbar-in' }, [el('a', { class:'brand', href:o.back.href }, [el('span', { text:'←' }), el('span', { class:'bl', text:o.back.text.replace(/^←s*/, ' ') })])].concat(o.title ? [el('span', { class:'lesson-title' }, [el('b', { text:String(o.title[0]) }), o.title[1]])] : [], [el('nav', { class:'nav', 'aria-label':'Сабақ бөлімдері' }, nav)])),
      el('div', { class:'progress' }, [el('span', { text:'Сабақ барысы' }), el('div', { class:'progress-track' }, this.fill), this.ptext])
    ]);
    document.body.prepend(head);
    this.prevB = el('button', { type:'button', class:'btn', text:'← Артқа' });
    this.resetB = el('button', { type:'button', class:'btn ghost', text:'↺ Қайта бастау' });
    this.nextB = el('button', { type:'button', class:'btn primary', text:'Алға →' });
    this.info = el('span', { class:'ctrl-info', 'aria-live':'polite' });
    const sp = el('input', { type:'range', min:'0', max:'3', step:'1', value:'1', 'aria-label':'Жылдамдық' }), spo = el('output', { text:'1x' });
    document.body.append(el('div', { class:'ctrl', role:'region', 'aria-label':'Қадамдарды басқару' }, el('div', { class:'ctrl-in' }, [this.prevB, this.resetB, this.nextB, this.info, el('label', { class:'speed' }, ['Жылдамдық', sp, spo])])));
    const SP = [0.5, 1, 1.5, 2];
    try{ const v = +localStorage.getItem('course-speed'); if (SP.includes(v)) sp.value = String(SP.indexOf(v)); }catch(e){}
    const setSp = () => { const v = SP[+sp.value]; Anim.setSpeed(v); spo.textContent = String(v).replace('.', ',') + 'x'; try{ localStorage.setItem('course-speed', v); }catch(e){} };
    sp.addEventListener('input', setSp); setSp();
    this.prevB.addEventListener('click', () => this.prev());
    this.nextB.addEventListener('click', () => this.next());
    this.resetB.addEventListener('click', () => { const s = this.secs[this.section]; if (s && s.reset) s.reset(); });
    document.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (e.key === 'ArrowRight'){ e.preventDefault(); this.next(); }
      else if (e.key === 'ArrowLeft'){ e.preventDefault(); this.prev(); }
    });
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) this.setActive(x.target.dataset.sec); }), { rootMargin:'-35% 0px -60% 0px' });
      $$('section[data-sec]').forEach(s => io.observe(s));
    }
    this.ready = true; this.setActive('hero');
  },
  register(id, obj){ this.secs[id] = obj; },
  stp(){ const s = this.secs[this.section]; return s && s.stepper ? s.stepper : null; },
  order(){ return $$('section[data-sec]').map(s => s.dataset.sec); },
  goTo(id){ const t = document.getElementById(id); if (t){ t.scrollIntoView({ behavior:Anim.reduced ? 'auto' : 'smooth', block:'start' }); this.setActive(id); } },
  next(){ const st = this.stp(); if (st && !st.atEnd()){ st.next(); return; } const o = this.order(), i = o.indexOf(this.section); if (i < o.length - 1) this.goTo(o[i + 1]); },
  prev(){ const st = this.stp(); if (st && st.s > 0){ st.prev(); return; } const o = this.order(), i = o.indexOf(this.section); if (i > 0) this.goTo(o[i - 1]); },
  setActive(id){
    if (!this.ready) return;
    this.section = id;
    Object.entries(this.links).forEach(([k, a]) => a.classList.toggle('active', k === id));
    const s = this.sections.find(x => x.id === id), n = this.sections.length;
    this.fill.style.width = (s ? s.n / n * 100 : 0) + '%';
    this.ptext.textContent = s ? s.n + ' / ' + n + ', ' + s.title : '0 / ' + n;
    const a = this.links[id]; if (a){ const l = a.parentElement.parentElement; l.scrollTo({ left:a.offsetLeft - l.clientWidth / 2 + a.clientWidth / 2 }); }
    this.update();
  },
  update(){
    if (!this.ready) return;
    const s = this.sections.find(x => x.id === this.section), st = this.stp();
    const title = s ? s.n + '. ' + s.title : 'Шолу';
    this.info.textContent = st ? title + ' · Қадам ' + (st.s + 1) + ' / ' + st.count : title;
    this.nextB.textContent = st && !st.atEnd() ? 'Алға →' : 'Келесі бөлім →';
    this.prevB.textContent = st && st.s > 0 ? '← Артқа' : '← Алдыңғы бөлім';
  }
};

window.L = { $, $$, el, esc, sub, supS, fmt, fmtP, parseNum, restartClass, Anim, CANCEL, Runner, Stepper, ExplainPanel, Check, CodeView, highlightPy, copyText, Course };
})();
