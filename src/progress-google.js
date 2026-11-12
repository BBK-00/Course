const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const encodeJson = value => encode(new TextEncoder().encode(JSON.stringify(value)));

export function sheetSource(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  const match = url.pathname.match(/^\/spreadsheets\/d\/([\w-]{10,150})\/edit\/?$/);
  if (url.origin !== 'https://docs.google.com' || !match) return null;
  const gid = new URLSearchParams(url.hash.slice(1)).get('gid') ?? url.searchParams.get('gid');
  if (gid === null || !/^\d{1,10}$/.test(gid) || Number(gid) > 2147483647) return null;
  return { id: match[1], gid: Number(gid), url: 'https://docs.google.com/spreadsheets/d/' + match[1] + '/edit?gid=' + Number(gid) };
}

async function accessToken(raw) {
  const account = JSON.parse(raw);
  const pkcs8 = Uint8Array.from(atob(account.private_key.replace(/-----[^-]+-----|\s+/g, '')), c => c.charCodeAt(0));
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  const key = await crypto.subtle.importKey('pkcs8', pkcs8, algorithm, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const claim = encodeJson({ alg: 'RS256', typ: 'JWT' }) + '.' + encodeJson({
    iss: account.client_email, scope: SHEETS_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 600
  });
  const signature = await crypto.subtle.sign(algorithm.name, key, new TextEncoder().encode(claim));
  const response = await fetch(TOKEN_URL, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: claim + '.' + encode(new Uint8Array(signature)) })
  });
  if (!response.ok) throw new Error('sheet_auth');
  const data = await response.json();
  if (!data.access_token) throw new Error('sheet_auth');
  return data.access_token;
}

export async function readGoogleJournal(env, source) {
  const token = await accessToken(env.GOOGLE_SHEETS_SERVICE_ACCOUNT);
  const base = 'https://sheets.googleapis.com/v4/spreadsheets/' + source.id;
  const get = async suffix => {
    const response = await fetch(base + suffix, {
      headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(10000)
    });
    if (response.status === 401 || response.status === 403 || response.status === 404) throw new Error('sheet_access');
    if (!response.ok) throw new Error('sheet_unavailable');
    return response.json();
  };
  const book = await get('?fields=sheets(properties(sheetId,title,gridProperties)');
  const tab = book.sheets?.find(s => s.properties.sheetId === source.gid)?.properties;
  if (!tab) throw new Error('sheet_tab');
  const width = Math.min(tab.gridProperties?.columnCount || 1, 156);
  let letters = '';
  for (let col = width; col; col = Math.floor((col - 1) / 26)) letters = String.fromCharCode(65 + (col - 1) % 26) + letters;
  const range = "'" + tab.title.replace(/'/g, "''") + "'!A1:" + letters + Math.min(tab.gridProperties?.rowCount || 1, 350);
  const data = await get('/values/' + encodeURIComponent(range) + '?valueRenderOption=FORMATTED_VALUE');
  return data.values || [];
}
