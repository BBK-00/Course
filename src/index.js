/* Сабақ жүйесінің API-ы (Cloudflare Worker + D1). Статикалық сайтты ASSETS беріп тұрады. */
import { sign, verify, safeEqual, bearer, liveCode } from './auth.js';
import { TOPICS, MAX, autoScore, aiGrade, compute, variantOf, sysText } from './grading.js';
import { SCHEMA } from './schema.js';

let ready = false;
async function ensureSchema(DB) { if (ready) return; await DB.batch(SCHEMA.map(q => DB.prepare(q))); ready = true; }

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const err = (code, status = 400, extra) => json({ ok: false, error: code, ...(extra || {}) }, status);
const now = () => Math.floor(Date.now() / 1000);
const all = async st => (await st.all()).results || [];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try { await ensureSchema(env.DB); return await route(request, env, ctx, url); }
    catch (e) {
      if (e.message === 'no_password') return err('no_password', 500);
      return err('server', 500, { message: String(e.message || e) });
    }
  }
};

async function body(request) { try { return await request.json(); } catch (e) { return {}; } }

async function route(request, env, ctx, url) {
  const path = url.pathname.slice(5), method = request.method, DB = env.DB;
  const b = method === 'GET' ? {} : await body(request);

  /* ---------------- Студент: ашық жол ---------------- */
  if (path === 'public/roster' && method === 'GET') {
    const ses = await DB.prepare("SELECT id, topic FROM sessions WHERE status='open' ORDER BY id DESC LIMIT 1").first();
    if (!ses) return json({ ok: true, open: false });
    const rows = await all(DB.prepare('SELECT s.id, s.full_name, s.group_id, g.name AS gname, (SELECT 1 FROM attendance a WHERE a.session_id=? AND a.student_id=s.id) AS present FROM students s JOIN groups g ON g.id=s.group_id WHERE s.active=1 ORDER BY g.name, s.full_name').bind(ses.id));
    const groups = {};
    rows.forEach(r => { (groups[r.group_id] = groups[r.group_id] || { id: r.group_id, name: r.gname, students: [] }).students.push({ id: r.id, name: r.full_name, present: !!r.present }); });
    return json({ ok: true, open: true, topic: ses.topic, groups: Object.values(groups) });
  }

  if (path === 'join' && method === 'POST') {
    const ses = await DB.prepare("SELECT * FROM sessions WHERE status='open' ORDER BY id DESC LIMIT 1").first();
    if (!ses) return err('no_session');
    const sid = Number(b.student_id), dev = String(b.device || '').slice(0, 64);
    if (!sid || !dev) return err('bad_request');
    const fails = await DB.prepare('SELECT COUNT(*) AS n FROM join_fails WHERE student_id=? AND at>?').bind(sid, now() - 60).first();
    if (fails.n >= 5) return err('wait', 429);
    const st = await DB.prepare('SELECT * FROM students WHERE id=? AND active=1').bind(sid).first();
    if (!st) return err('no_student', 404);
    const codes = [await liveCode(env, ses.id, 0), await liveCode(env, ses.id, -1)];
    if (!codes.includes(String(b.code || '').trim())) { await DB.prepare('INSERT INTO join_fails (student_id, at) VALUES (?, ?)').bind(sid, now()).run(); return err('bad_code'); }
    let att = await DB.prepare('SELECT * FROM attendance WHERE session_id=? AND student_id=?').bind(ses.id, sid).first();
    if (att) {
      if (att.device_id && att.device_id !== dev) return err('taken', 409);
      if (!att.device_id) await DB.prepare('UPDATE attendance SET device_id=? WHERE session_id=? AND student_id=?').bind(dev, ses.id, sid).run();
    } else {
      const n = TOPICS[ses.topic].variants.length;
      const idx = (await DB.prepare('SELECT COUNT(*) AS n FROM students WHERE group_id=? AND active=1 AND id<?').bind(st.group_id, sid).first()).n;
      await DB.prepare('INSERT INTO attendance (session_id, student_id, variant, joined_at, device_id) VALUES (?,?,?,?,?)').bind(ses.id, sid, idx % n + 1, now(), dev).run();
    }
    const token = await sign(env, { r: 's', st: sid, ses: ses.id }, 12 * 3600);
    return json({ ok: true, token });
  }

  if (path === 'me' && method === 'GET') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    return json(await studentState(env, p.ses, p.st));
  }

  if (path === 'submit' && method === 'POST') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const task = Number(b.task);
    if (![1, 2, 3].includes(task)) return err('bad_task');
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(p.ses).first();
    if (!ses || ses.status !== 'open') return err('closed', 403);
    if (!ses.work_until) return err('not_started', 403);
    if (now() > ses.work_until + 90) return err('time_over', 403);
    const att = await DB.prepare('SELECT * FROM attendance WHERE session_id=? AND student_id=?').bind(p.ses, p.st).first();
    if (!att) return err('auth', 401);
    const payload = sanitize(task, b.payload || {});
    const sig = JSON.stringify(b.signals || {}).slice(0, 4000), auto = autoScore(task, ses.topic, att.variant, payload);
    const ins = await DB.prepare('INSERT OR IGNORE INTO submissions (session_id, student_id, task, payload, signals, auto_score, submitted_at) VALUES (?,?,?,?,?,?,?)').bind(p.ses, p.st, task, JSON.stringify(payload), sig, auto, now()).run();
    if (!ins.meta.changes) return err('already', 409);
    if (task > 1) await gradeRow(env, DB, p.ses, p.st, task, ses, att.variant, payload, b.signals || {}, auto);
    return json({ ok: true, ...(await studentState(env, p.ses, p.st)), task });
  }

  /* ---------------- Оқытушы ---------------- */
  if (path === 'teacher/login' && method === 'POST') {
    const secretPw = String(env.TEACHER_PASSWORD || '').trim();
    if (!secretPw) return err('no_password', 500);
    /* Құпиясөзді таңдап алудан қорғау: бір IP-ден 10 минутта 6 қате болса, уақытша тоқтатылады */
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const bad = await DB.prepare('SELECT COUNT(*) AS n FROM login_fails WHERE ip=? AND at>?').bind(ip, now() - 600).first();
    if (bad.n >= 6) return err('wait', 429);
    if (!safeEqual(String(b.password || '').trim(), secretPw)) { await DB.prepare('INSERT INTO login_fails (ip, at) VALUES (?, ?)').bind(ip, now()).run(); await new Promise(r => setTimeout(r, 900)); return err('bad_password', 401); }
    await DB.prepare('DELETE FROM login_fails WHERE ip=?').bind(ip).run();
    return json({ ok: true, token: await sign(env, { r: 't' }, 12 * 3600) });
  }
  if (path.startsWith('teacher/')) {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 't') return err('auth', 401);
    return teacher(path.slice(8), method, b, env, ctx, url);
  }
  return err('not_found', 404);
}

function sanitize(task, p) {
  const s = (v, n) => String(v === undefined || v === null ? '' : v).slice(0, n);
  if (task === 1) return { quiz: (Array.isArray(p.quiz) ? p.quiz : []).slice(0, 12).map(v => (Number.isInteger(v) ? v : null)) };
  if (task === 2) return { steps: s(p.steps, 8000), ans: (Array.isArray(p.ans) ? p.ans : []).slice(0, 3).map(v => s(v, 30)) };
  return { code: s(p.code, 8000), out: s(p.out, 400) };
}

async function gradeRow(env, DB, ses_id, st_id, task, ses, variant, payload, sig, auto) {
  const elapsed = ses.work_started_at ? (now() - ses.work_started_at) / 60 : null;
  const g = await aiGrade(env, task, ses.topic, variant, payload, sig, auto, elapsed);
  await DB.prepare('UPDATE submissions SET ai_score=?, ai_pct=?, flags=?, ai_comment=? WHERE session_id=? AND student_id=? AND task=?').bind(g.score, g.ai_pct, g.flags, g.comment, ses_id, st_id, task).run();
}

async function loadFor(DB, ses_id, st_id) {
  const [att, subs, res] = await Promise.all([
    DB.prepare('SELECT * FROM attendance WHERE session_id=? AND student_id=?').bind(ses_id, st_id).first(),
    all(DB.prepare('SELECT * FROM submissions WHERE session_id=? AND student_id=? ORDER BY task').bind(ses_id, st_id)),
    DB.prepare('SELECT * FROM results WHERE session_id=? AND student_id=?').bind(ses_id, st_id).first()
  ]);
  return { att, subs, res };
}

/* Студентке көрінетін күй: ұпайлар, таймер. ЖИ түсініктемесі көрсетілмейді. */
async function studentState(env, ses_id, st_id) {
  const DB = env.DB;
  const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(ses_id).first();
  const st = await DB.prepare('SELECT s.full_name, g.name AS gname FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=?').bind(st_id).first();
  const { att, subs, res } = await loadFor(DB, ses_id, st_id);
  if (!ses || !st || !att) return { ok: false, error: 'auth' };
  const c = compute(att, subs, res);
  const tasks = {};
  [1, 2, 3].forEach(n => { const t = c.tasks[n]; tasks[n] = { sent: t.sent, pts: t.pts, max: t.max, pending: !!t.pending }; });
  return { ok: true, student: { name: st.full_name, group: st.gname }, variant: att.variant, session: { id: ses.id, topic: ses.topic, status: ses.status, work_until: ses.work_until, work_started_at: ses.work_started_at }, now: now(), attendance: c.attendance, tasks, total: c.final, complete: c.complete };
}

/* ---------------- Оқытушы маршруттары ---------------- */
async function teacher(path, method, b, env, ctx, url) {
  const DB = env.DB;

  if (path === 'roster' && method === 'GET') return json({ ok: true, groups: await roster(DB) });
  if (path === 'groups' && method === 'POST') {
    const name = String(b.name || '').trim().slice(0, 40);
    if (!name) return err('bad_request');
    await DB.prepare('INSERT OR IGNORE INTO groups (name) VALUES (?)').bind(name).run();
    return json({ ok: true, groups: await roster(DB) });
  }
  let m;
  if ((m = path.match(/^groups\/(\d+)$/))) {
    if (method === 'DELETE') { await DB.prepare('DELETE FROM groups WHERE id=?').bind(m[1]).run(); return json({ ok: true, groups: await roster(DB) }); }
    if (method === 'PATCH') { await DB.prepare('UPDATE groups SET name=? WHERE id=?').bind(String(b.name || '').trim().slice(0, 40), m[1]).run(); return json({ ok: true, groups: await roster(DB) }); }
  }
  if (path === 'students' && method === 'POST') {
    const gid = Number(b.group_id);
    const names = [...new Set(String(b.names || '').split(/\r?\n/).map(s => s.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim()).filter(Boolean))];
    const have = new Set((await all(DB.prepare('SELECT full_name FROM students WHERE group_id=?').bind(gid))).map(r => r.full_name.toLowerCase()));
    const add = names.filter(n => !have.has(n.toLowerCase())).slice(0, 80);
    if (add.length) await DB.batch(add.map(n => DB.prepare('INSERT INTO students (group_id, full_name) VALUES (?,?)').bind(gid, n.slice(0, 80))));
    return json({ ok: true, added: add.length, groups: await roster(DB) });
  }
  if ((m = path.match(/^students\/(\d+)$/))) {
    if (method === 'DELETE') { await DB.prepare('DELETE FROM students WHERE id=?').bind(m[1]).run(); return json({ ok: true, groups: await roster(DB) }); }
    if (method === 'PATCH') {
      if (b.name !== undefined) await DB.prepare('UPDATE students SET full_name=? WHERE id=?').bind(String(b.name).trim().slice(0, 80), m[1]).run();
      if (b.active !== undefined) await DB.prepare('UPDATE students SET active=? WHERE id=?').bind(b.active ? 1 : 0, m[1]).run();
      if (b.group_id !== undefined) await DB.prepare('UPDATE students SET group_id=? WHERE id=?').bind(Number(b.group_id), m[1]).run();
      return json({ ok: true, groups: await roster(DB) });
    }
  }

  /* Сабақ */
  if (path === 'session/start' && method === 'POST') {
    const topic = String(b.topic || '6');
    if (!TOPICS[topic]) return err('bad_topic');
    await DB.prepare("UPDATE sessions SET status='closed' WHERE status='open'").run();
    const code = String(1000 + Math.floor(Math.random() * 9000));
    await DB.prepare('INSERT INTO sessions (topic, code, status, created_at) VALUES (?,?,?,?)').bind(topic, code, 'open', now()).run();
    return json({ ok: true });
  }
  if (path === 'session/work' && method === 'POST') {
    const ses = await DB.prepare("SELECT * FROM sessions WHERE status='open' ORDER BY id DESC LIMIT 1").first();
    if (!ses) return err('no_session');
    const min = Math.max(1, Math.min(240, Number(b.minutes) || 40));
    const t = now();
    const until = b.total && ses.work_started_at ? ses.work_started_at + min * 60 : (b.extend && ses.work_until && ses.work_until > t ? ses.work_until : t) + min * 60;
    await DB.prepare('UPDATE sessions SET work_started_at=COALESCE(work_started_at, ?), work_until=? WHERE id=?').bind(t, until, ses.id).run();
    return json({ ok: true });
  }
  if (path === 'session/stopwork' && method === 'POST') {
    await DB.prepare("UPDATE sessions SET work_until=? WHERE status='open'").bind(now() - 120).run();
    return json({ ok: true });
  }
  if (path === 'session/close' && method === 'POST') {
    await DB.prepare("UPDATE sessions SET status='closed' WHERE status='open'").run();
    return json({ ok: true });
  }
  if (path === 'release' && method === 'POST') {
    await DB.prepare('UPDATE attendance SET device_id=NULL WHERE session_id=? AND student_id=?').bind(Number(b.session_id), Number(b.student_id)).run();
    return json({ ok: true });
  }
  if (path === 'attendance' && method === 'POST') {
    const sid = Number(b.session_id), stu = Number(b.student_id);
    if (b.present) {
      const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(sid).first(), st = await DB.prepare('SELECT * FROM students WHERE id=?').bind(stu).first();
      if (!ses || !st) return err('not_found', 404);
      const idx = (await DB.prepare('SELECT COUNT(*) AS n FROM students WHERE group_id=? AND active=1 AND id<?').bind(st.group_id, stu).first()).n;
      await DB.prepare('INSERT OR IGNORE INTO attendance (session_id, student_id, variant, joined_at, device_id, manual) VALUES (?,?,?,?,NULL,1)').bind(sid, stu, idx % TOPICS[ses.topic].variants.length + 1, now()).run();
    } else await DB.prepare('DELETE FROM attendance WHERE session_id=? AND student_id=?').bind(sid, stu).run();
    return json({ ok: true });
  }

  /* Тікелей көрініс: кім бар / кім жоқ және прогресс */
  if (path === 'live' && method === 'GET') {
    const ses = await DB.prepare('SELECT * FROM sessions ORDER BY (status=\'open\') DESC, id DESC LIMIT 1').first();
    const groups = await roster(DB);
    if (!ses) return json({ ok: true, session: null, now: now(), groups });
    const [atts, subs, ress] = await Promise.all([
      all(DB.prepare('SELECT * FROM attendance WHERE session_id=?').bind(ses.id)),
      all(DB.prepare('SELECT * FROM submissions WHERE session_id=?').bind(ses.id)),
      all(DB.prepare('SELECT * FROM results WHERE session_id=?').bind(ses.id))
    ]);
    const A = new Map(atts.map(a => [a.student_id, a])), R = new Map(ress.map(r => [r.student_id, r]));
    const S = {}; subs.forEach(s => { (S[s.student_id] = S[s.student_id] || []).push(s); });
    groups.forEach(g => g.students.forEach(s => {
      const a = A.get(s.id);
      s.present = !!a; s.joined_at = a ? a.joined_at : null; s.variant = a ? a.variant : null; s.device = a ? !!a.device_id : false; s.manual = a ? !!a.manual : false;
      const c = compute(a, S[s.id] || [], R.get(s.id));
      s.tasks = {}; [1, 2, 3].forEach(n => { const t = c.tasks[n]; s.tasks[n] = { sent: t.sent, pts: t.pts, max: t.max, pending: !!t.pending, ai_pct: t.ai_pct === undefined ? null : t.ai_pct }; });
      s.total = c.final; s.auto = c.auto; s.ai_pct = c.ai_pct; s.edited = c.edited_total; s.complete = c.complete;
    }));
    return json({ ok: true, now: now(), session: { id: ses.id, topic: ses.topic, code: ses.status === 'open' ? await liveCode(env, ses.id, 0) : '', code_ttl: 60 - (Math.floor(Date.now() / 1000) % 60), status: ses.status, work_until: ses.work_until, work_started_at: ses.work_started_at, created_at: ses.created_at }, groups });
  }

  /* Бір студенттің толық жұмысы */
  if (path === 'work' && method === 'GET') {
    const sid = Number(url.searchParams.get('session')), stu = Number(url.searchParams.get('student'));
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(sid).first();
    const st = await DB.prepare('SELECT s.*, g.name AS gname FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=?').bind(stu).first();
    if (!ses || !st) return err('not_found', 404);
    const { att, subs, res } = await loadFor(DB, sid, stu), c = compute(att, subs, res);
    const ex = att ? variantOf(ses.topic, att.variant) : null;
    return json({ ok: true, student: { id: st.id, name: st.full_name, group: st.gname }, session: { id: ses.id, topic: ses.topic }, attendance: att ? { variant: att.variant, joined_at: att.joined_at, manual: !!att.manual } : null,
      sys: att ? sysText(ses.topic, att.variant) : '', note: ex ? ex.noteKk : '', result: res || null, calc: c,
      subs: subs.map(s => ({ ...s, payload: JSON.parse(s.payload), signals: s.signals ? JSON.parse(s.signals) : {} })) });
  }
  if (path === 'task_grade' && method === 'POST') {
    const sc = (b.score === '' || b.score === null || b.score === undefined) ? null : Math.max(0, Math.min(MAX[Number(b.task)] || 0, Math.round(Number(b.score))));
    await DB.prepare('UPDATE submissions SET teacher_score=?, teacher_comment=? WHERE id=?').bind(sc, String(b.comment || '').slice(0, 1000), Number(b.id)).run();
    return json({ ok: true });
  }
  if (path === 'total' && method === 'POST') {
    const tt = (b.total === '' || b.total === null || b.total === undefined) ? null : Math.max(0, Math.min(100, Math.round(Number(b.total))));
    await DB.prepare('INSERT INTO results (session_id, student_id, teacher_total, teacher_comment) VALUES (?,?,?,?) ON CONFLICT(session_id, student_id) DO UPDATE SET teacher_total=excluded.teacher_total, teacher_comment=excluded.teacher_comment').bind(Number(b.session_id), Number(b.student_id), tt, String(b.comment || '').slice(0, 1000)).run();
    return json({ ok: true });
  }
  if (path === 'regrade' && method === 'POST') {
    const s = await DB.prepare('SELECT * FROM submissions WHERE id=?').bind(Number(b.id)).first();
    if (!s || s.task === 1) return err('not_found', 404);
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(s.session_id).first(), att = await DB.prepare('SELECT * FROM attendance WHERE session_id=? AND student_id=?').bind(s.session_id, s.student_id).first();
    await gradeRow(env, DB, s.session_id, s.student_id, s.task, ses, att ? att.variant : 1, JSON.parse(s.payload), s.signals ? JSON.parse(s.signals) : {}, s.auto_score || 0);
    return json({ ok: true });
  }
  if (path === 'reopen' && method === 'POST') {
    await DB.prepare('DELETE FROM submissions WHERE id=?').bind(Number(b.id)).run();
    return json({ ok: true });
  }

  /* Журнал: студент × тақырып (қатысым + қорытынды) */
  if (path === 'journal' && method === 'GET') {
    const sess = await all(DB.prepare('SELECT * FROM sessions ORDER BY id'));
    const groups = await roster(DB, true);
    const [atts, subs, ress] = await Promise.all([all(DB.prepare('SELECT * FROM attendance')), all(DB.prepare('SELECT * FROM submissions')), all(DB.prepare('SELECT * FROM results'))]);
    const topics = [...new Set(sess.map(s => s.topic))].sort(), latest = {};
    sess.forEach(s => { latest[s.topic] = s; });
    const key = (a, b2) => a + ':' + b2;
    const A = new Map(atts.map(a => [key(a.session_id, a.student_id), a])), R = new Map(ress.map(r => [key(r.session_id, r.student_id), r]));
    const S = {}; subs.forEach(s => { (S[key(s.session_id, s.student_id)] = S[key(s.session_id, s.student_id)] || []).push(s); });
    groups.forEach(g => g.students.forEach(s => {
      s.scores = {};
      topics.forEach(t => { const se = latest[t], k = key(se.id, s.id), c = compute(A.get(k), S[k] || [], R.get(k)); s.scores[t] = { attendance: c.attendance, total: c.final, complete: c.complete, session: se.id, sent: [1, 2, 3].filter(n => c.tasks[n].sent).length, edited: c.edited_total }; });
    }));
    return json({ ok: true, topics, titles: Object.fromEntries(topics.map(t => [t, (TOPICS[t] || {}).title || t])), groups });
  }
  return err('not_found', 404);
}

async function roster(DB, activeOnly) {
  const gs = await all(DB.prepare('SELECT * FROM groups ORDER BY name'));
  const st = await all(DB.prepare('SELECT * FROM students' + (activeOnly ? ' WHERE active=1' : '') + ' ORDER BY full_name'));
  return gs.map(g => ({ id: g.id, name: g.name, students: st.filter(s => s.group_id === g.id).map(s => ({ id: s.id, name: s.full_name, active: !!s.active })) }));
}
