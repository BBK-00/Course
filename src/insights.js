/* Топты талдау: журнал деректерінен көрсеткіштер мен келесі 2 сабаққа болжам. ЖИ қолданылмайды — бәрі формула. */

const round1 = v => Math.round(v * 10) / 10;
const mean = list => list.length ? list.reduce((a, v) => a + v, 0) / list.length : null;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
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
  const missing = total - scores.length; // бағасы жоқ тақырыптар: келмеген, қайта тапсыру немесе бос
  const blank = points.filter(p => p.score === null && !p.mark).length;
  // Баға аз (1–2 немесе жоқ): бағасыз тақырыптарды білмеуі мүмкін деп, болжамды төмендетеміз
  if (scores.length < 3) {
    const known = scores.length ? mean(scores) : 40;
    const first = clamp(known - 40 * missing / total, 0, 100);
    const reasons = [scores.length ? total + ' тақырыптың ' + scores.length + '-інде ғана баға бар, қалғанын білмеуі мүмкін' : 'әлі баға жоқ, тақырыптар меңгерілмеген болуы мүмкін'];
    if (absent) reasons.push('сабаққа келмеген: ' + absent + ' рет');
    if (retake) reasons.push('қалған сабақ (қайта тапсыру керек): ' + retake);
    return {
      ready: true, thin: true, count: scores.length, absent, retake, missing, total,
      base: round1(known), trend: 0, next: [Math.round(first), Math.round(first)],
      range: [Math.round(clamp(first - 15, 0, 100)), Math.round(clamp(first + 15, 0, 100))],
      risk: first < 50 ? 'high' : first < threshold ? 'mid' : 'low', reasons
    };
  }
  const last = scores.slice(-3).reverse(); // жаңасы бірінші
  const weights = [0.5, 0.3, 0.2];
  const base = last.reduce((a, v, i) => a + v * weights[i], 0);
  const trend = clamp(slope(scores.slice(-4)), -10, 10);
  const recent = points.slice(-5);
  const recentAbsent = recent.filter(p => p.mark === 'ж').length;
  const absencePenalty = 15 * (0.6 * recentAbsent / Math.max(1, recent.length) + 0.4 * absent / Math.max(1, points.length));
  const retakePenalty = Math.min(retake, 4) * 3;
  const blankPenalty = 15 * blank / total; // бос ұяшық = баға қойылмаған тақырып
  const first = clamp(base + 0.5 * trend - absencePenalty - retakePenalty - blankPenalty, 0, 100);
  const second = clamp(first + 0.5 * trend, 0, 100);
  const spread = clamp(deviation(scores), 5, 15);
  const risk = first < 50 ? 'high' : first < threshold ? 'mid' : 'low';
  const reasons = [];
  if (trend <= -2) reasons.push('соңғы бағалар төмендеп барады');
  else if (trend >= 2) reasons.push('соңғы бағалар жоғарылап барады');
  if (mean(scores) < threshold) reasons.push('орташа балл межеден төмен (' + round1(mean(scores)) + ')');
  if (recentAbsent >= 1 || absent >= 2) reasons.push('сабаққа келмеген: ' + absent + ' рет' + (recentAbsent ? ' (соңғы 5 сабақта ' + recentAbsent + ')' : ''));
  if (retake) reasons.push('қалған сабақ (қайта тапсыру керек): ' + retake);
  if (blank >= 2) reasons.push(blank + ' тақырыпқа баға қойылмаған');
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

  const lessons = graded.map(l => {
    const sc = students.map(s => scoresOf(s, l)).filter(isNum);
    const absent = students.filter(s => cell(s, l)?.mark === 'ж').length;
    return { key: l.key, date: l.date, number: l.number, title: l.title || '', kind: l.kind, source: l.source, avg: sc.length ? round1(mean(sc)) : null, n: sc.length, absent };
  });
  const filled = lessons.filter(l => l.avg !== null);
  const overall = mean(filled.map(l => l.avg));
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

  const planned = new Set(view.plan.map(t => t.n));
  const done = new Set(graded.map(l => Number(l.number)).filter(n => planned.has(n)));

  const predictions = students.map(s => {
    const points = graded.map(l => ({ score: scoresOf(s, l), mark: cell(s, l)?.mark || '' }));
    const f = forecastStudent(points, threshold);
    const weak = [], missed = [];
    graded.forEach((l, i) => {
      const p = points[i], info = lessons[i];
      const item = { key: l.key, date: l.date, number: l.number, title: l.title || '', score: p.score };
      if (p.score !== null && (p.score < threshold || (info.avg !== null && p.score < info.avg - 10))) weak.push(item);
      if (p.mark === 'ж' || p.mark === 'с') missed.push({ ...item, retake: p.mark === 'с' });
    });
    weak.sort((a, b) => a.score - b.score);
    const unscored = graded.map((l, i) => ({ key: l.key, date: l.date, number: l.number, title: l.title || '', score: null, mark: points[i].mark })).filter((_, i) => points[i].score === null && points[i].mark !== 'ж');
    return { id: s.id, name: s.name, avg: view.summary[s.id]?.avg ?? null, ...f, weak: weak.slice(0, 3), missed: missed.slice(-3).reverse(), unscored: f.thin ? unscored.slice(0, 5) : [] };
  });
  const order = { high: 0, mid: 1, low: 2 };
  predictions.sort((a, b) => (a.ready === b.ready ? 0 : a.ready ? -1 : 1) || (order[a.risk] ?? 3) - (order[b.risk] ?? 3) || (a.next?.[0] ?? 0) - (b.next?.[0] ?? 0));

  const practice = view.lessons.filter(l => l.source === 'practice').map(l => {
    const sc = students.map(s => cell(s, l)?.score).filter(isNum);
    return { key: l.key, title: l.title, avg: sc.length ? Math.round(mean(sc)) : null, n: sc.length };
  });

  return {
    kpi: {
      students: students.length, lessons: graded.length, avg: groupAvg, recentAvg, earlierAvg, threshold,
      below: avgs.filter(v => v < threshold).length, attendance, absent: absentTotal, retake: retakeTotal,
      planDone: done.size, planTotal: view.plan.length
    },
    trend: lessons, histogram,
    donut: { graded: gradedCells, absent: absentTotal, retake: retakeTotal },
    absentTop: students.map(s => ({ id: s.id, name: s.name, absent: view.summary[s.id]?.absent || 0 })).filter(r => r.absent).sort((a, b) => b.absent - a.absent).slice(0, 8),
    hardTopics: lessons.filter(l => l.hard).sort((a, b) => a.avg - b.avg).slice(0, 4),
    practice, predictions,
    risk: { high: predictions.filter(p => p.risk === 'high').length, mid: predictions.filter(p => p.risk === 'mid').length, notReady: predictions.filter(p => !p.ready).length }
  };
}

/* ЖИ-ге бару үшін ықшам кіріс (токен аз): тек қауіптегі студенттер мен қиын тақырыптар */
export function compactFacts(analysis) {
  const k = analysis.kpi;
  return {
    average: k.avg, threshold: k.threshold, recent: k.recentAvg, earlier: k.earlierAvg, attendance: k.attendance,
    hardTopics: analysis.hardTopics.map(t => (t.title || t.date) + ' (' + t.avg + ')'),
    atRisk: analysis.predictions.filter(p => p.ready && p.risk !== 'low').slice(0, 6).map(p => ({
      name: p.name, forecast: p.next[0], reasons: p.reasons.slice(0, 2), weak: p.weak.map(w => w.title || w.date).slice(0, 2)
    }))
  };
}

export const factsKey = facts => {
  const text = JSON.stringify(facts);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return String(hash >>> 0) + ':' + text.length;
};
