/* 7-тақырып: аппроксимация және интерполяция. Анимациялар anime.js арқылы; барлығын оқытушы «Алға / Артқа» батырмасымен басқарады.
   Қолданылған көмекші: Plot (SVG график), Demo (қадамдық ойнатқыш: элементтер қадам нөміріне байланып көрінеді). */
(function(){
'use strict';
const { el, fmt, Stepper, ExplainPanel, Course, Anim } = window.L;
const NS = 'http://www.w3.org/2000/svg';
const S = (tag, a, parent) => { const e = document.createElementNS(NS, tag); for (const k in (a || {})) e.setAttribute(k, a[k]); if (parent) parent.append(e); return e; };
const hasA = () => typeof window.anime === 'function' && !Anim.reduced;
const f1 = v => fmt(v, 3);
const N = v => String(v).replace('-', '−').replace('.', ',');

/* ================= Математика ================= */
const lagrange = (xs, ys) => x => { let s = 0; for (let i = 0; i < xs.length; i++){ let t = ys[i]; for (let j = 0; j < xs.length; j++) if (j !== i) t *= (x - xs[j]) / (xs[i] - xs[j]); s += t; } return s; };
const piecewise = (xs, ys) => x => { let i = 0; while (i < xs.length - 2 && x > xs[i + 1]) i++; return ys[i] + (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) * (x - xs[i]); };
function naturalSpline(xs, ys){
  const n = xs.length - 1, h = [], a = [], b = [], c = [], d = [];
  for (let i = 0; i < n; i++) h[i] = xs[i + 1] - xs[i];
  const m = Array(n + 1).fill(0);   /* екінші туындылар (табиғи шекара: m0 = mn = 0) */
  for (let i = 1; i < n; i++){ a[i] = h[i - 1]; b[i] = 2 * (h[i - 1] + h[i]); c[i] = h[i]; d[i] = 6 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1]); }
  for (let i = 2; i < n; i++){ const w = a[i] / b[i - 1]; b[i] -= w * c[i - 1]; d[i] -= w * d[i - 1]; }
  for (let i = n - 1; i >= 1; i--) m[i] = (d[i] - (i < n - 1 ? c[i] * m[i + 1] : 0)) / b[i];
  return x => { let i = 0; while (i < n - 1 && x > xs[i + 1]) i++; const t = xs[i + 1] - x, u = x - xs[i]; return m[i] * t * t * t / (6 * h[i]) + m[i + 1] * u * u * u / (6 * h[i]) + (ys[i] / h[i] - m[i] * h[i] / 6) * t + (ys[i + 1] / h[i] - m[i + 1] * h[i] / 6) * u; };
}
function lsLine(xs, ys){ const n = xs.length, sx = xs.reduce((s, v) => s + v, 0), sy = ys.reduce((s, v) => s + v, 0), sxx = xs.reduce((s, v) => s + v * v, 0), sxy = xs.reduce((s, v, i) => s + v * ys[i], 0), a1 = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a1, a0: (sy - a1 * sx) / n }; }

/* ================= Plot: SVG график ================= */
class Plot{
  constructor(host, o){
    const w = o.w || 640, h = o.h || 380, pad = Object.assign({ l:48, r:18, t:14, b:38 }, o.pad || {});
    Object.assign(this, { w, h, pad, xmin:o.xmin, xmax:o.xmax, ymin:o.ymin, ymax:o.ymax });
    this.svg = S('svg', { viewBox:'0 0 ' + w + ' ' + h, class:'pl', role:'img', 'aria-label':o.label || 'График' });
    const id = 'cp' + Math.random().toString(36).slice(2, 8), defs = S('defs', {}, this.svg), cp = S('clipPath', { id }, defs);
    S('rect', { x:pad.l, y:pad.t, width:w - pad.l - pad.r, height:h - pad.t - pad.b }, cp);
    this.gGrid = S('g', {}, this.svg); this.gBack = S('g', {}, this.svg);
    this.gCurves = S('g', { 'clip-path':'url(#' + id + ')' }, this.svg); this.gMarks = S('g', {}, this.svg); this.gPts = S('g', {}, this.svg);
    (o.xt || []).forEach(t => { const v = Array.isArray(t) ? t[0] : t, lb = Array.isArray(t) ? t[1] : N(t); S('line', { x1:this.X(v), x2:this.X(v), y1:pad.t, y2:h - pad.b, class:'gl' }, this.gGrid); S('text', { x:this.X(v), y:h - pad.b + 18, 'text-anchor':'middle' }, this.gGrid).textContent = lb; });
    (o.yt || []).forEach(t => { const v = Array.isArray(t) ? t[0] : t, lb = Array.isArray(t) ? t[1] : N(t); S('line', { x1:pad.l, x2:w - pad.r, y1:this.Y(v), y2:this.Y(v), class:'gl' }, this.gGrid); S('text', { x:pad.l - 8, y:this.Y(v) + 4, 'text-anchor':'end' }, this.gGrid).textContent = lb; });
    S('line', { x1:pad.l, x2:w - pad.r, y1:h - pad.b, y2:h - pad.b, class:'ax' }, this.gGrid); S('line', { x1:pad.l, x2:pad.l, y1:pad.t, y2:h - pad.b, class:'ax' }, this.gGrid);
    if (this.ymin < 0 && this.ymax > 0) S('line', { x1:pad.l, x2:w - pad.r, y1:this.Y(0), y2:this.Y(0), class:'ax0' }, this.gGrid);
    if (o.xl) S('text', { x:w - pad.r, y:h - 6, 'text-anchor':'end', class:'al' }, this.gGrid).textContent = o.xl;
    if (o.yl) S('text', { x:pad.l + 6, y:pad.t + 10, class:'al' }, this.gGrid).textContent = o.yl;
    host.append(this.svg);
  }
  X(x){ return this.pad.l + (x - this.xmin) / (this.xmax - this.xmin) * (this.w - this.pad.l - this.pad.r); }
  Y(y){ return this.h - this.pad.b - (y - this.ymin) / (this.ymax - this.ymin) * (this.h - this.pad.t - this.pad.b); }
  d(fn, a, b, n){
    n = n || 160; let s = '', lim = (this.ymax - this.ymin) * 4;
    for (let i = 0; i <= n; i++){ const x = a + (b - a) * i / n; let y = fn(x); if (!isFinite(y)) continue; y = Math.max(this.ymin - lim, Math.min(this.ymax + lim, y)); s += (s ? 'L' : 'M') + this.X(x).toFixed(1) + ' ' + this.Y(y).toFixed(1); }
    return s;
  }
  curve(fn, a, b, style, n){ return S('path', { d:this.d(fn, a, b, n), style:'fill:none;stroke-linejoin:round;stroke-linecap:round;' + style }, this.gCurves); }
  seg(x1, y1, x2, y2, style, layer){ return S('line', { x1:this.X(x1), y1:this.Y(y1), x2:this.X(x2), y2:this.Y(y2), style:style }, layer || this.gMarks); }
  pt(x, y, color, r){ return S('circle', { cx:this.X(x), cy:this.Y(y), r:r || 7, style:'fill:' + (color || 'var(--primary)') + ';stroke:#fff;stroke-width:2.5', class:'pt' }, this.gPts); }
  txt(x, y, str, o){ o = o || {}; const t = S('text', { x:this.X(x) + (o.dx || 0), y:this.Y(y) + (o.dy || 0), 'text-anchor':o.anchor || 'start', style:'font-weight:700;font-size:' + (o.size || 14) + 'px;fill:' + (o.color || 'var(--text)') }, this.gMarks); t.textContent = str; return t; }
}

/* ================= Demo: қадамдық ойнатқыш ================= */
class Demo{
  constructor(o){
    this.items = []; this.anims = []; this.fxs = {}; this.applyFns = []; this.steps = o.steps;
    this.ex = new ExplainPanel(o.side);
    this.stepper = new Stepper({ count:o.steps.length, apply:s => this.apply(s), animate:(s, ctx) => this.animate(s, ctx), barHost:o.bar });
    if (o.id) Course.register(o.id, { stepper:this.stepper, reset:() => this.stepper.reset() });
    this.stepper.init();
  }
  tag(els, s, o){ o = o || {}; [].concat(els).forEach(e => { if (e) this.items.push({ e, s, end:o.end, draw:!!o.draw, pop:!!o.pop, delay:o.delay || 0, tr:!!o.tr }); }); return els; }
  vis(i, st){ return st >= i.s && (i.end === undefined || st < i.end); }
  stop(){ this.anims.forEach(a => { try { a.pause(); } catch (e) {} }); this.anims = []; }
  onApply(fn){ this.applyFns.push(fn); }
  fx(s, fn){ (this.fxs[s] = this.fxs[s] || []).push(fn); }
  apply(st){
    this.stop();
    this.items.forEach(i => { const v = this.vis(i, st), e = i.e; e.style.opacity = v ? '1' : '0'; e.style.visibility = v ? 'visible' : 'hidden'; if (i.draw){ e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; } e.style.transform = ''; });
    this.applyFns.forEach(f => f(st));
    this.ex.set(this.steps[st].t);
  }
  run(opts){ const a = window.anime(opts); this.anims.push(a); return a.finished; }
  async animate(st, ctx){
    if (!hasA()) return;
    const inn = this.items.filter(i => i.s === st), out = this.items.filter(i => i.end === st), ps = [];
    inn.forEach(i => { i.e.style.visibility = 'visible'; i.e.style.opacity = '0'; });
    inn.filter(i => i.draw).forEach(i => { const L = i.e.getTotalLength(); i.e.style.strokeDasharray = L; i.e.style.strokeDashoffset = L; i.e.style.opacity = '1'; ps.push(this.run({ targets:i.e, strokeDashoffset:[L, 0], duration:Anim.d(1000), delay:Anim.d(i.delay), easing:'easeInOutSine' })); });
    const pops = inn.filter(i => i.pop).map(i => i.e), plain = inn.filter(i => !i.draw && !i.pop).map(i => i.e);
    if (pops.length) ps.push(this.run({ targets:pops, opacity:[0, 1], scale:[0.2, 1], duration:Anim.d(520), delay:window.anime.stagger(Anim.d(140)), easing:'easeOutBack' }));
    if (plain.length) ps.push(this.run({ targets:plain, opacity:[0, 1], translateY:[6, 0], duration:Anim.d(520), delay:window.anime.stagger(Anim.d(70)), easing:'easeOutQuad' }));
    out.forEach(i => ps.push(this.run({ targets:i.e, opacity:[1, 0], duration:Anim.d(450), easing:'linear' })));
    (this.fxs[st] || []).forEach(fn => ps.push(fn(ctx)));
    await Promise.all(ps);
  }
}
const pulse = (e, sc) => { if (hasA()) window.anime({ targets:e, scale:[1, sc || 1.12, 1], duration:Anim.d(420), easing:'easeInOutSine' }); };
const tween = (from, to, ms, upd, ease) => hasA() ? window.anime({ targets:{ v:from }, v:to, duration:Anim.d(ms), easing:ease || 'easeInOutQuad', update:a => upd(a.animations[0].currentValue), complete:() => upd(to) }).finished : (upd(to), Promise.resolve());

const BLUE = 'var(--info)', GREEN = 'var(--ok-ring)', ORANGE = 'var(--pivot-ring)', RED = 'var(--bad)', GRAY = '#94A3B8', VIOLET = 'var(--violet)';
const cstyle = (c, w, dash) => 'stroke:' + c + ';stroke-width:' + (w || 3.5) + (dash ? ';stroke-dasharray:' + dash : '');

/* ============ A. Мәселе: температура ============ */
function demoTemp(){
  const stage = document.getElementById('dtStage'), tb = el('table', { class:'tmp' }), data = [[12, 20], [13, 23], [14, 25]];
  tb.innerHTML = '<tr><th>Сағат</th>' + data.map(d => '<td>' + d[0] + ':00</td>').join('') + '<td class="q">13:30</td></tr><tr><th>Температура</th>' + data.map(d => '<td>' + d[1] + '°</td>').join('') + '<td class="q">?</td></tr>';
  stage.append(tb);
  const P = new Plot(stage, { xmin:11.6, xmax:14.4, ymin:18.5, ymax:26.5, xt:[[12, '12:00'], [13, '13:00'], [14, '14:00']], yt:[20, 22, 24, 26], xl:'сағат', yl:'t, °C', label:'Температура графигі' });
  const pts = data.map(d => P.pt(d[0], d[1], 'var(--primary)', 8));
  const qline = P.seg(13.5, 18.5, 13.5, 26.5, 'stroke:' + RED + ';stroke-width:2;stroke-dasharray:6 6'), qtxt = P.txt(13.5, 19.3, '13:30 — ?', { anchor:'middle', color:'var(--bad)', size:15 });
  const p2 = lagrange(data.map(d => d[0]), data.map(d => d[1]));
  const lin = P.curve(x => 23 + 2 * (x - 13), 13, 14, cstyle(GREEN, 4.5)), v1 = P.pt(13.5, 24, GREEN, 8), l1 = P.txt(13.5, 24, '24°', { dx:12, dy:6, color:'var(--ok)', size:16 });
  const par = P.curve(p2, 11.9, 14.1, cstyle(VIOLET, 3, '8 6')), v2 = P.pt(13.5, p2(13.5), VIOLET, 6), l2 = P.txt(13.5, p2(13.5), '≈ 24,1°', { dx:-14, dy:-12, anchor:'end', color:'var(--violet)', size:15 });
  const steps = [
    { t:{ now:'Температураны сағат сайын өлшедік. Кестеде үш мән бар: 12:00, 13:00 және 14:00.', why:'Өлшеуді енді қайталай алмаймыз, бізде тек осы нүктелер бар.', how:'Сұрақ: 13:30-да температура қанша болды? Бұл мән кестеде жоқ.' } },
    { t:{ now:'Кестені графикке саламыз: әр өлшем бір нүкте.', why:'График мәндердің қалай өзгергенін көрсетеді.', how:'Көлденең ось — сағат, тік ось — температура.' } },
    { t:{ now:'13:30 нүктесін белгілейміз. Бұл нүктеде мән белгісіз.', why:'Табатын мән өлшенген нүктелердің арасында жатыр.', how:'Бұл — интерполяция есебі: берілген нүктелердің ішіндегі мәнді болжау.' } },
    { t:{ now:'Көрші екі нүктені түзумен қосамыз.', why:'Түзу — ең қарапайым функция, оны есептеу оңай.', how:'13:00 мен 14:00 арасындағы түзуді аламыз.' } },
    { t:{ now:'Түзу бойымен 13:30-дағы мәнді оқимыз: 24°.', why:'Бір сағатта температура 2° өсті, жарты сағатта 1° өседі.', how:'Есептеу: 23 + 0,5 · 2 = 24.', calc:['23 + 0,5 · (25 − 23) = 24'] } },
    { t:{ now:'Үш нүкте арқылы парабола жүргізсек, жауап 24,125° болады.', why:'Парабола өсудің үдеуін де ескереді, сондықтан дәлірек болуы мүмкін.', how:'Жуық мән екі тәсілмен де шамалас. Дәлдік жаңа бөлімдерде талданады.', after:'Нақты мән белгісіз, сондықтан екі жауап та жуық.' } }
  ];
  const d = new Demo({ steps, side:document.getElementById('dtSide'), bar:document.getElementById('dtBar'), id:'idea' });
  d.tag(tb, 0); d.tag(pts, 1, { pop:true }); d.tag([qline, qtxt], 2); d.tag(lin, 3, { draw:true }); d.tag([v1, l1], 4, { pop:true }); d.tag(par, 5, { draw:true }); d.tag([v2, l2], 5, { pop:true, delay:900 });
  d.apply(0);
}

/* ============ B. Аппроксимация және интерполяция ============ */
function demoApprox(){
  const stage = document.getElementById('dbStage'), xs = [1, 2, 3, 4, 5], ys = [2.2, 3.0, 4.7, 4.5, 6.4];
  const ls = lsLine(xs, ys), F = x => ls.a0 + ls.a1 * x, L = lagrange(xs, ys);
  const P = new Plot(stage, { xmin:0.5, xmax:5.5, ymin:1, ymax:7.5, xt:xs, yt:[2, 4, 6], xl:'x', yl:'y', label:'Аппроксимация және интерполяция' });
  const res = xs.map((x, i) => P.seg(x, ys[i], x, F(x), 'stroke:' + RED + ';stroke-width:3.5')), rl = xs.map((x, i) => P.txt(x, (ys[i] + F(x)) / 2, 'R' + '₁₂₃₄₅'[i], { dx:10, dy:5, color:'var(--bad)', size:13 }));
  const line = P.curve(F, 0.5, 5.5, cstyle(BLUE, 4)), lt = P.txt(5.4, F(5.4), 'F(x) = a₀ + a₁x', { anchor:'end', dy:-12, color:'var(--info)', size:15 });
  const cur = P.curve(L, 1, 5, cstyle(GREEN, 4)), ct = P.txt(5, 7.1, 'P(xᵢ) = yᵢ', { anchor:'end', color:'var(--ok)', size:15 });
  const pts = xs.map((x, i) => P.pt(x, ys[i], 'var(--primary)', 8));
  const steps = [
    { t:{ now:'Өлшеу нәтижелері: 5 нүкте. Олар бір түзудің бойында емес, шашыраңқы.', why:'Нақты өлшеуде әрқашан аздаған қателік болады.', how:'Бізге бұл нүктелерге жақын жүретін қарапайым функция керек.' } },
    { t:{ now:'Түзу F(x) = a₀ + a₁x жүргіземіз: ол нүктелерге жақын жүреді, бірақ олардан өтпейді.', why:'Бұл аппроксимация: функцияны қарапайым функциямен ауыстырамыз.', how:'Коэффициенттер a₀, a₁ ауытқу мейлінше аз болатындай таңдалады.' } },
    { t:{ now:'Қызыл кесінділер — ауытқу R(xᵢ) = f(xᵢ) − F(xᵢ).', why:'Ауытқу жуықтаудың қаншалықты дәл екенін көрсетеді.', how:'Түзу нүктелерден өтпейді, сондықтан ауытқу нөл емес.', calc:['f(x) = F(x) + R(x)'] } },
    { t:{ now:'Енді қисық әр нүктеден өтеді: ауытқу барлық түйінде нөл.', why:'Бұл интерполяция: деректерді дәл деп есептейміз және F(xᵢ) = yᵢ болуын талап етеміз.', how:'Қызыл кесінділер жоғалды, себебі R(xᵢ) = 0.', after:'Интерполяция — аппроксимацияның ерекше түрі.' } }
  ];
  const d = new Demo({ steps, side:document.getElementById('dbSide'), bar:document.getElementById('dbBar'), id:'approx' });
  d.tag(line, 1, { draw:true, end:3 }); d.tag(lt, 1, { end:3 }); d.tag(res, 2, { end:3, pop:false }); d.tag(rl, 2, { end:3 }); d.tag(cur, 3, { draw:true }); d.tag(ct, 3);
  d.apply(0);
}

/* ============ C. Интерполяция және экстраполяция (слайдер) ============ */
function demoRange(){
  const stage = document.getElementById('dcStage'), xs = [0, 1, 2, 3, 4], ys = xs.map(Math.sin), P1 = lagrange(xs, ys), f = Math.sin;
  const P = new Plot(stage, { xmin:-1.2, xmax:5.4, ymin:-2.6, ymax:2.6, xt:[0, 1, 2, 3, 4, 5], yt:[-2, -1, 0, 1, 2], xl:'x', yl:'y', label:'Интерполяция және экстраполяция' });
  S('rect', { x:P.X(0), y:P.pad.t, width:P.X(4) - P.X(0), height:P.h - P.pad.t - P.pad.b, style:'fill:var(--ok-bg);opacity:.7' }, P.gBack);
  const t1 = P.txt(2, 2.25, 'интерполяция аймағы', { anchor:'middle', color:'var(--ok)', size:14 }), t2 = P.txt(-1.1, 2.25, 'экстраполяция', { color:'var(--bad)', size:14 }), t3 = P.txt(5.3, 2.25, 'экстраполяция', { anchor:'end', color:'var(--bad)', size:14 });
  P.curve(f, -1.2, 5.4, cstyle(GRAY, 3, '7 6')); P.curve(P1, -1.2, 5.4, cstyle(BLUE, 4));
  xs.forEach((x, i) => P.pt(x, ys[i], 'var(--primary)', 7));
  const mk = P.seg(1.5, -2.6, 1.5, 2.6, 'stroke:' + ORANGE + ';stroke-width:2.5'), dF = P.pt(1.5, f(1.5), GRAY, 6), dP = P.pt(1.5, P1(1.5), BLUE, 7);
  const ctl = el('div', { class:'rng' }), sl = el('input', { type:'range', min:'-1.2', max:'5.4', step:'0.05', value:'1.5', 'aria-label':'x нүктесі' }), out = el('div', { class:'rng-out', role:'status' });
  const b1 = el('button', { type:'button', class:'btn small', text:'x → интерполяция' }), b2 = el('button', { type:'button', class:'btn small', text:'x → экстраполяция' });
  ctl.append(el('label', { text:'x нүктесін жылжыт:' }), sl, el('div', { class:'stepbar' }, [b1, b2])); stage.append(ctl, out);
  const upd = () => {
    const x = +sl.value, inside = x >= 0 && x <= 4, e = Math.abs(f(x) - P1(x));
    mk.setAttribute('x1', P.X(x)); mk.setAttribute('x2', P.X(x)); dF.setAttribute('cx', P.X(x)); dF.setAttribute('cy', P.Y(Math.max(P.ymin, Math.min(P.ymax, f(x))))); dP.setAttribute('cx', P.X(x)); dP.setAttribute('cy', P.Y(Math.max(P.ymin - 2, Math.min(P.ymax + 2, P1(x)))));
    out.innerHTML = '<span class="badge ' + (inside ? 'ok' : 'bad') + '">' + (inside ? 'Интерполяция' : 'Экстраполяция') + '</span> x = <b>' + N(x.toFixed(2)) + '</b> &nbsp; f(x) = <b>' + N(f(x).toFixed(3)) + '</b> &nbsp; P(x) = <b>' + N(P1(x).toFixed(3)) + '</b> &nbsp; қателік = <b style="color:var(' + (e < 0.05 ? '--ok' : e < 0.5 ? '--pivot' : '--bad') + ')">' + N(e.toFixed(3)) + '</b>';
  };
  let was = true; sl.addEventListener('input', () => { upd(); const ins = +sl.value >= 0 && +sl.value <= 4; if (ins !== was){ was = ins; pulse(out.querySelector('.badge'), 1.2); } });
  const go = v => tween(+sl.value, v, 1400, x => { sl.value = x; upd(); });
  b1.addEventListener('click', () => go(2.5)); b2.addEventListener('click', () => go(5.2));
  upd();
}

/* ============ D. Жалғыздық: түйін қосамыз ============ */
function demoUnique(){
  const stage = document.getElementById('duStage'), xs = [1, 2, 3, 4, 5], ys = [2, 3.6, 2.8, 4.9, 3.7];
  const P = new Plot(stage, { xmin:0.4, xmax:5.6, ymin:0, ymax:7, xt:xs, yt:[2, 4, 6], xl:'x', yl:'y', label:'Түйін қосу' });
  const poly = k => lagrange(xs.slice(0, k), ys.slice(0, k)), samp = (fn) => { const a = []; for (let i = 0; i <= 120; i++){ const x = xs[0] - 0.5 + (xs[4] - xs[0] + 1) * i / 120; a.push(fn(x)); } return a; };
  const D = (arr) => { let s = ''; arr.forEach((y, i) => { const x = xs[0] - 0.5 + (xs[4] - xs[0] + 1) * i / 120; y = Math.max(-6, Math.min(13, y)); s += (s ? 'L' : 'M') + P.X(x).toFixed(1) + ' ' + P.Y(y).toFixed(1); }); return s; };
  const path = S('path', { style:'fill:none;stroke-linecap:round;stroke-linejoin:round;' + cstyle(BLUE, 4) }, P.gCurves), cap = P.txt(5.5, 6.5, '', { anchor:'end', color:'var(--info)', size:16 });
  const pts = xs.map((x, i) => P.pt(x, ys[i], 'var(--primary)', 8));
  const NAME = ['', 'тұрақты (n = 0)', 'түзу (n = 1)', 'парабола (n = 2)', 'кубтық (n = 3)', '4-дәрежелі (n = 4)'];
  const steps = [
    { t:{ now:'Бізде әзірге түйін жоқ. Түйін қосып, олар арқылы өтетін көпмүшелікті бақылаймыз.', why:'Мақсат: n + 1 түйін арқылы өтетін, дәрежесі n-нен аспайтын көпмүшелікті табу.', how:'«Алға →» басқан сайын бір түйін қосылады.' } },
    { t:{ now:'1 түйін: дәрежесі 0 көпмүшелік — көлденең түзу.', why:'Бір нүкте арқылы дәрежесі 0 болатын жалғыз көпмүшелік өтеді.', how:'n + 1 = 1, демек n = 0.' } },
    { t:{ now:'2 түйін: олар арқылы жалғыз түзу өтеді.', why:'Екі нүкте түзуді бірмәнді анықтайды.', how:'n + 1 = 2, демек n = 1.' } },
    { t:{ now:'3 түйін: жалғыз парабола өтеді.', why:'Үш нүкте екінші дәрежелі көпмүшелікті бірмәнді анықтайды.', how:'n + 1 = 3, демек n = 2.' } },
    { t:{ now:'4 түйін: жалғыз кубтық көпмүшелік.', why:'Қисық бұрынғы түйіндердің бәрінен өтіп, жаңа түйінге бұрылады.', how:'n + 1 = 4, демек n = 3.' } },
    { t:{ now:'5 түйін: дәрежесі 4 болатын жалғыз көпмүшелік.', why:'Түйіндер санына қарай дәреже артады, бірақ көпмүшелік әрқашан жалғыз.', how:'n + 1 нүкте → дәрежесі n-нен аспайтын жалғыз көпмүшелік.', after:'Түйіндердің x-координаталары әртүрлі болуы шарт.' } }
  ];
  const d = new Demo({ steps, side:document.getElementById('duSide'), bar:document.getElementById('duBar'), id:'interp' });
  pts.forEach((p, i) => d.tag(p, i + 1, { pop:true }));
  const arr = k => k === 0 ? null : samp(poly(k));
  d.onApply(st => { const a = arr(st); path.style.opacity = a ? '1' : '0'; if (a) path.setAttribute('d', D(a)); cap.textContent = st ? NAME[st] : ''; });
  for (let s = 1; s <= 5; s++) d.fx(s, () => { const from = s === 1 ? samp(() => ys[0]) : arr(s - 1), to = arr(s); path.style.opacity = '1'; cap.textContent = NAME[s]; return tween(0, 1, 900, t => path.setAttribute('d', D(to.map((y, i) => from[i] + (y - from[i]) * t)))); });
  d.apply(0);
}

/* ============ E. Шеткі айырымдар кестесі ============ */
function demoDiff(){
  const host = document.getElementById('deStage'), x0 = 0, h = 1, y = [1, 0, 5, 22, 57];
  const rows = [y.slice()]; while (rows[rows.length - 1].length > 1){ const p = rows[rows.length - 1]; rows.push(p.slice(1).map((v, i) => v - p[i])); }
  const head = ['xᵢ', 'yᵢ', 'Δyᵢ', 'Δ²yᵢ', 'Δ³yᵢ', 'Δ⁴yᵢ'], tb = el('table', { class:'dt' }), cells = [];
  tb.append(el('thead', null, el('tr', null, head.map(t => el('th', { text:t })))));
  const body = el('tbody'); tb.append(body);
  for (let i = 0; i < 5; i++){
    const tr = el('tr'); const rc = [];
    for (let c = 0; c < 6; c++){
      const v = c === 0 ? x0 + i * h : rows[c - 1][i];
      const td = el('td', { text:v === undefined ? '' : N(v), class:'c' + c + (v === undefined ? ' empty' : '') }); tr.append(td); rc.push(td);
    }
    body.append(tr); cells.push(rc);
  }
  host.append(el('div', { class:'it-wrap' }, tb));
  const steps = [
    { t:{ now:'Түйіндер бірдей қадаммен орналасқан: xᵢ = x₀ + i·h. Мұнда x₀ = 0, h = 1.', why:'Қадам тұрақты болғанда шеткі айырымдарды есептеу және интерполяциялау формуласын жазу жеңіл.', how:'Төмендегі кестеде y мәндері берілген: 1, 0, 5, 22, 57.' } },
    { t:{ now:'1-ретті айырым: көрші екі мәннің айырмасы.', why:'Δyᵢ = yᵢ₊₁ − yᵢ. Бұл функцияның бір қадамдағы өсімі.', how:'Төменнен жоғары қарай әр жұпты алып шегереміз.', calc:['Δy₀ = 0 − 1 = −1', 'Δy₁ = 5 − 0 = 5', 'Δy₂ = 22 − 5 = 17', 'Δy₃ = 57 − 22 = 35'] } },
    { t:{ now:'2-ретті айырым: 1-ретті айырымдардың айырмасы.', why:'Δ²yᵢ = Δyᵢ₊₁ − Δyᵢ. Ол өсімнің өзі қалай өзгеретінін, яғни қисаюды көрсетеді.', how:'Алдыңғы бағанның көрші мәндерін шегереміз.', calc:['Δ²y₀ = 5 − (−1) = 6', 'Δ²y₁ = 17 − 5 = 12', 'Δ²y₂ = 35 − 17 = 18'] } },
    { t:{ now:'3-ретті айырым.', why:'Жалпы ереже: Δᵏyᵢ = Δᵏ⁻¹yᵢ₊₁ − Δᵏ⁻¹yᵢ.', how:'Әр келесі бағанда мән бір азаяды.', calc:['Δ³y₀ = 12 − 6 = 6', 'Δ³y₁ = 18 − 12 = 6'] } },
    { t:{ now:'4-ретті айырым нөлге тең, ал 3-ретті айырымдар бірдей (6).', why:'Бұл — көпмүшелік белгісі: дәрежесі m көпмүшеліктің m-ретті айырымы тұрақты, (m+1)-ретті айырымы нөл.', how:'Біздің деректер 3-дәрежелі көпмүшеліктен алынған (y = x³ − 2x + 1).', calc:['Δ⁴y₀ = 6 − 6 = 0'], after:'Айырымдар кестесі функцияның қандай көпмүшелікке ұқсайтынын көрсетеді.' } }
  ];
  const d = new Demo({ steps, side:document.getElementById('deSide'), bar:document.getElementById('deBar'), id:'diff' });
  for (let c = 0; c < 6; c++) { const col = cells.map(r => r[c]).filter(td => td.textContent !== ''); d.tag(col, c === 0 || c === 1 ? 0 : c - 1, { tr:true }); }
  /* ағымдағы бағанды бояу */
  d.onApply(st => { cells.forEach(r => r.forEach((td, c) => td.classList.toggle('hot', c >= 2 && c - 1 === st))); });
  d.apply(0);
}

/* ============ F. Сызықтық және квадраттық: мысал ============ */
function demoLinQuad(){
  const stage = document.getElementById('dfStage'), xs = [1, 2, 3], ys = [2, 3, 6], g = x => x * x - 2 * x + 3;
  const P = new Plot(stage, { xmin:0.5, xmax:3.5, ymin:0.5, ymax:7, xt:[1, 2, 2.5, 3], yt:[2, 4, 6], xl:'x', yl:'y', label:'Сызықтық және квадраттық интерполяция' });
  const qline = P.seg(2.5, 0.5, 2.5, 7, 'stroke:' + RED + ';stroke-width:2;stroke-dasharray:6 6'), qt = P.txt(2.5, 1.1, 'x = 2,5', { anchor:'middle', color:'var(--bad)', size:14 });
  const lin = P.curve(x => 3 + 3 * (x - 2), 2, 3, cstyle(GREEN, 5)), lv = P.pt(2.5, 4.5, GREEN, 8), lt = P.txt(2.5, 4.5, 'P₁ = 4,5', { dx:-12, dy:-4, anchor:'end', color:'var(--ok)', size:16 });
  const par = P.curve(g, 0.7, 3.3, cstyle(BLUE, 4)), pv = P.pt(2.5, g(2.5), BLUE, 8), pt = P.txt(2.5, g(2.5), 'P₂ = 4,25', { dx:14, dy:20, color:'var(--info)', size:16 });
  const br = P.seg(2.62, 4.25, 2.62, 4.5, 'stroke:' + RED + ';stroke-width:3'), brt = P.txt(2.62, 4.38, 'айырма 0,25', { dx:8, dy:-26, color:'var(--bad)', size:13 });
  const pts = xs.map((x, i) => P.pt(x, ys[i], 'var(--primary)', 8));
  const steps = [
    { t:{ now:'Үш түйін берілген: (1; 2), (2; 3), (3; 6). x = 2,5 нүктесінде мәнді табамыз.', why:'Сызықтық және квадраттық интерполяцияны салыстырамыз.', how:'Қадам h = 1.' } },
    { t:{ now:'Сызықтық интерполяция: 2 және 3 түйіндерін түзумен қосамыз.', why:'Бұл жағдайда x₀ = 2, q = (2,5 − 2)/1 = 0,5.', how:'P₁ = y₀ + q·Δy₀, мұнда Δy₀ = 6 − 3 = 3.', calc:['P₁(2,5) = 3 + 0,5 · 3 = 4,5'] } },
    { t:{ now:'Квадраттық интерполяция: үш түйін арқылы парабола жүргіземіз.', why:'Парабола қисаюды да ескереді.', how:'x₀ = 1, q = 1,5. Δy₀ = 1, Δ²y₀ = 2.', calc:['P₂ = 2 + 1,5·1 + (1,5·0,5/2)·2', 'P₂(2,5) = 4,25'] } },
    { t:{ now:'Екі жауаптың айырмасы 0,25.', why:'Түйіндегі мәндер y = x² − 2x + 3 параболасына дәл келеді. Функцияның өзі парабола болғандықтан, квадраттық интерполяция дәл жауап береді.', how:'Сызықтық интерполяция бұл жерде 0,25-ке қателеседі, себебі функция иілген.', after:'Функция қаншалықты қисық болса, жоғары дәрежелі интерполяция соншалықты пайдалы.' } }
  ];
  const d = new Demo({ steps, side:document.getElementById('dfSide'), bar:document.getElementById('dfBar'), id:'lin' });
  d.tag(pts, 0, { pop:true }); d.tag([qline, qt], 0); d.tag(lin, 1, { draw:true }); d.tag([lv, lt], 1, { pop:true, delay:600 }); d.tag(par, 2, { draw:true }); d.tag([pv, pt], 2, { pop:true, delay:700 }); d.tag([br, brt], 3);
  d.apply(0);
}

/* ============ G1. Қадам кішірейсе, қателік азаяды (слайдер) ============ */
function demoStep(){
  const stage = document.getElementById('dhStage'), f = Math.sin, a = 0, b = 3;
  const P = new Plot(stage, { xmin:-0.15, xmax:3.15, ymin:-0.15, ymax:1.15, xt:[0, 1, 2, 3], yt:[0, 0.5, 1], xl:'x', yl:'y', label:'Қадам мен қателік' });
  P.curve(f, a, b, cstyle(GRAY, 3.5, '7 6'));
  const poly = S('path', { style:'fill:none;stroke-linejoin:round;' + cstyle(GREEN, 3.5) }, P.gCurves), dots = S('g', {}, P.gPts);
  const ctl = el('div', { class:'rng' }), sl = el('input', { type:'range', min:'1', max:'16', step:'1', value:'2', 'aria-label':'Бөлік саны' }), out = el('div', { class:'rng-out', role:'status' });
  ctl.append(el('label', { text:'Бөлік саны n (қадам h = 3/n):' }), sl); stage.append(ctl, out);
  const err = n => { const xs = Array.from({ length:n + 1 }, (_, i) => a + (b - a) * i / n), L = piecewise(xs, xs.map(f)); let m = 0; for (let i = 0; i <= 600; i++){ const x = a + (b - a) * i / 600; m = Math.max(m, Math.abs(f(x) - L(x))); } return m; };
  const draw = n => {
    const xs = Array.from({ length:n + 1 }, (_, i) => a + (b - a) * i / n), ys = xs.map(f);
    poly.setAttribute('d', xs.map((x, i) => (i ? 'L' : 'M') + P.X(x).toFixed(1) + ' ' + P.Y(ys[i]).toFixed(1)).join(''));
    dots.innerHTML = ''; xs.forEach((x, i) => S('circle', { cx:P.X(x), cy:P.Y(ys[i]), r:5, style:'fill:var(--primary);stroke:#fff;stroke-width:2' }, dots));
    const e = err(n), ph = n % 2 === 0 && n >= 2 ? err(n / 2) : 0;
    out.innerHTML = 'n = <b>' + n + '</b>, h = <b>' + N((3 / n).toFixed(3)) + '</b> &nbsp; ең үлкен қателік = <b>' + N(e.toFixed(4)) + '</b>' + (ph ? ' &nbsp; <span class="badge ok">n/2 кезіндегіден ' + N((ph / e).toFixed(2)) + ' есе аз</span>' : '');
  };
  sl.addEventListener('input', () => draw(+sl.value)); draw(2);
}

/* ============ H. Рунге құбылысы және сплайндар ============ */
function demoSpline(){
  const stage = document.getElementById('dsStage'), f = x => 1 / (1 + 25 * x * x), n = 10, xs = Array.from({ length:n + 1 }, (_, i) => -1 + 2 * i / n), ys = xs.map(f);
  const P = new Plot(stage, { xmin:-1.1, xmax:1.1, ymin:-0.6, ymax:2.2, xt:[-1, -0.5, 0, 0.5, 1], yt:[0, 1, 2], xl:'x', yl:'y', label:'Рунге құбылысы және сплайндар' });
  const real = P.curve(f, -1, 1, cstyle(GRAY, 3.5, '7 6'), 240);
  const glob = P.curve(lagrange(xs, ys), -1, 1, cstyle(RED, 4), 300), lin = P.curve(piecewise(xs, ys), -1, 1, cstyle(GREEN, 4), 300), cub = P.curve(naturalSpline(xs, ys), -1, 1, cstyle(BLUE, 4), 300);
  const pts = xs.map((x, i) => P.pt(x, ys[i], 'var(--primary)', 6));
  const t1 = P.txt(-0.95, 1.95, 'Бір көпмүшелік (n = 10)', { color:'var(--bad)', size:15 }), t2 = P.txt(-0.95, 1.95, 'Сызықтық сплайн', { color:'var(--ok)', size:15 }), t3 = P.txt(-0.95, 1.95, 'Кубтық сплайн', { color:'var(--info)', size:15 });
  const steps = [
    { t:{ now:'f(x) = 1/(1 + 25x²) функциясының 11 түйінін алдық. Түйіндер бірдей қадаммен орналасқан.', why:'Түйін көп болғанда бір көпмүшелік қандай болатынын көреміз.', how:'Сұр сызық — функцияның өзі.' } },
    { t:{ now:'Барлық түйін арқылы дәрежесі 10 болатын көпмүшелік жүргіздік. Ол шеттерінде қатты тербеледі.', why:'Түйін саны көбейген сайын дәреже артады, ал жоғары дәрежелі көпмүшелік түйіндер арасында ауытқиды. Бұл Рунге құбылысы.', how:'Қызыл қисық түйіндерден өтеді, бірақ олардың арасында функциядан мүлдем алыс.', after:'Нүкте көп болса, бір үлкен көпмүшелік жарамайды.' } },
    { t:{ now:'Идея: әр екі көрші түйінге өз қарапайым қисығын саламыз. Алдымен түзулер (сызықтық сплайн).', why:'Бұл — локалды интерполяция. Әр бөлікте тек екі нүкте қолданылады, сондықтан тербеліс жоқ.', how:'Қисық үзілмейді, бірақ түйіндерде сынады.' } },
    { t:{ now:'Кубтық сплайн: әр бөлікте 3-дәрежелі көпмүшелік, түйіндерде тегіс жалғасады.', why:'Мәні, бірінші және екінші туындысы түйіндерде үзілмейді, сондықтан қисық тегіс.', how:'Көк қисық функцияға өте жақын және тербелмейді.', after:'Графикада, жобалауда (CAD) және қаріптерде осы әдіс қолданылады.' } }
  ];
  const d = new Demo({ steps, side:document.getElementById('dsSide'), bar:document.getElementById('dsBar'), id:'spline' });
  d.tag(pts, 0, { pop:true }); d.tag(glob, 1, { draw:true, end:2 }); d.tag(t1, 1, { end:2 }); d.tag(lin, 2, { draw:true, end:3 }); d.tag(t2, 2, { end:3 }); d.tag(cub, 3, { draw:true }); d.tag(t3, 3);
  d.apply(0);
}

window.ApproxDemos = { demoTemp, demoApprox, demoRange, demoUnique, demoDiff, demoLinQuad, demoStep, demoSpline, Plot, lagrange, naturalSpline, lsLine };
})();
