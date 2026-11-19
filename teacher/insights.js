/* Топты талдау: диаграммалар (формуламен есептелген, ЖИ жоқ) және келесі 2 сабаққа болжам. Сервер: /api/teacher/classes/insights */
window.TeacherInsights = function ({ h, btn, api, toast, openJournal }) {
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = new Intl.NumberFormat('kk-KZ', { maximumFractionDigits: 1 });
  const dm = date => date.slice(8, 10) + '.' + date.slice(5, 7);
  const band = (score, threshold) => score >= 90 ? 'high' : score >= 75 ? 'good' : score >= threshold ? 'mid' : 'low';
  const BIN_COLORS = ['#e8806c', '#f0b36b', '#f3d36a', '#c8dd86', '#8fcf9b', '#4fb97c'];
  const RISK = { high: ['Қауіпті', 'low'], mid: ['Назар аудару', 'mid'], low: ['Тұрақты', 'high'] };
  const state = { course: 0, student: 0, courses: null };

  const svg = (tag, attrs = {}, kids = []) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v);
    for (const kid of [].concat(kids)) if (kid) el.append(kid);
    return el;
  };
  const title = text => svg('title', {}, document.createTextNode(text));
  const card = (heading, note, ...body) => h('section', { class: 'workspace-card ins-card' }, [h('div', { class: 'ins-head' }, [h('h2', { text: heading }), note ? h('small', { text: note }) : null]), ...body]);
  const empty = text => h('p', { class: 'workspace-empty', text });

  /* Сызықты диаграмма: series = [{name,color,values:[number|null],dash}] */
  function lineChart(labels, series, threshold) {
    const W = 640, H = 230, L = 34, R = 12, T = 12, B = 30, n = labels.length;
    const x = i => n < 2 ? (L + W - R) / 2 : L + i * (W - L - R) / (n - 1), y = v => T + (100 - v) * (H - T - B) / 100;
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ins-svg', role: 'img', 'aria-label': 'Орташа баллдың сабақ бойынша өзгерісі' });
    for (const g of [0, 25, 50, 75, 100]) {
      root.append(svg('line', { x1: L, x2: W - R, y1: y(g), y2: y(g), stroke: '#ececf6' }), svg('text', { x: L - 6, y: y(g) + 4, 'text-anchor': 'end', class: 'ins-axis' }, document.createTextNode(String(g))));
    }
    root.append(svg('line', { x1: L, x2: W - R, y1: y(threshold), y2: y(threshold), stroke: '#b42318', 'stroke-dasharray': '5 4' }),
      svg('text', { x: W - R, y: y(threshold) - 4, 'text-anchor': 'end', class: 'ins-axis', fill: '#b42318' }, document.createTextNode('шек ' + threshold)));
    const step = Math.ceil(n / 12);
    labels.forEach((label, i) => { if (i % step === 0) root.append(svg('text', { x: x(i), y: H - 10, 'text-anchor': 'middle', class: 'ins-axis' }, document.createTextNode(label))); });
    for (const s of series) {
      let d = '';
      s.values.forEach((v, i) => { if (v === null || v === undefined) return; d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); });
      root.append(svg('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-dasharray': s.dash || null }));
      s.values.forEach((v, i) => { if (v !== null && v !== undefined) root.append(svg('circle', { cx: x(i), cy: y(v), r: 3.5, fill: s.color }, title(s.name + ' · ' + labels[i] + ' · ' + fmt.format(v)))); });
    }
    return root;
  }

  function histogram(bins) {
    const W = 420, H = 190, B = 26, T = 18, max = Math.max(1, ...bins.map(b => b.count)), bw = W / bins.length;
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ins-svg', role: 'img', 'aria-label': 'Студенттердің орташа баллдары бойынша бөліну' });
    bins.forEach((b, i) => {
      const bh = (H - B - T) * b.count / max, bx = i * bw + 8;
      root.append(svg('rect', { x: bx, y: H - B - bh, width: bw - 16, height: Math.max(bh, 1), rx: 5, fill: BIN_COLORS[i] }, title(b.lo + '–' + b.hi + ': ' + b.count + ' студент')),
        svg('text', { x: bx + (bw - 16) / 2, y: H - B - bh - 5, 'text-anchor': 'middle', class: 'ins-num' }, document.createTextNode(String(b.count))),
        svg('text', { x: bx + (bw - 16) / 2, y: H - 8, 'text-anchor': 'middle', class: 'ins-axis' }, document.createTextNode(b.lo + '–' + b.hi)));
    });
    return root;
  }

  function donut(parts) {
    const total = parts.reduce((a, p) => a + p.value, 0) || 1, R = 52, C = 2 * Math.PI * R;
    let offset = 0;
    const root = svg('svg', { viewBox: '0 0 140 140', class: 'ins-donut', role: 'img', 'aria-label': 'Қатысу және қайта тапсыру' });
    root.append(svg('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: '#ececf6', 'stroke-width': 22 }));
    for (const p of parts) {
      const len = C * p.value / total;
      if (p.value) root.append(svg('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: p.color, 'stroke-width': 22, 'stroke-dasharray': `${len} ${C - len}`, 'stroke-dashoffset': -offset, transform: 'rotate(-90 70 70)' }, title(p.name + ': ' + p.value)));
      offset += len;
    }
    return root;
  }

  const bars = (rows, color, max) => h('div', { class: 'ins-bars' }, rows.map(r => h('div', { class: 'ins-bar' }, [
    h('span', { class: 'ins-bar-name', text: r.name, title: r.name }),
    h('span', { class: 'ins-bar-track' }, h('i', { style: `width:${Math.max(2, r.value / max * 100)}%;background:${r.color || color}` })),
    h('b', { text: r.label ?? String(r.value) })])));

  function heatmap(view, student) {
    const lessons = view.lessons.filter(l => l.source !== 'practice');
    const head = [h('th', { class: 'ins-heat-name', text: 'Студент' }), ...lessons.map(l => h('th', { title: l.title || l.date, text: dm(l.date) })), h('th', { text: 'Орт.' })];
    const rows = view.students.map(s => h('tr', {}, [
      h('th', { class: 'ins-heat-name' }, h('button', { type: 'button', class: 'student-ai', on: { click: () => student(s.id) } }, s.name)),
      ...lessons.map(l => {
        const c = view.cells[s.id]?.[l.key];
        const text = !c ? '' : c.score !== null ? String(Math.round(c.score)) : c.mark === 'ж' ? 'н' : 'қ';
        return h('td', { class: c ? 'jc ' + (c.score !== null ? band(c.score, view.threshold) : c.mark === 'ж' ? 'abs' : 'ret') : '', title: c ? (c.score ?? (c.mark === 'ж' ? 'НБ' : 'Қайта тапсыру')) + ' · ' + dm(l.date) : '', text });
      }),
      h('td', { class: 'ins-heat-avg', text: view.summary[s.id]?.avg == null ? '—' : fmt.format(view.summary[s.id].avg) })]));
    return h('div', { class: 'ins-scroll', tabindex: '0', 'aria-label': 'Студент және сабақ бойынша баллдар' }, h('table', { class: 'ins-heat' }, [h('thead', {}, h('tr', {}, head)), h('tbody', {}, rows)]));
  }

  const kpiCard = (name, value, note, tone) => h('div', { class: 'ins-kpi' + (tone ? ' ' + tone : '') }, [h('small', { text: name }), h('strong', { text: String(value) }), note ? h('span', { text: note }) : null]);

  function summaryText(a) {
    const k = a.kpi, risky = a.predictions.filter(p => p.ready && p.risk === 'high'), mid = a.predictions.filter(p => p.ready && p.risk === 'mid');
    const parts = [];
    if (k.avg !== null) parts.push('Топтың орташасы ' + fmt.format(k.avg) + (k.recentAvg !== null && k.earlierAvg !== null ? '; соңғы сабақтарда ' + fmt.format(k.recentAvg) + ' (бұрын ' + fmt.format(k.earlierAvg) + ')' : '') + '.');
    parts.push(risky.length ? 'Келесі 2 сабақта 50 баллдан төмен алуы мүмкін: ' + risky.map(p => p.name).join(', ') + '.' : 'Қазіргі көрсеткіштер бойынша 50 баллдан төмен болжам жоқ.');
    if (mid.length) parts.push('Межеден (' + k.threshold + ') төмен болу қаупі: ' + mid.map(p => p.name).join(', ') + '.');
    if (a.hardTopics.length) parts.push('Қиын тақырыптар: ' + a.hardTopics.map(t => (t.title || dm(t.date)) + ' (' + fmt.format(t.avg) + ')').join(', ') + '.');
    return parts.join(' ');
  }

  function advice(p) {
    const lines = [];
    if (p.weak.length) lines.push('Осы тақырыптардан қосымша тапсырма беріңіз: ' + p.weak.map(w => (w.title || dm(w.date)) + ' (' + fmt.format(w.score) + ')').join('; ') + '.');
    if (p.unscored?.length) lines.push('Бағасы жоқ тақырыптар (білмеуі мүмкін): ' + p.unscored.map(w => w.title || dm(w.date)).join('; ') + '. Осылардан қосымша тапсырма беріңіз.');
    if (p.missed.length) lines.push('Сабаққа келмеген тақырыптарды қысқаша түсіндіріңіз: ' + p.missed.map(w => w.title || dm(w.date)).join('; ') + '.');
    if (!lines.length) lines.push(p.risk === 'low' ? 'Қосымша шара керек емес, қазіргі қарқынды сақтаңыз.' : 'Жеке әңгіме өткізіп, соңғы жұмыстарын бірге қарап шығыңыз.');
    return lines;
  }

  function forecastTable(a, view, student) {
    const rows = a.predictions.map(p => h('tr', { class: p.ready ? 'risk-' + p.risk : 'risk-none' }, [
      h('th', { scope: 'row' }, h('button', { type: 'button', class: 'student-ai', on: { click: () => student(p.id) } }, p.name)),
      h('td', { text: p.avg === null ? '—' : fmt.format(p.avg) }),
      p.ready ? h('td', {}, [h('b', { text: p.next[0] + ' · ' + p.next[1] }), h('small', { text: ' (' + p.range[0] + '–' + p.range[1] + ')' + (p.thin ? ' · аз баға' : '') })]) : h('td', { class: 'ins-muted', text: 'дерек аз (' + p.count + ' баға)' }),
      h('td', {}, p.ready ? h('span', { class: 'jc ' + RISK[p.risk][1], text: RISK[p.risk][0] }) : '—'),
      h('td', { class: 'ins-reasons', text: p.ready ? p.reasons.join('; ') || '—' : 'Журналда сабақ жоқ' }),
      h('td', { class: 'ins-advice' }, p.ready && p.risk !== 'low' ? advice(p).map(t => h('p', { text: t })) : p.ready ? '' : '')]));
    return h('div', { class: 'ins-scroll' }, h('table', { class: 'classes-table ins-forecast' }, [
      h('thead', {}, h('tr', {}, ['Студент', 'Орташа', 'Болжам (1 · 2 сабақ)', 'Қауіп', 'Себебі', 'Не істеу керек'].map(t => h('th', { scope: 'col', text: t })))), h('tbody', {}, rows)]));
  }

  function studentCard(a, view, id, close) {
    const s = view.students.find(x => x.id === id), p = a.predictions.find(x => x.id === id);
    if (!s || !p) return null;
    const lessons = view.lessons.filter(l => l.source !== 'practice');
    const own = lessons.map(l => { const c = view.cells[s.id]?.[l.key]; return c && c.score !== null ? c.score : null; });
    const group = a.trend.map(l => l.avg);
    const marks = lessons.map(l => view.cells[s.id]?.[l.key]?.mark).filter(Boolean);
    const practice = view.lessons.filter(l => l.source === 'practice').map(l => ({ name: l.title, value: view.cells[s.id]?.[l.key]?.score ?? 0, label: view.cells[s.id]?.[l.key] ? view.cells[s.id][l.key].score + '%' : '—' }));
    return h('section', { class: 'workspace-card ins-card ins-student', id: 'insStudent' }, [
      h('div', { class: 'ins-head' }, [h('h2', { text: s.name }), h('span', { class: 'sp' }), btn('Жабу', close, 'sm')]),
      h('div', { class: 'ins-kpis' }, [kpiCard('Орташа', p.avg === null ? '—' : fmt.format(p.avg), 'топта ' + (a.kpi.avg === null ? '—' : fmt.format(a.kpi.avg))), kpiCard('Болжам', p.ready ? p.next[0] + ' · ' + p.next[1] : '—', p.ready ? RISK[p.risk][0] : 'дерек аз', p.ready && p.risk === 'high' ? 'bad' : ''),
        kpiCard('НБ', p.absent, 'сабаққа келмеген'), kpiCard('Қайта тапсыру', p.retake, marks.length + ' белгі')]),
      h('div', { class: 'ins-legend' }, [h('i', { style: 'background:#e2661f' }), s.name.split(' ').slice(0, 2).join(' '), h('i', { style: 'background:#4144c4' }), 'Топ орташасы']),
      lineChart(lessons.map(l => dm(l.date)), [{ name: 'Топ орташасы', color: '#4144c4', values: group, dash: '6 4' }, { name: s.name, color: '#e2661f', values: own }], view.threshold),
      p.ready && p.reasons.length ? h('p', {}, [h('b', { text: 'Белгілер: ' }), p.reasons.join('; ') + '.']) : null,
      h('div', { class: 'ins-advice-box' }, [h('b', { text: 'Ұсыныс' }), ...advice(p).map(t => h('p', { text: t }))]),
      practice.length ? h('div', {}, [h('h3', { text: 'Python жаттығуы' }), bars(practice, '#4fb97c', 100)]) : null]);
  }

  async function paint(root, data) {
    const view = data, a = data.analysis, k = a.kpi;
    if (!view.lessons.length || !view.students.length) { root.append(empty('Талдау үшін журналға студент пен сабақ күндерін қосыңыз («Журнал» бөлімінде Google журналын импорттаңыз).')); return; }
    const delta = k.recentAvg !== null && k.earlierAvg !== null ? k.recentAvg - k.earlierAvg : null;
    const kpis = h('div', { class: 'ins-kpis' }, [
      kpiCard('Топтың орташасы', k.avg === null ? '—' : fmt.format(k.avg), delta === null ? null : (delta >= 0 ? '▲ ' : '▼ ') + fmt.format(Math.abs(delta)) + ' соңғы сабақтарда', delta !== null && delta < 0 ? 'bad' : ''),
      kpiCard('Межеден төмен', k.below, 'студент · шек ' + k.threshold, k.below ? 'bad' : ''),
      kpiCard('Қатысу', k.attendance === null ? '—' : k.attendance + '%', 'НБ ' + k.absent),
      kpiCard('Қайта тапсыру', k.retake, 'белгі'),
      kpiCard('Келесі сабақта қауіп', a.risk.high + a.risk.mid, a.risk.high + ' қауіпті · ' + a.risk.mid + ' назар', a.risk.high ? 'bad' : ''),
      kpiCard('Жоспар', k.planTotal ? k.planDone + ' / ' + k.planTotal : '—', k.planTotal ? 'тақырып өтілді' : 'жоспар жүктелмеген')]);

    const trend = card('Орташа балл динамикасы', 'сабақ күні бойынша', lineChart(a.trend.filter(l => l.avg !== null).map(l => dm(l.date)), [{ name: 'Топ орташасы', color: '#4144c4', values: a.trend.filter(l => l.avg !== null).map(l => l.avg) }], k.threshold));
    const hist = card('Баллдар бойынша бөліну', 'студенттің орташасы', histogram(a.histogram));
    const parts = [{ name: 'Бағаланды', value: a.donut.graded, color: '#4fb97c' }, { name: 'НБ', value: a.donut.absent, color: '#8a8cab' }, { name: 'Қайта тапсыру', value: a.donut.retake, color: '#f0b36b' }];
    const attend = card('Қатысу', null, h('div', { class: 'ins-donut-row' }, [donut(parts), h('ul', { class: 'ins-key' }, parts.map(p => h('li', {}, [h('i', { style: 'background:' + p.color }), p.name + ': ' + p.value])))]),
      a.absentTop.length ? bars(a.absentTop.map(r => ({ name: r.name, value: r.absent })), '#8a8cab', a.absentTop[0].absent) : null);

    const topics = card('Сабақтар мен тақырыптар', 'қызыл — топ орташасынан төмен', a.trend.some(l => l.avg !== null)
      ? bars(a.trend.filter(l => l.avg !== null).map(l => ({ name: dm(l.date) + (l.title ? ' · ' + l.title : ''), value: l.avg, color: l.hard ? '#e8806c' : '#4144c4', label: fmt.format(l.avg) + (l.absent ? ' · НБ ' + l.absent : '') })), '#4144c4', 100)
      : empty('Баға жоқ.'));
    const py = a.practice.length ? card('Python жаттығулары', 'студенттердің өз жұмысы, орта %', bars(a.practice.map(l => ({ name: l.title, value: l.avg ?? 0, label: l.avg === null ? '—' : l.avg + '% · ' + l.n + ' студ.' })), '#4fb97c', 100)) : null;

    const aiBox = h('div', { class: 'ins-ai', role: 'status' });
    const showAi = r => aiBox.replaceChildren(h('p', {}, [h('b', { text: 'Қорытынды. ' }), r.summary]), h('p', {}, [h('b', { text: 'Не істеу керек. ' }), r.action]));
    if (data.ai) showAi(data.ai);
    const aiBtn = btn(data.ai ? 'ЖИ түсініктемесін жаңарту' : 'ЖИ-мен түсіндіру', async () => {
      aiBtn.disabled = true; aiBox.replaceChildren(h('p', { text: 'ЖИ түсініктеме жазуда…' }));
      const r = await api('classes/ai', { course: view.course.id });
      aiBtn.disabled = false;
      if (r.ok && r.summary) showAi(r); else aiBox.replaceChildren(h('p', { class: 'bad', text: r.ai === 'ai_config' ? 'ЖИ бапталмаған. Жоғарыдағы есептелген болжам жұмыс істей береді.' : r.ai === 'no_scores' ? 'Түсіндіру үшін баға жеткіліксіз.' : 'ЖИ қазір жауап бермеді. Есептелген болжам жоғарыда.' }));
    }, 'sm');
    const holder = h('div', {});
    const open = id => { state.student = id; const c = studentCard(a, view, id, () => { state.student = 0; holder.replaceChildren(); }); holder.replaceChildren(...(c ? [c] : [])); c?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const forecast = card('Келесі 2 сабаққа болжам', 'формула: соңғы баға, үрдіс, НБ және қайта тапсыру', h('p', { class: 'ins-lead', text: summaryText(a) }),
      forecastTable(a, view, open), h('p', { class: 'ins-note', text: 'Болжам — журнал көрсеткіштеріне негізделген бағалау, кепілдік емес. Бағасы аз студенттерде (3-тен кем) бағасыз тақырыптар меңгерілмеген деп есептеліп болжам төмендетіледі, ауқымы кеңірек.' }),
      h('div', { class: 'workspace-actions' }, [aiBtn]), aiBox);
    root.append(kpis, forecast, holder, h('div', { class: 'ins-grid' }, [trend, hist]), h('div', { class: 'ins-grid' }, [attend, topics]), ...(py ? [py] : []),
      card('Студент × сабақ', 'студент атын бассаң жеке талдау ашылады', heatmap(view, open)));
    if (state.student) open(state.student);
  }

  async function courses() {
    const j = await api('classes');
    if (!j.ok) return [];
    return j.groups.flatMap(g => g.courses.map(c => ({ ...c, group: g })));
  }

  async function render(root, { course, student } = {}) {
    if (course) state.course = course;
    if (student) state.student = student;
    state.courses = await courses();
    if (!state.courses.length) { root.replaceChildren(empty('Алдымен «Топтар» бөлімінде топ пен пәнді қосыңыз.')); return; }
    if (!state.courses.some(c => c.id === state.course)) state.course = state.courses[0].id;
    const pick = h('select', { class: 'field', 'aria-label': 'Топ және пән' }, state.courses.map(c => h('option', { value: c.id, text: c.group.name + ' · ' + c.subject + ' · ' + c.year + '–' + (c.year + 1) })));
    pick.value = String(state.course);
    pick.onchange = () => { state.course = Number(pick.value); state.student = 0; render(root); };
    const bar = h('section', { class: 'workspace-card' }, [h('div', { class: 'classes-journal-bar' }, [h('label', { class: 'workspace-filter' }, [h('span', { text: 'Топ және пән' }), pick]),
      h('div', { class: 'workspace-actions' }, [btn('Журналға өту', () => openJournal(state.course), 'sm'), btn('Басып шығару', () => window.print(), 'sm')])])]);
    const body = h('div', { class: 'ins-page' }, h('p', { class: 'workspace-empty', role: 'status', text: 'Талдау жүктелуде…' }));
    root.replaceChildren(bar, body);
    const ticket = state.course;
    const data = await api('classes/insights?course=' + state.course);
    if (ticket !== state.course) return;
    if (!data.ok) { body.replaceChildren(h('p', { class: 'workspace-empty', role: 'alert', text: 'Талдауды жүктеу мүмкін болмады.' })); return; }
    body.replaceChildren();
    paint(body, data);
  }

  return { render };
};
