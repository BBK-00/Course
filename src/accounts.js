import { safeEqual } from './auth.js';
import { ustazaiTask, runUstazaiTask } from './ustazai-ai.js';
import { studentJournal } from './classes.js';
import { hasLesson, gradeItem, savePractice } from './practice.js';

const cookieName = 'bbk_learner';
const sessionSeconds = 60 * 60 * 24 * 30;
const courseIds = new Set(['python', 'scratch', 'sandyq-adister', 'akt']);
const enc = new TextEncoder();
const hex = bytes => Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
const random = size => hex(crypto.getRandomValues(new Uint8Array(size)));
const sha256 = async value => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))));

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const params = { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' };
  return hex(new Uint8Array(await crypto.subtle.deriveBits(params, key, 256)));
}

function json(value, status = 200, cookie) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(JSON.stringify(value), { status, headers });
}

const failure = (error, status = 400) => json({ ok: false, error }, status);
const cookie = (url, token, seconds) => `${cookieName}=${token}; Path=/api/account; Max-Age=${seconds}; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}`;

async function tokenHash(request) {
  const value = request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? sha256(value) : null;
}

async function viewer(DB, account) {
  if (!account) return { ok: true, account: null, courses: [] };
  const result = await DB.prepare('SELECT course FROM learner_courses WHERE account_id=? ORDER BY enrolled_at, course').bind(account.id).all();
  return { ok: true, account: { name: account.name, email: account.email, ...(account.student_id ? { student: true } : {}) }, courses: result.results.map(row => row.course) };
}

async function limit(DB, scope, now, count) {
  const window = Math.floor(now / 900);
  const row = await DB.prepare(`INSERT INTO learner_attempts(scope, window, attempts) VALUES (?, ?, 1)
    ON CONFLICT(scope) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN min(attempts+1,99) ELSE 1 END, window=excluded.window
    RETURNING attempts`).bind(scope, window).first();
  return row.attempts <= count;
}

/* Оқытушы берген студент аккаунттары: логин (email емес) + пароль. */
export async function setStudentAccount(DB, student, login, password, now = Math.floor(Date.now() / 1000)) {
  const salt = random(24), derived = await passwordHash(password, salt);
  const existing = await DB.prepare('SELECT id FROM learner_accounts WHERE student_id=?').bind(student.id).first();
  if (existing) {
    const taken = await DB.prepare('SELECT id FROM learner_accounts WHERE email=? AND id<>?').bind(login, existing.id).first();
    if (taken) return false;
    await DB.batch([
      DB.prepare('UPDATE learner_accounts SET email=?, name=?, salt=?, password_hash=? WHERE id=?').bind(login, student.full_name, salt, derived, existing.id),
      DB.prepare('DELETE FROM learner_sessions WHERE account_id=?').bind(existing.id)
    ]);
    return true;
  }
  const insert = await DB.prepare('INSERT INTO learner_accounts(id,email,name,salt,password_hash,created_at,student_id) VALUES (?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING')
    .bind(crypto.randomUUID(), login, student.full_name, salt, derived, now, student.id).run();
  return insert.meta.changes > 0;
}

export function removeStudentAccount(DB, studentId) {
  return DB.prepare('DELETE FROM learner_accounts WHERE student_id=?').bind(studentId).run();
}

async function credentials(request, DB, url, path, body, now) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const validId = path === 'login'
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^[a-z0-9._-]{3,40}$/.test(email)
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (email.length > 254 || !validId || password.length < (path === 'login' ? 1 : 8) || password.length > 128) return failure('fields');
  if (path === 'register' && (name.length < 2 || name.length > 80)) return failure('fields');

  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const clientScope = await sha256(`${path}:ip:${ip}`);
  if (!await limit(DB, clientScope, now, path === 'register' ? 60 : 80)) return failure('wait', 429);
  if (path === 'login' && !await limit(DB, await sha256('login:email:' + email), now, 8)) return failure('wait', 429);

  const token = random(32);
  const hash = await sha256(token);
  let account;
  if (path === 'register') {
    account = { id: crypto.randomUUID(), name, email };
    const salt = random(24);
    const derived = await passwordHash(password, salt);
    const [insert] = await DB.batch([
      DB.prepare('INSERT INTO learner_accounts(id,email,name,salt,password_hash,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING')
        .bind(account.id, email, name, salt, derived, now),
      DB.prepare('INSERT INTO learner_sessions(token_hash,account_id,expires_at) SELECT ?,id,? FROM learner_accounts WHERE id=?')
        .bind(hash, now + sessionSeconds, account.id)
    ]);
    if (!insert.meta.changes) return failure('email_taken', 409);
  } else {
    account = await DB.prepare('SELECT * FROM learner_accounts WHERE email=?').bind(email).first();
    const derived = await passwordHash(password, account?.salt || '0'.repeat(48));
    const valid = safeEqual(derived, account?.password_hash || '0'.repeat(64));
    if (!account || !valid) return failure('credentials', 401);
    await DB.prepare('INSERT INTO learner_sessions(token_hash,account_id,expires_at) VALUES (?,?,?)').bind(hash, account.id, now + sessionSeconds).run();
  }
  return json(await viewer(DB, account), path === 'register' ? 201 : 200, cookie(url, token, sessionSeconds));
}

export async function accountApi(request, DB, url, env) {
  const path = url.pathname.slice('/api/account'.length).replace(/^\//, '');
  const now = Math.floor(Date.now() / 1000);
  if (request.method !== 'GET') {
    const origin = request.headers.get('Origin');
    if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return failure('origin', 403);
    if (request.method !== 'POST' || !/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return failure('method', 405);
    let body;
    try {
      const raw = await request.text();
      if (raw.length > (path === 'ustazai' ? 24000 : path === 'practice' ? 9000 : 4096)) return failure('fields', 413);
      body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return failure('fields');
    } catch { return failure('fields'); }
    if (path === 'register' || path === 'login') return credentials(request, DB, url, path, body, now);
    const hash = await tokenHash(request);
    if (path === 'logout') {
      if (hash) await DB.prepare('DELETE FROM learner_sessions WHERE token_hash=?').bind(hash).run();
      return json({ ok: true, account: null, courses: [] }, 200, cookie(url, '', 0));
    }
    if (path === 'ustazai') {
      // Тіркелу міндетті емес: аккаунты жоқ қолданушы IP бойынша шектеледі, барлық сұрауға жалпы шек бар.
      const account = await findAccount(DB, hash, now);
      const task = ustazaiTask(body);
      if (!task) return failure('fields');
      const ip = request.headers.get('CF-Connecting-IP') || 'local';
      const own = account ? await limit(DB, await sha256('ustazai:account:' + account.id), now, 8)
        : await limit(DB, await sha256('ustazai:anon:' + ip), now, 20);
      if (!own || !await limit(DB, await sha256('ustazai:ip:' + ip), now, 60) ||
          !await limit(DB, await sha256('ustazai:all'), now, 600)) return failure('wait', 429);
      try {
        return json({ ok: true, data: await runUstazaiTask(env, task) });
      } catch (error) {
        return failure(error.kind === 'config' ? 'ai_config' : 'ai_unavailable', 503);
      }
    }
    if (path === 'practice') {
      // Өзіндік жаттығу нәтижесі: серверде қайта тексеріліп, тек студент аккаунтына сақталады.
      const account = await findAccount(DB, hash, now);
      if (!account) return failure('auth', 401);
      if (!account.student_id) return failure('not_student', 403);
      const lesson = Number(body.lesson), kind = body.kind, index = Number(body.index);
      if (!hasLesson(lesson) || !['warm', 'code', 'test'].includes(kind) || !Number.isInteger(index) || typeof body.value !== 'string') return failure('fields');
      const scope = kind === 'code' ? 'code' : 'quick';
      if (!await limit(DB, await sha256('practice:' + scope + ':' + account.id), now, scope === 'code' ? 30 : 90)) return failure('wait', 429);
      let graded;
      try { graded = await gradeItem(env, lesson, kind, index, body.value); }
      catch { return failure('runner', 503); }
      if (!graded) return failure('fields');
      await savePractice(DB, account.student_id, lesson, kind, index, graded.points, graded.weight, now);
      return json({ ok: true, points: graded.points, weight: graded.weight });
    }
    if (path !== 'course') return failure('not_found', 404);
    if (!courseIds.has(body.course) || typeof body.saved !== 'boolean') return failure('fields');
    const account = await findAccount(DB, hash, now);
    if (!account) return failure('auth', 401);
    if (body.saved) await DB.prepare('INSERT OR IGNORE INTO learner_courses(account_id,course,enrolled_at) VALUES (?,?,?)').bind(account.id, body.course, now).run();
    else await DB.prepare('DELETE FROM learner_courses WHERE account_id=? AND course=?').bind(account.id, body.course).run();
    return json(await viewer(DB, account));
  }
  if (path === 'journal') {
    const account = await findAccount(DB, await tokenHash(request), now);
    if (!account) return failure('auth', 401);
    if (!account.student_id) return json({ ok: true, journal: null });
    return json({ ok: true, journal: await studentJournal(DB, account.student_id) });
  }
  if (path) return failure('not_found', 404);
  return json(await viewer(DB, await findAccount(DB, await tokenHash(request), now)));
}

function findAccount(DB, hash, now) {
  if (!hash) return null;
  return DB.prepare(`SELECT a.id,a.name,a.email,a.student_id FROM learner_sessions s JOIN learner_accounts a ON a.id=s.account_id
    WHERE s.token_hash=? AND s.expires_at>?`).bind(hash, now).first();
}

export function cleanAccounts(DB, now = Math.floor(Date.now() / 1000)) {
  return DB.batch([
    DB.prepare('DELETE FROM learner_sessions WHERE expires_at<=?').bind(now),
    DB.prepare('DELETE FROM learner_attempts WHERE window<?').bind(Math.floor(now / 900) - 4)
  ]);
}
