const round = value => Math.round(value * 10) / 10;
const mean = values => values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null;
const forecastNext = daily => daily.length >= 3 ? mean(daily.slice(-3).map(day => day.score)) : null;

function summarizeBacktest(check) {
  return {
    count: check.count,
    mae: check.count ? round(check.error / check.count) : null,
    lastMae: check.count ? round(check.lastError / check.count) : null
  };
}

export function summarizeProgress(students, entries, threshold) {
  const byStudent = new Map();
  for (const entry of entries) {
    if (!byStudent.has(entry.student)) byStudent.set(entry.student, []);
    byStudent.get(entry.student).push(entry);
  }
  const groupCheck = { count: 0, error: 0, lastError: 0 };
  const profiles = students.map(student => {
    const history = (byStudent.get(student.id) || []).sort((a, b) => a.date.localeCompare(b.date) || a.column - b.column);
    const scores = history.filter(e => e.score !== null);
    const days = new Map();
    for (const { date, score } of scores) {
      if (!days.has(date)) days.set(date, []);
      days.get(date).push(score);
    }
    const daily = [...days].map(([date, values]) => ({ date, score: mean(values) }));
    const last = daily.slice(-2);
    const previous = daily.slice(-4, -2);
    const recentAverage = mean(last.map(day => day.score));
    const previousAverage = previous.length === 2 ? mean(previous.map(day => day.score)) : null;
    const drop = previousAverage === null ? null : round(previousAverage - recentAverage);
    const reason = last.length === 2 && last.every(day => day.score < threshold) ? 'low' : drop >= 10 ? 'drop' : '';

    // Predict each past day using only its three preceding graded days.
    const check = { count: Math.max(0, daily.length - 3), error: 0, lastError: 0 };
    for (let index = 3; index < daily.length; index++) {
      const prediction = forecastNext(daily.slice(index - 3, index));
      check.error += Math.abs(prediction - daily[index].score);
      check.lastError += Math.abs(daily[index - 1].score - daily[index].score);
    }
    if (student.active) {
      groupCheck.count += check.count;
      groupCheck.error += check.error;
      groupCheck.lastError += check.lastError;
    }

    return {
      ...student, history, daily, average: mean(scores.map(e => e.score)), count: scores.length, reason, drop,
      recentAverage, previousAverage, forecast: forecastNext(daily), backtest: summarizeBacktest(check)
    };
  });
  const active = profiles.filter(p => p.active);
  const scored = active.filter(p => p.count);
  const forecasts = active.flatMap(p => p.forecast === null ? [] : [p.forecast]);
  const groupDays = new Map();
  for (const profile of active) for (const day of profile.daily) {
    if (!groupDays.has(day.date)) groupDays.set(day.date, { values: [], titles: new Set() });
    groupDays.get(day.date).values.push(day.score);
  }
  for (const profile of active) for (const entry of profile.history) {
    if (entry.title && entry.score !== null) groupDays.get(entry.date).titles.add(entry.title);
  }
  return {
    profiles, total: active.length, assessed: scored.length, average: mean(scored.map(p => p.average)),
    attention: active.filter(p => p.reason).length, forecast: mean(forecasts),
    forecastCount: forecasts.length, belowThreshold: forecasts.filter(score => score < threshold).length,
    backtest: summarizeBacktest(groupCheck),
    daily: [...groupDays].sort(([a], [b]) => a.localeCompare(b)).map(([date, { values, titles }]) => ({
      date, score: mean(values), count: values.length, title: titles.size === 1 ? [...titles][0] : ''
    }))
  };
}
