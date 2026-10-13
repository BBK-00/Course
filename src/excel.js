/* АКТ · 10-тақырып: әр студентке жеке Excel файл жасау және жүктелгенін тексеру (3 лист, 60 балл). */
import { buildXlsx, readXlsx, colName, colIdx, addr, ST } from './xlsx.js';

const enc = new TextEncoder();
export const SHEET_MAX = { 1: 15, 2: 20, 3: 25 };
export const SHEET_TITLE = { 1: '1-лист · Оңай', 2: '2-лист · Орташа', 3: '3-лист · Күрделі' };

/* Студент пен сабаққа байланысты жеке сандар (әр жүктегенде бірдей) */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const GOODS = ['Дәптер', 'Қалам', 'Қарындаш', 'Өшіргіш', 'Сызғыш', 'Қайшы', 'Желім', 'Альбом', 'Бояу', 'Папка', 'Маркер', 'Калькулятор', 'Рюкзак', 'Флешка', 'Тышқан', 'Құлаққап'];
const NAMES = ['Айдар', 'Асел', 'Бекзат', 'Дана', 'Ерлан', 'Жанна', 'Мадина', 'Нұрлан'];

export function dataFor(st, ses) {
  const R = rng((st * 7919 + ses * 104729 + 977) >>> 0), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const shuf = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = ri(0, i); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const g1 = shuf(GOODS).slice(0, 10).map(name => ({ name, price: ri(4, 100) * 50, qty: ri(5, 60), del: ri(2, 15) * 10 }));
  const disc = [0.05, 0.1, 0.15, 0.2][ri(0, 3)], vat = 0.12;
  const g2 = shuf(GOODS).slice(0, 8).map(name => ({ name, price: ri(20, 200) * 50 }));
  const fin = g2.map(g => g.price * (1 - disc) * (1 + vat)).sort((a, b) => a - b);
  const thr2 = Math.round((fin[3] + fin[4]) / 2 / 10) * 10 + 0.5;
  const pickN = (lo, hi, n) => shuf(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, n);
  return { s1: g1, s2: { disc, vat, thr: thr2, rows: g2 }, s3: { rm: pickN(2, 19, 8), cm: pickN(2, 19, 8), thr: ri(5, 12) * 10, rates: [0.05, 0.1, 0.15, 0.2], emp: shuf(NAMES).slice(0, 5).map(name => ({ name, sal: ri(30, 80) * 5000 })) } };
}

export async function stampOf(env, st, ses) {
  const secret = String(env.TEACHER_PASSWORD || '').trim(); if (!secret) throw new Error('no_password');
  const k = await crypto.subtle.importKey('raw', enc.encode('bbk-xl|' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode('xl|' + st + '|' + ses)));
  return [...s.slice(0, 5)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ---------- Күтілетін мәндер ---------- */
const LEG = 'Функциялар: СУММ (SUM) · СРЗНАЧ (AVERAGE) · МАКС (MAX) · МИН (MIN) · ЕСЛИ (IF) · СЧЁТЕСЛИ (COUNTIF)';
const SEP = 'Аргумент бөлгіш: орысша Excel-де «;», ағылшынша Excel-де «,» (мысалы СУММ(A1;B1) немесе SUM(A1,B1)).';
const R2 = n => Math.round(n * 100) / 100;

function exp1(D) {
  const rows = D.s1.map(g => { const e = g.price * g.qty, f = g.qty * g.del; return { ...g, e, f, g: e + f }; });
  const G = rows.map(r => r.g);
  return { rows, sumE: rows.reduce((a, r) => a + r.e, 0), sumF: rows.reduce((a, r) => a + r.f, 0), sumG: G.reduce((a, b) => a + b, 0), max: Math.max(...G), min: Math.min(...G), avg: G.reduce((a, b) => a + b, 0) / G.length };
}
function exp2(D) {
  const { disc, vat, thr } = D.s2;
  const rows = D.s2.rows.map(g => { const c = g.price * disc, d = g.price - c, e = d * vat, f = d + e; return { ...g, c, d, e, f, cat: f > thr ? 'Қымбат' : 'Арзан' }; });
  const alt = D.s2.rows.reduce((a, g) => a + g.price * 0.75 * (1 + vat), 0);
  return { rows, sumC: rows.reduce((a, r) => a + r.c, 0), sumF: rows.reduce((a, r) => a + r.f, 0), alt };
}
function exp3(D) {
  const { rm, cm, rates, emp, thr } = D.s3;
  const M = rm.map(a => cm.map(b => a * b)), flat = M.flat();
  const B = emp.map(e => rates.map(r => e.sal * r));
  return { M, sum: flat.reduce((a, b) => a + b, 0), avg: flat.reduce((a, b) => a + b, 0) / flat.length, max: Math.max(...flat), cnt: flat.filter(x => x > thr).length, B, colSum: rates.map((_, j) => B.reduce((a, r) => a + r[j], 0)), bmax: Math.max(...B.flat()) };
}

/* ---------- Файлды құру ---------- */
export function buildFile(D, owner) {
  const sheets = [];
  const mk = (name, widths) => { const sh = { name, widths, cells: [] }; sh.put = (a, v, s) => { sh.cells.push({ a, v, s }); return sh; }; sh.lines = arr => arr.forEach(([r, t, s]) => sh.put('K' + r, t, s || ST.note)); return sh; };
  const W = [34, 15, 15, 15, 17, 17, 17, 15, 15, 3, 110];

  /* 1-лист */
  let s = mk('1-Оңай', W); sheets.push(s);
  s.put('A1', '1-лист · ОҢАЙ · Салыстырмалы сілтеме — дүкен сатылымы', ST.title).put('A2', owner, ST.owner);
  ['Тауар', 'Бағасы (тг)', 'Саны (дана)', 'Жеткізу, 1 дана (тг)', 'Тауар құны', 'Жеткізу ақысы', 'Жалпы сома'].forEach((h, i) => s.put(colName(i) + '4', h, ST.head));
  D.s1.forEach((g, i) => { const r = 5 + i; s.put('A' + r, g.name, ST.text).put('B' + r, g.price, ST.given).put('C' + r, g.qty, ST.given).put('D' + r, g.del, ST.given); ['E', 'F', 'G'].forEach(c => s.put(c + r, null, ST.ans)); });
  s.put('A15', 'Барлығы', ST.label).put('A16', 'Ең үлкен жалпы сома', ST.label).put('A17', 'Ең кіші жалпы сома', ST.label).put('A18', 'Орташа жалпы сома', ST.label);
  ['E', 'F', 'G'].forEach(c => s.put(c + '15', null, ST.ans)); ['16', '17', '18'].forEach(r => s.put('G' + r, null, ST.ans));
  s.lines([[1, '1-ЛИСТ · ОҢАЙ · 15 минут · Тақырып: салыстырмалы сілтеме (A1)', ST.nhead], [2, 'Формуланы ӨЗІҢ жазасың, дайын санды қолмен енгізбе. Сары ұяшықтар — сенің жауабың. Бастапқы сандарды өзгертпе.'], [3, LEG], [4, SEP],
    [6, '1.1  E5 ұяшығына тауар құнын есепте: бағасы × саны. Формуланы E14 ұяшығына дейін төмен көшір.'],
    [7, '1.2  F5 ұяшығына жеткізу ақысын есепте: саны × бір данаға жеткізу. F14 дейін көшір.'],
    [8, '1.3  G5 ұяшығына жалпы соманы тап: тауар құны + жеткізу ақысы. G14 дейін көшір.'],
    [9, '1.4  15-жолда E, F, G бағандарының қосындысын СУММ (SUM) арқылы тап.'],
    [10, '1.5  G16 — ең үлкен МАКС (MAX), G17 — ең кіші МИН (MIN), G18 — орташа СРЗНАЧ (AVERAGE) жалпы сома.'],
    [11, '1.6  Шартты форматтау: G5:G14 аймағында орташадан үлкен мәндерді жасыл түспен белгіле (Басты → Шартты форматтау).'],
    [12, '1.7  A4:G14 кестесін «Жалпы сома» бағаны бойынша кему ретімен сұрыпта (Деректер → Сұрыптау). Формулалар бұзылмауы керек.'],
    [14, 'Файлды .xlsx форматында сақтап, сайтқа жүктеңіз. Файлдың аты мен «ID» жолын өзгертпеңіз.']]);

  /* 2-лист */
  s = mk('2-Орташа', W); sheets.push(s);
  s.put('A1', '2-лист · ОРТАША · Абсолютті сілтеме — жеңілдік пен салық', ST.title).put('A2', owner, ST.owner);
  s.put('A3', 'Жеңілдік, %', ST.label).put('B3', D.s2.disc, ST.pct).put('A4', 'ҚҚС (салық), %', ST.label).put('B4', D.s2.vat, ST.pct).put('A5', 'Қымбат бағаның шегі (тг)', ST.label).put('B5', D.s2.thr, ST.given);
  ['Тауар', 'Бағасы (тг)', 'Жеңілдік сомасы', 'Жеңілдікпен баға', 'Салық сомасы', 'Түпкілікті баға', 'Санаты'].forEach((h, i) => s.put(colName(i) + '7', h, ST.head));
  D.s2.rows.forEach((g, i) => { const r = 8 + i; s.put('A' + r, g.name, ST.text).put('B' + r, g.price, ST.given); ['C', 'D', 'E', 'F', 'G'].forEach(c => s.put(c + r, null, ST.ans)); });
  s.put('A16', 'Барлығы', ST.label).put('C16', null, ST.ans).put('F16', null, ST.ans).put('A18', '25% жеңілдікпен жалпы сома', ST.label).put('B18', null, ST.ans).put('A19', 'Айырма (F16 − B18)', ST.label).put('B19', null, ST.ans);
  s.lines([[1, '2-ЛИСТ · ОРТАША · 20 минут · Тақырып: абсолютті сілтеме ($A$1)', ST.nhead], [2, 'Формуланы ӨЗІҢ жазасың. Тұрақты мәндерді ($ арқылы) бекіту керек: F4 пернесі. B3, B4, B5 мәндерін өзгертпе.'], [3, LEG], [4, SEP],
    [6, '2.1  C8: жеңілдік сомасы = баға × жеңілдік %. Жеңілдік B3 ұяшығында — оны $B$3 деп бекіт. C15 дейін көшір.'],
    [7, '2.2  D8: жеңілдікпен баға = баға − жеңілдік сомасы. D15 дейін көшір.'],
    [8, '2.3  E8: салық сомасы = жеңілдікпен баға × ҚҚС. ҚҚС B4 ұяшығында — оны $B$4 деп бекіт. E15 дейін көшір.'],
    [9, '2.4  F8: түпкілікті баға = жеңілдікпен баға + салық сомасы. F15 дейін көшір.'],
    [10, '2.5  G8: ЕСЛИ (IF) арқылы санатын анықта: түпкілікті баға B5 шегінен жоғары болса «Қымбат», әйтпесе «Арзан». Шек — $B$5. G15 дейін көшір.'],
    [11, '2.6  C16 және F16: жеңілдіктің және түпкілікті бағаның жалпы сомасы — СУММ (SUM).'],
    [12, '2.7  Салыстыру: жеңілдік 25% болса, түпкілікті бағалардың жалпы сомасы қанша болады? B3-ті 0,25 деп өзгертіп F16-ны қара, санды B18-ге жаз, сосын B3-ті бастапқы мәніне қайтар.'],
    [13, '2.8  B19: формула жаз — F16 мен B18 арасындағы айырма (F16 − B18).'],
    [15, 'Файлды .xlsx форматында сақтап, сайтқа жүктеңіз. Файлдың аты мен «ID» жолын өзгертпеңіз.']]);

  /* 3-лист */
  s = mk('3-Күрделі', W); sheets.push(s);
  const { rm, cm, rates, emp, thr } = D.s3;
  s.put('A1', '3-лист · КҮРДЕЛІ · Аралас сілтеме — көбейту және есептеу кестесі', ST.title).put('A2', owner, ST.owner).put('A4', 'Көбейту кестесі', ST.label).put('A5', '×', ST.head);
  cm.forEach((v, j) => s.put(colName(1 + j) + '5', v, ST.head)); rm.forEach((v, i) => { s.put('A' + (6 + i), v, ST.head); for (let j = 0; j < 8; j++) s.put(colName(1 + j) + (6 + i), null, ST.ans); });
  s.put('A15', 'Көбейтінділер қосындысы', ST.label).put('B15', null, ST.ans).put('A16', 'Орташа мәні', ST.label).put('B16', null, ST.ans).put('A17', 'Ең үлкен мәні', ST.label).put('B17', null, ST.ans).put('A18', 'Саны (көбейтінді > ' + thr + ')', ST.label).put('B18', null, ST.ans);
  s.put('A20', 'Үстеме кестесі', ST.label).put('A21', 'Қызметкер', ST.head).put('B21', 'Жалақы (тг)', ST.head); rates.forEach((r, j) => s.put(colName(2 + j) + '21', r, ST.pct));
  emp.forEach((e, i) => { const r = 22 + i; s.put('A' + r, e.name, ST.text).put('B' + r, e.sal, ST.given); for (let j = 0; j < 4; j++) s.put(colName(2 + j) + r, null, ST.ans); });
  s.put('A27', 'Барлығы', ST.label); for (let j = 0; j < 4; j++) s.put(colName(2 + j) + '27', null, ST.ans);
  s.put('A29', 'Ең үлкен үстеме сомасы', ST.label).put('B29', null, ST.ans);
  s.lines([[1, '3-ЛИСТ · КҮРДЕЛІ · 25 минут · Тақырып: аралас сілтеме ($A1, A$1)', ST.nhead], [2, 'Формуланы ӨЗІҢ жазасың. $ белгісі қай жерде тұрса, сол бөлік бекітіледі. Бастапқы сандарды өзгертпе.'], [3, LEG], [4, SEP],
    [6, '3.1  B6: БІР формула жаз — A бағанындағы көбейткіш × 5-жолдағы көбейткіш. Бағанды не жолды $ арқылы бекіт ($A6 және B$5). Сосын B6:I13 аймағын толтыр.'],
    [7, '3.2  B15 — көбейтінділер қосындысы СУММ (SUM), B16 — орташасы СРЗНАЧ (AVERAGE), B17 — ең үлкені МАКС (MAX). Аймақ: B6:I13.'],
    [8, '3.3  B18: мәні ' + thr + '-тен үлкен ұяшықтар саны — СЧЁТЕСЛИ (COUNTIF).'],
    [9, '3.4  C22: үстеме сомасы = жалақы (B бағаны) × үстеме % (21-жол). Бір формуламен C22:F26 аймағын толтыр: $B22 және C$21.'],
    [10, '3.5  C27:F27 — әр үстеме бойынша қосынды, СУММ (SUM).'],
    [11, '3.6  Шартты форматтау: B6:I13 аймағында ' + thr + '-тен үлкен мәндерді қызыл түспен белгіле.'],
    [12, '3.7  B29: C22:F26 аймағындағы ең үлкен үстеме сомасы — МАКС (MAX).'],
    [14, 'Файлды .xlsx форматында сақтап, сайтқа жүктеңіз. Файлдың аты мен «ID» жолын өзгертпеңіз.']]);
  return buildXlsx(sheets);
}

/* ---------- Тексеру ---------- */
const FN = /([A-Z][A-Z0-9.]*)\(/g;
const REFRE = /(?<![A-Za-z0-9_.])(\$?)([A-Z]{1,3})(\$?)(\d{1,7})(?![\dA-Za-z(])/g;
/* Формуланы жасырын түрге келтіреміз: сілтемелер ұяшыққа қатысты (салыстырмалы) немесе бекітілген ($) болып жазылады */
function canon(f, a, loose) {
  const p = addr(a);
  f = String(f).replace(/^=/, '').replace(/"[^"]*"/g, '""').replace(/(?:'[^']*'|[A-Za-z0-9_.]+)!/g, '').replace(/_xlfn\./gi, '').replace(/\s+/g, '').toUpperCase();
  const refs = [...f.matchAll(REFRE)].map(m => loose ? m[2] + m[4] : (m[1] ? '$' + m[2] : 'c' + (colIdx(m[2]) - p.c)) + (m[3] ? '$' + m[4] : 'r' + (+m[4] - p.r)));
  const fns = [...f.matchAll(FN)].map(m => m[1]);
  return refs.sort().join(',') + '|' + fns.sort().join(',');
}
const same = (x, y) => {
  if (x === null || x === undefined || y === null || y === undefined) return false;
  if (typeof y === 'number') { const n = typeof x === 'number' ? x : Number(String(x).replace(',', '.')); return isFinite(n) && Math.abs(n - y) <= 0.01 + Math.abs(y) * 1e-9; }
  return String(x).trim().toLowerCase() === String(y).trim().toLowerCase();
};
/* Бір ұяшық: 0..1. exp = {f, v, val, loose} */
function cellScore(c, a, exp) {
  if (!c || !a) return 0;
  const isF = !!c.f, hasV = c.v !== null && c.v !== undefined;
  if (!isF && !hasV) return 0;
  const vOk = hasV ? same(c.v, exp.v) : null;
  if (exp.val) return vOk || (vOk === null && isF) ? 1 : 0;
  if (!isF) return vOk ? 0.25 : 0;
  const fOk = canon(c.f, a, exp.loose) === canon(exp.f, a, exp.loose);
  return vOk === null ? (fOk ? 1 : 0) : (vOk ? 0.6 : 0) + (fOk ? 0.4 : 0);
}
const inRect = (a, rect) => { const p = addr(a), [x, y] = rect.split(':'), q1 = addr(x), q2 = addr(y || x); return p.c >= q1.c && p.c <= q2.c && p.r >= q1.r && p.r <= q2.r; };
const overlap = (r1, r2) => { const [a, b] = r1.split(':'), [c, d] = r2.split(':'), p = addr(a), q = addr(b || a), s = addr(c), t = addr(d || c); return p.c <= t.c && q.c >= s.c && p.r <= t.r && q.r >= s.r; };

export async function gradeFile(D, buf, stamp) {
  let wb; try { wb = await readXlsx(buf); } catch (e) { return { error: 'bad_file' }; }
  if (wb.length < 3) return { error: 'bad_file' };
  const [w1, w2, w3] = wb, g = (w, a) => w.cells.get(a) || null, val = (w, a) => { const c = g(w, a); return c ? c.v : null; };

  /* Иесі: ID белгісі және бастапқы деректер дәл осы студенттікі болуы керек */
  const ids = wb.slice(0, 3).map(w => { const m = /ID\s+([0-9a-f]{10})/i.exec(String(val(w, 'A2') || '')); return m ? m[1].toLowerCase() : null; });
  if (ids.some(x => x && x !== stamp)) return { error: 'not_yours' };
  let tot = 0, hit = 0; const chk = (a, b) => { tot++; if (same(a, b)) hit++; };
  const rowOf = D.s1.map(gd => { for (let r = 5; r <= 14; r++) if (String(val(w1, 'A' + r)) === gd.name) return r; return 0; });
  D.s1.forEach((gd, i) => { const r = rowOf[i]; tot++; if (r) { hit++; chk(val(w1, 'B' + r), gd.price); chk(val(w1, 'C' + r), gd.qty); chk(val(w1, 'D' + r), gd.del); } else tot += 3; });
  chk(val(w2, 'B3'), D.s2.disc); chk(val(w2, 'B4'), D.s2.vat); chk(val(w2, 'B5'), D.s2.thr);
  D.s2.rows.forEach((gd, i) => { chk(val(w2, 'A' + (8 + i)), gd.name); chk(val(w2, 'B' + (8 + i)), gd.price); });
  D.s3.cm.forEach((v, j) => chk(val(w3, colName(1 + j) + '5'), v)); D.s3.rm.forEach((v, i) => chk(val(w3, 'A' + (6 + i)), v));
  D.s3.emp.forEach((e, i) => { chk(val(w3, 'A' + (22 + i)), e.name); chk(val(w3, 'B' + (22 + i)), e.sal); }); D.s3.rates.forEach((v, j) => chk(val(w3, colName(2 + j) + '21'), v));
  if (hit / tot < 0.7) return { error: 'not_yours' };

  const E1 = exp1(D), E2 = exp2(D), E3 = exp3(D);
  const out = [[], [], []];   /* әр лист: [{id, label, max, got}] */
  const item = (sh, id, label, max, parts) => { const f = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0; out[sh].push({ id, label, max, got: Math.round(max * f * 100) / 100 }); };
  const sc = (w, a, exp) => cellScore(g(w, a), a, exp);

  /* 1-лист */
  const col1 = (key, ltr, fn, label, id) => item(0, id, label, 3, E1.rows.map((r, i) => { const x = rowOf[i]; return x ? sc(w1, ltr + x, { f: fn(x), v: r[key] }) : 0; }));
  col1('e', 'E', x => `B${x}*C${x}`, 'Тауар құны (B×C)', '1.1'); col1('f', 'F', x => `C${x}*D${x}`, 'Жеткізу ақысы (C×D)', '1.2'); col1('g', 'G', x => `E${x}+F${x}`, 'Жалпы сома (E+F)', '1.3');
  item(0, '1.4', 'Қосындылар (СУММ, 15-жол)', 2, [sc(w1, 'E15', { f: 'SUM(E5:E14)', v: E1.sumE, loose: 1 }), sc(w1, 'F15', { f: 'SUM(F5:F14)', v: E1.sumF, loose: 1 }), sc(w1, 'G15', { f: 'SUM(G5:G14)', v: E1.sumG, loose: 1 })]);
  item(0, '1.5', 'МАКС, МИН, СРЗНАЧ', 2, [sc(w1, 'G16', { f: 'MAX(G5:G14)', v: E1.max, loose: 1 }), sc(w1, 'G17', { f: 'MIN(G5:G14)', v: E1.min, loose: 1 }), sc(w1, 'G18', { f: 'AVERAGE(G5:G14)', v: E1.avg, loose: 1 })]);
  item(0, '1.6', 'Шартты форматтау (G5:G14)', 1, [w1.cf.some(r => overlap(r, 'G5:G14')) ? 1 : 0]);
  const seq = []; for (let r = 5; r <= 14; r++) { const i = rowOf.indexOf(r); if (i >= 0) seq.push(E1.rows[i].g); }
  item(0, '1.7', 'Кему ретімен сұрыптау', 1, [seq.length === 10 && seq.every((x, i) => i === 0 || seq[i - 1] >= x) ? 1 : 0]);

  /* 2-лист */
  const col2 = (key, ltr, fn, label, id, max) => item(1, id, label, max, E2.rows.map((r, i) => sc(w2, ltr + (8 + i), { f: fn(8 + i), v: r[key] })));
  col2('c', 'C', x => `B${x}*$B$3`, 'Жеңілдік сомасы ($B$3)', '2.1', 4); col2('d', 'D', x => `B${x}-C${x}`, 'Жеңілдікпен баға', '2.2', 3); col2('e', 'E', x => `D${x}*$B$4`, 'Салық сомасы ($B$4)', '2.3', 4);
  col2('f', 'F', x => `D${x}+E${x}`, 'Түпкілікті баға', '2.4', 3); col2('cat', 'G', x => `IF(F${x}>$B$5,"Қымбат","Арзан")`, 'Санаты (ЕСЛИ, $B$5)', '2.5', 3);
  item(1, '2.6', 'Жалпы қосындылар', 1, [sc(w2, 'C16', { f: 'SUM(C8:C15)', v: E2.sumC, loose: 1 }), sc(w2, 'F16', { f: 'SUM(F8:F15)', v: E2.sumF, loose: 1 })]);
  item(1, '2.7', '25% жеңілдік жауабы', 1, [sc(w2, 'B18', { v: E2.alt, val: 1 })]);
  const b18 = val(w2, 'B18'); item(1, '2.8', 'Айырма (F16 − B18)', 1, [sc(w2, 'B19', { f: 'F16-B18', v: E2.sumF - (typeof b18 === 'number' ? b18 : E2.alt), loose: 1 })]);

  /* 3-лист */
  item(2, '3.1', 'Көбейту кестесі ($A6*B$5)', 10, E3.M.flatMap((row, i) => row.map((v, j) => { const a = colName(1 + j) + (6 + i); return sc(w3, a, { f: `$A${6 + i}*${colName(1 + j)}$5`, v }); })));
  item(2, '3.2', 'Қосынды, орташа, ең үлкен', 3, [sc(w3, 'B15', { f: 'SUM(B6:I13)', v: E3.sum, loose: 1 }), sc(w3, 'B16', { f: 'AVERAGE(B6:I13)', v: E3.avg, loose: 1 }), sc(w3, 'B17', { f: 'MAX(B6:I13)', v: E3.max, loose: 1 })]);
  item(2, '3.3', 'СЧЁТЕСЛИ (COUNTIF)', 2, [sc(w3, 'B18', { f: 'COUNTIF(B6:I13,"x")', v: E3.cnt, loose: 1 })]);
  item(2, '3.4', 'Үстеме кестесі ($B22*C$21)', 6, E3.B.flatMap((row, i) => row.map((v, j) => { const c = colName(2 + j); return sc(w3, c + (22 + i), { f: `$B${22 + i}*${c}$21`, v }); })));
  item(2, '3.5', 'Үстеме қосындылары', 2, E3.colSum.map((v, j) => { const c = colName(2 + j); return sc(w3, c + '27', { f: `SUM(${c}22:${c}26)`, v, loose: 1 }); }));
  item(2, '3.6', 'Шартты форматтау (B6:I13)', 1, [w3.cf.some(r => overlap(r, 'B6:I13')) ? 1 : 0]);
  item(2, '3.7', 'Ең үлкен үстеме', 1, [sc(w3, 'B29', { f: 'MAX(C22:F26)', v: E3.bmax, loose: 1 })]);

  const sheets = out.map(items => ({ items, pts: Math.round(items.reduce((a, b) => a + b.got, 0) * 10) / 10 }));
  return { sheets, match: Math.round(hit / tot * 100) };
}
