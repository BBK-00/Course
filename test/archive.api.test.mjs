/* Creates fixtures only in a dedicated local Wrangler database. */
import assert from 'node:assert/strict';
import { lessonOf } from '../src/py.js';
const base = process.env.BASE || 'http://127.0.0.1:8788';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error('Local test server only');
const call = async (path, body, token) => {
  const r = await fetch(base + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, ...await r.json() };
};
const login = await call('teacher/login', { password: process.env.PASS || 'test123' });
assert(login.ok);
const T = (path, body) => call('teacher/' + path, body, login.token);
for (const [path, body] of [['sessions?trash=1'], ['session/trash', { ids: [1] }], ['session/restore', { ids: [1] }]]) assert.equal((await call('teacher/' + path, body)).status, 401);
await T('session/close', {});
const name = 'Архив QA ' + Date.now();
const group = (await T('groups', { name })).groups.find(g => g.name === name);
const student = (await T('students', { group_id: group.id, names: 'Архивті тексеру студенті' })).groups.find(g => g.id === group.id).students[0];
async function create(score, withWork = false) {
  assert((await T('session/start', { topic: 'P4', group_id: group.id })).ok);
  const live = await T('live'), id = live.session.id;
  if (score !== null) {
    const join = await call('join', { student_id: student.id, code: live.session.code, device: 'archive-' + id });
    assert(join.ok);
    if (withWork) {
      assert((await T('pywin', { task: 1, minutes: 7, action: 'start' })).ok);
      const data = await call('py/data', null, join.token);
      const item = lessonOf('P4', data.variant || 1)[0].items[0];
      assert((await call('py/submit', { quiz: { [item.id]: item.ans } }, join.token)).ok);
      assert((await call('py/hw', { photo: 'A'.repeat(3000), mime: 'image/jpeg' }, join.token)).ok, 'Requires local Gemini stub');
      const work = await T('work?session=' + id + '&student=' + student.id);
      const sub = work.subs.find(s => s.task === 1);
      assert((await T('task_grade', { id: sub.id, task: 1, score: 1, comment: 'Тапсырма пікірі сақталсын' })).ok);
    }
    assert((await T('total', { session_id: id, student_id: student.id, total: score, comment: 'Қорытынды пікірі ' + id })).ok);
  }
  await T('session/close', {});
  return id;
}
const low = await create(44), high = await create(87, true), blank = await create(null);
const highPath = 'work?session=' + high + '&student=' + student.id;
const snapshot = async () => {
  const { calc, subs, hw, attempts, attendance, result } = await T(highPath);
  return JSON.stringify({ calc, subs, hw, attempts, attendance, result });
};
const before = await snapshot(), rosterBefore = JSON.stringify((await T('roster')).groups);
const journal = async () => (await T('journal')).groups.find(g => g.id === group.id).students.find(s => s.id === student.id).scores.P4;
assert.equal((await journal()).total, 87);
let list = await T('sessions');
assert(list.rows.some(r => r.id === blank && r.att === 0), 'Empty test lessons must be visible');
for (const ids of [[], [0], [-1], [1.5], ['1'], [null], 'bad']) assert.equal((await T('session/trash', { ids })).status, 400);
assert.equal((await T('session/trash', { ids: [blank, 99999999] })).status, 404);
assert((await T('sessions')).rows.some(r => r.id === blank), 'Invalid batch must have no partial effects');

await T('session/start', { topic: 'P7', group_id: group.id });
const active = (await T('live')).session.id;
assert.equal((await T('session/trash', { ids: [blank, active] })).error, 'session_open');
assert((await T('sessions')).rows.some(r => r.id === blank), 'Batch containing an active lesson must have no partial effects');
assert.equal((await T('session/trash', { ids: [high, blank, high] })).changed, 2);
assert.equal((await journal()).total, 44, 'Journal falls back to next best visible lesson');
list = await T('sessions');
assert(!list.rows.some(r => r.id === high || r.id === blank));
let trash = await T('sessions?trash=1');
assert(trash.rows.some(r => r.id === high && r.removed_at && r.work_count === 2 && r.homework === 1 && r.attempts === 1));
assert.equal(list.counts.trash, trash.counts.trash);
assert(!(await T('homework')).rows.some(r => r.session_id === high));
assert.equal((await T('live?session=' + high)).session, null);
assert.equal((await T('consolidate?session=' + high)).session, null);
assert.equal((await T('feedback?session=' + high)).present, 0);
assert.equal((await T('session/reopen', { id: high, minutes: 15 })).error, 'session_trashed');
assert.equal((await T('live')).session.id, active, 'Blocked reopen must not close another lesson');
assert.equal(await snapshot(), before, 'Trash preserves grades, comments, original answers, attempts and photos');
assert.equal((await T('session/trash', { ids: [high] })).changed, 0, 'Repeat trash is idempotent');
assert.equal((await T('session/restore', { ids: [high, blank] })).changed, 2);
assert.equal((await T('session/restore', { ids: [high] })).changed, 0, 'Repeat restore is idempotent');
assert.equal((await T('live')).session.id, active, 'Restore must not close the active lesson');
assert.equal((await T('live?session=' + high)).session.status, 'closed');
assert.equal((await journal()).total, 87);
assert((await T('homework')).rows.some(r => r.session_id === high));
assert.equal(await snapshot(), before, 'Restore must preserve all original work byte for byte');
assert.equal(JSON.stringify((await T('roster')).groups), rosterBefore);
await T('session/close', {});
// The newest lesson is excluded from all default contexts too.
assert.equal((await T('session/trash', { ids: [active] })).changed, 1);
assert.equal((await T('live')).session.id, blank);
assert.equal((await T('consolidate')).session.id, blank);
assert((await T('session/restore', { ids: [active] })).ok);
console.log('Archive: permissions, empty lessons, atomic batch validation, active lesson protection, journal fallback, homework exclusion and complete data restoration passed.');
console.log('Local fixtures: group=' + group.id + ' lessons=' + [low, high, blank, active].join(','));
