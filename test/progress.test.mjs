import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { memoryD1 } from './d1-memory.mjs';
import worker from '../src/index.js';
import { sign } from '../src/auth.js';
import { courseDate } from '../src/progress.js';
import { parseJournal, readJournalPaste, summarizeProgress } from '../src/progress-journal.js';
import { readGoogleJournal, sheetSource } from '../src/progress-google.js';

const source = sheetSource('https://docs.google.com/spreadsheets/d/fakeSheet12345/edit#gid=42');
const fixture = () => [
  'Бағдарлама атауы\tКМ 3.5',
  '\t\t1\t2\t3\t4',
  '№\tТЕГІ, АТЫ, ӘКЕСІНІҢ АТЫ\t07.09\t07.09\t11.09\t14.09\tҚРТ\t"Қайта\nтапсыру"',
  '\t(толық)',
  '1\tСынақ Бір\t95\t85\t0\t55\t91\t1',
  '2\tСынақ Екі\tс\tж\t70,5\t\t94',
  '3\tБелгісіз Студент\t100',
  '4\tСынақ Бір\t97',
  '5\tСынақ Үш\t101\tбаға\t12\t50'
].join('\r\n');

test('same-day grades, marks, totals and insufficient history', () => {
  const students = ['Бір', 'Екі', 'Үш'].map((name, index) => ({ id: index + 1, name: 'Сынақ ' + name, active: 1 }));
  const parsed = parseJournal(readJournalPaste(fixture()), students, 2025);
  assert.equal(parsed.lessons, 4);
  assert.deepEqual(parsed.issues.map(i => i.kind), ['unmatched', 'ambiguous', 'value', 'value']);
  const report = summarizeProgress(students, parsed.entries, 60);
  const [one, two] = report.profiles;
  assert.deepEqual(one.history.map(e => e.score), [95, 85, 0, 55]);
  assert.equal(one.reason, 'low');
  assert.equal(one.forecast, 48.3);
  assert.deepEqual(two.history.map(e => e.mark), ['с', 'ж', '']);
  assert.equal(two.average, 70.5);
  assert.equal(two.forecast, null);
  assert.equal(report.forecastCount, 1);
  assert.equal(report.belowThreshold, 1);
});

test('forecast backtesting uses earlier graded days and excludes inactive students from group errors', () => {
  const students = [{ id: 1, active: 1 }, { id: 2, active: 1 }, { id: 3, active: 0 }];
  const entries = [[40, 50, 60, 70, 90], [88, 0, 66], [90, 90, 90, 0]].flatMap((scores, i) =>
    scores.map((score, d) => ({ student: i + 1, date: '2026-10-0' + (d + 1), column: 0, score }))
  ).reverse();
  const report = summarizeProgress(students, entries, 70);
  assert.equal(report.profiles[0].forecast, 73.3);
  assert.deepEqual(report.profiles[0].backtest, { count: 2, mae: 25, lastMae: 15 });
  assert.deepEqual(report.profiles[1].backtest, { count: 0, mae: null, lastMae: null });
  assert.equal(report.profiles[1].forecast, 51.3);
  assert.deepEqual(report.profiles[2].backtest, { count: 1, mae: 90, lastMae: 90 });
  assert.deepEqual(report.backtest, { count: 2, mae: 25, lastMae: 15 });
  assert.equal(report.forecastCount, 2);
  assert.equal(report.belowThreshold, 1);
});

test('Google access resolves the exact tab and reads only formatted values', async t => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const env = { GOOGLE_SHEETS_SERVICE_ACCOUNT: JSON.stringify({
    client_email: 'local-test@example.test', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' })
  }) };
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push(String(url));
    if (requests.length === 1) {
      const claim = JSON.parse(Buffer.from(options.body.get('assertion').split('.')[1], 'base64url').toString());
      assert.equal(claim.scope, 'https://www.googleapis.com/auth/spreadsheets.readonly');
      return Response.json({ access_token: 'mock-token' });
    }
    assert.equal(options.headers.Authorization, 'Bearer mock-token');
    return Response.json(requests.length === 2
      ? { sheets: [{ properties: { sheetId: 42, title: "Сынақ' 42", gridProperties: { rowCount: 1000, columnCount: 27 } } }] }
      : { values: [['07.09', '100']] });
  });
  assert.deepEqual(await readGoogleJournal(env, source), [['07.09', '100']]);
  assert.ok(decodeURIComponent(requests[2]).includes("'Сынақ'' 42'!A1:AA350"));
});

test('teacher routes preserve old marks, scope new sessions to a course and report progress', async t => {
  const DB = memoryD1(), { sqlite } = DB;
  t.after(() => sqlite.close());
  const env = { DB, TEACHER_PASSWORD: 'local-test', GEMINI_STUB: '1' };
  const token = await sign(env, { r: 't' }, 60);
  const call = async (path, body, method, auth = token) => {
    const response = await worker.fetch(new Request('http://localhost/api/teacher/' + path, {
      method: method || (body ? 'POST' : 'GET'), headers: { Authorization: 'Bearer ' + auth },
      body: body ? JSON.stringify(body) : undefined
    }), env);
    const data = await response.json();
    assert.notEqual(response.status, 500, JSON.stringify(data));
    return data;
  };
  assert.equal((await call('progress', null, 'GET', '')).error, 'auth');
  const group = (await call('groups', { name: 'Сынақ тобы' })).groups[0].id;
  const people = await call('students', { group_id: group, names: 'Сынақ Бір\nСынақ Екі\nСынақ Үш' });
  const student = people.groups[0].students.find(s => s.name === 'Сынақ Бір').id;
  const current = courseDate(Date.now());
  const year = +current.slice(0, 4) - (+current.slice(5, 7) < 9 ? 1 : 0);
  const created = await call('progress/course', { group, year, course: 'py', subject: 'КМ 3.5', threshold: 60, sheet: source.url });
  assert.equal(created.ok, true);
  const id = created.id;
  assert.equal((await call('progress/google', { id })).error, 'sheet_config');
  const body = { id, text: fixture() };
  const preview = await call('progress/preview', body);
  assert.equal(preview.scores, 7);
  assert.equal((await call('progress/import', { ...body, revision: preview.revision })).ok, true);
  assert.equal((await call('progress/import', { ...body, revision: preview.revision })).error, 'journal_changed');
  const refreshed = await call('progress/preview', body);
  assert.equal((await call('progress/import', { ...body, revision: refreshed.revision })).unchanged, true);
  assert.equal((await call('progress/report?id=' + id)).report.profiles.length, 3);
  assert.equal((await call('session/start', { group_id: group, course_group_id: id, topic: '10' })).error, 'course_mismatch');
  assert.equal((await call('session/start', { group_id: group, course_group_id: id, topic: 'P12' })).ok, true);
  const publicLesson = await worker.fetch(new Request('http://localhost/api/public/lesson'), env).then(r => r.json());
  assert.equal(publicLesson.lesson.href, '/live/python/P12');
  const classroom = await worker.fetch(new Request('http://localhost' + publicLesson.lesson.href), env);
  assert.equal(classroom.status, 200);
  const html = await classroom.text();
  assert.match(html, /PyWork\.mount\(\{topic:"P12"/);
  assert.match(html, /\/python\/12-for-range/);
  assert.match(html, /\?hash:"task"/);
  const session = sqlite.prepare('SELECT id FROM sessions WHERE course_group_id=?').get(id).id;
  sqlite.prepare('INSERT INTO attendance(session_id, student_id, variant, joined_at) VALUES (?,?,1,0)').run(session, student);
  sqlite.prepare('INSERT INTO results(session_id, student_id, teacher_total) VALUES (?,?,?)').run(session, student, 77);
  assert.equal((await call('session/close', {})).ok, true);
  assert.equal((await call('progress/report?id=' + id + '&source=site')).report.average, 77);
  assert.equal((await call('progress/ai', { id, source: 'site', student })).ok, true);
  assert.equal((await call('groups/' + group, null, 'DELETE')).error, 'group_has_history');
});
