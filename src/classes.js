/* Топ + пән (сынып), студент аккаунттары және журнал. Оқытушы маршруттары: /api/teacher/classes/* */
import { readCsv, parseJournal } from './progress-journal.js';
import { courseYear, courseDate, siteGrades, staticCourses, courseAliases } from './progress.js';
import { sheetSource } from './progress-google.js';
import { geminiJson } from './gemini.js';
import { percentOf } from './practice.js';
import { setStudentAccount, removeStudentAccount } from './accounts.js';
import { PYTHON_TITLES } from './python-titles.js';
import { analyze, compactFacts, factsKey } from './insights.js';
import { officeRows, topicsFromRows, topicsFromAi, validTopics } from './plan-import.js';

const rowsOf = async statement => (await statement.all()).results || [];
const clean = value => String(value ?? '').trim();
const nameKey = value => clean(value).normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('kk');
const titleCase = value => clean(value).replace(/\s+/g, ' ').toLocaleLowerCase('kk')
  .replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase('kk'));
const journalErrors = new Set(['journal_format', 'journal_header', 'journal_dates']);
const sheetErrors = new Set(['sheet_access', 'sheet_unavailable', 'sheet_link']);
const MARKS = new Set(['ж', 'с']);

const translit = {
  а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', і: 'i', к: 'k', қ: 'k',
  л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f', х: 'h', һ: 'h',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};
const latin = word => [...word.toLocaleLowerCase('kk')].map(ch => translit[ch] ?? (/[a-z0-9]/.test(ch) ? ch : '')).join('');

/* «Қыдбекова Аружан Канатовна» → «kydbekova.aruzhan» */
export function suggestLogin(fullName) {
  const [surname = '', first = ''] = clean(fullName).split(/\s+/);
  const a = latin(surname), b = latin(first);
  return (a && b ? a + '.' + b : a || b || 'student').slice(0, 40);
}

async function freeLogin(DB, base) {
  const taken = new Set((await rowsOf(DB.prepare('SELECT email FROM learner_accounts WHERE email LIKE ?').bind(base + '%'))).map(r => r.email));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 200; n++) if (!taken.has(base + n)) return base + n;
  return base + Date.now() % 100000;
}

/* ---------- Журнал күйі: соңғы нұсқа progress_imports кестесінде ---------- */
const latest = (DB, id) => DB.prepare('SELECT id, created_at, entries, meta FROM progress_imports WHERE course_id=? ORDER BY id DESC LIMIT 1').bind(id).first();

async function stateOf(DB, courseId) {
  const row = await latest(DB, courseId);
  const entries = JSON.parse(row?.entries || '[]');
  let lessons = row?.meta ? JSON.parse(row.meta) : null;
  if (!lessons) {
    const seen = new Map();
    for (const e of entries) if (!seen.has(e.column)) seen.set(e.column, { column: e.column, date: e.date, number: e.number || '', hours: null, kind: '' });
    lessons = [...seen.values()];
  }
  return { revision: row?.id || 0, at: row?.created_at || null, entries, lessons };
}

async function saveState(DB, courseId, revision, entries, lessons) {
  const packed = JSON.stringify(entries), meta = JSON.stringify(lessons);
  if (new TextEncoder().encode(packed + meta).length > 800000) throw new Error('journal_format');
  const result = await DB.prepare(`INSERT INTO progress_imports(course_id, created_at, entries, meta)
    SELECT ?, ?, ?, ? WHERE COALESCE((SELECT MAX(id) FROM progress_imports WHERE course_id=?),0)=?`)
    .bind(courseId, Date.now(), packed, meta, courseId, revision).run();
  if (!result.meta.changes) throw new Error('journal_changed');
  await DB.prepare('DELETE FROM progress_imports WHERE course_id=? AND id<(SELECT MAX(id) FROM progress_imports WHERE course_id=?)-30')
    .bind(courseId, courseId).run();
}

export async function journalView(DB, course, onlyStudent = null) {
  const [students, state, site, plan] = await Promise.all([
    rowsOf(DB.prepare('SELECT id, full_name AS name, active FROM students WHERE group_id=? ORDER BY id').bind(course.group_id)),
    stateOf(DB, course.id), siteGrades(DB, course),
    rowsOf(DB.prepare('SELECT n, title, hours FROM course_plan WHERE course_id=? ORDER BY n').bind(course.id))
  ]);
  const topicOf = new Map(plan.map(t => [t.n, t.title]));
  // Python курсында студенттің өзіндік жаттығу нәтижелері бөлек бағандармен көрсетіледі (орташаға кірмейді).
  const practice = course.course === 'py'
    ? await rowsOf(DB.prepare('SELECT p.student_id, p.lesson, p.item, p.best, p.at FROM practice_results p JOIN students s ON s.id=p.student_id WHERE s.group_id=?').bind(course.group_id))
    : [];
  const lessons = state.lessons.map(l => ({ key: 'c' + l.column, date: l.date, number: l.number || '', hours: l.hours ?? null, kind: l.kind || '', source: 'journal', title: topicOf.get(Number(l.number)) || PYTHON_TITLES[Number(l.number)] || '' }));
  const siteLessons = new Map();
  for (const e of site.entries) if (!siteLessons.has(e.column)) siteLessons.set(e.column, { key: 's' + e.column, date: e.date, number: '', hours: null, kind: 'сайт', source: 'site', title: e.title });
  lessons.push(...siteLessons.values());
  const practiceLessons = new Map(), practiceRows = new Map();
  for (const row of practice) {
    const key = row.student_id + ':' + row.lesson;
    if (!practiceRows.has(key)) practiceRows.set(key, []);
    practiceRows.get(key).push(row);
    practiceLessons.set(row.lesson, Math.max(practiceLessons.get(row.lesson) || 0, row.at));
  }
  for (const [lesson, at] of practiceLessons) lessons.push({ key: 'p' + lesson, date: courseDate(at * 1000), number: '', hours: null, kind: 'жаттығу', source: 'practice', title: lesson + '-сабақ · өзіндік жаттығу' });
  lessons.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key, 'en', { numeric: true }));
  const cells = {};
  const put = (student, key, score, mark) => { (cells[student] ||= {})[key] = { score, mark }; };
  for (const e of state.entries) put(e.student, 'c' + e.column, e.score, e.mark || '');
  for (const e of site.entries) put(e.student, 's' + e.column, e.score, '');
  for (const [key, rows] of practiceRows) { const [student, lesson] = key.split(':').map(Number); put(student, 'p' + lesson, percentOf(lesson, rows), ''); }
  const summary = {};
  for (const s of students) {
    const mine = Object.entries(cells[s.id] || {}).filter(([key]) => !key.startsWith('p')).map(([, cell]) => cell);
    const scores = mine.filter(c => c.score !== null && c.score !== undefined).map(c => c.score);
    summary[s.id] = {
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : null,
      count: scores.length, absent: mine.filter(c => c.mark === 'ж').length, retake: mine.filter(c => c.mark === 'с').length
    };
  }
  const visible = onlyStudent ? students.filter(s => s.id === onlyStudent) : students.filter(s => s.active || cells[s.id]);
  return { revision: state.revision, importedAt: state.at, plan, students: visible, lessons, cells, summary, threshold: course.threshold };
}

/* ---------- Google Sheets (сілтеме арқылы ашық кесте) ---------- */
async function readSheet(url) {
  const source = sheetSource(String(url || '').trim());
  if (!source) throw new Error('sheet_link');
  let response;
  try {
    response = await fetch('https://docs.google.com/spreadsheets/d/' + source.id + '/export?format=csv&gid=' + source.gid, { signal: AbortSignal.timeout(12000) });
  } catch { throw new Error('sheet_unavailable'); }
  if (!response.ok || !/csv/i.test(response.headers.get('content-type') || '')) throw new Error('sheet_access');
  const text = await response.text();
  if (text.length > 600000) throw new Error('journal_format');
  const rows = readCsv(text);
  if (rows.length > 350 || rows.some(r => r.length > 156)) throw new Error('journal_format');
  return { rows, source };
}

function sheetNames(rows) {
  const head = rows.slice(0, 25).findIndex(r => r.some(v => { const k = nameKey(v); return k === 'аты-жөні' || (k.includes('тегі') && k.includes('әкесінің аты')); }));
  if (head < 0) return [];
  const col = rows[head].findIndex(v => { const k = nameKey(v); return k === 'аты-жөні' || (k.includes('тегі') && k.includes('әкесінің аты')); });
  return rows.slice(head + 1).map(r => clean(r[col])).filter(n => n && !/^\(толық\)$/i.test(n));
}

const rosterOf = (DB, groupId) => rowsOf(DB.prepare('SELECT id, full_name AS name, active FROM students WHERE group_id=? ORDER BY id').bind(groupId));

async function importSheet(DB, course, rows, commit, createStudents) {
  let roster = await rosterOf(DB, course.group_id);
  const known = new Set(roster.map(s => nameKey(s.name)));
  const missing = createStudents
    ? [...new Map(sheetNames(rows).filter(n => !known.has(nameKey(n))).map(n => [nameKey(n), titleCase(n)])).values()] : [];
  if (commit && missing.length) {
    await DB.batch(missing.map(name => DB.prepare('INSERT INTO students (group_id, full_name) VALUES (?,?)').bind(course.group_id, name)));
    roster = await rosterOf(DB, course.group_id);
  } else if (missing.length) roster = [...roster, ...missing.map((name, i) => ({ id: -1 - i, name, active: 1 }))]; // алдын ала қарау
  const parsed = parseJournal(rows, roster, course.year);
  const old = await stateOf(DB, course.id);
  const next = new Set(parsed.entries.map(e => e.student + ':' + e.column));
  const summary = {
    students: parsed.matched, newStudents: missing.length,
    unmatched: parsed.issues.filter(i => i.kind !== 'value').map(i => i.name), badValues: parsed.issues.filter(i => i.kind === 'value').length,
    lessons: parsed.lessons, scores: parsed.entries.filter(e => e.score !== null).length, marks: parsed.entries.filter(e => e.score === null).length,
    replaces: old.entries.length, removed: old.entries.filter(e => !next.has(e.student + ':' + e.column)).length
  };
  if (!commit) return { ...summary, columns: parsed.columns.map(c => ({ date: c.date, number: c.number, hours: c.hours, kind: c.kind })) };
  if (!parsed.entries.length) throw new Error('journal_empty');
  await saveState(DB, course.id, old.revision, parsed.entries.map(({ student, date, column, number, score, mark }) => ({ student, date, column, number, score, mark })), parsed.columns);
  return summary;
}

/* ---------- Көмекшілер ---------- */
async function courseCatalog(DB) {
  const subjects = await rowsOf(DB.prepare('SELECT id, title FROM subjects ORDER BY ord, title'));
  const catalog = { ...staticCourses };
  for (const s of subjects) catalog[courseAliases[s.id] || s.id] ??= s.title;
  return catalog;
}

async function classesOverview(DB) {
  const [groups, students, courses, accounts, imports, plans] = await Promise.all([
    rowsOf(DB.prepare('SELECT id, name FROM groups ORDER BY name')),
    rowsOf(DB.prepare('SELECT id, group_id, full_name AS name, active FROM students ORDER BY id')),
    rowsOf(DB.prepare('SELECT id, group_id, course, subject, year, threshold, sheet FROM progress_courses ORDER BY year DESC, subject')),
    rowsOf(DB.prepare('SELECT student_id, email AS login FROM learner_accounts WHERE student_id IS NOT NULL')),
    rowsOf(DB.prepare('SELECT course_id, MAX(id) AS revision, MAX(created_at) AS at FROM progress_imports GROUP BY course_id')),
    rowsOf(DB.prepare('SELECT course_id, COUNT(*) AS n FROM course_plan GROUP BY course_id'))
  ]);
  const planOf = new Map(plans.map(p => [p.course_id, p.n]));
  const loginOf = new Map(accounts.map(a => [a.student_id, a.login]));
  const importOf = new Map(imports.map(i => [i.course_id, i]));
  return groups.map(group => ({
    ...group,
    students: students.filter(s => s.group_id === group.id).map(s => ({ id: s.id, name: s.name, active: !!s.active, login: loginOf.get(s.id) || '' })),
    courses: courses.filter(c => c.group_id === group.id).map(c => ({ ...c, imported: !!importOf.get(c.id), importedAt: importOf.get(c.id)?.at || null, planCount: planOf.get(c.id) || 0 }))
  }));
}

const parseNames = text => [...new Set(String(text || '').split(/\r?\n/).map(s => s.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 80);

async function courseFields(DB, b, fallbackYear) {
  const course = String(b.course || ''), subject = clean(b.subject).slice(0, 120);
  const year = b.year === undefined || b.year === '' ? fallbackYear : Number(b.year);
  const threshold = b.threshold === undefined || b.threshold === '' ? 60 : Number(b.threshold);
  const sheet = clean(b.sheet);
  const source = sheet ? sheetSource(sheet) : null;
  if (!subject || !/^[\w-]{1,64}$/.test(course) || !Number.isInteger(year) || year < 2000 || year > 2100
    || !Number.isInteger(threshold) || threshold < 1 || threshold > 100 || (sheet && !source)) return null;
  if (!Object.hasOwn(staticCourses, course) && !(await DB.prepare('SELECT id FROM subjects WHERE id=?').bind(course).first())) return null;
  return { course, subject, year, threshold, sheet: source?.url || '' };
}

async function ownedCourse(DB, id) {
  const n = Number(id);
  return Number.isSafeInteger(n) && n > 0 ? DB.prepare('SELECT * FROM progress_courses WHERE id=?').bind(n).first() : null;
}

/* ---------- API ---------- */
export async function classesApi(path, method, b, env, url, json, err) {
  const DB = env.DB;
  const sub = path.replace(/^classes\/?/, '');
  const today = courseDate(Date.now());

  if (sub === '' && method === 'GET') return json({ ok: true, groups: await classesOverview(DB), catalog: await courseCatalog(DB), year: courseYear(today) });

  /* Топ жасау: пән МІНДЕТТІ. Пәнсіз топ сақталмайды. */
  if (sub === '' && method === 'POST') {
    const name = clean(b.name).slice(0, 40);
    if (!name) return err('bad_request');
    const fields = await courseFields(DB, b, courseYear(today));
    if (!fields) return err('group_needs_subject');
    const exists = await DB.prepare('SELECT id FROM groups WHERE name=?').bind(name).first();
    if (exists) return err('group_exists', 409);
    const group = await DB.prepare('INSERT INTO groups (name) VALUES (?) RETURNING id').bind(name).first();
    try {
      await DB.prepare('INSERT INTO progress_courses (group_id, course, subject, year, threshold, sheet) VALUES (?,?,?,?,?,?)')
        .bind(group.id, fields.course, fields.subject, fields.year, fields.threshold, fields.sheet).run();
      const names = parseNames(b.names);
      if (names.length) await DB.batch(names.map(n => DB.prepare('INSERT INTO students (group_id, full_name) VALUES (?,?)').bind(group.id, n.slice(0, 80))));
    } catch (error) {
      await DB.prepare('DELETE FROM groups WHERE id=?').bind(group.id).run();
      throw error;
    }
    return json({ ok: true, id: group.id, groups: await classesOverview(DB) });
  }

  let m;
  if ((m = sub.match(/^group\/(\d+)$/))) {
    const id = Number(m[1]);
    if (method === 'PATCH') {
      const name = clean(b.name).slice(0, 40);
      if (!name) return err('bad_request');
      const taken = await DB.prepare('SELECT id FROM groups WHERE name=? AND id<>?').bind(name, id).first();
      if (taken) return err('group_exists', 409);
      await DB.prepare('UPDATE groups SET name=? WHERE id=?').bind(name, id).run();
      return json({ ok: true, groups: await classesOverview(DB) });
    }
    if (method === 'DELETE') {
      const used = await DB.prepare(`SELECT 1 AS x FROM sessions WHERE group_id=? UNION ALL
        SELECT 1 FROM progress_imports i JOIN progress_courses c ON c.id=i.course_id WHERE c.group_id=? LIMIT 1`).bind(id, id).first();
      if (used) return err('group_has_history', 409);
      await DB.batch([
        DB.prepare('DELETE FROM learner_accounts WHERE student_id IN (SELECT id FROM students WHERE group_id=?)').bind(id),
        DB.prepare('DELETE FROM course_plan WHERE course_id IN (SELECT id FROM progress_courses WHERE group_id=?)').bind(id),
        DB.prepare('DELETE FROM progress_ai WHERE course_id IN (SELECT id FROM progress_courses WHERE group_id=?)').bind(id),
        DB.prepare('DELETE FROM progress_courses WHERE group_id=?').bind(id),
        DB.prepare('DELETE FROM groups WHERE id=?').bind(id)
      ]);
      return json({ ok: true, groups: await classesOverview(DB) });
    }
  }

  /* Қолданыстағы топқа пән қосу */
  if (sub === 'course' && method === 'POST') {
    const group = Number(b.group);
    if (!(await DB.prepare('SELECT id FROM groups WHERE id=?').bind(group).first())) return err('no_group', 404);
    const fields = await courseFields(DB, b, courseYear(today));
    if (!fields) return err('course_fields');
    const row = await DB.prepare(`INSERT INTO progress_courses (group_id, course, subject, year, threshold, sheet) VALUES (?,?,?,?,?,?)
      ON CONFLICT(group_id, course, subject, year) DO UPDATE SET threshold=excluded.threshold, sheet=CASE WHEN excluded.sheet<>'' THEN excluded.sheet ELSE sheet END
      RETURNING id`).bind(group, fields.course, fields.subject, fields.year, fields.threshold, fields.sheet).first();
    return json({ ok: true, id: row.id, groups: await classesOverview(DB) });
  }
  if ((m = sub.match(/^course\/(\d+)$/)) && method === 'DELETE') {
    const course = await ownedCourse(DB, m[1]);
    if (!course) return err('not_found', 404);
    const linked = await DB.prepare(`SELECT 1 AS x FROM progress_imports WHERE course_id=? UNION ALL SELECT 1 FROM sessions WHERE course_group_id=? LIMIT 1`).bind(course.id, course.id).first();
    if (linked) return err('course_has_data', 409);
    await DB.batch([DB.prepare('DELETE FROM course_plan WHERE course_id=?').bind(course.id), DB.prepare('DELETE FROM progress_ai WHERE course_id=?').bind(course.id), DB.prepare('DELETE FROM progress_courses WHERE id=?').bind(course.id)]);
    return json({ ok: true, groups: await classesOverview(DB) });
  }

  /* Студенттер аккаунты: оқытушы логин мен парольді өзі береді */
  if (sub === 'account' && method === 'POST') {
    const student = await DB.prepare('SELECT id, full_name FROM students WHERE id=?').bind(Number(b.student)).first();
    if (!student) return err('not_found', 404);
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 6 || password.length > 128) return err('password_short');
    const given = clean(b.login).toLowerCase();
    if (given && !/^[a-z0-9._-]{3,40}$/.test(given)) return err('login_format');
    const current = await DB.prepare('SELECT email FROM learner_accounts WHERE student_id=?').bind(student.id).first();
    const login = given || current?.email || await freeLogin(DB, suggestLogin(student.full_name));
    const done = await setStudentAccount(DB, student, login, password);
    if (!done) return err('login_taken', 409);
    return json({ ok: true, login, groups: await classesOverview(DB) });
  }
  if (sub === 'accounts' && method === 'POST') {
    const group = Number(b.group), password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 6 || password.length > 128) return err('password_short');
    const missing = await rowsOf(DB.prepare(`SELECT s.id, s.full_name FROM students s WHERE s.group_id=? AND s.active=1
      AND NOT EXISTS (SELECT 1 FROM learner_accounts a WHERE a.student_id=s.id) ORDER BY s.full_name`).bind(group));
    const made = [];
    for (const student of missing) {
      const login = await freeLogin(DB, suggestLogin(student.full_name));
      if (await setStudentAccount(DB, student, login, password)) made.push({ student: student.id, name: student.full_name, login });
    }
    return json({ ok: true, made, groups: await classesOverview(DB) });
  }
  if ((m = sub.match(/^account\/(\d+)$/)) && method === 'DELETE') {
    await removeStudentAccount(DB, Number(m[1]));
    return json({ ok: true, groups: await classesOverview(DB) });
  }

  /* Пән жоспары: Word/Excel файлынан тақырыптар (кестеден, қаласа ЖИ-мен) */
  if (sub === 'plan' && method === 'GET') {
    const course = await ownedCourse(DB, url.searchParams.get('course'));
    if (!course) return err('not_found', 404);
    return json({ ok: true, topics: await rowsOf(DB.prepare('SELECT n, title, hours FROM course_plan WHERE course_id=? ORDER BY n').bind(course.id)) });
  }
  if (sub === 'plan/preview' && method === 'POST') {
    const course = await ownedCourse(DB, b.course);
    if (!course) return err('not_found', 404);
    if (typeof b.data !== 'string' || !b.data || b.data.length > 3000000) return err('plan_file');
    let bytes;
    try { bytes = Uint8Array.from(atob(b.data), ch => ch.charCodeAt(0)); } catch { return err('plan_file'); }
    let rows;
    try { rows = await officeRows(bytes, b.name); }
    catch (error) { return err(error.message === 'plan_type' ? 'plan_type' : 'plan_file'); }
    let topics = topicsFromRows(rows), source = 'table', ai = '';
    if (b.ai && !env.GEMINI_STUB) {
      try { const smart = await topicsFromAi(env, rows); if (smart.length) { topics = smart; source = 'ai'; } }
      catch (error) { ai = error.kind === 'config' ? 'ai_config' : 'ai_unavailable'; }
    }
    if (!topics.length) return err('plan_empty');
    return json({ ok: true, topics, source, ai, rows: rows.length });
  }
  if (sub === 'plan' && method === 'POST') {
    const course = await ownedCourse(DB, b.course);
    if (!course) return err('not_found', 404);
    if (!validTopics(b.topics)) return err('plan_topics');
    const topics = b.topics.map(t => ({ n: t.n, title: clean(t.title), hours: t.hours ?? null })).sort((x, y) => x.n - y.n);
    await DB.batch([DB.prepare('DELETE FROM course_plan WHERE course_id=?').bind(course.id),
      ...topics.map(t => DB.prepare('INSERT INTO course_plan (course_id, n, title, hours) VALUES (?,?,?,?)').bind(course.id, t.n, t.title, t.hours))]);
    return json({ ok: true, saved: topics.length });
  }
  if (sub === 'plan' && method === 'DELETE') {
    const course = await ownedCourse(DB, url.searchParams.get('course'));
    if (!course) return err('not_found', 404);
    await DB.prepare('DELETE FROM course_plan WHERE course_id=?').bind(course.id).run();
    return json({ ok: true });
  }

  /* Топты талдау: көрсеткіштер мен болжам формуламен есептеледі (ЖИ жоқ) */
  if (sub === 'insights' && method === 'GET') {
    const course = await ownedCourse(DB, url.searchParams.get('course'));
    if (!course) return err('not_found', 404);
    const group = await DB.prepare('SELECT name FROM groups WHERE id=?').bind(course.group_id).first();
    const view = await journalView(DB, course);
    const analysis = analyze(view);
    const cached = await DB.prepare('SELECT facts_key, summary, action FROM progress_ai WHERE course_id=?').bind(course.id).first();
    const fresh = cached && cached.facts_key === factsKey(compactFacts(analysis));
    return json({ ok: true, course: { id: course.id, subject: course.subject, year: course.year, group: group?.name || '', groupId: course.group_id },
      ...view, analysis, ai: fresh ? { summary: cached.summary, action: cached.action } : null });
  }

  /* ЖИ түсініктемесі: тек болжам үшін, 1 шағын сұраныс, нәтиже кэштеледі */
  if (sub === 'ai' && method === 'POST') {
    const course = await ownedCourse(DB, b.course);
    if (!course) return err('not_found', 404);
    const analysis = analyze(await journalView(DB, course));
    const facts = compactFacts(analysis);
    if (facts.average === null || !analysis.predictions.some(p => p.ready)) return json({ ok: true, ai: 'no_scores' });
    const key = factsKey(facts);
    const cached = await DB.prepare('SELECT facts_key, summary, action FROM progress_ai WHERE course_id=?').bind(course.id).first();
    if (cached && cached.facts_key === key) return json({ ok: true, summary: cached.summary, action: cached.action, cached: true });
    let out;
    if (env.GEMINI_STUB) out = { summary: 'Журнал көрсеткіштері бойынша қысқа түсініктеме.', action: 'Қауіптегі студенттерге әлсіз тақырыптардан қосымша тапсырма беріңіз.' };
    else {
      try {
        out = await geminiJson(env, [{ text: 'Қазақ тілінде оқытушыға келесі 2 сабаққа арналған болжамды түсіндір: 2–3 сөйлем қорытынды және бір нақты әрекет. '
          + 'Тек берілген сандарға сүйен, жаңа сан немесе себеп ойлап таппа. Деректер: ' + JSON.stringify(facts) }],
        { type: 'OBJECT', properties: { summary: { type: 'STRING' }, action: { type: 'STRING' } }, required: ['summary', 'action'] },
        { budgetMs: 12000, maxOutputTokens: 300, validate: o => typeof o.summary === 'string' && typeof o.action === 'string' });
      } catch (error) {
        return json({ ok: true, ai: error.kind === 'config' ? 'ai_config' : 'ai_unavailable' });
      }
    }
    const summary = out.summary.slice(0, 700), action = out.action.slice(0, 400);
    await DB.prepare('INSERT OR REPLACE INTO progress_ai (course_id, facts_key, summary, action, at) VALUES (?,?,?,?,?)').bind(course.id, key, summary, action, Date.now()).run();
    return json({ ok: true, summary, action });
  }

  /* Журнал */
  if (sub === 'journal' && method === 'GET') {
    const course = await ownedCourse(DB, url.searchParams.get('course'));
    if (!course) return err('not_found', 404);
    const group = await DB.prepare('SELECT name FROM groups WHERE id=?').bind(course.group_id).first();
    return json({ ok: true, course: { id: course.id, subject: course.subject, year: course.year, sheet: course.sheet, group: group?.name || '', groupId: course.group_id }, ...await journalView(DB, course) });
  }
  if (sub === 'import' && method === 'POST') {
    const course = await ownedCourse(DB, b.course);
    if (!course) return err('not_found', 404);
    try {
      const url2 = clean(b.sheet) || course.sheet;
      const { rows, source } = await readSheet(url2);
      const summary = await importSheet(DB, course, rows, !!b.commit, b.createStudents !== false);
      if (b.commit) await DB.prepare('UPDATE progress_courses SET sheet=? WHERE id=?').bind(source.url, course.id).run();
      return json({ ok: true, ...summary });
    } catch (error) {
      if (journalErrors.has(error.message) || sheetErrors.has(error.message)) return err(error.message);
      if (error.message === 'journal_empty') return err('journal_empty');
      if (error.message === 'journal_changed') return err('journal_changed', 409);
      throw error;
    }
  }
  if (sub === 'cell' && method === 'POST') {
    const course = await ownedCourse(DB, b.course);
    if (!course) return err('not_found', 404);
    const key = String(b.key || '');
    const column = /^c(\d{1,4})$/.exec(key)?.[1];
    if (column === undefined) return err('cell_readonly');
    const student = await DB.prepare('SELECT id FROM students WHERE id=? AND group_id=?').bind(Number(b.student), course.group_id).first();
    if (!student) return err('not_found', 404);
    const raw = clean(b.value).replace(',', '.');
    let score = null, mark = '';
    if (raw !== '') {
      if (MARKS.has(raw.toLowerCase())) mark = raw.toLowerCase();
      else if (/^\d+(\.\d+)?$/.test(raw) && Number(raw) <= 100) score = Number(raw);
      else return err('cell_value');
    }
    const state = await stateOf(DB, course.id);
    const lesson = state.lessons.find(l => String(l.column) === column);
    if (!lesson) return err('not_found', 404);
    const entries = state.entries.filter(e => !(e.student === student.id && String(e.column) === column));
    if (raw !== '') entries.push({ student: student.id, date: lesson.date, column: lesson.column, number: lesson.number || '', score, mark });
    try { await saveState(DB, course.id, state.revision, entries, state.lessons); }
    catch (error) { if (error.message === 'journal_changed') return err('journal_changed', 409); throw error; }
    return json({ ok: true });
  }
  if (sub === 'lesson' && method === 'POST') {
    const course = await ownedCourse(DB, b.course);
    if (!course) return err('not_found', 404);
    const date = clean(b.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return err('bad_request');
    const hours = b.hours === undefined || b.hours === '' ? null : Number(b.hours);
    if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 12)) return err('bad_request');
    const state = await stateOf(DB, course.id);
    const column = Math.max(999, ...state.lessons.map(l => l.column)) + 1;
    if (column > 9999) return err('bad_request');
    state.lessons.push({ column, date, number: '', hours, kind: clean(b.kind).slice(0, 12) });
    try { await saveState(DB, course.id, state.revision, state.entries, state.lessons); }
    catch (error) { if (error.message === 'journal_changed') return err('journal_changed', 409); throw error; }
    return json({ ok: true });
  }
  return err('not_found', 404);
}

/* Студент аккаунтына байланған журнал (тек өз жолы) */
export async function studentJournal(DB, studentId) {
  const student = await DB.prepare('SELECT s.id, s.full_name AS name, s.group_id, g.name AS group_name FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=?').bind(studentId).first();
  if (!student) return null;
  const courses = await rowsOf(DB.prepare('SELECT * FROM progress_courses WHERE group_id=? ORDER BY year DESC, subject').bind(student.group_id));
  const out = [];
  for (const course of courses) {
    const view = await journalView(DB, course, student.id);
    out.push({ subject: course.subject, year: course.year, plan: view.plan, lessons: view.lessons, cells: view.cells[student.id] || {}, summary: view.summary[student.id] || null, threshold: course.threshold });
  }
  return { student: { name: student.name, group: student.group_name }, courses: out };
}
