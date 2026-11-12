/* Студия: сабақтарды D1-де, суреттерді R2-де сақтау; ашық бет (/c/...) пен мұғалімнің API-ы (teacher/studio/...). */
import { SUBJECT_DIRS, parseIndex, extractItems, applyEdits, sanitizeEdits, htmlToMd, mediaOf } from './studio-pages.js';
import { sanitizeTasks, validateTasks, hasTasks, buildCases, compileDef } from './data-lessons.js';
import { registerData, ensureData, DATA_META } from './data-registry.js';
import { gradeCodeItems, consoleHarness, NEED_MARK } from './py.js';
import { runCode, LANGS } from './runner.js';
import { BUILTIN_SUBJECTS, sanitizeBlocks, lessonPage, listPage, slugify, renderBody, blockText, reviewQuestions } from './studio-render.js';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const err = (code, status = 400, extra) => json({ ok: false, error: code, ...(extra || {}) }, status);
const html = (s, status = 200, cache = 'public, max-age=30') => new Response(s, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache } });
const all = async st => (await st.all()).results || [];
const jparse = (s, d) => { try { const v = JSON.parse(s); return v === null || v === undefined ? d : v; } catch (e) { return d; } };

export const MEDIA_MAX = 600 * 1024;        /* сервер қабылдайтын ең үлкен сурет (клиент ~300 КБ-қа сығады) */
export const MEDIA_DAY = 200;               /* тәулігіне жүктеуге болатын сурет саны */
export const VERSIONS_KEEP = 20;
const MAX_LESSON = 400 * 1024;              /* бір сабақтың JSON көлемі */
const TEMPLATES = {
  theory: [['h', 'Не үйренесің'], ['p', '- Бірінші мақсат\n- Екінші мақсат'], ['h', 'Түсіндіру'], ['p', 'Мұнда теорияны қысқа жаз.'], ['h', 'Мысал'], ['code', 'print("Сәлем")'], ['h', 'Қысқаша қорытынды'], ['p', '- Негізгі ой']],
  blank: []
};
const blocksOf = tpl => {
  const blocks = (TEMPLATES[tpl] || TEMPLATES.blank).map((x, i) => x[0] === 'h' ? { id: 'b' + i, t: 'h', lv: 2, text: x[1] } : x[0] === 'code' ? { id: 'b' + i, t: 'code', code: x[1], cap: '' } : { id: 'b' + i, t: 'p', text: x[1] });
  if (tpl === 'theory') {
    blocks.splice(-2);
    blocks.push({ id: 'review', t: 'steps', section: 'review', items: ['Бүгінгі негізгі ұғымды өз сөзіңмен түсіндір.'] });
    blocks.push({ id: 'summary', t: 'p', section: 'summary', text: '- Негізгі ой' });
  }
  return blocks;
};

/* Сурет байттарынан түрін анықтау (SVG мен басқаларды қабылдамаймыз) */
export function sniffImage(u8) {
  const eq = (o, a) => a.every((v, i) => u8[o + i] === v);
  if (u8.length > 12 && eq(0, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (u8.length > 12 && eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (u8.length > 12 && eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return { mime: 'image/webp', ext: 'webp' };
  if (u8.length > 12 && eq(0, [0x47, 0x49, 0x46, 0x38])) return { mime: 'image/gif', ext: 'gif' };
  return null;
}

async function subjectsOf(DB) {
  const custom = await all(DB.prepare('SELECT id, title, icon, ord FROM subjects ORDER BY ord, rowid'));
  return [...BUILTIN_SUBJECTS.map(s => ({ ...s, builtin: true })), ...custom.map(s => ({ id: s.id, title: s.title, icon: s.icon || '📘', builtin: false }))];
}

/* ---------------- Ашық жол: кіру қажет емес ---------------- */
export async function studioPublic(request, env, url) {
  const DB = env.DB, p = url.pathname;
  if (p === '/api/pub/lessons') {
    const rows = await all(DB.prepare("SELECT id, subject, slug, pub_title AS title, topic_num, published_at FROM lessons WHERE status='published' ORDER BY subject, ord, id")), meta = await all(DB.prepare('SELECT subject, num, title, descr FROM topic_meta'));
    return json({ ok: true, lessons: rows.map(r => ({ ...r, href: '/c/' + r.subject + '/' + r.slug })), meta });
  }
  let m = p.match(/^\/media\/(\d+)$/);
  if (m) {
    if (!env.MEDIA) return new Response('no media', { status: 404 });
    const row = await DB.prepare('SELECT r2_key, mime FROM media WHERE id=?').bind(+m[1]).first();
    if (!row) return new Response('not found', { status: 404 });
    const obj = await env.MEDIA.get(row.r2_key);
    if (!obj) return new Response('not found', { status: 404 });
    return new Response(obj.body, { headers: { 'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (p === '/c' || p === '/c/') {
    const subs = await subjectsOf(DB), rows = await all(DB.prepare("SELECT subject, COUNT(*) n FROM lessons WHERE status='published' GROUP BY subject")), cnt = Object.fromEntries(rows.map(r => [r.subject, r.n]));
    return html(listPage('Жаңа сабақтар', 'Мұғалім студиядан жасаған ашық сабақтар.', subs.filter(s => cnt[s.id]).map(s => ({ href: '/c/' + s.id, icon: s.icon, title: s.title, sub: cnt[s.id] + ' сабақ' })), '/'));
  }
  m = p.match(/^\/c\/([\w-]+)\/?$/);
  if (m) {
    const sub = (await subjectsOf(DB)).find(s => s.id === m[1]); if (!sub) return html('<h1>Табылмады</h1>', 404, 'no-store');
    const rows = await all(DB.prepare("SELECT slug, pub_title AS title FROM lessons WHERE subject=? AND status='published' ORDER BY ord, id").bind(sub.id));
    return html(listPage(sub.title, '', rows.map((r, i) => ({ href: '/c/' + sub.id + '/' + r.slug, icon: String(i + 1), title: r.title })), sub.path || '/c'));
  }
  m = p.match(/^\/c\/([\w-]+)\/([\w-]+)\/?$/);
  if (m) {
    const sub = (await subjectsOf(DB)).find(s => s.id === m[1]);
    const l = sub && await DB.prepare("SELECT id, pub_title, pub_blocks, pub_tasks FROM lessons WHERE subject=? AND slug=? AND status='published'").bind(sub.id, m[2]).first();
    if (!l) return html(listPage('Сабақ табылмады', 'Сілтеме ескірген немесе сабақ жасырылған.', [], '/c'), 404, 'no-store');
    const td = jparse(l.pub_tasks, null), withT = td && td.tasks && hasTasks(td);
    return html(lessonPage({ title: l.pub_title, blocks: jparse(l.pub_blocks, []) }, { subject: sub, task: withT ? { topic: 'D' + l.id, items: td.tasks.filter(x => x.items.length).map(x => ({ title: x.title, minutes: x.minutes })), hw: td.hw } : null }));
  }
  return null;
}

/* Бар сабақ беттері: тек пән бетінде «ашық» деп көрсетілген беттерге рұқсат */
async function pageHtml(env, request, p) {
  const m = String(p).match(/^\/(python|scratch|sandyq-adister|akt)\/([\w-]+)$/); if (!m || m[2] === 'index') return null;
  const idx = await env.ASSETS.fetch(new Request(new URL('/' + m[1] + '/', request.url)));
  if (!idx.ok || !parseIndex(await idx.text(), m[1]).some(t => t.path === p)) return null;
  const res = await env.ASSETS.fetch(new Request(new URL(p, request.url)));
  return res.ok ? await res.text() : null;
}
/* Бар сабақ бетін студиядағы өңдеулермен беру (өңдеу жоқ болса, бет өзгеріссіз беріледі) */
export async function servePage(request, env, url) {
  const row = await env.DB.prepare('SELECT edits FROM page_edits WHERE path=?').bind(url.pathname).first();
  if (!row) return null;
  const res = await env.ASSETS.fetch(request);
  if (!res.ok || !/text\/html/.test(res.headers.get('content-type') || '')) return res;
  const headers = new Headers(res.headers); headers.delete('content-length'); headers.set('Cache-Control', 'no-cache');
  return new Response(applyEdits(await res.text(), jparse(row.edits, null)), { status: 200, headers });
}

/* Эталон шешімдер өз тест жағдайларынан толық өтуі керек (бір Judge0 сұранысы). Қателі код (fix) толық өтіп кетпеуі керек: ескерту. */
export async function checkTasks(env, d) {
  const jobs = [];
  d.tasks.forEach((t, ti) => t.items.forEach((x, ii) => { if (x.k === 'quiz' || x.k === 'short') return; const cases = buildCases(x.cases), where = (ti + 1) + '-тапсырма, ' + (ii + 1) + '-есеп';
    jobs.push({ where, kind: 'ref', item: { cases, hints: {}, skills: ['logic'] }, code: x.ref }); if (x.k === 'fix' && x.starter.trim()) jobs.push({ where, kind: 'starter', item: { cases, hints: {}, skills: ['logic'] }, code: x.starter }); }));
  if (!jobs.length) return { failed: [], warns: [], infra: false };
  const graded = await gradeCodeItems(src => runCode(env, 'python', src, ''), jobs.map(j => ({ item: j.item, code: j.code })));
  if (graded.some(g => g.infra)) return { failed: [], warns: [], infra: true };
  const failed = [], warns = [];
  graded.forEach((g, i) => { const j = jobs[i];
    if (j.kind === 'ref' && g.frac < 1) failed.push(j.where + ': эталон шешім ' + g.passed + '/' + g.total + ' тестен өтті. Күтілетін шығаруды не эталонды тексер.' + (g.cases.find(c => !c.ok) ? ' Мысалы, енгізу «' + (g.cases.find(c => !c.ok).in || []).join('; ') + '», шықты «' + (g.cases.find(c => !c.ok).got || g.cases.find(c => !c.ok).err || 'ештеңе') + '».' : ''));
    if (j.kind === 'starter' && g.frac >= 1) warns.push(j.where + ': қателі код барлық тестен өтіп тұр, яғни қате жоқ сияқты.'); });
  return { failed, warns, infra: false };
}

/* ---------------- Мұғалім API-ы (teacher/studio/...) ---------------- */
async function snapshot(DB, l, label) {
  await DB.batch([
    DB.prepare('INSERT INTO lesson_versions (lesson_id, ver, title, blocks, tasks, label, at) SELECT ?,COALESCE(MAX(ver),0)+1,?,?,?,?,? FROM lesson_versions WHERE lesson_id=?')
      .bind(l.id, l.title, l.blocks, l.tasks || '[]', label || '', Date.now(), l.id),
    DB.prepare('DELETE FROM lesson_versions WHERE lesson_id=? AND ver <= (SELECT MAX(ver)-? FROM lesson_versions WHERE lesson_id=?)')
      .bind(l.id, VERSIONS_KEEP, l.id)
  ]);
}
const tasksOf = r => sanitizeTasks(jparse(r.tasks, null));
const lessonOut = (r, full) => ({ id: r.id, topic_num: r.topic_num || null, subject: r.subject, slug: r.slug, title: r.title, status: r.status, updated_at: r.updated_at, published_at: r.published_at, ord: r.ord, dirty: r.status === 'published' && r.updated_at > (r.published_at || 0), ...(full ? { blocks: jparse(r.blocks, []), tasks: tasksOf(r), cfg: jparse(r.cfg, null) } : {}) });

export async function studioTeacher(path, method, b, request, env) {
  const DB = env.DB;
  if (path === 'run' && method === 'POST') {
    const code = String(b.code || '');
    const language = String(b.language || 'python');
    if (!code.trim() || code.length > 6000 || !LANGS.includes(language)) return err('bad_code');
    const inputs = (Array.isArray(b.inputs) ? b.inputs : []).slice(0, 16).map(value => String(value).slice(0, 150));
    const source = language === 'python' ? consoleHarness(code, inputs) : code;
    const result = await runCode(env, language, source, inputs.join('\n'));
    if (result.infra) return err('unavailable', 503);
    const need = result.stderr.includes(NEED_MARK);
    return json({ ok: true, run: { stdout: result.stdout, stderr: result.stderr.replace(NEED_MARK, ''), need } });
  }
  if (path === 'list' && method === 'GET') {
    const rows = await all(DB.prepare('SELECT id, subject, slug, title, status, updated_at, published_at, ord, topic_num FROM lessons ORDER BY subject, ord, id'));
    return json({ ok: true, subjects: await subjectsOf(DB), lessons: rows.map(r => lessonOut(r)), r2: !!env.MEDIA });
  }
  if (path === 'topics' && method === 'GET') {   /* пәннің бас бетіндегі барлық тақырып + студия күйі */
    const sid = new URL(request.url).searchParams.get('subject');
    const lessons = await all(DB.prepare('SELECT id, title, status, updated_at, published_at, topic_num FROM lessons WHERE subject=? ORDER BY ord, id').bind(sid));
    let topics = [];
    if (SUBJECT_DIRS.includes(sid)) {
      const res = await env.ASSETS.fetch(new Request(new URL('/' + sid + '/', request.url)));
      topics = parseIndex(res.ok ? await res.text() : '', sid);
    }
    const meta = Object.fromEntries((await all(DB.prepare('SELECT num, title, descr FROM topic_meta WHERE subject=?').bind(sid))).map(m => [m.num, m]));
    const edited = new Set((await all(DB.prepare('SELECT path FROM page_edits WHERE path LIKE ?').bind('/' + sid + '/%'))).map(r => r.path));
    const linked = new Set();
    const out = topics.map(t => {
      const m = meta[t.num] || {}, l = lessons.find(x => x.topic_num === t.num); if (l) linked.add(l.id);
      return { num: t.num, title: m.title || t.title, descr: m.descr === undefined || m.descr === null ? t.descr : m.descr, section: t.section, state: l && (!t.open || t.fallback) ? 'studio' : t.open ? 'code' : 'empty', path: t.path, edited: t.open && edited.has(t.path), customTitle: !!m.title, lesson: l ? { id: l.id, title: l.title, status: l.status, dirty: l.status === 'published' && l.updated_at > (l.published_at || 0) } : null };
    });
    return json({ ok: true, topics: out, extra: lessons.filter(l => !linked.has(l.id)).map(l => ({ id: l.id, title: l.title, status: l.status, dirty: l.status === 'published' && l.updated_at > (l.published_at || 0) })) });
  }
  if (path === 'topic/save' && method === 'POST') {
    const sid = String(b.subject || ''), num = +b.num; if (!sid || !(num > 0)) return err('bad');
    await DB.prepare('INSERT INTO topic_meta (subject, num, title, descr) VALUES (?,?,?,?) ON CONFLICT(subject, num) DO UPDATE SET title=excluded.title, descr=excluded.descr').bind(sid, num, String(b.title || '').trim().slice(0, 160) || null, b.descr === undefined || b.descr === null ? null : String(b.descr).slice(0, 400)).run();
    return json({ ok: true });
  }
  if (path === 'page' && method === 'GET') {   /* бар сабақ бетінің өңделетін мәтіндері */
    const p = new URL(request.url).searchParams.get('path') || '', html = await pageHtml(env, request, p); if (html === null) return err('not_found', 404);
    const row = await DB.prepare('SELECT edits FROM page_edits WHERE path=?').bind(p).first(), ed = row ? jparse(row.edits, null) : null;
    const items = extractItems(html).map(x => { const e = ed && ed.items && ed.items[x.i]; const used = e && e.o === x.inner; if (x.media) { const cur = used ? mediaOf(e.h) : x.media; return { i: x.i, kind: x.kind, section: x.section, editable: true, media: cur, orig: x.media }; } return { i: x.i, kind: x.kind, section: x.section, editable: x.editable, orig: x.md, md: used ? htmlToMd(e.h) : x.md }; });
    return json({ ok: true, items, extra: ed && ed.extra ? ed.extra : [] });
  }
  if (path === 'page/save' && method === 'POST') {
    const p = String(b.path || ''), html = await pageHtml(env, request, p); if (html === null) return err('not_found', 404);
    const e = sanitizeEdits(html, b);
    if (!Object.keys(e.items).length && !e.extra.length) await DB.prepare('DELETE FROM page_edits WHERE path=?').bind(p).run();
    else await DB.prepare('INSERT INTO page_edits (path, edits, updated_at) VALUES (?,?,?) ON CONFLICT(path) DO UPDATE SET edits=excluded.edits, updated_at=excluded.updated_at').bind(p, JSON.stringify(e), Date.now()).run();
    return json({ ok: true, changed: Object.keys(e.items).length, extra: e.extra.length });
  }
  if (path === 'page/render' && method === 'POST') {
    const p = String(b.path || ''), html = await pageHtml(env, request, p); if (html === null) return err('not_found', 404);
    const preview = applyEdits(html, sanitizeEdits(html, b)).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
    return json({ ok: true, html: preview.replace(/<head>/i, '<head><base href="' + p.replace(/[^/]+$/, '') + '">') });
  }
  if (path === 'subject' && method === 'POST') {
    const title = String(b.title || '').trim().slice(0, 60); if (!title) return err('title');
    let id = slugify(title); if ((await subjectsOf(DB)).some(s => s.id === id)) id += '-' + Math.floor(Math.random() * 900 + 100);
    await DB.prepare('INSERT INTO subjects (id, title, icon, ord) VALUES (?,?,?,?)').bind(id, title, String(b.icon || '📘').slice(0, 4), Date.now() % 100000).run();
    return json({ ok: true, id });
  }
  if (path === 'subject/del' && method === 'POST') {
    const n = await DB.prepare('SELECT COUNT(*) n FROM lessons WHERE subject=?').bind(String(b.id)).first();
    if (n && n.n) return err('not_empty');
    await DB.prepare('DELETE FROM subjects WHERE id=?').bind(String(b.id)).run(); return json({ ok: true });
  }
  if (path === 'lesson/new' && method === 'POST') {
    const sub = (await subjectsOf(DB)).find(s => s.id === b.subject); if (!sub) return err('subject');
    const source = b.copy ? await DB.prepare('SELECT blocks,tasks FROM lessons WHERE id=?').bind(+b.copy).first() : null;
    if (b.copy && !source) return err('not_found', 404);
    const title = String(b.title || 'Жаңа сабақ').trim().slice(0, 120) || 'Жаңа сабақ', t = Date.now();
    const topic = Number.isInteger(b.topic_num) && b.topic_num > 0 && !source ? b.topic_num : null;
    const ord = await DB.prepare('SELECT COALESCE(MAX(ord),0)+1 o FROM lessons WHERE subject=?').bind(sub.id).first();
    const r = await DB.prepare('INSERT INTO lessons (subject, slug, title, status, blocks, tasks, ord, created_at, updated_at, topic_num) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ? IS NULL OR NOT EXISTS(SELECT 1 FROM lessons WHERE subject=? AND topic_num=?) RETURNING id')
      .bind(sub.id, 'tmp-' + crypto.randomUUID(), title, 'draft', source?.blocks || JSON.stringify(blocksOf(b.template)), source?.tasks || '[]', ord ? ord.o : 1, t, t, topic, topic, sub.id, topic).first();
    if (!r) {
      const existing = await DB.prepare('SELECT id FROM lessons WHERE subject=? AND topic_num=? ORDER BY id LIMIT 1').bind(sub.id, topic).first();
      return existing ? json({ok:true,id:existing.id,existing:true}) : err('conflict', 409);
    }
    const id = r.id; await DB.prepare('UPDATE lessons SET slug=? WHERE id=?').bind(slugify(title) + '-' + id, id).run();
    return json({ ok: true, id });
  }
  if (path === 'lesson' && method === 'GET') {
    const r = await DB.prepare('SELECT * FROM lessons WHERE id=?').bind(+new URL(request.url).searchParams.get('id')).first();
    return r ? json({ ok: true, lesson: lessonOut(r, true) }) : err('not_found', 404);
  }
  if (path === 'lesson/save' && method === 'POST') {
    const l = await DB.prepare('SELECT * FROM lessons WHERE id=?').bind(+b.id).first(); if (!l) return err('not_found', 404);
    if (!b.force && b.base && l.updated_at > +b.base) return err('conflict', 409, { updated_at: l.updated_at });
    const blocks = JSON.stringify(sanitizeBlocks(b.blocks)), title = String(b.title === undefined ? l.title : b.title).trim().slice(0, 120) || 'Атаусыз сабақ';
    if (blocks.length > MAX_LESSON) return err('too_big');
    const tasks = b.tasks === undefined ? l.tasks : JSON.stringify(sanitizeTasks(b.tasks));
    if (tasks.length > MAX_LESSON) return err('too_big');
    const t = Math.max(Date.now(), l.updated_at + 1);
    const updated = await DB.prepare('UPDATE lessons SET title=?, blocks=?, tasks=?, updated_at=? WHERE id=? AND updated_at=? RETURNING id')
      .bind(title, blocks, tasks, t, l.id, l.updated_at).first();
    if (!updated) return err('conflict', 409);
    const lastV = await DB.prepare('SELECT MAX(at) a FROM lesson_versions WHERE lesson_id=?').bind(l.id).first();
    if (!b.autosave || !lastV?.a || t - lastV.a > 10 * 60 * 1000) await snapshot(DB, l, b.autosave ? 'Автосақтау' : String(b.label || '').slice(0, 60));
    return json({ ok: true, updated_at: t });
  }
  if (path === 'lesson/publish' && method === 'POST') {
    const l = await DB.prepare('SELECT * FROM lessons WHERE id=?').bind(+b.id).first(); if (!l) return err('not_found', 404);
    if (b.publish === false) { await DB.prepare("UPDATE lessons SET status='hidden' WHERE id=?").bind(l.id).run(); return json({ ok: true, status: 'hidden' }); }
    const blocks = jparse(l.blocks, []);
    if (blocks.some(block => block.t === 'img' && !block.media || block.t === 'yt' && !block.vid))
      return err('media_missing', 422);
    const td = tasksOf(l), withTasks = hasTasks(td);
    if (!withTasks && !blocks.some(x => x.t !== 'hr' && (blockText(x).trim() || x.code?.trim() || x.media || x.vid || x.rows?.flat().some(Boolean) || x.items?.some(Boolean)))) return err('empty');
    const pubTasks = withTasks ? JSON.stringify(td) : '[]';
    const used = await DB.prepare('SELECT 1 FROM sessions WHERE topic=? LIMIT 1').bind('D' + l.id).first();
    if (used && (l.pub_tasks || '[]') !== pubTasks) return err('used_tasks', 409);
    if (td.tasks.length || td.hw.on) {
      const problems = validateTasks(td); if (problems.length) return err('invalid', 422, { problems });
      const chk = await checkTasks(env, td); if (chk.failed.length) return err('ref_fail', 422, { problems: chk.failed });
      if (chk.infra) return err('unavailable', 503);
    }
    const t = Date.now();
    const published = await DB.prepare("UPDATE lessons SET status='published', pub_title=?, pub_blocks=?, pub_tasks=?, published_at=? WHERE id=? AND updated_at=? AND (COALESCE(pub_tasks,'[]')=? OR NOT EXISTS(SELECT 1 FROM sessions WHERE topic=?)) RETURNING id")
      .bind(l.title, l.blocks, pubTasks, Math.max(t, l.updated_at), l.id, l.updated_at, pubTasks, 'D' + l.id).first();
    if (!published) return err('conflict', 409);
    await snapshot(DB, l, 'Жарияланды');
    if (withTasks) registerData({ id: l.id, subject: l.subject, slug: l.slug, title: l.title, pub_title: l.title }, td);
    return json({ ok: true, status: 'published', published_at: t, url: '/c/' + l.subject + '/' + l.slug, tasks: withTasks });
  }
  if (path === 'lesson/check' && method === 'POST') {   /* эталон шешімдер өз тесттерінен өте ме */
    const l = await DB.prepare('SELECT tasks FROM lessons WHERE id=?').bind(+b.id).first(); if (!l) return err('not_found', 404);
    const d = b.tasks ? sanitizeTasks(b.tasks) : tasksOf(l), problems = validateTasks(d), chk = problems.length ? { failed: [], infra: false, warns: [] } : await checkTasks(env, d);
    return json({ ok: true, problems, failed: chk.failed, warns: chk.warns, infra: chk.infra });
  }
  if (path === 'datalessons' && method === 'GET') {   /* оқытушы панелі үшін: тапсырмасы бар жарияланған сабақтар */
    await ensureData(DB, true);
    const rows = await all(DB.prepare("SELECT id, subject, slug, status, topic_num, pub_blocks FROM lessons WHERE pub_tasks IS NOT NULL AND pub_tasks != '[]' AND pub_tasks != ''")), subs = await subjectsOf(DB);
    return json({ ok: true, lessons: rows.map(r => { const m = DATA_META['D' + r.id]; return m ? { topic: 'D' + r.id, id: r.id, n: r.topic_num, subject: r.subject, subjectTitle: (subs.find(x => x.id === r.subject) || {}).title, status: r.status, title: m.title, path: '/c/' + r.subject + '/' + r.slug, noHw: m.def.noHw, withHw: m.def.withHw, minutes: m.def.minutes, titles: m.def.titles, hw: m.hw, questions: reviewQuestions(jparse(r.pub_blocks, [])) } : null; }).filter(Boolean) });
  }
  if (path === 'lesson/move' && method === 'POST') {
    const sub = (await subjectsOf(DB)).find(s => s.id === b.subject); if (!sub) return err('subject');
    await DB.prepare('UPDATE lessons SET subject=? WHERE id=?').bind(sub.id, +b.id).run(); return json({ ok: true });
  }
  if (path === 'lesson/order' && method === 'POST') {
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Boolean).slice(0, 200);
    await DB.batch(ids.map((id, i) => DB.prepare('UPDATE lessons SET ord=? WHERE id=?').bind(i + 1, id))); return json({ ok: true });
  }
  if (path === 'lesson/del' && method === 'POST') {
    const used = await DB.prepare('SELECT COUNT(*) n FROM sessions WHERE topic=?').bind('D' + (+b.id)).first();
    if (used && used.n) return err('has_sessions', 409, { n: used.n });
    await DB.batch([DB.prepare('DELETE FROM lesson_versions WHERE lesson_id=?').bind(+b.id), DB.prepare('DELETE FROM lessons WHERE id=?').bind(+b.id)]); return json({ ok: true });
  }
  if (path === 'versions' && method === 'GET') {
    const rows = await all(DB.prepare('SELECT ver, title, label, at FROM lesson_versions WHERE lesson_id=? ORDER BY ver DESC').bind(+new URL(request.url).searchParams.get('id')));
    return json({ ok: true, versions: rows });
  }
  if (path === 'restore' && method === 'POST') {
    const v = await DB.prepare('SELECT * FROM lesson_versions WHERE lesson_id=? AND ver=?').bind(+b.id, +b.ver).first(); if (!v) return err('not_found', 404);
    const l = await DB.prepare('SELECT * FROM lessons WHERE id=?').bind(+b.id).first(); if (!l) return err('not_found', 404);
    if (b.base !== undefined && l.updated_at !== Number(b.base)) return err('conflict', 409);
    const t = Math.max(Date.now(), l.updated_at + 1);
    const restored = await DB.prepare('UPDATE lessons SET title=?, blocks=?, tasks=?, updated_at=? WHERE id=? AND updated_at=? RETURNING id')
      .bind(v.title, v.blocks, v.tasks || '[]', t, l.id, l.updated_at).first();
    if (!restored) return err('conflict', 409);
    await snapshot(DB, l, 'Қалпына келтірер алдында');
    return json({ ok: true, updated_at: t });
  }
  if (path === 'render' && method === 'POST') {   /* жарияламай алдын ала қарау: сервер сол генераторды қолданады */
    const blocks = sanitizeBlocks(b.blocks), sub = (await subjectsOf(DB)).find(s => s.id === b.subject) || { id: '', title: 'Сабақ' };
    const td = b.tasks ? sanitizeTasks(b.tasks) : null;
    const def = td && hasTasks(td) ? compileDef(td) : null;
    const points = def && (td.hw.on ? def.withHw : def.noHw);
    const task = def ? {
      items: td.tasks.filter(x => x.items.length).map((x, i) => ({ title: x.title, minutes: x.minutes, points: points[i + 1] })),
      hw: td.hw
    } : null;
    return json({ ok: true, html: lessonPage({ title: String(b.title || ''), blocks }, { subject: sub, preview: true, section: b.section, task }) });
  }
  if (path === 'media' && method === 'POST') {   /* дене = сурет байттары (клиент WebP-ке сығады) */
    if (!env.MEDIA) return err('no_r2', 503);
    if (+request.headers.get('Content-Length') > MEDIA_MAX) return err('too_big', 413, { max: MEDIA_MAX });
    const buf = new Uint8Array(await request.arrayBuffer());
    if (!buf.length) return err('empty');
    if (buf.length > MEDIA_MAX) return err('too_big', 413, { max: MEDIA_MAX });
    const kind = sniffImage(buf); if (!kind) return err('bad_type', 415);
    const day = await DB.prepare('SELECT COUNT(*) n FROM media WHERE created_at > ?').bind(Date.now() - 86400000).first();
    if (day && day.n >= MEDIA_DAY) return err('quota', 429);
    const key = 'm/' + crypto.randomUUID() + '.' + kind.ext;
    let alt = request.headers.get('X-Alt') || '';
    try { alt = decodeURIComponent(alt); } catch {}
    alt = alt.slice(0, 200);
    await env.MEDIA.put(key, buf, { httpMetadata: { contentType: kind.mime } });
    const r = await DB.prepare('INSERT INTO media (r2_key, mime, bytes, alt, created_at) VALUES (?,?,?,?,?)').bind(key, kind.mime, buf.length, alt, Date.now()).run();
    return json({ ok: true, id: r.meta.last_row_id, url: '/media/' + r.meta.last_row_id, bytes: buf.length });
  }
  return null;
}
export { renderBody };
