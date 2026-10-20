/* Сабақ жүйесінің API-ы (Cloudflare Worker + D1). Статикалық сайтты ASSETS беріп тұрады. */
import { sign, verify, safeEqual, bearer, liveCode } from './auth.js';
import { dataFor, stampOf, buildFile, gradeFile } from './excel.js';
import { TOPICS, MAX, MAXT, autoScore, aiGrade, compute, variantOf, sysText, outOk } from './grading.js';
import { SCHEMA } from './schema.js';
import { runCode, LANGS } from './runner.js';
import { PLAN, PLANS } from './plan.js';
import { gradeSb3 } from './scratch.js';
import { gradePptx, designGrade, compose } from './mm.js';
import { data7, auto7, desc7, LIMIT7 } from './approx.js';

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
  const b = method === 'GET' || path === 'xl/upload' || path === 'sb/upload' || path === 'mm/upload' ? {} : await body(request);

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

  /* АКТ · Excel жұмысы: студентке жеке файл беріледі, толтырылған файл жүктеледі */
  if (path === 'xl/file' && method === 'GET') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(p.ses).first();
    if (!ses || ses.status !== 'open' || ses.topic !== '10') return err('closed', 403);
    if (!ses.work_until) return err('not_started', 403);
    if (now() > ses.work_until + 90) return err('time_over', 403);
    const st = await DB.prepare('SELECT s.full_name, g.name AS gname FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=?').bind(p.st).first();
    if (!st) return err('auth', 401);
    await DB.prepare('INSERT OR IGNORE INTO task_starts (session_id, student_id, task, started_at) VALUES (?,?,?,?)').bind(p.ses, p.st, 1, now()).run();
    const bytes = buildFile(dataFor(p.st, p.ses), 'Студент: ' + st.full_name + ' · ' + st.gname + ' · ID ' + await stampOf(env, p.st, p.ses));
    return new Response(bytes, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="akt10-excel.xlsx"', 'Cache-Control': 'no-store' } });
  }
  if (path === 'xl/upload' && method === 'POST') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(p.ses).first();
    if (!ses || ses.status !== 'open' || ses.topic !== '10') return err('closed', 403);
    if (!ses.work_until) return err('not_started', 403);
    if (now() > ses.work_until + 90) return err('time_over', 403);
    const busy = await DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE student_id=? AND at>?').bind(p.st, now() - 60).first();
    if (busy.n >= 6) return err('wait', 429);
    await DB.prepare('INSERT INTO runs (student_id, at) VALUES (?, ?)').bind(p.st, now()).run();
    if ((await DB.prepare('SELECT COUNT(*) AS n FROM submissions WHERE session_id=? AND student_id=?').bind(p.ses, p.st).first()).n) return err('already', 409);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > 3e6) return err('bad_file');
    const res = await gradeFile(dataFor(p.st, p.ses), buf, await stampOf(env, p.st, p.ses));
    if (res.error) return err(res.error);
    const t0 = now();
    await DB.batch(res.sheets.map((sh, i) => DB.prepare('INSERT OR REPLACE INTO submissions (session_id, student_id, task, payload, signals, auto_score, submitted_at) VALUES (?,?,?,?,?,?,?)').bind(p.ses, p.st, i + 1, JSON.stringify({ items: sh.items, match: res.match }), '{}', sh.pts, t0)));
    return json({ ok: true, ...(await studentState(env, p.ses, p.st)), sheets: res.sheets });
  }

  /* АКТ 13: куиз-презентация (.pptx құрылым + PDF дизайн) */
  if (path === 'mm/upload' && method === 'POST') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(p.ses).first();
    if (!ses || ses.status !== 'open' || ses.topic !== 'A13') return err('closed', 403);
    if (!ses.work_until) return err('not_started', 403);
    if (now() > ses.work_until + 90) return err('time_over', 403);
    const busy = await DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE student_id=? AND at>?').bind(p.st, now() - 60).first();
    if (busy.n >= 4) return err('wait', 429);
    if ((await DB.prepare('SELECT COUNT(*) AS n FROM submissions WHERE session_id=? AND student_id=?').bind(p.ses, p.st).first()).n) return err('already', 409);
    let fd; try { fd = await request.formData(); } catch (e) { return err('need_both'); }
    const pp = fd.get('pptx'), pf = fd.get('pdf');   /* PDF міндетті емес: жоқ болса, дизайн слайд құрылымынан бағаланады */
    if (!pp || typeof pp.arrayBuffer !== 'function') return err('need_both');
    const hasPdf = !!(pf && typeof pf.arrayBuffer === 'function' && pf.size > 0);
    if (pp.size > 60e6 || (hasPdf && pf.size > 14e6)) return err('too_big');
    const st = await DB.prepare('SELECT full_name FROM students WHERE id=?').bind(p.st).first();
    const g = await gradePptx(await pp.arrayBuffer(), st ? st.full_name : '');
    if (g.error) return err(g.error);
    const pdf = hasPdf ? await pf.arrayBuffer() : null;
    if (pdf && new TextDecoder().decode(new Uint8Array(pdf, 0, 5)) !== '%PDF-') return err('bad_pdf');
    let dup = '';
    if (g.fp) {
      const o = await all(DB.prepare("SELECT x.payload, s.full_name FROM submissions x JOIN students s ON s.id=x.student_id WHERE x.session_id=? AND x.student_id!=? AND x.task=1").bind(p.ses, p.st));
      const hit = o.find(r => { try { return JSON.parse(r.payload).fp === g.fp; } catch (e) { return false; } });
      if (hit) dup = hit.full_name;
    }
    await DB.prepare('INSERT INTO runs (student_id, at) VALUES (?, ?)').bind(p.st, now()).run();
    let design; try { design = await designGrade(env, pdf, pdf ? null : { deck: g.deck, slides: g.slides.map(s => s.missing ? { n: s.n, missing: true } : { n: s.n, text: String(s.text || '').slice(0, 220), ...s.facts }) }); } catch (e) { return err('ai_busy', 503); }
    const rows = compose(g, design), t0 = now();
    await DB.batch(rows.map((sh, i) => DB.prepare('INSERT OR REPLACE INTO submissions (session_id, student_id, task, payload, signals, auto_score, submitted_at, flags) VALUES (?,?,?,?,?,?,?,?)').bind(p.ses, p.st, i + 1, JSON.stringify({ items: sh.items, fp: g.fp, dup, summary: String(design.summary || '').slice(0, 300) }), '{}', dup ? 0 : sh.pts, t0, dup ? '🔴 Бұл презентация «' + dup + '» студентінің жұмысымен бірдей (көшірілген). Балл 0.' : (i === 2 ? 'Дизайн (ЖИ): ' + String(design.summary || '').slice(0, 200) : ''))));
    return json({ ok: true, ...(await studentState(env, p.ses, p.st)), sheets: rows.map(s => ({ items: s.items, pts: dup ? 0 : s.pts })), dup: !!dup, summary: design.summary || '' });
  }

  /* Scratch 7: .sb3 ойын жобасы жүктеледі, блоктар автоматты талданады */
  if (path === 'sb/upload' && method === 'POST') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(p.ses).first();
    if (!ses || ses.status !== 'open' || ses.topic !== 'S7') return err('closed', 403);
    if (!ses.work_until) return err('not_started', 403);
    if (now() > ses.work_until + 90) return err('time_over', 403);
    const busy = await DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE student_id=? AND at>?').bind(p.st, now() - 60).first();
    if (busy.n >= 6) return err('wait', 429);
    await DB.prepare('INSERT INTO runs (student_id, at) VALUES (?, ?)').bind(p.st, now()).run();
    if ((await DB.prepare('SELECT COUNT(*) AS n FROM submissions WHERE session_id=? AND student_id=?').bind(p.ses, p.st).first()).n) return err('already', 409);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > 25e6) return err('bad_file');
    const res = await gradeSb3(buf, String(new URL(request.url).searchParams.get('e') || '').slice(0, 800));
    if (res.error) return err(res.error);
    let dup = '';
    if (res.fp) {
      const o = await all(DB.prepare("SELECT x.payload, s.full_name FROM submissions x JOIN students s ON s.id=x.student_id WHERE x.session_id=? AND x.student_id!=? AND x.task=1").bind(p.ses, p.st));
      const hit = o.find(r => { try { return JSON.parse(r.payload).fp === res.fp; } catch (e) { return false; } });
      if (hit) dup = hit.full_name;
    }
    const t0 = now();
    await DB.batch(res.sheets.map((sh, i) => DB.prepare('INSERT OR REPLACE INTO submissions (session_id, student_id, task, payload, signals, auto_score, submitted_at, flags) VALUES (?,?,?,?,?,?,?,?)').bind(p.ses, p.st, i + 1, JSON.stringify({ items: sh.items, fp: res.fp, dup, blocks: res.blocks }), '{}', dup ? 0 : sh.pts, t0, dup ? '🔴 Бұл жоба «' + dup + '» студентінің жобасымен бірдей (көшірілген). Балл 0.' : '')));
    return json({ ok: true, ...(await studentState(env, p.ses, p.st)), sheets: res.sheets.map(s => ({ items: s.items, pts: dup ? 0 : s.pts })), dup: !!dup });
  }

  /* Сабақ жоспары: тек мұғалімдерге (қонақ мұғалім токені немесе оқытушы панелі) */
  if (path === 'plan' && method === 'GET') {
    const p = await verify(env, bearer(request));
    if (!p) return err('auth', 401);
    if (p.r !== 'g' && p.r !== 't') return err('forbidden', 403);
    const pl = PLANS[url.searchParams.get('topic')] || PLAN;
    return json({ ok: true, title: pl.title, html: pl.html, topics: url.searchParams.get('all') ? Object.entries(PLANS).filter(([k]) => k !== '6' || PLAN.html.indexOf('жүктелмеген') < 0).map(([k, v]) => ({ topic: k, title: v.title, html: v.html })) : undefined });
  }

  if (path === 'join_guest' && method === 'POST') {
    const ses = await DB.prepare("SELECT * FROM sessions WHERE status='open' ORDER BY id DESC LIMIT 1").first();
    if (!ses) return err('no_session');
    const ip = 'g:' + (request.headers.get('CF-Connecting-IP') || 'local');
    const bad = await DB.prepare('SELECT COUNT(*) AS n FROM login_fails WHERE ip=? AND at>?').bind(ip, now() - 60).first();
    if (bad.n >= 8) return err('wait', 429);
    const name = String(b.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (name.length < 3) return err('bad_request');
    const codes = [await liveCode(env, ses.id, 0), await liveCode(env, ses.id, -1)];
    if (!codes.includes(String(b.code || '').trim())) { await DB.prepare('INSERT INTO login_fails (ip, at) VALUES (?, ?)').bind(ip, now()).run(); return err('bad_code'); }
    await DB.prepare('INSERT OR IGNORE INTO guests (session_id, name, at) VALUES (?,?,?)').bind(ses.id, name, now()).run();
    return json({ ok: true, token: await sign(env, { r: 'g', ses: ses.id, name }, 12 * 3600) });
  }

  if (path === 'me' && method === 'GET') {
    const p = await verify(env, bearer(request));
    if (!p) return err('auth', 401);
    if (p.r === 't') return json({ ok: true, guest: true, teacher: true, student: { name: 'Оқытушы', group: 'Мұғалім' }, now: now() });
    if (p.r === 'g') {
      const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(p.ses).first();
      if (!ses) return err('auth', 401);
      return json({ ok: true, guest: true, student: { name: p.name, group: 'Мұғалім' }, session: { id: ses.id, topic: ses.topic, status: ses.status, work_until: ses.work_until, work_started_at: ses.work_started_at }, now: now() });
    }
    if (p.r !== 's') return err('auth', 401);
    return json(await studentState(env, p.ses, p.st));
  }

  if (path === 'task/start' && method === 'POST') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const task = Number(b.task);
    if (![1, 2, 3].includes(task)) return err('bad_task');
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(p.ses).first();
    if (!ses || ses.status !== 'open') return err('closed', 403);
    if (ses.topic === '7') {   /* 7-тақырып: үш тапсырмаға бір таймер, мерзімнен кейін де жіберуге болады (балл азаяды) */
      if (!ses.work_until) return err('not_started', 403);
      const t = now();
      await DB.batch([1, 2, 3].map(n => DB.prepare('INSERT OR IGNORE INTO task_starts (session_id, student_id, task, started_at) VALUES (?,?,?,?)').bind(p.ses, p.st, n, t)));
      return json({ ok: true, ...(await studentState(env, p.ses, p.st)) });
    }
    if (!ses.work_until || now() > ses.work_until + 90) return err(ses.work_until ? 'time_over' : 'not_started', 403);
    await DB.prepare('INSERT OR IGNORE INTO task_starts (session_id, student_id, task, started_at) VALUES (?,?,?,?)').bind(p.ses, p.st, task, now()).run();
    return json({ ok: true, ...(await studentState(env, p.ses, p.st)) });
  }

  if (path === 'feedback' && method === 'POST') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const level = Math.max(1, Math.min(5, Math.round(Number(b.level) || 0)));
    if (!b.level) return err('bad_request');
    const learned = JSON.stringify((Array.isArray(b.learned) ? b.learned : []).slice(0, 8).map(v => String(v).slice(0, 60)));
    await DB.prepare('INSERT INTO feedback (session_id, student_id, level, learned, hard, comment, at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(session_id, student_id) DO UPDATE SET level=excluded.level, learned=excluded.learned, hard=excluded.hard, comment=excluded.comment, at=excluded.at').bind(p.ses, p.st, level, learned, String(b.hard || '').slice(0, 80), String(b.comment || '').slice(0, 600), now()).run();
    return json({ ok: true });
  }

  if (path === 'run' && method === 'POST') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const busy = await DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE student_id=? AND at>?').bind(p.st, now() - 60).first();
    if (busy.n >= 12) return err('wait', 429);
    await DB.prepare('INSERT INTO runs (student_id, at) VALUES (?, ?)').bind(p.st, now()).run();
    const code = String(b.code || '');
    if (!code.trim()) return err('bad_request');
    const r = await runCode(env, LANGS.includes(b.language) ? b.language : 'python', code, '');
    return json({ ok: true, run: r });
  }

  if (path === 'submit' && method === 'POST') {
    const p = await verify(env, bearer(request));
    if (!p || p.r !== 's') return err('auth', 401);
    const task = Number(b.task);
    if (![1, 2, 3].includes(task)) return err('bad_task');
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(p.ses).first();
    if (!ses || ses.status !== 'open') return err('closed', 403);
    if (!ses.work_until) return err('not_started', 403);
    const x7 = ses.topic === '7';
    if (!x7 && now() > ses.work_until + 90) return err('time_over', 403);
    const st0 = await DB.prepare('SELECT started_at FROM task_starts WHERE session_id=? AND student_id=? AND task=?').bind(p.ses, p.st, task).first();
    if (!st0) return err('task_not_started', 403);
    if (!x7 && now() > st0.started_at + TOPICS[ses.topic].limits[task] * 60 + 45) return err('task_time_over', 403);
    const att = await DB.prepare('SELECT * FROM attendance WHERE session_id=? AND student_id=?').bind(p.ses, p.st).first();
    if (!att) return err('auth', 401);
    if (x7) {   /* код тапсырмасы: мерзімнен кеш — балл азаяды, көшіріп қойса — 0 */
      const sg = b.signals && typeof b.signals === 'object' ? b.signals : {}, pl = sanitize(2, b.payload || {}), N = v => Math.max(0, Math.min(1e6, Number(v) || 0));
      const pasted = N(sg.pasted), typed = N(sg.typed), assist = N(sg.assist), tpl = N(sg.tpl);
      pl.late = Math.round(Math.max(0, (now() - (st0.started_at + LIMIT7 * 60)) / 60) * 10) / 10;
      pl.zero = pasted >= 40 ? 'paste' : (pl.code.length > tpl + typed + assist + 60 ? 'typed' : '');
      const clean = { away: N(sg.away), paste: N(sg.paste), pasted, typed, assist, tpl };
      const ins7 = await DB.prepare('INSERT OR IGNORE INTO submissions (session_id, student_id, task, payload, signals, auto_score, submitted_at) VALUES (?,?,?,?,?,?,?)').bind(p.ses, p.st, task, JSON.stringify(pl), JSON.stringify(clean), 0, now()).run();
      if (!ins7.meta.changes) return err('already', 409);
      await gradeCode7(env, DB, p.ses, p.st, ses, att.variant, task, pl, clean);
      return json({ ok: true, ...(await studentState(env, p.ses, p.st)), task });
    }
    const payload = sanitize(task, b.payload || {});
    const sig = JSON.stringify(b.signals || {}).slice(0, 4000), auto = autoScore(task, ses.topic, att.variant, payload);
    const ins = await DB.prepare('INSERT OR IGNORE INTO submissions (session_id, student_id, task, payload, signals, auto_score, submitted_at) VALUES (?,?,?,?,?,?,?)').bind(p.ses, p.st, task, JSON.stringify(payload), sig, auto, now()).run();
    if (!ins.meta.changes) return err('already', 409);
    if (task === 2) await gradeCode(env, DB, p.ses, p.st, ses, att.variant, payload, b.signals || {}, (now() - st0.started_at) / 60);
    else if (task === 1) await gradeRow(env, DB, p.ses, p.st, task, ses, att.variant, payload, b.signals || {}, auto, (now() - st0.started_at) / 60);
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
  if (task === 3) return { quiz: (Array.isArray(p.quiz) ? p.quiz : []).slice(0, 12).map(v => (Number.isInteger(v) ? v : null)) };
  if (task === 1) {
    const photo = /^[A-Za-z0-9+/=]*$/.test(String(p.photo || '').slice(0, 200)) ? s(p.photo, 950000) : '';
    return { steps: s(p.steps, 8000), ans: (Array.isArray(p.ans) ? p.ans : []).slice(0, 3).map(v => s(v, 30)), photo, photo_mime: /^image\/(jpeg|png|webp)$/.test(p.photo_mime) ? p.photo_mime : 'image/jpeg' };
  }
  return { code: s(p.code, 8000), lang: LANGS.includes(p.lang) ? p.lang : 'python' };
}

/* Код: сервердe нақты орындалады, нәтиже шешіммен салыстырылады, сосын ЖИ логиканы бағалайды */
async function gradeCode(env, DB, ses_id, st_id, ses, variant, payload, sig, tmin) {
  const ex = variantOf(ses.topic, variant);
  const res = await runCode(env, payload.lang || 'python', payload.code, '');
  const p2 = { ...payload, out: String(res.stdout || '').slice(0, 300), run: { ok: res.ok, stdout: res.stdout, stderr: res.stderr, status: res.status, backend: res.backend || '' } };
  const auto = res.infra ? 0 : (outOk(res.stdout, ex.out) ? 12 : 0);
  await DB.prepare('UPDATE submissions SET payload=?, auto_score=? WHERE session_id=? AND student_id=? AND task=2').bind(JSON.stringify(p2), auto, ses_id, st_id).run();
  if (res.infra) {
    await DB.prepare('UPDATE submissions SET ai_score=NULL, ai_pct=NULL, flags=?, ai_comment=? WHERE session_id=? AND student_id=? AND task=2').bind('⚠ орындау қызметі жауап бермеді', 'Бағдарламаны іске қосу мүмкін болмады. «ЖИ-мен қайта» батырмасымен кейін қайта тексеріңіз.', ses_id, st_id).run();
    return;
  }
  await gradeRow(env, DB, ses_id, st_id, 2, ses, variant, p2, sig, auto, tmin);
}

/* 7-тақырып: код сервердe нақты орындалады, нәтиже дұрыс жауаппен салыстырылады, ЖИ логиканы бағалайды */
async function gradeCode7(env, DB, ses_id, st_id, ses, variant, task, payload, sig) {
  const res = await runCode(env, payload.lang || 'python', payload.code, '');
  const a = auto7(task, variant, res.stdout);
  const p2 = { ...payload, run: { ok: res.ok, stdout: res.stdout, stderr: res.stderr, status: res.status, backend: res.backend || '' }, items: a.items };
  const auto = res.infra ? 0 : a.pts;
  await DB.prepare('UPDATE submissions SET payload=?, auto_score=? WHERE session_id=? AND student_id=? AND task=?').bind(JSON.stringify(p2), auto, ses_id, st_id, task).run();
  if (payload.zero) { await DB.prepare('UPDATE submissions SET ai_score=0, ai_pct=0, flags=?, ai_comment=? WHERE session_id=? AND student_id=? AND task=?').bind('🔴 ' + (payload.zero === 'paste' ? 'код сырттан көшіріліп қойылған' : 'код терілмей пайда болған') + ' → 0 балл', 'Көшіру анықталды, тапсырмаға 0 балл қойылды.', ses_id, st_id, task).run(); return; }
  if (res.infra) { await DB.prepare('UPDATE submissions SET ai_score=NULL, ai_pct=NULL, flags=?, ai_comment=? WHERE session_id=? AND student_id=? AND task=?').bind('⚠ орындау қызметі жауап бермеді', 'Бағдарламаны іске қосу мүмкін болмады. «ЖИ-мен қайта» батырмасымен кейін қайта тексеріңіз.', ses_id, st_id, task).run(); return; }
  await gradeRow(env, DB, ses_id, st_id, task, ses, variant, p2, sig, auto, null);
}

async function gradeRow(env, DB, ses_id, st_id, task, ses, variant, payload, sig, auto, elapsed) {
  const g = await aiGrade(env, task, ses.topic, variant, payload, sig, auto, elapsed === undefined ? null : elapsed);
  await DB.prepare('UPDATE submissions SET ai_score=?, ai_pct=?, flags=?, ai_comment=? WHERE session_id=? AND student_id=? AND task=?').bind(g.score, g.ai_pct, g.flags, g.comment, ses_id, st_id, task).run();
}

async function loadFor(DB, ses_id, st_id) {
  const [att, subs, res, bn] = await Promise.all([
    DB.prepare('SELECT * FROM attendance WHERE session_id=? AND student_id=?').bind(ses_id, st_id).first(),
    all(DB.prepare('SELECT * FROM submissions WHERE session_id=? AND student_id=? ORDER BY task').bind(ses_id, st_id)),
    DB.prepare('SELECT * FROM results WHERE session_id=? AND student_id=?').bind(ses_id, st_id).first(),
    DB.prepare('SELECT COALESCE(SUM(points),0) AS n FROM bonus WHERE session_id=? AND student_id=?').bind(ses_id, st_id).first()
  ]);
  return { att, subs, res, bonus: bn ? bn.n : 0 };
}

/* Студентке көрінетін күй: ұпайлар, таймер. ЖИ түсініктемесі көрсетілмейді. */
async function studentState(env, ses_id, st_id) {
  const DB = env.DB;
  const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(ses_id).first();
  const st = await DB.prepare('SELECT s.full_name, g.name AS gname FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=?').bind(st_id).first();
  const { att, subs, res, bonus } = await loadFor(DB, ses_id, st_id);
  if (!ses || !st || !att) return { ok: false, error: 'auth' };
  const c = compute(att, subs, res, bonus, ses && ses.topic);
  const fbk = await DB.prepare('SELECT 1 AS x FROM feedback WHERE session_id=? AND student_id=?').bind(ses_id, st_id).first();
  const starts = {}; (await all(DB.prepare('SELECT task, started_at FROM task_starts WHERE session_id=? AND student_id=?').bind(ses_id, st_id))).forEach(r => { starts[r.task] = r.started_at; });
  const tasks = {};
  [1, 2, 3].forEach(n => { const t = c.tasks[n]; tasks[n] = { sent: t.sent, pts: t.pts, max: t.max, pending: !!t.pending, started_at: starts[n] || null, limit: TOPICS[ses.topic].limits[n], zero: t.zero || '', late: t.late || 0, lf: t.late_factor || 1 }; });
  const data = ses.topic === '7' ? data7(att.variant) : undefined;
  return { ok: true, student: { name: st.full_name, group: st.gname }, variant: att.variant, data, session: { id: ses.id, topic: ses.topic, status: ses.status, work_until: ses.work_until, work_started_at: ses.work_started_at }, now: now(), attendance: c.attendance, tasks, total: c.final, bonus: c.bonus, feedback: !!fbk, complete: c.complete };
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
  /* Кездейсоқ жабылған сабақты қайта ашу: ашық сабақ болса, ол жабылады; қатысым мен жұмыстар сақталады */
  if (path === 'sessions' && method === 'GET') {
    const rows = await all(DB.prepare("SELECT s.id, s.topic, s.status, s.created_at, s.work_until, (SELECT COUNT(*) FROM attendance a WHERE a.session_id=s.id) AS att, (SELECT COUNT(DISTINCT student_id) FROM submissions x WHERE x.session_id=s.id) AS subs FROM sessions s ORDER BY s.id DESC LIMIT 25"));
    return json({ ok: true, now: now(), rows: rows.filter(r => r.att > 0) });
  }
  if (path === 'session/reopen' && method === 'POST') {
    const id = Number(b.id), ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(id).first();
    if (!ses) return err('not_found', 404);
    const extra = Math.max(0, Math.min(120, Math.round(Number(b.minutes) || 0))), t = now();
    const until = ses.work_until && extra ? Math.max(ses.work_until, t) + extra * 60 : ses.work_until;
    await DB.prepare("UPDATE sessions SET status='closed' WHERE status='open' AND id!=?").bind(id).run();
    await DB.prepare("UPDATE sessions SET status='open', work_until=? WHERE id=?").bind(until === undefined ? null : until, id).run();
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
    const [atts, subs, ress, bns] = await Promise.all([
      all(DB.prepare('SELECT * FROM attendance WHERE session_id=?').bind(ses.id)),
      all(DB.prepare('SELECT * FROM submissions WHERE session_id=?').bind(ses.id)),
      all(DB.prepare('SELECT * FROM results WHERE session_id=?').bind(ses.id)),
      all(DB.prepare('SELECT student_id, SUM(points) AS n FROM bonus WHERE session_id=? GROUP BY student_id').bind(ses.id))
    ]);
    const guests = await all(DB.prepare('SELECT name, at FROM guests WHERE session_id=? ORDER BY at').bind(ses.id));
    const A = new Map(atts.map(a => [a.student_id, a])), R = new Map(ress.map(r => [r.student_id, r])), BN = new Map(bns.map(r => [r.student_id, r.n]));
    const S = {}; subs.forEach(s => { (S[s.student_id] = S[s.student_id] || []).push(s); });
    groups.forEach(g => g.students.forEach(s => {
      const a = A.get(s.id);
      s.present = !!a; s.joined_at = a ? a.joined_at : null; s.variant = a ? a.variant : null; s.device = a ? !!a.device_id : false; s.manual = a ? !!a.manual : false;
      const c = compute(a, S[s.id] || [], R.get(s.id), BN.get(s.id) || 0, ses.topic);
      s.bonus = c.bonus; s.tasks = {}; [1, 2, 3].forEach(n => { const t = c.tasks[n]; s.tasks[n] = { sent: t.sent, pts: t.pts, max: t.max, pending: !!t.pending, ai_pct: t.ai_pct === undefined ? null : t.ai_pct }; });
      s.total = c.final; s.auto = c.auto; s.ai_pct = c.ai_pct; s.edited = c.edited_total; s.complete = c.complete;
    }));
    return json({ ok: true, now: now(), session: { id: ses.id, topic: ses.topic, code: ses.status === 'open' ? await liveCode(env, ses.id, 0) : '', code_ttl: 600 - (Math.floor(Date.now() / 1000) % 600), status: ses.status, work_until: ses.work_until, work_started_at: ses.work_started_at, created_at: ses.created_at }, groups, guests });
  }

  /* Бір студенттің толық жұмысы */
  if (path === 'work' && method === 'GET') {
    const sid = Number(url.searchParams.get('session')), stu = Number(url.searchParams.get('student'));
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(sid).first();
    const st = await DB.prepare('SELECT s.*, g.name AS gname FROM students s JOIN groups g ON g.id=s.group_id WHERE s.id=?').bind(stu).first();
    if (!ses || !st) return err('not_found', 404);
    const { att, subs, res, bonus } = await loadFor(DB, sid, stu), c = compute(att, subs, res, bonus, ses.topic);
    const x10 = ['10', 'S7', 'A13'].includes(ses.topic), x7 = ses.topic === '7', ex = att && !x10 && !x7 ? variantOf(ses.topic, att.variant) : null, d7 = att && x7 ? desc7(att.variant) : null;
    return json({ ok: true, student: { id: st.id, name: st.full_name, group: st.gname }, session: { id: ses.id, topic: ses.topic }, attendance: att ? { variant: att.variant, joined_at: att.joined_at, manual: !!att.manual } : null,
      sys: d7 ? d7.sys : att && !x10 ? sysText(ses.topic, att.variant) : '', note: d7 ? d7.note : ex ? ex.noteKk : '', result: res || null, calc: c,
      subs: subs.map(s => ({ ...s, payload: JSON.parse(s.payload), signals: s.signals ? JSON.parse(s.signals) : {} })) });
  }
  if (path === 'task_grade' && method === 'POST') {
    const tp = await DB.prepare('SELECT s.topic FROM submissions x JOIN sessions s ON s.id=x.session_id WHERE x.id=?').bind(Number(b.id)).first();
    const sc = (b.score === '' || b.score === null || b.score === undefined) ? null : Math.max(0, Math.min((MAXT[tp ? tp.topic : '6'] || MAX)[Number(b.task)] || 0, Math.round(Number(b.score))));
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
    if (!s) return err('not_found', 404);
    { const t0 = await DB.prepare('SELECT topic FROM sessions WHERE id=?').bind(s.session_id).first(); if (s.task === 3 && !(t0 && t0.topic === '7')) return err('not_found', 404); }
    const ses = await DB.prepare('SELECT * FROM sessions WHERE id=?').bind(s.session_id).first(), att = await DB.prepare('SELECT * FROM attendance WHERE session_id=? AND student_id=?').bind(s.session_id, s.student_id).first();
    const pl = JSON.parse(s.payload), sg = s.signals ? JSON.parse(s.signals) : {};
    if (ses.topic === '7') await gradeCode7(env, DB, s.session_id, s.student_id, ses, att ? att.variant : 1, s.task, pl, sg);
    else if (s.task === 2) await gradeCode(env, DB, s.session_id, s.student_id, ses, att ? att.variant : 1, pl, sg, null);
    else await gradeRow(env, DB, s.session_id, s.student_id, s.task, ses, att ? att.variant : 1, pl, sg, s.auto_score || 0, null);
    return json({ ok: true });
  }
  if (path === 'reopen' && method === 'POST') {
    const old = await DB.prepare('SELECT * FROM submissions WHERE id=?').bind(Number(b.id)).first();
    const ot = old ? await DB.prepare('SELECT topic FROM sessions WHERE id=?').bind(old.session_id).first() : null;
    if (old && ot && ot.topic === '7') await DB.prepare('DELETE FROM submissions WHERE id=?').bind(old.id).run();
    else if (old && ot && ['10', 'S7', 'A13'].includes(ot.topic)) await DB.batch([DB.prepare('DELETE FROM submissions WHERE session_id=? AND student_id=?').bind(old.session_id, old.student_id), DB.prepare('DELETE FROM task_starts WHERE session_id=? AND student_id=?').bind(old.session_id, old.student_id)]);
    else if (old) await DB.batch([DB.prepare('DELETE FROM submissions WHERE id=?').bind(old.id), DB.prepare('DELETE FROM task_starts WHERE session_id=? AND student_id=? AND task=?').bind(old.session_id, old.student_id, old.task)]);
    return json({ ok: true });
  }

  /* Бекіту: ең аз балл алған 10 студент, бонус балл */
  if (path === 'consolidate' && method === 'GET') {
    const ses = await DB.prepare("SELECT * FROM sessions ORDER BY (status='open') DESC, id DESC LIMIT 1").first();
    if (!ses) return json({ ok: true, session: null, low: [], log: [] });
    const [atts, subs, ress, bns, studs, log] = await Promise.all([
      all(DB.prepare('SELECT * FROM attendance WHERE session_id=?').bind(ses.id)), all(DB.prepare('SELECT * FROM submissions WHERE session_id=?').bind(ses.id)),
      all(DB.prepare('SELECT * FROM results WHERE session_id=?').bind(ses.id)), all(DB.prepare('SELECT student_id, SUM(points) AS n FROM bonus WHERE session_id=? GROUP BY student_id').bind(ses.id)),
      all(DB.prepare('SELECT s.id, s.full_name, g.name AS gname FROM students s JOIN groups g ON g.id=s.group_id WHERE s.active=1')),
      all(DB.prepare('SELECT b.id, b.points, b.note, b.at, s.full_name FROM bonus b JOIN students s ON s.id=b.student_id WHERE b.session_id=? ORDER BY b.id DESC').bind(ses.id))
    ]);
    const R = new Map(ress.map(r => [r.student_id, r])), BN = new Map(bns.map(r => [r.student_id, r.n])), S = {}; subs.forEach(s => { (S[s.student_id] = S[s.student_id] || []).push(s); });
    const SN = new Map(studs.map(s => [s.id, s]));
    const rows = atts.filter(a => SN.has(a.student_id)).map(a => { const c = compute(a, S[a.student_id] || [], R.get(a.student_id), BN.get(a.student_id) || 0, ses.topic), st = SN.get(a.student_id); return { id: a.student_id, name: st.full_name, group: st.gname, total: c.final, bonus: c.bonus }; });
    rows.sort((x, y) => x.total - y.total || x.name.localeCompare(y.name, 'kk'));
    return json({ ok: true, session: { id: ses.id, topic: ses.topic, status: ses.status }, present: rows.length, low: rows.slice(0, 10), log });
  }
  if (path === 'bonus' && method === 'POST') {
    const pts = Math.max(0, Math.min(10, Math.round(Number(b.points) || 0)));
    if (!pts) return err('bad_request');
    await DB.prepare('INSERT INTO bonus (session_id, student_id, points, note, at) VALUES (?,?,?,?,?)').bind(Number(b.session_id), Number(b.student_id), pts, String(b.note || '').slice(0, 120), now()).run();
    return json({ ok: true });
  }
  if (path === 'bonus_delete' && method === 'POST') {
    await DB.prepare('DELETE FROM bonus WHERE id=?').bind(Number(b.id)).run();
    return json({ ok: true });
  }
  if (path === 'feedback' && method === 'GET') {
    const ses = await DB.prepare("SELECT * FROM sessions ORDER BY (status='open') DESC, id DESC LIMIT 1").first();
    if (!ses) return json({ ok: true, rows: [], levels: [0, 0, 0, 0, 0], present: 0 });
    const rows = await all(DB.prepare('SELECT f.level, f.learned, f.hard, f.comment, f.at, s.full_name, g.name AS gname FROM feedback f JOIN students s ON s.id=f.student_id JOIN groups g ON g.id=s.group_id WHERE f.session_id=? ORDER BY f.at DESC').bind(ses.id));
    const present = (await DB.prepare('SELECT COUNT(*) AS n FROM attendance WHERE session_id=?').bind(ses.id).first()).n;
    const levels = [0, 0, 0, 0, 0]; rows.forEach(r => { levels[r.level - 1]++; });
    return json({ ok: true, present, levels, rows: rows.map(r => ({ name: r.full_name, group: r.gname, level: r.level, learned: JSON.parse(r.learned || '[]'), hard: r.hard, comment: r.comment, at: r.at })) });
  }

  /* Журнал: студент × тақырып (қатысым + қорытынды) */
  if (path === 'journal' && method === 'GET') {
    const sess = await all(DB.prepare('SELECT * FROM sessions ORDER BY id'));
    const groups = await roster(DB, true);
    const [atts, subs, ress, bns] = await Promise.all([all(DB.prepare('SELECT * FROM attendance')), all(DB.prepare('SELECT * FROM submissions')), all(DB.prepare('SELECT * FROM results')), all(DB.prepare('SELECT session_id, student_id, SUM(points) AS n FROM bonus GROUP BY session_id, student_id'))]);
    const topics = [...new Set(sess.map(s => s.topic))].sort(), latest = {};
    sess.forEach(s => { latest[s.topic] = s; });
    const key = (a, b2) => a + ':' + b2;
    const A = new Map(atts.map(a => [key(a.session_id, a.student_id), a])), R = new Map(ress.map(r => [key(r.session_id, r.student_id), r])), BN = new Map(bns.map(r => [key(r.session_id, r.student_id), r.n]));
    const S = {}; subs.forEach(s => { (S[key(s.session_id, s.student_id)] = S[key(s.session_id, s.student_id)] || []).push(s); });
    groups.forEach(g => g.students.forEach(s => {
      s.scores = {};
      topics.forEach(t => { let best = null; sess.filter(x => x.topic === t).forEach(se => { const k = key(se.id, s.id), c = compute(A.get(k), S[k] || [], R.get(k), BN.get(k) || 0, t); if (!best || c.final > best.c.final || (c.final === best.c.final && se.id > best.se.id)) best = { se, c }; }); const { se, c } = best; s.scores[t] = { attendance: c.attendance, total: c.final, complete: c.complete, session: se.id, sent: [1, 2, 3].filter(n => c.tasks[n].sent).length, edited: c.edited_total }; });   /* бір тақырып бірнеше рет өтсе, студенттің ең жақсы нәтижесі */
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
