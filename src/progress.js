import { TOPICS } from './grading.js';
import { gradeRecords, lessonMarks } from './grade-history.js';
import { DATA_META } from './data-registry.js';
import { geminiJson } from './gemini.js';
import { readGoogleJournal, sheetSource } from './progress-google.js';
import { parseJournal, readJournalPaste, summarizeProgress } from './progress-journal.js';

const rowsOf = async statement => (await statement.all()).results || [];
const courseAliases = { python: 'py', scratch: 'sb', 'sandyq-adister': 'sm' };
const staticCourses = { py: 'Python', sb: 'Scratch', sm: 'Сандық әдістер', akt: 'АКТ' };
const sheetErrors = new Set(['sheet_access', 'sheet_auth', 'sheet_tab', 'sheet_unavailable']);
const journalErrors = new Set(['journal_format', 'journal_header', 'journal_dates']);

export function courseOfTopic(topic) {
  const subject = DATA_META[topic]?.subject;
  if (subject) return courseAliases[subject] || subject;
  if (/^P\d+$/.test(topic)) return 'py';
  if (topic === 'S7') return 'sb';
  if (['6', '7'].includes(topic)) return 'sm';
  return 'akt';
}

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' });
export const courseDate = time => dayFormat.format(new Date(time));
export const inCourseYear = (date, year) => date >= year + '-09-01' && date < (year + 1) + '-09-01';
export const courseYear = date => Number(date.slice(0, 4)) - (date.slice(5, 7) < '09' ? 1 : 0);

async function compatibleCourses(DB, session) {
  if (!session.group_id || !TOPICS[session.topic]) return [];
  const date = courseDate(session.created_at * 1000);
  return rowsOf(DB.prepare('SELECT * FROM progress_courses WHERE group_id=? AND course=? AND year=? ORDER BY subject,id')
    .bind(session.group_id, courseOfTopic(session.topic), courseYear(date)));
}

export async function resolveProgressCourse(DB, session) {
  const courses = await compatibleCourses(DB, session);
  const linked = courses.find(course => course.id === session.course_group_id);
  const course = linked || (!session.course_group_id && courses.length === 1 ? courses[0] : null);
  return { courses, course, inferred: !!course && !linked };
}

function latestImport(DB, id) {
  return DB.prepare('SELECT id, created_at, entries FROM progress_imports WHERE course_id=? ORDER BY id DESC LIMIT 1').bind(id).first();
}

async function rosterFor(DB, course) {
  return rowsOf(DB.prepare('SELECT id, full_name AS name, active FROM students WHERE group_id=? ORDER BY full_name').bind(course.group_id));
}

async function siteGrades(DB, course) {
  const [{ n: courseCount }, available] = await Promise.all([
    DB.prepare('SELECT COUNT(*) AS n FROM progress_courses WHERE group_id=? AND course=? AND year=?')
      .bind(course.group_id, course.course, course.year).first(),
    rowsOf(DB.prepare(`SELECT s.* FROM sessions s WHERE s.group_id=? AND s.status='closed'
      AND (s.course_group_id=? OR s.course_group_id IS NULL)
      AND NOT EXISTS (SELECT 1 FROM session_trash t WHERE t.session_id=s.id)`).bind(course.group_id, course.id))
  ]);
  const compatible = available.filter(s => TOPICS[s.topic] && courseOfTopic(s.topic) === course.course
    && inCourseYear(courseDate(s.created_at * 1000), course.year));
  const sessions = compatible.filter(s => s.course_group_id === course.id || courseCount === 1);
  const marks = lessonMarks(sessions, await gradeRecords(DB, sessions.map(s => s.id)));
  const entries = marks.filter(mark => mark.finalized).map(mark => ({
    student: mark.student, date: courseDate(mark.date * 1000), column: mark.session,
    number: '', title: TOPICS[mark.topic].title, score: mark.total, mark: ''
  }));
  return { entries, linkedSessions: sessions.length, unassignedSessions: compatible.length - sessions.length };
}

async function reportFor(DB, course, source) {
  const imported = await latestImport(DB, course.id);
  const students = await rosterFor(DB, course);
  const site = source === 'site' ? await siteGrades(DB, course) : null;
  const grades = site?.entries ?? JSON.parse(imported?.entries || '[]');
  const known = new Set(students.map(s => s.id));
  for (const grade of grades) if (!known.has(grade.student)) {
    known.add(grade.student);
    students.push({ id: grade.student, name: grade.name || 'Студент #' + grade.student, active: 0 });
  }
  const today = courseDate(Date.now());
  const report = summarizeProgress(students, grades.filter(grade => grade.date <= today), course.threshold);
  return { report, importedAt: imported?.created_at || null,
    ...(site ? { site: { linkedSessions: site.linkedSessions, unassignedSessions: site.unassignedSessions } } : {}) };
}

async function prepareImport(DB, course, input) {
  let rows;
  if (typeof input.text === 'string' && input.text.length <= 300000) rows = readJournalPaste(input.text);
  else if (Array.isArray(input.cells)) rows = input.cells;
  if (!rows || rows.length > 350 || rows.some(r => !Array.isArray(r) || r.length > 156 ||
    r.some(v => v !== null && (typeof v !== 'string' && typeof v !== 'number' || String(v).length > 2000)))) throw new Error('journal_format');
  const roster = await rosterFor(DB, course);
  const preview = parseJournal(rows, roster, course.year);
  const latest = await latestImport(DB, course.id);
  const old = JSON.parse(latest?.entries || '[]');
  const key = entry => [entry.student, entry.date, entry.number || entry.column].join(':');
  const next = new Map(preview.entries.map(entry => [key(entry), entry]));
  return {
    ...preview, revision: latest?.id || 0,
    removed: old.filter(e => !next.has(key(e))).length,
    changed: old.filter(e => {
      const current = next.get(key(e));
      return current && (current.score !== e.score || current.mark !== e.mark);
    }).length,
    scores: preview.entries.filter(e => e.score !== null).length
  };
}

const aiSchema = { type: 'OBJECT', properties: { summary: { type: 'STRING' }, action: { type: 'STRING' } }, required: ['summary', 'action'] };
const aiFocus = new Map([
  ['now', 'Соңғы бағалардағы өзгерісті сипаттап, қазір қандай қолдау көрсетуге болатынын айт.'],
  ['year', 'Оқу жылының нәтижесін, бағаланған дерек көлемін және көрінетін динамиканы қорытындыла.'],
  ['forecast', 'Дайын болжамды және оның дерек көлемін түсіндір. Болжам мәні null болса, дерек аз екенін айт. Жаңа болжам есептеме.']
]);

export async function progressApi(path, method, body, env, url, json, err) {
  const DB = env.DB;
  if (path === 'progress/session' && (method === 'GET' || method === 'POST')) {
    const id = Number(method === 'GET' ? url.searchParams.get('session') : body.session);
    if (!Number.isSafeInteger(id) || id < 1) return err('not_found', 404);
    const session = await DB.prepare(`SELECT s.* FROM sessions s WHERE id=?
      AND NOT EXISTS (SELECT 1 FROM session_trash t WHERE t.session_id=s.id)`).bind(id).first();
    if (!session) return err('not_found', 404);
    const context = await resolveProgressCourse(DB, session);
    if (method === 'GET') return json({ ok:true, selected:context.course?.id || null, inferred:context.inferred,
      courses:context.courses.map(c => ({ id:c.id, subject:c.subject, year:c.year })) });
    const course = context.courses.find(c => c.id === Number(body.course));
    if (!course) return err('course_mismatch', 409);
    const saved = await DB.prepare(`UPDATE sessions SET course_group_id=? WHERE id=? AND group_id=?
      AND NOT EXISTS (SELECT 1 FROM session_trash WHERE session_id=?)`).bind(course.id, id, course.group_id, id).run();
    if (!saved.meta.changes) return err('not_found', 404);
    return json({ ok:true, id:course.id });
  }
  if (path === 'progress' && method === 'GET') {
    const [groups, subjects, courses] = await Promise.all([
      rowsOf(DB.prepare('SELECT id, name FROM groups ORDER BY name')),
      rowsOf(DB.prepare('SELECT id, title FROM subjects ORDER BY ord, title')),
      rowsOf(DB.prepare(`SELECT p.*, g.name AS group_name,
        (SELECT i.created_at FROM progress_imports i WHERE i.course_id=p.id ORDER BY i.id DESC LIMIT 1) AS imported_at
        FROM progress_courses p JOIN groups g ON g.id=p.group_id ORDER BY p.year DESC, g.name, p.subject`))
    ]);
    const catalog = { ...staticCourses };
    for (const subject of subjects) catalog[courseAliases[subject.id] || subject.id] ??= subject.title;
    return json({ ok: true, groups, courses, catalog });
  }
  if (path === 'progress/course' && method === 'POST') {
    const group = Number(body.group), year = Number(body.year), threshold = Number(body.threshold);
    const course = String(body.course || ''), subject = String(body.subject || '').trim(), sheet = String(body.sheet || '').trim();
    const source = sheet ? sheetSource(sheet) : null;
    if (!Number.isSafeInteger(group) || group < 1 || !Number.isInteger(year) || year < 2000 || year > 2100 ||
      !Number.isInteger(threshold) || threshold < 1 || threshold > 100 ||
      !/^[\w-]{1,64}$/.test(course) || !subject || subject.length > 120 || sheet && !source) return err('course_fields');
    if (!(await DB.prepare('SELECT id FROM groups WHERE id=?').bind(group).first())) return err('no_group', 404);
    if (!Object.hasOwn(staticCourses, course) && !(await DB.prepare('SELECT id FROM subjects WHERE id=?').bind(course).first())) return err('course_fields');
    const row = await DB.prepare(`INSERT INTO progress_courses (group_id, course, subject, year, threshold, sheet)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(group_id, course, subject, year)
      DO UPDATE SET threshold=excluded.threshold, sheet=excluded.sheet RETURNING id`)
      .bind(group, course, subject, year, threshold, source?.url || '').first();
    return json({ ok: true, id: row.id });
  }
  const id = Number(method === 'GET' ? url.searchParams.get('id') : body.id);
  const course = Number.isSafeInteger(id) && id > 0 && await DB.prepare('SELECT * FROM progress_courses WHERE id=?').bind(id).first();
  if (!course) return err('not_found', 404);
  if (path === 'progress/report' && method === 'GET') {
    return json({ ok: true, ...await reportFor(DB, course, url.searchParams.get('source')) });
  }
  if (['progress/preview', 'progress/import', 'progress/google'].includes(path) && method === 'POST') {
    let cells;
    if (path === 'progress/google') {
      if (!env.GOOGLE_SHEETS_SERVICE_ACCOUNT) return err('sheet_config');
      const source = sheetSource(course.sheet);
      if (!source) return err('sheet_link');
      try { cells = await readGoogleJournal(env, source); }
      catch (error) { return err(sheetErrors.has(error.message) ? error.message : 'sheet_unavailable'); }
    }
    let preview;
    try { preview = await prepareImport(DB, course, cells ? { cells } : body); }
    catch (error) {
      if (journalErrors.has(error.message)) return err(error.message);
      throw error;
    }
    if (path !== 'progress/import') {
      const { entries, ...summary } = preview;
      return json({ ok: true, ...summary, sample: entries.slice(0, 6), ...(cells ? { cells } : {}) });
    }
    if (!preview.entries.length) return err('journal_empty');
    if (body.revision !== preview.revision) return err('journal_changed', 409);
    const packed = JSON.stringify(preview.entries);
    if (new TextEncoder().encode(packed).length > 800000) return err('journal_format');
    const result = await DB.prepare(`INSERT INTO progress_imports(course_id, created_at, entries)
      SELECT ?, ?, ? WHERE COALESCE((SELECT MAX(id) FROM progress_imports WHERE course_id=?),0)=?
      AND NOT EXISTS (SELECT 1 FROM progress_imports WHERE id=? AND entries=?)`)
      .bind(id, Date.now(), packed, id, preview.revision, preview.revision, packed).run();
    if (!result.meta.changes && (await latestImport(DB, id))?.id !== preview.revision) return err('journal_changed', 409);
    return json({ ok: true, imported: preview.entries.length, unchanged: !result.meta.changes });
  }
  if (path === 'progress/ai' && method === 'POST') {
    const { report } = await reportFor(DB, course, body.source);
    const profile = report.profiles.find(p => p.id === Number(body.student));
    if (body.student && !profile) return err('not_found', 404);
    const days = profile ? profile.daily : report.daily;
    const window = { days: days.length, first: days[0]?.score, latest: days.at(-1)?.score };
    const facts = profile ? {
      scored: profile.count, average: profile.average, last: profile.daily.slice(-4).map(d => d.score),
      reason: profile.reason, drop: profile.drop, forecast: profile.forecast, backtest: profile.backtest, window
    } : {
      total: report.total, assessed: report.assessed, average: report.average,
      attention: report.attention, forecast: report.forecast, forecastCount: report.forecastCount,
      belowThreshold: report.belowThreshold, backtest: report.backtest,
      recent: report.daily.slice(-4).map(d => ({ score: d.score, count: d.count })), window
    };
    if (facts.average === null) return err('no_scores');
    try {
      const opinion = env.GEMINI_STUB ? { summary: 'Бағаларда көрсетілген оқу барысы бойынша қысқа талдау.', action: 'Соңғы бағаланған жұмыстарды студентпен бірге қарап шығыңыз.' }
        : await geminiJson(env, [{ text: 'Қазақ тілінде оқытушыға оқу үлгерімі туралы қысқа қорытынды жаз. ' + (aiFocus.get(body.mode) || aiFocus.get('now')) + ' Тек осы көрсеткіштерге сүйен. Сандарды өзгертпе, қателердің тақырыбын не себептерін ойдан шығарма. Бір нақты қолдау әрекетін ұсын. Межелік балл ' + course.threshold + '. Көрсеткіштер ' + JSON.stringify(facts) }], aiSchema,
          { budgetMs: 12000, maxOutputTokens: 350, validate: o => typeof o.summary === 'string' && typeof o.action === 'string' });
      return json({ ok: true, summary: opinion.summary.slice(0, 800), action: opinion.action.slice(0, 500) });
    } catch (error) { return err(error.kind === 'config' ? 'ai_config' : 'ai_unavailable', 503); }
  }
  return err('not_found', 404);
}
