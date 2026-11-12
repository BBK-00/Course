import { compute, TOPICS } from './grading.js';

const keyOf = (session, student) => `${session}:${student}`;
const rowsOf = async statement => (await statement.all()).results || [];

export async function gradeRecords(DB, sessionIds) {
  if (!sessionIds.length) return { attendance: [], submissions: [], results: [], bonus: [] };
  const ids = JSON.stringify(sessionIds);
  const inSessions = ' WHERE session_id IN (SELECT value FROM json_each(?))';
  const query = (table, suffix = '') => rowsOf(DB.prepare('SELECT * FROM ' + table + inSessions + suffix).bind(ids));
  const [attendance, submissions, results, bonus] = await Promise.all([
    query('attendance'), query('submissions'), query('results', ' AND teacher_total IS NOT NULL'), query('bonus')
  ]);
  return { attendance, submissions, results, bonus };
}

// Only activity with a real student/session pair can become a journal cell.
export function lessonMarks(sessions, { attendance, submissions, results, bonus }) {
  const bySession = new Map(sessions.map(session => [session.id, session]));
  const activities = new Map();
  function ensure(row) {
    const key = keyOf(row.session_id, row.student_id);
    if (!activities.has(key)) activities.set(key, { session: bySession.get(row.session_id), student: row.student_id, submissions: [], bonus: 0 });
    return activities.get(key);
  }
  for (const row of attendance) ensure(row).attendance = row;
  for (const row of submissions) ensure(row).submissions.push(row);
  for (const row of results) ensure(row).result = row;
  for (const row of bonus) ensure(row).bonus += row.points;

  const marks = [];
  for (const record of activities.values()) {
    const { session, student, attendance, submissions, result, bonus } = record;
    if (!session || !TOPICS[session.topic]) continue;
    const score = compute(attendance, submissions, result, bonus, session.topic, session);
    const teacherMark = result?.teacher_total != null;
    marks.push({
      student, session: session.id, topic: session.topic, date: session.created_at, total: score.final,
      present: !!attendance, attendance: score.attendance, complete: score.complete,
      finalized: session.status === 'closed' && (score.complete || teacherMark),
      sent: Object.values(score.tasks).filter(task => task.sent).length,
      taskCount: Object.keys(score.tasks).length, edited: teacherMark || !!score.edited_total
    });
  }
  return marks;
}

export async function teacherJournal(DB, groups, groupId = 0) {
  const sessionFilter = groupId ? ' AND (s.group_id=? OR COALESCE(s.group_id,0)=0)' : '';
  const statement = DB.prepare(`SELECT s.* FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM session_trash t WHERE t.session_id=s.id)${sessionFilter} ORDER BY s.id`);
  const sessions = await rowsOf(groupId ? statement.bind(groupId) : statement);
  const marks = lessonMarks(sessions, await gradeRecords(DB, sessions.map(s => s.id)));
  const sessionGroups = new Map(sessions.map(session => [session.id, session.group_id]));
  const byStudent = new Map();
  const visible = new Map(groups.flatMap(group => group.students.map(student => [student.id, group.id])));
  const groupTopics = new Map(groups.map(group => [group.id, new Map()]));
  const topics = new Set();
  const later = (a, b) => a.date > b.date || (a.date === b.date && a.session > b.session);
  for (const mark of marks) {
    if (!visible.has(mark.student)) continue;
    topics.add(mark.topic);
    const group = visible.get(mark.student);
    if (sessionGroups.get(mark.session) === group) {
      const lessons = groupTopics.get(group), last = lessons.get(mark.topic);
      if (!last || later(mark, last)) lessons.set(mark.topic, mark);
    }
    if (!byStudent.has(mark.student)) byStudent.set(mark.student, { best: {}, recent: {} });
    const { best, recent } = byStudent.get(mark.student);
    const before = best[mark.topic];
    if (!before || Number(mark.finalized) > Number(before.finalized) ||
      (mark.finalized === before.finalized && (mark.total > before.total || (mark.total === before.total && later(mark, before))))) best[mark.topic] = mark;
    if (!recent[mark.topic] || later(mark, recent[mark.topic])) recent[mark.topic] = mark;
  }
  for (const group of groups) for (const student of group.students) {
    const data = byStudent.get(student.id);
    student.scores = data?.best || {};
    student.recent = data?.recent || {};
    for (const [topic, lesson] of groupTopics.get(group.id)) {
      if (student.scores[topic]) continue;
      const missing = {
        student: student.id, session: lesson.session, topic, date: lesson.date, total: null,
        present: false, attendance: 0, complete: false, finalized: false, sent: 0, taskCount: lesson.taskCount, edited: false
      };
      student.scores[topic] = missing;
      student.recent[topic] = missing;
    }
  }
  return {
    topics: [...topics].sort(),
    titles: Object.fromEntries([...topics].map(topic => [topic, TOPICS[topic]?.title || topic])),
    groups
  };
}
