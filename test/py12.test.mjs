import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import worker from '../src/index.js';
import { buildP12, P12_MAX, P12_MINUTES } from '../src/py12.js';
import { checkCase, gradeQuizItem, gradeCodeItems } from '../src/py.js';
import { memoryD1 } from './d1-memory.mjs';

const tasks = buildP12();
const quiz = tasks[3].items;
assert.deepEqual(tasks.map(task => task.items.length), [5, 3, 2, 10]);
assert.equal(Object.values(P12_MINUTES).reduce((sum, min) => sum + min), 60);
assert.deepEqual(Object.values(P12_MAX), [20, 30, 30, 20]);
assert.deepEqual(tasks.map(task => task.items.reduce((sum, item) => sum + item.max, 0)), Object.values(P12_MAX));
assert.equal(quiz.filter(item => item.typed).length, 4);
assert(quiz.every(item => item.max === 2));

const win = process.platform === 'win32';
function python(code) {
  const run = spawnSync(win ? 'py' : 'python3', win ? ['-3', '-'] : ['-'], {
    input: code, encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' }, timeout: 5000
  });
  assert.equal(run.status, 0, run.stderr || String(run.error));
  return run.stdout;
}
for (const item of quiz.filter(item => item.typed)) {
  const stdout = python(item.code);
  assert.equal(gradeQuizItem(item, stdout).frac, 1);
  assert.equal(gradeQuizItem(item, stdout.trim().split(/\s+/).join(', ')).frac, 1);
}
assert.equal(gradeQuizItem(quiz[5], '2 4 6 8 10').frac, 0);
const firstCase = tasks[0].items[0].cases[0];
assert.equal(checkCase(firstCase, { out: [...firstCase.exp].reverse().join('\n') }), false);
assert.equal(checkCase(firstCase, { out: [...firstCase.exp, '21'].join('\n') }), false);
const [conditional] = tasks[2].items;
const [withoutIf] = await gradeCodeItems(code => ({ stdout: python(code) }), [
  { item: conditional, code: 'for i in range(4, 29, 4):\n    print(i)' }
]);
assert.equal(withoutIf.passed, 1);
assert.equal(withoutIf.frac, 0.8);

const DB = memoryD1();
const env = { DB, TEACHER_PASSWORD: 'p12-test' };
async function call(path, body, token) {
  const res = await worker.fetch(new Request('https://qa.invalid/api/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body && JSON.stringify(body)
  }), env, {});
  return { http: res.status, ...await res.json() };
}
const { token: teacher } = await call('teacher/login', { password: env.TEACHER_PASSWORD });
const teach = (path, body) => call('teacher/' + path, body, teacher);
const { groups: [group] } = await teach('groups', { name: 'Lesson 12 QA' });
const { groups: [{ students: [student] }] } = await teach('students', { group_id: group.id, names: 'Practice Student' });
assert.equal((await teach('session/start', { topic: 'P12', group_id: group.id })).ok, true);
const { session } = await teach('live');
const { token: learner } = await call('join', { code: session.code, student_id: student.id, device: 'lesson-12-qa' });
const work = (path, body) => call('py/' + path, body, learner);

assert.equal((await work('sample/P12')).http, 401);
const preview = await call('py/sample/P12', undefined, teacher);
assert.deepEqual(preview.tasks.map(task => task.items.length), [5, 3, 2, 10]);
for (const item of preview.tasks.flatMap(task => task.items)) {
  for (const secret of ['correct', 'ans', 'accepted', 'cases', 'ref']) assert(!Object.hasOwn(item, secret));
}
const locked = await work('data');
assert(locked.tasks.every(task => task.locked && task.items.length === 0));
assert.deepEqual(locked.hw, { off: true });
assert.equal((await teach('pywin', { task: 5 })).ok, false);
const correctQuiz = Object.fromEntries(quiz.map(item => [item.id, item.typed ? item.ans.replace(/ /g, ', ') : item.correct]));
assert.equal((await work('submit', { quiz: correctQuiz })).ok, false);

// Route the execution provider through real Python for local, deterministic grading.
const fetch0 = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  assert.equal(new URL(url).hostname, 'ce.judge0.com');
  return Response.json({ stdout: python(JSON.parse(options.body).source_code), status: { id: 3, description: 'Accepted' } });
};
try {
  for (const task of tasks) {
    const { wins } = await teach('pywin', { task: task.n, action: 'start' });
    assert.equal(wins[task.n].until - wins[task.n].from, P12_MINUTES[task.n] * 60);
    const opened = (await work('data')).tasks[task.n - 1];
    assert.equal(opened.items.length, task.items.length);
    const body = task.n === 4 ? { quiz: correctQuiz } : { codes: Object.fromEntries(task.items.map(item => [item.id, item.ref])) };
    const result = await work('submit', body);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.scores[task.n].pts, P12_MAX[task.n], JSON.stringify(result.results));
    assert.equal(result.results.length, task.items.length);
    DB.sqlite.prepare('UPDATE py_wins SET until_at=0 WHERE session_id=? AND task=?').run(session.id, task.n);
  }
  // Per-task revision: the task 1 revision window must not reopen task 2.
  const { groups: grp } = await teach('students', { group_id: group.id, names: 'Second Student' });
  const second = grp.find(g => g.id === group.id).students.find(x => x.name === 'Second Student');
  const { token: t2 } = await call('join', { code: session.code, student_id: second.id, device: 'lesson-12-qa-2' });
  const w2 = (path, body) => call('py/' + path, body, t2);
  const age = () => DB.sqlite.prepare('UPDATE py_attempts SET at=at-60 WHERE session_id=?').run(session.id);
  for (const task of [1, 2]) await teach('pywin', { task, action: 'start' });
  const it11 = tasks[0].items[0], it21 = tasks[1].items[0];
  assert.equal((await w2('submit', { item: it11.id, code: 'print(0)' })).ok, true);
  assert.equal((await w2('submit', { item: it21.id, code: 'print(0)' })).ok, true);
  age();
  assert.equal((await w2('submit', { item: it11.id, code: it11.ref })).ok, false, 'no revision before the teacher opens it');
  for (const task of [1, 2]) DB.sqlite.prepare('UPDATE py_wins SET until_at=0 WHERE session_id=? AND task=?').run(session.id, task);
  assert.equal((await teach('pywin', { task: 11, action: 'start' })).ok, true);
  const revising = await w2('data');
  assert.equal(revising.wins[11].until > revising.wins[11].from, true);
  assert.equal((await w2('submit', { item: it21.id, code: it21.ref })).ok, false, 'task 2 revision is still closed');
  assert.equal((await w2('submit', { item: it11.id, code: it11.ref })).ok, true);
  assert.equal((await w2('data')).state[it11.id].pts, 2.8);
} finally {
  globalThis.fetch = fetch0;
}
assert.equal((await teach('pywin', { task: 0, action: 'start' })).wins[0].until > 0, true);
const guestPreview = await call('py/sample/P12', undefined, teacher);
assert.equal(guestPreview.ok, true);
const result = await work('data');
assert.equal(result.total, 100);
assert.equal(result.complete, true);
const analytics = await teach('py_stats?session=' + session.id);
assert.equal(analytics.allItems.length, 20);
assert.equal(analytics.ops.length, 5);
assert.equal(analytics.allItems.find(item => item.id === 50).label, '4.10');
console.log('Lesson 12: timers, stage gating, 12 Python submissions, mixed quiz, 100-point total and analytics passed.');

// Partial credit for exact-line tasks: a small slip is not zero, and the analysis says where it is.
{
  const { partialCase, lineDiag } = await import('../src/py.js');
  const hello = tasks[0].items[4].cases[0];
  const lines = n => ({ out: Array(n).fill('Сәлем!').join('\n') });
  assert.equal(partialCase(hello, lines(5)), 0.83);
  assert.equal(partialCase(hello, { out: Array(6).fill('Сәлем').join('\n') }), 0.75);
  assert.equal(partialCase(hello, { err: { type: 'SyntaxError' } }), 0);
  assert.equal(partialCase(hello, { out: '' }), 0);
  assert.equal(partialCase(hello, { out: Array(6).fill('x').join('\n') }), 0);
  assert(lineDiag(hello, lines(5), 'loop_range')[0].text.includes('6 жол'));
  assert(lineDiag(hello, { out: Array(6).fill('Сәлем').join('\n') }, 'loop_range')[0].text.includes('тыныс белгісі'));
  const [slip] = await gradeCodeItems(code => ({ stdout: python(code) }), [{ item: tasks[0].items[4], code: 'for i in range(5):\n    print("Сәлем!")' }]);
  assert.equal(slip.frac, 0.83);
  assert.equal(slip.passed, 0);
  assert(slip.diag.length >= 1);
}
console.log('Lesson 12: partial credit and line analysis passed.');
