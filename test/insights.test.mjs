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

test('forecast: fewer than 3 grades gives no number', () => {
  const f = forecastStudent(pts(80, 'ж', 70));
  assert.equal(f.ready, false);
  assert.equal(f.count, 2);
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
  assert.ok(f.reasons.some(r => r.includes('келмеген')));
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
  assert.equal(a.predictions[0].name, 'Әлсіз'); // қауіптісі бірінші
  assert.equal(a.predictions.at(-1).ready, false); // дерек аз — соңында
  const weak = a.predictions[0].weak;
  assert.equal(weak[0].score, 40);
  assert.equal(a.predictions[0].missed[0].number, '3');
});

test('analyze: empty journal does not throw', () => {
  const a = analyze({ students: [], lessons: [], cells: {}, summary: {}, threshold: 60, plan: [] });
  assert.equal(a.kpi.avg, null);
  assert.deepEqual(a.predictions, []);
});

test('compactFacts only carries people at risk and the cache key follows the facts', () => {
  const a = analyze(view());
  const facts = compactFacts(a);
  assert.deepEqual(facts.atRisk.map(r => r.name), ['Әлсіз']);
  assert.equal(factsKey(facts), factsKey(compactFacts(analyze(view()))));
  const other = view(); other.cells[2].c4 = { score: 90, mark: '' };
  assert.notEqual(factsKey(compactFacts(analyze(other))), factsKey(facts));
});
