import { PYTHON_TITLES, PREREQ } from './python-titles.js';
/* Топты талдау: журнал деректерінен көрсеткіштер мен келесі 2 сабаққа болжам. ЖИ қолданылмайды — бәрі формула. */

const round1 = v => Math.round(v * 10) / 10;
const mean = list => list.length ? list.reduce((a, v) => a + v, 0) / list.length : null;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtNum = v => String(round1(v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);

export const BINS = [[0, 49], [50, 59], [60, 69], [70, 79], [80, 89], [90, 100]];

/* Соңғы бірнеше бағаның сызықтық көлбеуі (бір сабаққа баллмен) */
export function slope(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2, my = mean(values);
  let num = 0, den = 0;
  values.forEach((y, x) => { num += (x - mx) * (y - my); den += (x - mx) ** 2; });
  return den ? num / den : 0;
}

const deviation = values => {
  const m = mean(values);
  return m === null ? 0 : Math.sqrt(mean(values.map(v => (v - m) ** 2)));
};

/* Студенттің болжамы. points — хронологиялық [{score, mark}] (жаттығу бағандарынсыз). */
export function forecastStudent(points, threshold = 60) {
  const scores = points.map(p => p.score).filter(isNum);
  const absent = points.filter(p => p.mark === 'ж').length;
  const retake = points.filter(p => p.mark === 'с').length;
  if (!points.length) return { ready: false, count: 0, absent, retake };
  const total = points.length;
  // Бірде баға жоқ: болжам жасалмайды (ешкім баға алмаған күндер 0 емес)
  if (!scores.length) return { ready: false, count: 0, absent, retake };
  const markPenalty = Math.min(absent, 3) * 2 + Math.min(retake, 3) * 2; // ж/с белгілері ғана аздап түсіреді
  // Баға аз (1–2): бар бағалардың өзіне сүйенеміз, диапазон кеңірек
  if (scores.length < 3) {
    const known = mean(scores);
    const first = clamp(known - markPenalty, 0, 100);
    const reasons = [];
    if (absent) reasons.push('себепсіз қалған: ' + absent + ' рет');
    if (retake) reasons.push('себеппен қалған сабақ: ' + retake);
    return {
      ready: true, thin: true, count: scores.length, absent, retake, total,
      base: round1(known), trend: 0, next: [Math.round(first), Math.round(first)],
      range: [Math.round(clamp(first - 10, 0, 100)), Math.round(clamp(first + 10, 0, 100))],
      risk: first < 50 ? 'high' : first < threshold ? 'mid' : 'low', reasons
    };
  }
  const last = scores.slice(-3).reverse(); // жаңасы бірінші
  const weights = [0.5, 0.3, 0.2];
  const recentWeighted = last.reduce((a, v, i) => a + v * weights[i], 0);
  const base = 0.6 * recentWeighted + 0.4 * mean(scores);
  const trend = clamp(slope(scores.slice(-4)), -10, 10);
  const recent = points.slice(-5);
  const recentAbsent = recent.filter(p => p.mark === 'ж').length;
  const absencePenalty = 8 * (0.6 * recentAbsent / Math.max(1, recent.length) + 0.4 * absent / Math.max(1, points.length));
  const retakePenalty = Math.min(retake, 4) * 1.5;
  const first = clamp(base + 0.5 * trend - absencePenalty - retakePenalty, 0, 100);
  const second = clamp(first + 0.5 * trend, 0, 100);
  const spread = clamp(deviation(scores), 5, 15);
  const risk = first < 50 ? 'high' : first < threshold ? 'mid' : 'low';
  const reasons = [];
  if (trend <= -2) reasons.push('соңғы бағалар төмендеп барады');
  else if (trend >= 2) reasons.push('соңғы бағалар жоғарылап барады');
  if (mean(scores) < threshold) reasons.push('орташа балл межеден төмен (' + round1(mean(scores)) + ')');
  if (recentAbsent >= 1 || absent >= 2) reasons.push('себепсіз қалған: ' + absent + ' рет' + (recentAbsent ? ' (соңғы 5 сабақта ' + recentAbsent + ')' : ''));
  if (retake) reasons.push('себеппен қалған сабақ: ' + retake);
  return {
    ready: true, count: scores.length, absent, retake,
    base: round1(base), trend: round1(trend), next: [Math.round(first), Math.round(second)],
    range: [Math.round(clamp(first - spread, 0, 100)), Math.round(clamp(first + spread, 0, 100))],
    risk, reasons
  };
}

/* view = journalView() нәтижесі */
export function analyze(view) {
  const threshold = view.threshold || 60;
  const graded = view.lessons.filter(l => l.source !== 'practice');
  const students = view.students;
  const cell = (s, l) => view.cells[s.id]?.[l.key];
  const scoresOf = (s, l) => { const c = cell(s, l); return c && isNum(c.score) ? c.score : null; };
  const planTitle = new Map(view.plan.map(t => [t.n, t.title]));
  const nameOf = n => planTitle.get(n) || PYTHON_TITLES[n] || '';

  const lessons = graded.map(l => {
    const sc = students.map(s => scoresOf(s, l)).filter(isNum);
    const absent = students.filter(s => cell(s, l)?.mark === 'ж').length;
    return { key: l.key, date: l.date, number: l.number, title: l.title || '', kind: l.kind, source: l.source, avg: sc.length ? round1(mean(sc)) : null, n: sc.length, absent };
  });

  /* ---------- Тақырыптар: бір нөмірлі бағандар біріктіріледі ---------- */
  const groups = new Map();
  graded.forEach(l => {
    const n = Number(l.number);
    const id = Number.isFinite(n) && n > 0 && l.source === 'journal' ? 't' + n : l.key;
    if (!groups.has(id)) groups.set(id, { id, n: id[0] === 't' ? n : null, title: l.title || (id[0] === 't' ? nameOf(n) : ''), date: l.date, lessons: [] });
    groups.get(id).lessons.push(l);
  });
  const topics = [...groups.values()].map(g => {
    const results = students.map(s => {
      const cells = g.lessons.map(l => cell(s, l)).filter(Boolean);
      const sc = cells.map(c => c.score).filter(isNum);
      const mark = sc.length ? '' : cells.some(c => c.mark === 'ж') ? 'ж' : cells.some(c => c.mark === 'с') ? 'с' : '';
      return { id: s.id, name: s.name, score: sc.length ? round1(mean(sc)) : null, mark };
    });
    const sc = results.map(r => r.score).filter(isNum);
    const avg = sc.length ? round1(mean(sc)) : null;
    const pass = sc.length ? Math.round(sc.filter(v => v >= threshold).length / sc.length * 100) : null;
    const spread = { high: sc.filter(v => v >= 75).length, mid: sc.filter(v => v >= threshold && v < 75).length, low: sc.filter(v => v < threshold).length, missed: results.filter(r => r.score === null && r.mark).length };
    const status = avg === null ? 'none' : avg < threshold || pass < 60 ? 'hard' : avg >= threshold + 15 && pass >= 80 ? 'good' : 'mid';
    return { id: g.id, n: g.n, title: g.title, date: g.date, avg, min: sc.length ? Math.min(...sc) : null, max: sc.length ? Math.max(...sc) : null, graded: sc.length, pass, spread, status, results };
  });
  const topicAvgs = topics.map(t => t.avg).filter(isNum);
  const overall = mean(topicAvgs);
  const byN = new Map(topics.filter(t => t.n).map(t => [t.n, t]));
  const filled = lessons.filter(l => l.avg !== null);
  for (const l of lessons) l.hard = l.avg !== null && overall !== null && (l.avg < threshold || l.avg < overall - 10);

  const avgs = students.map(s => view.summary[s.id]?.avg).filter(isNum);
  const groupAvg = avgs.length ? round1(mean(avgs)) : null;
  const tail = filled.slice(-3), head = filled.slice(0, -3);
  const recentAvg = tail.length ? round1(mean(tail.map(l => l.avg))) : null;
  const earlierAvg = head.length ? round1(mean(head.map(l => l.avg))) : null;

  const histogram = BINS.map(([lo, hi]) => ({ lo, hi, count: avgs.filter(v => v >= lo && (hi === 100 ? v <= 100 : v < hi + 1)).length }));
  const absentTotal = students.reduce((a, s) => a + (view.summary[s.id]?.absent || 0), 0);
  const retakeTotal = students.reduce((a, s) => a + (view.summary[s.id]?.retake || 0), 0);
  const gradedCells = students.reduce((a, s) => a + graded.filter(l => scoresOf(s, l) !== null).length, 0);
  const attendance = gradedCells + absentTotal + retakeTotal ? Math.round(gradedCells / (gradedCells + absentTotal + retakeTotal) * 100) : null;

  const done = new Set(topics.map(t => t.n).filter(n => n && planTitle.has(n)));

  /* ---------- Келесі 2 тақырып ---------- */
  const lastN = Math.max(0, ...topics.map(t => t.n || 0));
  const nextTopics = [lastN + 1, lastN + 2].map(n => ({ n, title: nameOf(n), prereq: (PREREQ[n] || []).filter(p => byN.has(p)) })).filter(t => t.title);

  const resultOf = (s, topic) => topic.results.find(r => r.id === s.id);
  const predictions = students.map(s => {
    const points = topics.filter(t => t.avg !== null).map(t => { const r = resultOf(s, t); return { score: r.score, mark: r.mark }; });
    const f = forecastStudent(points, threshold);
    const weak = [], missed = [], unscored = [];
    topics.forEach(t => {
      const r = resultOf(s, t), item = { n: t.n, title: t.title || t.date, score: r.score };
      if (r.score !== null && (r.score < threshold || (t.avg !== null && r.score < t.avg - 10))) weak.push(item);
      else if (r.score === null && r.mark) missed.push({ ...item, retake: r.mark === 'с' });
      else if (r.score === null) unscored.push(item);
    });
    weak.sort((a, b) => a.score - b.score);
    // Алғы тақырыптар (келесі тақырыптарға қажет): аты және баллы
    const need = [...new Set(nextTopics.flatMap(t => t.prereq))].sort((a, b) => a - b);
    const chips = need.map(n => { const t = byN.get(n), r = resultOf(s, t); return { n, title: t.title, score: r.score, mark: r.mark }; });
    const forecastFor = nt => {
      const own = chips.filter(c => nt.prereq.includes(c.n));
      if (!own.length) return f.next[0];
      const scored = own.filter(c => c.score !== null);
      if (!scored.length) return f.next[0];
      const missing = own.filter(c => c.score === null && c.mark).length;
      const prereq = clamp(mean(scored.map(c => c.score)) - 3 * missing, 0, 100);
      return Math.round(clamp(0.6 * prereq + 0.4 * f.next[0], 0, 100));
    };
    let next = f.next, risk = f.risk, range = f.range;
    if (f.ready && nextTopics.length) {
      next = nextTopics.map((t, i) => { const v = forecastFor(t); return i ? Math.round(clamp(v + 0.5 * (f.trend || 0), 0, 100)) : v; });
      if (next.length === 1) next = [next[0], next[0]];
      const shift = next[0] - f.next[0];
      range = [Math.round(clamp(f.range[0] + shift, 0, 100)), Math.round(clamp(f.range[1] + shift, 0, 100))];
      risk = next[0] < 50 ? 'high' : next[0] < threshold ? 'mid' : 'low';
    }
    const reasons = [...(f.reasons || [])];
    return { id: s.id, name: s.name, avg: view.summary[s.id]?.avg ?? null, ...f, next, range, risk, reasons: reasons.slice(0, 4), chips, weak: weak.slice(0, 4), missed: missed.slice(-4).reverse(), unscored: unscored.slice(0, 4) };
  });
  const order = { high: 0, mid: 1, low: 2 };
  predictions.sort((a, b) => (a.ready === b.ready ? 0 : a.ready ? -1 : 1) || (order[a.risk] ?? 3) - (order[b.risk] ?? 3) || (a.next?.[0] ?? 0) - (b.next?.[0] ?? 0));

  const practice = view.lessons.filter(l => l.source === 'practice').map(l => {
    const sc = students.map(s => cell(s, l)?.score).filter(isNum);
    return { key: l.key, title: l.title, avg: sc.length ? Math.round(mean(sc)) : null, n: sc.length };
  });
  const rank = topics.filter(t => t.avg !== null);
  return {
    kpi: {
      students: students.length, lessons: graded.length, avg: groupAvg, recentAvg, earlierAvg, threshold,
      below: avgs.filter(v => v < threshold).length, attendance, absent: absentTotal, retake: retakeTotal,
      planDone: done.size, planTotal: view.plan.length
    },
    trend: lessons, histogram, topics,
    donut: { graded: gradedCells, absent: absentTotal, retake: retakeTotal },
    absentTop: students.map(s => ({ id: s.id, name: s.name, absent: view.summary[s.id]?.absent || 0 })).filter(r => r.absent).sort((a, b) => b.absent - a.absent).slice(0, 8),
    hardTopics: rank.filter(t => t.status === 'hard' || (overall !== null && t.avg < overall - 10)).sort((a, b) => a.avg - b.avg).slice(0, 4),
    bestTopics: rank.filter(t => t.status === 'good').sort((a, b) => b.avg - a.avg).slice(0, 3),
    practice, predictions, nextTopics,
    risk: { high: predictions.filter(p => p.risk === 'high').length, mid: predictions.filter(p => p.risk === 'mid').length, notReady: predictions.filter(p => !p.ready).length }
  };
}

/* ЖИ-ге бару үшін ықшам кіріс (токен аз): тек қауіптегі студенттер мен қиын тақырыптар */
export function compactFacts(analysis) {
  const k = analysis.kpi;
  return {
    nextTopics: analysis.nextTopics.map(t => t.n + '. ' + t.title),
    average: k.avg, threshold: k.threshold, recent: k.recentAvg, earlier: k.earlierAvg, attendance: k.attendance,
    hardTopics: analysis.hardTopics.map(t => (t.title || t.date) + ' (' + t.avg + ')'),
    atRisk: analysis.predictions.filter(p => p.ready && p.risk !== 'low').slice(0, 6).map(p => ({
      name: p.name, forecast: p.next[0], reasons: p.reasons.slice(0, 2), weak: p.weak.map(w => w.title).slice(0, 2)
    }))
  };
}

export const factsKey = facts => {
  const text = JSON.stringify(facts);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return String(hash >>> 0) + ':' + text.length;
};
