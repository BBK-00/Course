import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastStudent, slope, analyze, compactFacts, factsKey } from '../src/insights.js';

const pts = (...v) => v.map(x => typeof x === 'number' ? { score: x, mark: '' } : { score: null, mark: x });

test('slope: rising, falling and flat series', () => {
  assert.equal(slope([50, 60, 70]), 10);
  assert.equal(slope([70, 60, 50]), -10);
  assert.equal(slope([60, 60, 60]), 0);
  assert.equal(slope([60]), 0);
});

test('forecast: blank days are not zeros; few grades keep their own level', () => {
  const thin = forecastStudent(pts(85, null, null, null, null, null, null, null, null).map(p => ({ score: p.score, mark: '' })));
  assert.equal(thin.ready, true);
  assert.equal(thin.thin, true);
  assert.ok(thin.next[0] >= 80); // бос күндер болжамды түсірмейді
  assert.equal(thin.risk, 'low');
  const two = forecastStudent(pts(90, 85, null, null, null));
  assert.ok(two.next[0] >= 80 && two.next[0] <= 90);
  assert.ok(!thin.reasons.some(r => r.includes('баға қойылмаған') || r.includes('ғана баға')));
  const none = forecastStudent(pts('ж', 'ж', 'ж'));
  assert.equal(none.ready, false); // бірде баға жоқ: 0 деп есептелмейді
  assert.equal(forecastStudent([]).ready, false);
});

test('forecast: stable strong student stays low risk', () => {
  const f = forecastStudent(pts(85, 88, 90, 87));
  assert.equal(f.ready, true);
  assert.equal(f.risk, 'low');
  assert.ok(f.next[0] >= 80);
});

test('forecast: falling grades with absences end below 50', () => {
  const f = forecastStudent(pts(70, 62, 55, 'ж', 48, 'ж', 40));
  assert.equal(f.risk, 'high');
  assert.ok(f.next[0] < 50);
  assert.ok(f.range[0] <= f.next[0] && f.next[0] <= f.range[1]);
  assert.ok(f.reasons.some(r => r.includes('төмендеп')));
  assert.ok(f.reasons.some(r => r.includes('себепсіз қалған')));
});

test('forecast: retakes lower the forecast', () => {
  const clean = forecastStudent(pts(70, 70, 70, 70));
  const retake = forecastStudent(pts(70, 70, 70, 70, 'с', 'с'));
  assert.ok(retake.next[0] < clean.next[0]);
});

function view() {
  const lessons = [1, 2, 3, 4].map(n => ({ key: 'c' + n, date: '2026-09-0' + n, number: String(n), title: 'Тақырып ' + n, kind: '', source: 'journal' }));
  const students = [{ id: 1, name: 'Мықты' }, { id: 2, name: 'Әлсіз' }, { id: 3, name: 'Жаңа' }];
  const cell = (score, mark = '') => ({ score, mark });
  const cells = {
    1: { c1: cell(90), c2: cell(92), c3: cell(95), c4: cell(94) },
    2: { c1: cell(70), c2: cell(55), c3: cell(null, 'ж'), c4: cell(40) },
    3: { c1: cell(80) }
  };
  const summary = { 1: { avg: 92.75, absent: 0, retake: 0 }, 2: { avg: 55, absent: 1, retake: 0 }, 3: { avg: 80, absent: 0, retake: 0 } };
  return { students, lessons, cells, summary, threshold: 60, plan: [{ n: 1, title: 'a' }, { n: 2, title: 'b' }, { n: 9, title: 'z' }] };
}

test('analyze: kpi, histogram, risk ordering and weak topics', () => {
  const a = analyze(view());
  assert.equal(a.kpi.students, 3);
  assert.equal(a.kpi.below, 1);
  assert.equal(a.kpi.absent, 1);
  assert.equal(a.kpi.planDone, 2);
  assert.equal(a.kpi.planTotal, 3);
  assert.equal(a.histogram.reduce((n, b) => n + b.count, 0), 3);
  assert.equal(a.histogram[1].count, 1); // 55
  assert.equal(a.histogram[5].count, 1); // 92.75
  assert.equal(a.predictions.at(-1).name, 'Мықты'); // тұрақтысы соңында
  assert.equal(a.predictions.at(-1).risk, 'low');
  const weakOne = a.predictions.find(p => p.id === 2), fresh = a.predictions.find(p => p.id === 3);
  assert.equal(weakOne.weak[0].score, 40);
  assert.equal(weakOne.missed[0].n, 3);
  assert.equal(fresh.thin, true);
  assert.equal(fresh.unscored.length, 3);
  assert.equal(fresh.risk, 'low'); // бір баға 80: болжам сол деңгейде
  assert.deepEqual(a.nextTopics.map(x => x.n), [5, 6]);
});

test('analyze: empty journal does not throw', () => {
  const a = analyze({ students: [], lessons: [], cells: {}, summary: {}, threshold: 60, plan: [] });
  assert.equal(a.kpi.avg, null);
  assert.deepEqual(a.predictions, []);
});

test('compactFacts only carries people at risk and the cache key follows the facts', () => {
  const a = analyze(view());
  const facts = compactFacts(a);
  assert.deepEqual(facts.atRisk.map(r => r.name).sort(), ['Әлсіз']);
  assert.equal(factsKey(facts), factsKey(compactFacts(analyze(view()))));
  const other = view(); other.cells[2].c4 = { score: 90, mark: '' };
  assert.notEqual(factsKey(compactFacts(analyze(other))), factsKey(facts));
});

test('topics: same-number columns merge, status and per-topic results', () => {
  const v = view();
  v.lessons.push({ key: 'c5', date: '2026-09-02', number: '4', title: '', kind: '', source: 'journal' });
  v.cells[1].c5 = { score: 96, mark: '' };
  const a = analyze(v);
  assert.equal(a.topics.length, 4); // 4-тақырып екі бағаннан біріктірілді
  const t4 = a.topics.find(t => t.n === 4);
  assert.equal(t4.results.find(r => r.id === 1).score, 95); // (94 + 96) / 2
  assert.equal(a.topics.find(t => t.n === 1).title, 'Тақырып 1');
  assert.ok(['hard', 'mid', 'good'].includes(t4.status));
});

test('topic forecast follows prerequisite topics and names them in reasons', () => {
  const lesson = n => ({ key: 'c' + n, date: '2026-09-0' + n, number: String(n), title: '', kind: '', source: 'journal' });
  const lessons = [7, 8, 9].map(lesson);
  const cell = (score, mark = '') => ({ score, mark });
  const mk = (a, b, c) => ({ c7: cell(a), c8: b === 'ж' ? cell(null, 'ж') : cell(b), c9: cell(c) });
  const v = {
    students: [{ id: 1, name: 'Бекем' }, { id: 2, name: 'Қиын' }, { id: 3, name: 'Өткізген' }], lessons,
    cells: { 1: mk(90, 92, 94), 2: mk(45, 40, 42), 3: mk(80, 'ж', 85) }, threshold: 60, plan: [],
    summary: { 1: { avg: 92 }, 2: { avg: 52 }, 3: { avg: 82 } }
  };
  v.lessons = [7, 8, 9].map(lesson);
  const a = analyze(v);
  assert.deepEqual(a.nextTopics.map(x => x.n), [10, 11]); // 7, 8, 9 алғы тақырыптар
  const byName = Object.fromEntries(a.predictions.map(p => [p.name, p]));
  assert.equal(byName['Бекем'].risk, 'low');
  assert.equal(byName['Қиын'].risk, 'high');
  assert.ok(byName['Қиын'].chips.some(c => c.title.includes('if–else') && c.score === 40));
  assert.ok(byName['Өткізген'].chips.some(c => c.n === 8 && c.score === null && c.mark === 'ж'));
  assert.ok(byName['Өткізген'].next[0] < byName['Бекем'].next[0]);
  assert.ok(a.predictions.every(p => !p.reasons.some(r => r.includes('баға қойылмаған'))));
});

test('forecast: one attended lesson and many misses cannot give a high score', () => {
  const f = forecastStudent(pts(70, 'с', 'с', 'с', 'с', 'с', 'с'));
  assert.ok(f.next[0] >= 10 && f.next[0] <= 25, 'forecast ' + f.next[0]);
  assert.equal(f.risk, 'high');
  assert.ok(f.reasons.some(r => r.includes('қатысқан сабақ: 1')));
  const mostly = forecastStudent(pts(85, 'с'));
  assert.ok(mostly.next[0] < 70 && mostly.next[0] > f.next[0]);
  const regular = forecastStudent(pts(90, 85, 88, 90));
  assert.ok(regular.next[0] >= 85);
});

test('gaps list unknown topics in order; ж and с count the same; tasks link to the topic page', () => {
  const lesson = n => ({ key: 'c' + n, date: '2026-09-0' + n, number: String(n), title: '', kind: '', source: 'journal' });
  const cell = (score, mark = '') => ({ score, mark });
  const v = {
    students: [{ id: 1, name: 'А' }], lessons: [7, 5, 8].map(lesson), threshold: 60, plan: [],
    cells: { 1: { c7: cell(30), c5: cell(null, 'с'), c8: cell(null, 'ж') } }, summary: { 1: { avg: 30 } }
  };
  const p = analyze(v).predictions[0];
  assert.deepEqual(p.gaps.map(g => g.n), [5, 7, 8]);
  assert.ok(p.gaps.every(g => g.url.startsWith('/python/') && g.url.endsWith('.html#task')));
  assert.equal(p.gaps[0].mark, 'с');
  assert.equal(p.gaps[2].mark, 'ж');
});

import { planHomework, bandOf } from '../src/homework-pool.js';

test('homework plan: weaker students get more and easier tasks, stronger get fewer and harder; lists differ per student', () => {
  const weak = planHomework(12, 30, 1), mid = planHomework(12, 60, 2), good = planHomework(12, 75, 3), top = planHomework(12, 92, 4);
  assert.ok(weak.tasks.length > mid.tasks.length && mid.tasks.length > good.tasks.length);
  assert.ok(weak.tasks.every(t => t.level !== 'hard') && weak.tasks.filter(t => t.level === 'easy').length >= 4);
  assert.ok(top.tasks.filter(t => t.level === 'hard').length >= 2 && top.tasks.every(t => t.level !== 'easy'));
  assert.deepEqual([weak, mid, good, top].map(p => p.band.key), ['support', 'base', 'good', 'top']);
  assert.notDeepEqual(planHomework(12, 60, 1).tasks.map(t => t.id), planHomework(12, 60, 2).tasks.map(t => t.id));
  assert.equal(new Set(top.tasks.map(t => t.id)).size, top.tasks.length);
  assert.equal(bandOf(null).key, 'base'); // баға жоқ: базалық
  assert.deepEqual(planHomework(99, 50, 0).tasks, []);
});

test('reasons explain a forecast above the average by strong related topics', () => {
  const lesson = n => ({ key: 'c' + n, date: '2026-09-0' + n, number: String(n), title: '', kind: '', source: 'journal' });
  const cell = score => ({ score, mark: '' });
  const v = {
    students: [{ id: 1, name: 'А' }], lessons: [7, 8, 9].map(lesson), threshold: 60, plan: [],
    cells: { 1: { c7: cell(88), c8: cell(92), c9: cell(95) } }, summary: { 1: { avg: 78 } } // журнал орташасы төмен, жақын тақырыптар күшті
  };
  const p = analyze(v).predictions[0];
  assert.ok(p.next[0] >= 82);
  assert.ok(p.reasons[0].includes('Орташа 78') && p.reasons[0].includes('жақсы біледі') && p.reasons[0].includes('болжам жоғары'), p.reasons[0]);
});
