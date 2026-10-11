/* HMAC токендер (WebCrypto). Кілт — TEACHER_PASSWORD негізінде; студент және оқытушы токендері бөлек. */
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function key(env) {
  const secret = env.TEACHER_PASSWORD;
  if (!secret) throw new Error('no_password');
  return crypto.subtle.importKey('raw', enc.encode('bbk-courses|' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function sign(env, payload, ttlSec) {
  const body = b64(enc.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })));
  const sig = b64(await crypto.subtle.sign('HMAC', await key(env), enc.encode(body)));
  return body + '.' + sig;
}
export async function verify(env, token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    if (!(await crypto.subtle.verify('HMAC', await key(env), unb64(sig), enc.encode(body)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64(body)));
    return p.exp > Date.now() / 1000 ? p : null;
  } catch (e) { return null; }
}
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
export const bearer = req => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
