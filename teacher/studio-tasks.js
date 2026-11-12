/* Студия: тапсырма құрастырушысы (код есебі, қатені түзет, тест сұрағы, үй жұмысы). Деректер: { v:1, tasks:[{title,minutes,pts,info,items:[...]}], hw:{...} }.
   StudioTasks.render(host, data, { changed, check }) */
(function(){
'use strict';
const h = (tag, a, kids) => { const e = document.createElement(tag); for (const k in (a || {})) { const v = a[k]; if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else if (k === 'on') { for (const ev in v) e.addEventListener(ev, v[ev]); } else if (v === true) e.setAttribute(k, ''); else if (v !== false && v !== null && v !== undefined) e.setAttribute(k, v); } [].concat(kids || []).forEach(c => { if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); }); return e; };
const MAXT = 4, MAXI = 15;
const KIND = { code: 'Код есебі', fix: 'Қатені түзет', quiz: 'Тест сұрағы', short: 'Қысқа жауап' };
const NEW = {
  short: () => ({ k: 'short', title: '', q: '', code: '', answers: '', why: '' }),
  code: () => ({ k: 'code', title: '', text: 'Екі бүтін сан берілген. Олардың қосындысын шығар.', starter: '', ref: 'a = int(input())\nb = int(input())\nprint(a + b)\n', hint: 'Екі санды input() арқылы оқып, int() арқылы санға айналдыр, қосындысын print ішінде шығар.', cases: [{ in: '2\n3', out: '5', not: '' }, { in: '10\n-4', out: '6', not: '' }] }),
  fix: () => ({ k: 'fix', title: '', text: 'Екі санның қосындысын шығару керек, бірақ кодта қате бар. Түзет.', starter: 'a = int(input())\nb = int(input())\nprint(a - b)\n', ref: 'a = int(input())\nb = int(input())\nprint(a + b)\n', hint: 'Амал белгісін тексер.', cases: [{ in: '2\n3', out: '5', not: '' }, { in: '10\n-4', out: '6', not: '' }] }),
  quiz: () => ({ k: 'quiz', title: '', q: 'Экранға не шығады?', code: 'print(2 + 3)', opts: ['5', '23', 'Қате', '2 + 3'], correct: 0, why: 'print ішіндегі өрнек алдымен есептеледі: 2 + 3 = 5.' })
};
const newTask = () => ({ title: 'Жаңа тапсырма', info: '', minutes: 10, pts: 0, items: [] });
const newHw = () => ({ on: true, title: '', lead: '', how: 'Кодты дәптерге жазып фотосын түсір, не бағдарламаның скриншотын ал.', items: [], crit: [{ t: 'Дұрыс шешім', pts: 20 }, { t: 'Кодтың жазылуы мен оқылуы', pts: 5 }] });

/* ұпайды 5-ке бөлу (серверлік data-lessons.js-пен бірдей алгоритм): тек алдын ала көрсету үшін */
function distribute(total, weights, unit){
  const n = weights.length; if (!n) return []; const units = Math.round(total / unit), tot = weights.reduce((a, b) => a + b, 0), w = tot > 0 ? weights : weights.map(() => 1), ws = w.reduce((a, b) => a + b, 0);
  const q = w.map(x => x / ws * units), base = q.map(Math.floor); if (units >= n) base.forEach((v, i) => { if (v < 1) base[i] = 1; });
  let left = units - base.reduce((a, b) => a + b, 0); const order = q.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k++, left--) base[order[k % n][1]]++; for (let k = n - 1; left < 0; k = (k - 1 + n) % n) { if (base[order[k][1]] > 1) { base[order[k][1]]--; left++; } }
  return base.map(v => v * unit);
}
function pointsPlan(d){
  const T = d.tasks.filter(t => t.items.length), manual = T.map(t => +t.pts || 0);
  const no = d.grading === 'manual' && !d.hw.on ? manual : distribute(100, T.map(t => +t.pts > 0 ? +t.pts : t.items.length), 5);
  const wh = d.grading === 'manual' && d.hw.on ? manual : distribute(75, no, 5);
  return T.map((t, i) => ({ no: no[i], wh: wh[i] }));
}

function grow(t){ t.style.height = 'auto'; t.style.height = Math.max(t.scrollHeight + 2, 56) + 'px'; }
function ta(o, key, ph, mono, rows, cb){ const t = h('textarea', { class: 'st-ta' + (mono ? ' mono' : ''), rows: rows || 2, placeholder: ph || '', spellcheck: mono ? 'false' : 'true' }); t.style.minHeight = '56px'; t.value = o[key] || ''; t.addEventListener('input', () => { o[key] = t.value; grow(t); cb(); }); requestAnimationFrame(() => grow(t)); return t; }
function inp(o, key, ph, cb, attrs){ const i = h('input', { class: 'st-field', type: 'text', placeholder: ph || '', ...(attrs || {}) }); i.value = o[key] === undefined || o[key] === null ? '' : o[key]; i.addEventListener('input', () => { o[key] = i.value; cb(); }); return i; }
const lab = (t, n) => h('label', { class: 'stt-lab' }, [h('span', { text: t }), n]);
const btn = (t, f, cls) => h('button', { type: 'button', class: 'st-btn' + (cls ? ' ' + cls : ''), text: t, on: { click: f } });
const openCards = new WeakMap();
function sectionCard(data, title, hint, className, defaultOpen) {
  const card = h('details', {class:className, open:openCards.get(data) ?? defaultOpen}, [
    h('summary', {class:'st-task-heading'}, [h('b', {text:title}), h('small', {text:hint})])
  ]);
  card.addEventListener('toggle', () => openCards.set(data, card.open));
  return card;
}

function render(host, data, ctx){
  const redraw = () => render(host, data, ctx), ch = () => ctx.changed(false), chS = () => { ctx.changed(true); redraw(); };
  const root = h('div', { class: 'st-doc stt' });
  const plan = pointsPlan(data);
  root.append(h('div', { class: 'st-blk st-info' }, [h('b', { text: 'Бағалау' }),
    h('p', { class: 'st-hint', text: 'Үй жұмысынсыз тапсырмаларға 100 балл. Үй жұмысымен тапсырмаларға 75, үй жұмысына 25 балл беріледі.' }),
    h('label', {class:'cfg-hw'}, [
      h('input', {type:'checkbox', checked:data.grading === 'manual', on:{change:event => { data.grading = event.target.checked ? 'manual' : 'auto'; chS(); }}}),
      ' Әр тапсырманың балын өзім қоямын'
    ])
  ]));

  data.tasks.forEach((t, ti) => {
    const done = t.items.length ? plan[data.tasks.slice(0, ti).filter(x => x.items.length).length] : null;
    const card = sectionCard(t, (ti + 1) + '. ' + (t.title || 'Атаусыз тапсырма'),
      t.items.length + ' есеп · ' + t.minutes + ' мин', 'st-blk stt-task', ti === 0 || !t.items.length);
    card.append(h('div', { class: 'st-bh' }, [h('span', { text: (ti + 1) + '-тапсырма' + (done ? ' · ' + done.no + ' балл (үй жұмысымен ' + done.wh + ')' : '') }), h('span', { class: 'sp' }),
      h('button', { class: 'st-ic', type: 'button', title: 'Жоғары', 'aria-label': 'Тапсырманы жоғары жылжыту', text: '↑', disabled: ti === 0, on: { click: () => { [data.tasks[ti - 1], data.tasks[ti]] = [data.tasks[ti], data.tasks[ti - 1]]; chS(); } } }),
      h('button', { class: 'st-ic', type: 'button', title: 'Төмен', 'aria-label': 'Тапсырманы төмен жылжыту', text: '↓', disabled: ti === data.tasks.length - 1, on: { click: () => { [data.tasks[ti + 1], data.tasks[ti]] = [data.tasks[ti], data.tasks[ti + 1]]; chS(); } } }),
      h('button', { class: 'st-ic', type: 'button', title: 'Өшіру', 'aria-label': 'Тапсырманы өшіру', text: '🗑', on: { click: () => { if (!t.items.length || confirm('Тапсырма мен ішіндегі есептер өшеді. Жалғастырамыз ба?')) { data.tasks.splice(ti, 1); chS(); } } } })]));
    card.append(h('div', { class: 'stt-row' }, [lab('Атауы', inp(t, 'title', 'Мысалы: Үлгі бойынша есеп', ch, { maxlength: 80 })), lab('Уақыты (минут)', inp(t, 'minutes', '10', ch, { type: 'number', min: 1, max: 90 })), data.grading === 'manual' ? lab('Балл', inp(t, 'pts', '0', ch, { type: 'number', min: 1, max: 100, step: 1 })) : null]));
    card.append(lab('Студентке нұсқау (міндетті емес)', ta(t, 'info', 'Мысалы: Әр есептің үстінде үлгі бар. Оқып, соған ұқсас шеш.', false, 2, ch)));
    t.items.forEach((x, ii) => card.append(itemCard(t, x, ii, ch, chS, ctx)));
    const kinds = !t.items.length ? ['code', 'fix', 'quiz', 'short'] : t.items[0].k === 'short' ? ['short'] : ['code', 'fix', 'quiz'];
    if (t.items.length < MAXI) card.append(h('div', { class: 'st-row' }, kinds.map(k => btn('+ ' + KIND[k], () => { const item = NEW[k](); openCards.set(item, true); t.items.push(item); chS(); }))));
    root.append(card);
  });
  if (data.tasks.length < MAXT) root.append(btn('+ Жаңа тапсырма (кіші бөлім)', () => { data.tasks.push(newTask()); chS(); }, 'st-add'));
  root.append(hwCard(data, ch, chS));
  const out = h('div', { class: 'stt-check', 'aria-live': 'polite' });
  root.append(h('div', { class: 'st-blk' }, [h('b', { text: 'Тексеру' }), h('p', { class: 'st-hint', text: 'Жариялау алдында эталон шешімдер өз тест жағдайларынан өтіп жатқанын жүйе тексереді. Қазір де тексеріп көруге болады (бірнеше секунд кетеді).' }), h('div', { class: 'st-row' }, [btn('Тапсырмаларды тексеру', async e => { e.target.disabled = true; out.replaceChildren(h('p', { class: 'st-hint', text: 'Тексеріп жатыр…' })); const r = await ctx.check(); e.target.disabled = false; out.replaceChildren(...showCheck(r)); }, 'st-primary')]), out]));
  host.replaceChildren(root);
}

function showCheck(r){
  if (!r.ok) return [h('p', { class: 'st-hint bad', text: r.error === 'network' ? 'Желі жоқ.' : 'Қате: ' + (r.error || '') })];
  const out = [];
  if (r.problems && r.problems.length) { out.push(h('p', { class: 'st-hint bad', text: 'Толтыру керек:' }), h('ul', { class: 'stt-list bad' }, r.problems.map(p => h('li', { text: p })))); return out; }
  if (r.infra) { out.push(h('p', { class: 'st-hint bad', text: 'Код орындау қызметі жауап бермеді. Эталондар тексерілмеді, кейінірек қайталаңыз.' })); return out; }
  if (r.failed && r.failed.length) out.push(h('p', { class: 'st-hint bad', text: 'Эталон шешімде қате бар:' }), h('ul', { class: 'stt-list bad' }, r.failed.map(p => h('li', { text: p }))));
  if (r.warns && r.warns.length) out.push(h('p', { class: 'st-hint', text: 'Ескертулер:' }), h('ul', { class: 'stt-list' }, r.warns.map(p => h('li', { text: p }))));
  if (!(r.failed && r.failed.length)) out.push(h('p', { class: 'st-hint', style: 'color:var(--ok);font-weight:600', text: '✓ Барлық эталон шешім өз тест жағдайларынан өтті.' }));
  return out;
}

function itemCard(t, x, ii, ch, chS, ctx){
  const c = sectionCard(x, (ii + 1) + '. ' + (x.title || KIND[x.k]), KIND[x.k], 'stt-item', ii === 0);
  c.append(h('div', { class: 'st-bh' }, [h('span', { text: (ii + 1) + '. ' + KIND[x.k] }), h('span', { class: 'sp' }),
    h('button', { class: 'st-ic', type: 'button', title: 'Жоғары', 'aria-label': 'Есепті жоғары жылжыту', text: '↑', disabled: ii === 0, on: { click: () => { [t.items[ii - 1], t.items[ii]] = [t.items[ii], t.items[ii - 1]]; chS(); } } }),
    h('button', { class: 'st-ic', type: 'button', title: 'Төмен', 'aria-label': 'Есепті төмен жылжыту', text: '↓', disabled: ii === t.items.length - 1, on: { click: () => { [t.items[ii + 1], t.items[ii]] = [t.items[ii], t.items[ii + 1]]; chS(); } } }),
    h('button', { class: 'st-ic', type: 'button', title: 'Өшіру', 'aria-label': 'Есепті өшіру', text: '🗑', on: { click: () => { t.items.splice(ii, 1); chS(); } } })]));
  c.append(lab('Атауы (міндетті емес)', inp(x, 'title', x.k === 'quiz' ? 'Сұрақ ' + (ii + 1) : 'Есеп ' + (ii + 1), ch, { maxlength: 100 })));
  if (x.k === 'short') {
    c.append(lab('Сұрақ', ta(x, 'q', 'Сұрақ мәтіні', false, 2, ch)),
      lab('Код (міндетті емес)', ta(x, 'code', 'Мысалы: print(2 + 3)', true, 2, ch)),
      lab('Қабылданатын жауаптар', ta(x, 'answers', 'Әр жауапты жеке жолға жазыңыз. Бір жауап 20 таңбаға дейін.', false, 2, ch)),
      lab('Түсіндірме', ta(x, 'why', 'Жауапты түсіндіріңіз', false, 2, ch)));
    return c;
  }
  if (x.k === 'quiz') {
    c.append(lab('Сұрақ', ta(x, 'q', 'Сұрақ мәтіні', false, 2, ch)), lab('Код (міндетті емес)', ta(x, 'code', 'Мысалы: print(2 + 3)', true, 2, ch)));
    const list = h('div', { class: 'stt-opts' }), radioName = 'c' + crypto.randomUUID();
    x.opts.forEach((o, k) => { const r = h('input', { type: 'radio', name: radioName, 'aria-label': 'Дұрыс жауап ' + (k + 1), checked: x.correct === k, on: { change: () => { x.correct = k; ch(); } } }); const i = h('input', { class: 'st-field', type: 'text', maxlength: 200, placeholder: 'Жауап ' + (k + 1) }); i.value = o; i.addEventListener('input', () => { x.opts[k] = i.value; ch(); }); list.append(h('div', { class: 'st-li' }, [r, i, h('button', { class: 'st-ic', type: 'button', title: 'Жауапты өшіру', 'aria-label': 'Жауапты өшіру', text: '✕', disabled: x.opts.length <= 2, on: { click: () => { x.opts.splice(k, 1); if (x.correct >= x.opts.length) x.correct = 0; else if (x.correct > k) x.correct--; chS(); } } })])); });
    c.append(h('p', { class: 'st-hint', text: 'Жауап нұсқаларын жазыңыз, дұрысын дөңгелекпен белгілеңіз. Студенттерде нұсқалар араласып шығады.' }), list);
    if (x.opts.length < 6) c.append(btn('+ Жауап', () => { x.opts.push(''); chS(); }));
    c.append(lab('Дұрыс жауаптың түсіндірмесі', ta(x, 'why', 'Студент қателессе, осы түсіндірме шығады', false, 2, ch)));
    return c;
  }
  c.append(lab('Есеп шарты', ta(x, 'text', 'Есептің мәтінін жазыңыз. **қалың**, `код` белгілері жұмыс істейді.', false, 3, ch)));
  const starterLabel = x.k === 'fix' ? 'Қателі код · студентке көрінеді' : 'Бастапқы код · міндетті емес';
  c.append(h('details', {class:'st-task-code'}, [h('summary', {text:starterLabel}), ctx.code(x, 'starter', ch)]));
  c.append(h('details', {class:'st-task-code'}, [h('summary', {text:'Дұрыс шешім · тек оқытушыға'}), ctx.code(x, 'ref', ch)]));
  c.append(h('div', { class: 'st-hint', text: 'Тест жағдайлары: әр жолда студент бағдарламасына берілетін енгізу (әр input() жеке жолда) және экранға шығуы керек мәтін.' }));
  const tbl = h('div', { class: 'stt-cases' });
  x.cases.forEach((cs, k) => tbl.append(h('div', { class: 'stt-case' }, [h('div', {}, [h('small', { text: 'Енгізу' }), ta(cs, 'in', 'Мысалы:\n2\n3', true, 2, ch)]), h('div', {}, [h('small', { text: 'Шығуы керек' }), ta(cs, 'out', 'Мысалы: 5', true, 2, ch)]), h('button', { class: 'st-ic', type: 'button', title: 'Жағдайды өшіру', 'aria-label': 'Тест жағдайын өшіру', text: '✕', disabled: x.cases.length <= 1, on: { click: () => { x.cases.splice(k, 1); chS(); } } })])));
  c.append(tbl);
  if (x.cases.length < 10) c.append(btn('+ Тест жағдайы', () => { x.cases.push({ in: '', out: '', not: '' }); chS(); }));
  c.append(lab('Кеңес (қате болғанда студентке көрсетіледі)', ta(x, 'hint', 'Мысалы: екінші санды оқуды ұмытпа', false, 2, ch)));
  return c;
}

function hwCard(d, ch, chS){
  if (!d.hw || typeof d.hw !== 'object' || !('on' in d.hw) && !d.hw.title) d.hw = d.hw && d.hw.title ? d.hw : newHw();
  const hw = d.hw, card = h('div', { class: 'st-blk stt-task' });
  const on = h('input', { type: 'checkbox', checked: !!hw.on, on: { change: e => { hw.on = e.target.checked; if (hw.on && !hw.crit.length) hw.crit = newHw().crit; chS(); } } });
  card.append(h('div', { class: 'st-bh' }, [h('span', { text: 'Үй жұмысы · 25 балл' })]), h('label', { class: 'cfg-hw' }, [on, h('span', { text: 'Бұл сабақта үй жұмысы бар (студент фото жүктейді, жасанды интеллект тексереді)' })]));
  if (!hw.on) { card.append(h('p', { class: 'st-hint', text: 'Өшірулі: барлық тапсырма 100 балға келтіріледі. Сабақ кезінде оқытушы да мұны өзгерте алады.' })); return card; }
  card.append(lab('Үй жұмысының атауы', inp(hw, 'title', 'Мысалы: Жоба: калькулятор', ch, { maxlength: 120 })), lab('Қысқаша шарты', ta(hw, 'lead', 'Студент не істеуі керек екенін қысқа жазыңыз', false, 2, ch)));
  card.append(h('div', { class: 'st-hint', text: 'Талаптар тізімі (студентке көрсетіледі):' }));
  const reqs = h('div'); hw.items.forEach((r, k) => { const i = h('input', { class: 'st-field', type: 'text', maxlength: 300, placeholder: 'Талап ' + (k + 1) }); i.value = r; i.addEventListener('input', () => { hw.items[k] = i.value; ch(); }); reqs.append(h('div', { class: 'st-li' }, [h('span', { class: 'num', text: String(k + 1) }), i, h('button', { class: 'st-ic', type: 'button', title: 'Өшіру', 'aria-label': 'Талапты өшіру', text: '✕', on: { click: () => { hw.items.splice(k, 1); chS(); } } })])); });
  card.append(reqs); if (hw.items.length < 8) card.append(btn('+ Талап', () => { hw.items.push(''); chS(); }));
  card.append(h('div', { class: 'st-hint', text: 'Бағалау критерийлері (қосындысы 25 болуы керек, жасанды интеллект осыларға қарап баға қояды):' }));
  const sum = h('b', { class: 'cfg-total' }), upd = () => { const v = hw.crit.reduce((a, c) => a + (+c.pts || 0), 0); sum.textContent = 'Қосындысы: ' + Math.round(v * 10) / 10 + ' / 25'; sum.style.color = Math.abs(v - 25) < .01 ? '#16a34a' : '#b45309'; };
  const crit = h('div'); hw.crit.forEach((c, k) => { const t = h('input', { class: 'st-field', type: 'text', maxlength: 200, placeholder: 'Критерий ' + (k + 1) }); t.value = c.t; t.addEventListener('input', () => { c.t = t.value; ch(); }); const p = h('input', { class: 'st-field', type: 'number', min: 0, max: 25, style: 'max-width:90px', 'aria-label': 'Балл' }); p.value = c.pts; p.addEventListener('input', () => { c.pts = +p.value || 0; upd(); ch(); }); crit.append(h('div', { class: 'st-li' }, [t, p, h('button', { class: 'st-ic', type: 'button', title: 'Өшіру', 'aria-label': 'Критерийді өшіру', text: '✕', on: { click: () => { hw.crit.splice(k, 1); chS(); } } })])); });
  card.append(crit); if (hw.crit.length < 8) card.append(btn('+ Критерий', () => { hw.crit.push({ t: '', pts: 0 }); chS(); })); card.append(h('div', { class: 'st-row' }, [sum])); upd();
  card.append(lab('Қалай тапсыру керек', inp(hw, 'how', 'Кодты дәптерге жазып фотосын түсір…', ch, { maxlength: 300 })));
  return card;
}

window.StudioTasks = { render, newHw, hasItems: d => !!(d && d.tasks && d.tasks.some(t => t.items.length)) };
})();
