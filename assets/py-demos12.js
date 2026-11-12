/* Python 12. for циклі және range().
   Цикл анимациясы блок-схемамен бірге жүреді: әр қадамда схеманың жанып тұрған блогы, код жолы, айнымалылар мен экран бір мезгілде өзгереді.
   Кадрларды PyTrace (assets/py-trace.js) қозғалтқышы жасайды, сондықтан көрсетілген нәтиже нақты Python нәтижесіне тең. */
(function () {
  'use strict';

  const { el } = window.L;
  const trace = window.PyTrace;
  const pauseAll = new Set();
  const words = new Set(['for', 'in', 'range', 'print']);
  const label = text => el('span', { class: 'p12-label', text });
  const button = (text, action, primary = false) =>
    el('button', { type: 'button', class: 'btn' + (primary ? ' primary' : ''), text, onclick: action });
  const SVG = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, text) => {
    const node = document.createElementNS(SVG, tag);
    Object.keys(attrs).forEach(key => node.setAttribute(key, attrs[key]));
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* ---------- Код панелі ---------- */
  function codePanel(title, lines) {
    const body = el('div', { class: 'p12-code', role: 'group', 'aria-label': title });
    function setCode(source) {
      body.replaceChildren(...source.map((line, index) => {
        const tokens = line.split(/("[^"]*"|\b(?:for|in|range|print)\b|\b\d+\b)/g);
        const code = el('code', {}, tokens.map(token => {
          if (words.has(token)) return el('span', { class: 'p12-keyword', text: token });
          if (/^\d+$/.test(token)) return el('span', { class: 'p12-literal', text: token });
          if (token.startsWith('"')) return el('span', { class: 'p12-string', text: token });
          return token;
        }));
        return el('div', { class: 'p12-line' }, [el('span', { class: 'p12-line-no', 'aria-hidden': 'true', text: index + 1 }), code]);
      }));
    }
    function mark(indices) {
      [...body.children].forEach((line, index) => line.classList.toggle('current', indices.includes(index)));
    }
    setCode(lines);
    return { root: el('div', { class: 'p12-code-panel' }, [label(title), body]), setCode, mark };
  }

  /* ---------- Сандар таспасы ---------- */
  function tape() {
    const root = el('div', { class: 'p12-tape', role: 'list', 'aria-label': 'Диапазондағы сандар' });
    let cells = [];
    function setValues(values, stop) {
      cells = values.map(value => el('span', { class: 'p12-tile', role: 'listitem', text: value }));
      const boundary = el('span', { class: 'p12-tile boundary', role: 'listitem' }, [
        el('b', { text: stop }), el('small', { text: 'кірмейді' })
      ]);
      root.replaceChildren(...cells, boundary);
    }
    /* done — өтіп кеткен сандар саны, active — қазір алынған санның нөмірі (-1: жоқ) */
    function paint(done, active) {
      cells.forEach((cell, index) => {
        cell.classList.toggle('visited', index < done);
        cell.classList.toggle('active', index === active);
        if (index === active) cell.setAttribute('aria-current', 'step');
        else cell.removeAttribute('aria-current');
      });
    }
    return { root, setValues, paint };
  }

  /* ---------- Блок-схема (SVG) ---------- */
  /* spec: { pre:[{id,type,text}], test:'мәтін', body:[…], exit:[…] }. type: term | proc | io. Басы мен Соңы өздігінен қосылады. */
  function flowChart(spec) {
    const CX = 150, W = 168, H = 38, DW = 190, DH = 70, GAP = 26, TURN = 40;
    const seq = [{ id: 'start', type: 'term', text: 'Басы' }, ...spec.pre, { id: 'dec', type: 'dec', text: spec.test }, ...spec.body, ...spec.exit, { id: 'end', type: 'term', text: 'Соңы' }];
    const geom = {};
    let y = 8;
    seq.forEach((node, index) => {
      const h = node.type === 'dec' ? DH : H;
      const firstAfterBody = index > 0 && seq[index - 1].id === spec.body[spec.body.length - 1].id;
      if (firstAfterBody) y += TURN;
      geom[node.id] = { top: y, h, cy: y + h / 2, bottom: y + h };
      y += h + GAP;
    });
    const height = y - GAP + 8, bodyLast = spec.body[spec.body.length - 1].id, exitFirst = spec.exit.length ? spec.exit[0].id : 'end';
    const root = svg('svg', { viewBox: '0 0 300 ' + height, class: 'p12-flow', role: 'img', 'aria-label': 'Цикл блок-схемасы' });
    root.append(svg('title', {}, 'Цикл блок-схемасы'));
    const defs = svg('defs'), marker = svg('marker', { id: 'p12-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerUnits: 'userSpaceOnUse', markerWidth: 10, markerHeight: 10, orient: 'auto-start-reverse' });
    marker.append(svg('path', { d: 'M0 0 L10 5 L0 10 z', class: 'p12-arrow-head' }));
    defs.append(marker); root.append(defs);

    const edgeLayer = svg('g'), nodeLayer = svg('g'), edgeEls = {}, nodeEls = {};
    const edge = (id, d, labelText, lx, ly) => {
      const g = svg('g', { class: 'p12-edge', 'data-edge': id });
      g.append(svg('path', { d, 'marker-end': 'url(#p12-arrow)' }));
      if (labelText) g.append(svg('text', { x: lx, y: ly, class: 'p12-edge-label' }, labelText));
      edgeLayer.append(g); edgeEls[id] = g;
    };
    const down = (a, b, id, labelText) => {
      const from = geom[a].bottom, to = geom[b].top;
      edge(id, 'M' + CX + ' ' + from + ' V' + to, labelText, CX + 8, from + 15);
    };
    const chain = list => list.slice(1).forEach((node, i) => down(list[i].id, node.id, list[i].id + '>' + node.id));
    chain([seq[0], ...spec.pre, { id: 'dec' }]);
    down('dec', spec.body[0].id, 'yes', 'Иә');
    chain(spec.body);
    chain([...spec.exit, { id: 'end' }].filter(Boolean));
    /* Жоқ: ромбының оң жағынан түсіп, шығу блогына кіреді */
    const dec = geom.dec, ex = geom[exitFirst];
    edge('no', 'M' + (CX + DW / 2) + ' ' + dec.cy + ' H284 V' + ex.cy + ' H' + (CX + W / 2 + 2), 'Жоқ', CX + DW / 2 + 8, dec.cy - 6);
    /* Қайту: соңғы дене блогынан солға, жоғары, ромбыға */
    const bl = geom[bodyLast];
    edge('back', 'M' + (CX - W / 2) + ' ' + bl.cy + ' H16 V' + dec.cy + ' H' + (CX - DW / 2 - 2));
    root.append(edgeLayer, nodeLayer);

    const lines = (text, limit) => {
      const out = []; let line = '';
      String(text).split(' ').forEach(word => { if ((line + ' ' + word).trim().length > limit && line) { out.push(line); line = word; } else line = (line + ' ' + word).trim(); });
      if (line) out.push(line);
      return out;
    };
    seq.forEach(node => {
      const g = geom[node.id], group = svg('g', { class: 'p12-node p12-' + node.type, 'data-node': node.id });
      if (node.type === 'dec') group.append(svg('polygon', { points: [CX, g.top, CX + DW / 2, g.cy, CX, g.bottom, CX - DW / 2, g.cy].join(' ') }));
      else if (node.type === 'io') group.append(svg('polygon', { points: [CX - W / 2 + 12, g.top, CX + W / 2, g.top, CX + W / 2 - 12, g.bottom, CX - W / 2, g.bottom].join(' ') }));
      else group.append(svg('rect', { x: CX - W / 2, y: g.top, width: W, height: g.h, rx: node.type === 'term' ? 19 : 4 }));
      const rows = lines(node.text, node.type === 'dec' ? 19 : 25), start = g.cy - (rows.length - 1) * 7.5;
      const text = svg('text', { x: CX, y: start, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      rows.forEach((row, i) => text.append(svg('tspan', { x: CX, dy: i ? 15 : 0 }, row)));
      group.append(text);
      nodeLayer.append(group); nodeEls[node.id] = group;
    });

    function edgeId(a, b) {
      if (a === 'dec' && b === spec.body[0].id) return 'yes';
      if (a === 'dec' && b === exitFirst) return 'no';
      if (a === bodyLast && b === 'dec') return 'back';
      return a + '>' + b;
    }
    function setActive(node, edgeKey) {
      Object.values(nodeEls).forEach(item => item.classList.remove('on'));
      Object.values(edgeEls).forEach(item => item.classList.remove('on'));
      if (nodeEls[node]) nodeEls[node].classList.add('on');
      if (edgeKey && edgeEls[edgeKey]) edgeEls[edgeKey].classList.add('on');
    }
    return { root, setActive, edgeId, bodyFirst: spec.body[0].id };
  }

  /* ---------- Кадрлар: PyTrace қадамдарын блок-схемаға байлау ---------- */
  function flowFrames(result, cfg, chart) {
    const frames = [];
    let vars = [], out = [], prev = 'start', done = 0, loops = 0, stop = null;
    const quiet = list => list.map(item => ({ ...item, ch: false }));
    const push = frame => frames.push({ vars: quiet(vars), out: out.slice(), tape: { done, active: -1 }, line: null, edge: null, ...frame });
    push({ node: 'start', cap: 'Бағдарлама басталады. Python код жолдарын жоғарыдан төмен қарай бір-бірлеп оқиды.' });
    result.frames.forEach(frame => {
      if (frame.kind === 'start') return;
      if (frame.kind === 'for') {
        stop = frame.tape.args[1];
        push({ node: cfg.rangeNode, edge: chart.edgeId(prev, cfg.rangeNode), line: frame.line, cap: frame.cap });
        prev = cfg.rangeNode;
      } else if (frame.kind === 'iter') {
        const index = frame.tape.pos, value = frame.tape.vals[index];
        if (loops > 0) push({ node: 'dec', edge: 'back', line: frame.line, cap: 'Цикл денесі аяқталды. Python for жолына қайтып, қатарды қайта тексереді.', tape: { done, active: -1 } });
        push({ node: 'dec', edge: loops > 0 ? null : chart.edgeId(prev, 'dec'), line: frame.line, cap: 'Тексеру: қатарда әлі сан бар ма? Иә, келесісі — ' + value + '.', tape: { done: index, active: -1 } });
        vars = frame.vars;
        push({ node: chart.bodyFirst, edge: 'yes', line: frame.line, cap: 'i айнымалысына қатардағы келесі сан беріледі: i = ' + value + '. Бұл ' + (index + 1) + '-қайталау.', vars: frame.vars, tape: { done: index, active: index } });
        prev = chart.bodyFirst; loops += 1; done = index + 1;
        frames[frames.length - 1].tape = { done: index, active: index };
      } else if (frame.kind === 'end') {
        if (loops > 0) push({ node: 'dec', edge: 'back', line: frame.line, cap: 'Цикл денесі аяқталды. Python for жолына қайтып, қатарды қайта тексереді.', tape: { done, active: -1 } });
        push({ node: 'dec', edge: loops > 0 ? null : chart.edgeId(prev, 'dec'), line: frame.line, cap: 'Тексеру: қатарда сан қалмады (' + stop + ' кірмейді). Жауап — жоқ, цикл аяқталады. Барлығы ' + loops + ' қайталау болды.', tape: { done, active: -1 } });
        prev = 'dec';
      } else {
        const node = cfg.lineNode[frame.line];
        vars = frame.vars; out = frame.out;
        const inBody = node === chart.bodyFirst || cfg.bodyNodes.includes(node);
        const edge = prev === node ? null : prev === 'dec' ? 'no' : chart.edgeId(prev, node);
        frames.push({ node, edge, line: frame.line, cap: frame.cap, vars: frame.vars, out: frame.out.slice(), tape: inBody ? { done: done - 1, active: done - 1 } : { done, active: -1 } });
        prev = node;
      }
    });
    frames.push({ node: 'end', edge: prev === 'dec' ? 'no' : chart.edgeId(prev, 'end'), line: null, cap: 'Бағдарлама аяқталды.', vars: quiet(vars), out: out.slice(), tape: { done, active: -1 } });
    frames[frames.length - 1].final = true;
    return frames;
  }

  /* ---------- Басқару: қадам, келесі сан, ойнату ---------- */
  function controlsFor(count, render) {
    let position = 0, timer = null, nextIteration = from => from + 1, total = 0;
    const info = el('span', { class: 'p12-play-count' });
    const step = button('Қадам →', () => advance(1), true);
    const jump = button('Келесі сан ⏭', () => { pause(); position = Math.min(nextIteration(position), total - 1); refresh(); });
    const back = button('← Артқа', () => { pause(); position = Math.max(0, position - 1); refresh(); });
    const play = button('▶ Ойнату', toggle);
    const reset = button('Басынан', () => { pause(); position = 0; refresh(); });
    const root = el('div', { class: 'p12-controls' }, [step, jump, back, play, reset, info]);
    function refresh() {
      const atEnd = position >= total - 1;
      render(position);
      step.disabled = atEnd || timer !== null;
      jump.disabled = atEnd || timer !== null;
      back.disabled = position === 0 || timer !== null;
      reset.disabled = position === 0;
      play.textContent = timer !== null ? 'Ⅱ Кідірту' : atEnd ? '↻ Қайта ойнату' : '▶ Ойнату';
      info.textContent = 'қадам ' + (position + 1) + ' / ' + total;
    }
    function pause() { if (timer !== null) { clearInterval(timer); timer = null; } }
    function advance(by) { position = Math.min(position + by, total - 1); if (position >= total - 1) pause(); refresh(); }
    function toggle() {
      if (timer !== null) { pause(); refresh(); return; }
      if (position >= total - 1) position = 0;
      timer = setInterval(() => advance(1), 1150);
      advance(1);
    }
    const stop = () => { if (timer !== null) { pause(); refresh(); } };
    pauseAll.add(stop);
    return {
      root,
      pause: stop,
      dispose() { pause(); pauseAll.delete(stop); },
      set(newTotal, jumpFn) { pause(); total = newTotal; nextIteration = jumpFn; position = 0; refresh(); }
    };
  }

  /* ---------- Цикл машинасы ---------- */
  function loopMachine(host, cfg) {
    const code = codePanel('Python коды', []);
    const numbers = tape();
    const chart = flowChart(cfg.spec);
    const result = trace.run(cfg.code);
    const output = el('pre', { class: 'p12-terminal', 'aria-label': 'Экранға шыққан мәндер' });
    const status = el('p', { class: 'p12-status', role: 'status' });
    const state = el('div', { class: 'p12-vars', 'aria-label': 'Айнымалылар' });
    const extra = cfg.extra ? cfg.extra() : null;
    const frames = flowFrames(result, cfg, chart);
    const values = result.frames.find(frame => frame.tape && frame.tape.vals.length).tape.vals;
    code.setCode(cfg.code.split('\n'));
    numbers.setValues(values, result.frames.find(frame => frame.tape).tape.args[1]);
    const controls = controlsFor(frames.length, position => {
      const frame = frames[position];
      chart.setActive(frame.node, frame.edge);
      code.mark(frame.line === null ? [] : [frame.line]);
      numbers.paint(frame.tape.done, frame.tape.active);
      state.replaceChildren(...(frame.vars.length ? frame.vars.map(item => el('span', { class: 'p12-var' + (item.ch ? ' changed' : '') }, [el('b', { text: item.n }), ' = ', item.v])) : [el('small', { text: 'айнымалы әлі жоқ' })]));
      output.textContent = frame.out.length ? frame.out.join('\n') : 'Экран әзірге бос';
      output.classList.toggle('p12-terminal-empty', !frame.out.length);
      status.textContent = frame.cap;
      if (extra) extra.update(frame);
    });
    /* «Келесі сан»: келесі қайталаудың басына (i = … блогына) не соңына өтеді */
    controls.set(frames.length, from => {
      const target = frames.findIndex((frame, index) => index > from && (frame.node === chart.bodyFirst || frame.final));
      return target < 0 ? frames.length - 1 : target;
    });
    const split = el('div', { class: 'p12-split flow' }, [
      el('div', { class: 'p12-flow-wrap' }, [label('Блок-схема'), chart.root]),
      el('div', { class: 'p12-flow-side' }, [
        code.root,
        el('div', { class: 'p12-stage' }, [label('Диапазондағы сандар'), numbers.root, label('Айнымалылар'), state, extra ? extra.root : null, label('Экран'), output])
      ])
    ]);
    host.append(split, el('div', { class: 'p12-dock' }, [status, controls.root]));
    return controls;
  }

  /* ---------- 01: i тапсырмасы ---------- */
  function loopDemo(host) {
    loopMachine(host, {
      code: 'for i in range(1, 6):\n    print(i)',
      spec: {
        pre: [{ id: 'range', type: 'proc', text: 'range(1, 6) қатарын дайында' }],
        test: 'Қатарда сан қалды ма?',
        body: [{ id: 'asg', type: 'proc', text: 'i = қатардағы келесі сан' }, { id: 'out', type: 'io', text: 'print(i)' }],
        exit: []
      },
      rangeNode: 'range',
      lineNode: { 1: 'out' },
      bodyNodes: ['out']
    });
  }

  /* ---------- 02: range() зертханасы ---------- */
  const examples = [
    { title: '0-ден санау', start: 0, stop: 5, step: 1, arity: 1, problem: '0-ден бастап 5-тен кіші бүтін сандарды тап.' },
    { title: '1-ден санау', start: 1, stop: 6, step: 1, arity: 2, problem: '1-ден 5-ке дейінгі сандарды 5-ті қоса ал.' },
    { title: 'Жұп сандар', start: 2, stop: 10, step: 2, arity: 3, problem: '2-ден бастап 10-нан кіші жұп сандарды тап.' },
    { title: 'Кері санау', start: 5, stop: 0, step: -1, arity: 3, problem: '5-тен 1-ге дейін кемітіп сана.' }
  ];

  function rangeDemo(host) {
    let values = [];
    let selected = 0;
    let arity = examples[0].arity;   /* қанша параметр жазылады: 1, 2 не 3 */
    let timer = null;
    const presetBar = el('div', { class: 'p12-presets', 'aria-label': 'Диапазон үлгілері' });
    const problem = el('p', { class: 'p12-range-problem' });
    const code = codePanel('Жазылуы', ['range(5)']);
    const list = el('p', { class: 'p12-range-list' });
    const facts = el('ul', { class: 'p12-facts' });
    const status = el('p', { class: 'p12-status', role: 'status' });
    const numbers = tape();
    const fields = [
      { key: 'start', label: 'Бастау · start', min: -10, max: 20 },
      { key: 'stop', label: 'Шекара · stop', min: -10, max: 20 },
      { key: 'step', label: 'Қадам · step', min: -5, max: 5 }
    ].map(field => {
      const input = el('input', { type: 'number', min: field.min, max: field.max, step: 1, 'aria-label': field.label });
      return { ...field, input, wrap: el('label', { class: 'p12-field' }, [el('span', { text: field.label }), input]) };
    });
    const setup = el('div', { class: 'p12-range-setup' });
    /* Жазылмайтын параметрлер көрсетілмейді: range(5) үшін тек stop, range(1, 6) үшін start және stop */
    function syncFields() {
      const [start, stop, step] = fields;
      start.wrap.hidden = arity < 2;
      step.wrap.hidden = arity < 3;
      if (arity < 2) start.input.value = '0';
      if (arity < 3) step.input.value = '1';
      setup.style.setProperty('--n', String(fields.filter(item => !item.wrap.hidden).length));
      stop.wrap.hidden = false;
    }
    const walk = button('▶ Сандарды ретімен көрсет', () => {
      if (timer !== null) { clearInterval(timer); timer = null; walk.textContent = '▶ Сандарды ретімен көрсет'; return; }
      if (!values.length) return;
      let index = 0;
      walk.textContent = 'Ⅱ Тоқтату';
      const tick = () => {
        numbers.paint(index, index < values.length ? index : -1);
        status.textContent = index < values.length ? (index + 1) + '-сан: ' + values[index] + '.' : 'Сандар таусылды. Шекара кірмейді.';
        if (index >= values.length) { clearInterval(timer); timer = null; walk.textContent = '▶ Сандарды ретімен көрсет'; return; }
        index += 1;
      };
      tick();
      timer = setInterval(tick, 650);
    });
    pauseAll.add(() => { if (timer !== null) { clearInterval(timer); timer = null; walk.textContent = '▶ Сандарды ретімен көрсет'; } });

    function refresh() {
      if (timer !== null) { clearInterval(timer); timer = null; walk.textContent = '▶ Сандарды ретімен көрсет'; }
      [...presetBar.children].forEach((item, index) => item.setAttribute('aria-pressed', String(index === selected)));
      problem.textContent = selected >= 0 ? examples[selected].problem : 'Өзің берген сандар бойынша range() не беретінін тап.';
      facts.replaceChildren();
      syncFields();
      if (fields.some(({ input, wrap }) => !wrap.hidden && (!input.value || !input.validity.valid))) {
        values = [];
        numbers.root.hidden = true;
        list.textContent = '';
        code.setCode(['range(' + ['start', 'stop', 'step'].slice(arity === 1 ? 1 : 0, arity === 1 ? 2 : arity).join(', ') + ')']);
        walk.disabled = true;
        status.textContent = 'Өрістерге бүтін сан енгіз: бастау мен шекара −10-нан 20-ға дейін, қадам −5-тен 5-ке дейін.';
        status.dataset.kind = 'error';
        return;
      }
      const [start, stop, step] = fields.map(({ input }) => input.valueAsNumber);
      const args = arity === 1 ? [stop] : arity === 2 ? [start, stop] : [start, stop, step];
      code.setCode(['range(' + args.join(', ') + ')']);
      const result = trace.rangeVals(start, stop, step);
      values = result || [];
      numbers.root.hidden = result === null;
      numbers.setValues(values, stop);
      numbers.paint(0, -1);
      walk.disabled = !values.length;
      list.textContent = result === null ? 'ValueError' : '[' + values.join(', ') + ']';
      status.dataset.kind = result === null ? 'error' : '';
      if (result === null) status.textContent = 'Қадам 0 бола алмайды. Оң қадам алға, теріс қадам кері жылжытады.';
      else if (!values.length) {
        status.textContent = step > 0
          ? 'Диапазон бос. Оң қадамда бастау шекарадан кіші болуы керек.'
          : 'Диапазон бос. Теріс қадамда бастау шекарадан үлкен болуы керек.';
      } else {
        status.textContent = 'Барлығы ' + values.length + ' сан. Шекарадағы ' + stop + ' саны тізімге кірмейді.';
        if (arity < 3) facts.append(el('li', { text: 'Жазылмаған бөліктер өздігінен қойылады: ' + (arity === 1 ? 'start = 0, step = 1.' : 'step = 1.') }));
        facts.append(
          el('li', { text: 'Бірінші сан: ' + values[0] + '. Соңғы сан: ' + values[values.length - 1] + '.' }),
          el('li', { text: 'Сан саны = ' + values.length + ' (цикл ' + values.length + ' рет қайталанады).' }),
          el('li', { text: step > 0 ? 'Қадам оң: әр сан алдыңғыдан ' + step + '-ге көп.' : 'Қадам теріс: әр сан алдыңғыдан ' + Math.abs(step) + '-ге аз.' })
        );
      }
    }

    function selectPreset(index) {
      selected = index;
      arity = examples[index].arity;
      fields.forEach(({ key, input }) => { input.value = examples[index][key]; });
      refresh();
    }
    examples.forEach((example, index) => presetBar.append(button(example.title, () => selectPreset(index))));
    fields.forEach(({ input }) => input.addEventListener('input', () => {
      selected = -1;
      refresh();
    }));
    setup.append(...fields.map(field => field.wrap));
    host.append(presetBar,
      el('div', { class: 'p12-problem' }, [el('b', { text: 'Есептің шарты' }), problem]),
      el('div', { class: 'p12-split range' }, [
        el('div', {}, [setup, code.root]),
        el('div', { class: 'p12-stage' }, [label('range() берген сандар'), numbers.root, list, facts, el('div', { class: 'p12-controls' }, [walk])])
      ]),
      status
    );
    selectPreset(0);
  }

  /* ---------- 03: санауыш, қосынды, көбейтінді ---------- */
  function collector(name, question, expression, className) {
    const total = el('strong', { class: 'p12-total', text: '0' });
    const math = el('code', { class: 'p12-equation', text: expression });
    return {
      total, math,
      root: el('div', { class: 'p12-collector ' + className }, [
        label(name), el('b', { text: question }), total, math
      ])
    };
  }

  const ACC = {
    count: { name: 'k', title: 'САНАУЫШ · k', question: 'Неше сан бар?', init: 'k = 0', body: 'k = k + 1', max: 10, cls: 'count', label: 'Санауыш', word: 'санауыш',
      calc: list => list.length, eq: (v, i) => (v - 1) + ' + 1 = ' + v },
    sum: { name: 's', title: 'ҚОСЫНДЫ · s', question: 'Сандардың қосындысы қанша?', init: 's = 0', body: 's = s + i', max: 10, cls: 'sum', label: 'Қосынды', word: 'қосынды',
      calc: list => list.reduce((x, y) => x + y, 0), eq: (v, i) => (v - i) + ' + ' + i + ' = ' + v },
    prod: { name: 'p', title: 'КӨБЕЙТІНДІ · p', question: 'Сандардың көбейтіндісі қанша?', init: 'p = 1', body: 'p = p * i', max: 6, cls: 'sum', label: 'Көбейтінді', word: 'көбейтінді',
      calc: list => list.reduce((x, y) => x * y, 1), eq: (v, i) => (v / i) + ' × ' + i + ' = ' + v }
  };

  function accDemo(host, kind, expectedId) {
    const K = ACC[kind];
    const n = el('input', { type: 'range', min: 2, max: K.max, value: 5, 'aria-label': 'n — соңғы сан' });
    const nValue = el('output', { text: '5' });
    const box = collector(K.title, K.question, K.init, K.cls);
    const holder = el('div');
    const root = el('div', { class: 'p12-collectors one' }, [box.root]);
    let machine;
    function build() {
      const end = n.valueAsNumber;
      nValue.textContent = end;
      const list = trace.rangeVals(1, end + 1, 1);
      const expected = document.getElementById(expectedId);
      if (expected) expected.textContent = 'Күтілетін нәтиже: n = ' + end + ' болса, ' + K.word + ' ' + K.calc(list) + '.';
      box.total.textContent = K.init.split('= ')[1]; box.math.textContent = K.init;
      machine?.dispose();
      holder.replaceChildren();
      machine = loopMachine(holder, {
        code: 'n = ' + end + '\n' + K.init + '\nfor i in range(1, n + 1):\n    ' + K.body + '\nprint("' + K.label + ':", ' + K.name + ')',
        spec: {
          pre: [{ id: 'init', type: 'proc', text: 'n = ' + end + '; ' + K.init }, { id: 'range', type: 'proc', text: 'range(1, n + 1) қатары' }],
          test: 'Қатарда сан қалды ма?',
          body: [{ id: 'asg', type: 'proc', text: 'i = келесі сан' }, { id: 'acc', type: 'proc', text: K.body }],
          exit: [{ id: 'res', type: 'io', text: 'print(' + K.name + ')' }]
        },
        rangeNode: 'range',
        lineNode: { 0: 'init', 1: 'init', 3: 'acc', 4: 'res' },
        bodyNodes: ['acc'],
        extra: () => ({
          root,
          update(frame) {
            const read = id => { const item = frame.vars.find(v => v.n === id); return item ? Number(item.v) : null; };
            const v = read(K.name), i = read('i');
            box.total.textContent = v === null ? K.init.split('= ')[1] : v;
            box.math.textContent = frame.node === 'acc' && v !== null ? K.eq(v, i) : K.name + ' = ' + (v === null ? K.init.split('= ')[1] : v);
          }
        })
      });
    }
    n.addEventListener('input', build);
    host.append(el('label', { class: 'p12-slider' }, [el('b', { text: 'n · соңғы сан' }), n, nValue]), holder);
    build();
    return () => machine.pause();
  }

  function mountCollectorTabs() {
    const tabs = [...document.querySelectorAll('.p12-collect-tabs [role="tab"]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    const pause = [
      accDemo(document.getElementById('pCount'), 'count', 'pCountExpected'),
      accDemo(document.getElementById('pSum'), 'sum', 'pSumExpected'),
      accDemo(document.getElementById('pProd'), 'prod', 'pProdExpected')
    ];
    let selected = 0;
    function select(index) {
      pause[selected]();
      selected = index;
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', event => {
        const last = tabs.length - 1;
        const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next);
        tabs[next].focus();
      });
    });
    function openLinkedExample() {
      const index = panels.findIndex(panel => '#' + panel.id === location.hash);
      if (index < 0) return;
      select(index);
      document.getElementById('collect').scrollIntoView();
    }
    window.addEventListener('hashchange', openLinkedExample);
    if (panels.some(panel => '#' + panel.id === location.hash)) requestAnimationFrame(openLinkedExample);
  }

  /* ---------- 04: жиі қателер ---------- */
  const mistakes = [
    { title: 'Қос нүкте жоқ', goal: '0, 1, 2 сандарын шығар.', wrong: 'for i in range(3)\n    print(i)', right: 'for i in range(3):\n    print(i)', why: 'for жолы қос нүктемен аяқталады. Онсыз Python цикл денесі қайдан басталатынын білмейді.' },
    { title: 'Шегініс жоқ', goal: '0, 1, 2 сандарын шығар.', wrong: 'for i in range(3):\nprint(i)', right: 'for i in range(3):\n    print(i)', why: 'Цикл денесі for-дан кейін 4 бос орынмен ішке жазылады. Шегініссіз жол циклге жатпайды.' },
    { title: 'Соңғы сан шықпай қалды', goal: '1-ден 5-ке дейін (5-ті қоса) шығар.', wrong: 'for i in range(1, 5):\n    print(i)', right: 'for i in range(1, 6):\n    print(i)', why: 'Шекара (stop) кірмейді. 5 шығуы үшін шекараны 6 деп жазу керек.' },
    { title: 'Қадамның бағыты қате', goal: '5-тен 1-ге дейін кері санау.', wrong: 'for i in range(5, 0, 1):\n    print(i)', right: 'for i in range(5, 0, -1):\n    print(i)', why: 'Қадам оң болса, сандар өседі. 5-тен 0-ге қарай кему үшін қадам теріс (-1) болуы керек.' },
    { title: 'Қорап әр жолы босап қалады', goal: '1-ден 4-ке дейінгі сандардың қосындысын шығар (10).', wrong: 's = 0\nfor i in range(1, 5):\n    s = 0\n    s = s + i\nprint(s)', right: 's = 0\nfor i in range(1, 5):\n    s = s + i\nprint(s)', why: 'Жинайтын айнымалыны цикл алдында бір рет дайындайды. Цикл ішінде s = 0 жазсаң, әр қайталауда қорап босап қалады.' },
    { title: 'Цикл денесі қайда аяқталады', goal: '0, 1, 2 сандарын шығарып, соңында «Дайын» деп бір рет жаз.', wrong: 'for i in range(3):\n    print(i)\n    print("Дайын")', right: 'for i in range(3):\n    print(i)\nprint("Дайын")', why: 'Шегінген жолдар ғана қайталанады. Шегініссіз жазылған жол цикл біткен соң бір рет орындалады.' }
  ];

  function runText(source) {
    const result = trace.run(source);
    if (!result.ok) return { error: true, text: result.msg };
    return { error: false, text: result.out.length ? result.out.join('\n') : 'Экранға ештеңе шықпады' };
  }

  function mistakesDemo(host) {
    let selected = 0;
    let fixed = false;
    const tabs = el('div', { class: 'p12-presets', 'aria-label': 'Қателер' });
    const goal = el('p', { class: 'p12-range-problem' });
    const panel = codePanel('Код', []);
    const result = el('pre', { class: 'p12-terminal' });
    const why = el('p', { class: 'p12-status', role: 'status' });
    const toggle = button('', () => { fixed = !fixed; paint(); }, true);
    function paint() {
      const item = mistakes[selected];
      [...tabs.children].forEach((tab, index) => tab.setAttribute('aria-pressed', String(index === selected)));
      goal.textContent = item.goal;
      const source = fixed ? item.right : item.wrong, run = runText(source);
      panel.setCode(source.split('\n'));
      result.textContent = run.text;
      result.classList.toggle('p12-terminal-empty', run.error || run.text.startsWith('Экранға ештеңе'));
      result.dataset.kind = run.error ? 'error' : '';
      why.dataset.kind = fixed ? '' : 'error';
      why.textContent = (fixed ? 'Дұрыс нұсқа. ' : 'Қате. ') + item.why;
      toggle.textContent = fixed ? '← Қате нұсқаны көр' : 'Қатені түзет →';
    }
    mistakes.forEach((item, index) => tabs.append(button((index + 1) + '. ' + item.title, () => { selected = index; fixed = false; paint(); })));
    host.append(tabs,
      el('div', { class: 'p12-problem' }, [el('b', { text: 'Не істеу керек' }), goal]),
      el('div', { class: 'p12-split' }, [panel.root, el('div', { class: 'p12-stage' }, [label('Python не істейді'), result])]),
      why, el('div', { class: 'p12-controls' }, [toggle]));
    paint();
  }

  /* ---------- Тапсырмалар ---------- */
  function mountTabs() {
    const tabs = [...document.querySelectorAll('.pl-seg [data-tab]')];
    const panes = [...document.querySelectorAll('.pl-pane')];
    function go(id, updateHash) {
      if (id.startsWith('pp-')) id = 'task';
      if (!panes.some(pane => pane.id === id)) id = 'teo';
      pauseAll.forEach(pause => pause());
      panes.forEach(pane => { pane.hidden = pane.id !== id; });
      tabs.forEach(tab => {
        const active = tab.dataset.tab === id;
        tab.classList.toggle('on', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      if (updateHash) {
        history.replaceState(null, '', '#' + id);
        window.scrollTo(0, 0);
      }
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => go(tab.dataset.tab, true));
      tab.addEventListener('keydown', event => {
        const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        go(tabs[next].dataset.tab, true);
        tabs[next].focus();
      });
    });
    document.querySelectorAll('[data-go]').forEach(item => item.addEventListener('click', () => {
      go(item.dataset.go, true);
      tabs.find(tab => tab.dataset.tab === item.dataset.go)?.focus({ preventScroll: true });
    }));
    window.addEventListener('hashchange', () => go(location.hash.slice(1), false));
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll.forEach(pause => pause()); });
    go(location.hash.slice(1), false);
  }

  const contents = [...document.querySelectorAll('.p12-contents a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const active = entries.find(entry => entry.isIntersecting);
      if (!active) return;
      contents.forEach(link => {
        if (link.hash === '#' + active.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, {rootMargin:'-20% 0px -60% 0px'});
    contents.forEach(link => observer.observe(document.getElementById(link.hash.slice(1))));
  }

  loopDemo(document.getElementById('pMachine'));
  rangeDemo(document.getElementById('pRange'));
  mistakesDemo(document.getElementById('pMistakes'));
  mountTabs();
  mountCollectorTabs();
})();
