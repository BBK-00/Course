/* Scratch 7-тақырып: «Кедергіден өт» ойынын (.sb3) жасанды интеллектсіз, блоктарды талдау арқылы тексеру. Барлығы 60 балл: 3 бөлім 12 / 18 / 30. */
import { unzip } from './xlsx.js';

export const SB_MAX = { 1: 12, 2: 18, 3: 30 };
export const SB_TITLE = { 1: 'Ойыншыны басқару', 2: 'Кедергінің қозғалысы', 3: 'Жеңу/ұтылу, анимация, дыбыс, түсіндіру' };

const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

/* Бір спрайттың блоктарын ыңғайлы қабатқа келтіреміз */
function view(blocks) {
  const B = {}; Object.entries(blocks || {}).forEach(([id, b]) => { if (b && !Array.isArray(b) && b.opcode) B[id] = b; });
  const val = (b, k) => { const i = b.inputs && b.inputs[k]; if (!i) return null; const x = i[1]; if (typeof x === 'string' && B[x]) { const f = B[x].fields && Object.values(B[x].fields)[0]; return f ? f[0] : null; } return Array.isArray(x) ? x[1] : null; };
  const fld = (b, k) => { const f = b.fields && b.fields[k]; return f ? f[0] : null; };
  const sub = (b, k) => { const i = b.inputs && b.inputs[k]; return i && typeof i[1] === 'string' && B[i[1]] ? i[1] : null; };
  /* блоктан бастап барлық ішкі блоктар (келесілер мен ішіндегілері) */
  const all = (id, out = [], seen = new Set()) => { while (id && B[id] && !seen.has(id)) { seen.add(id); const b = B[id]; out.push(b); Object.values(b.inputs || {}).forEach(inp => { for (const x of inp.slice(1)) if (typeof x === 'string' && B[x]) all(x, out, seen); }); id = b.next; } return out; };
  const inner = b => { const o = []; ['SUBSTACK', 'SUBSTACK2'].forEach(k => { const s = sub(b, k); if (s) all(s, o); }); return o; };
  const after = b => (b.next ? all(b.next) : []);
  return { B, list: Object.values(B), val, fld, sub, inner, after, all };
}

export async function gradeSb3(buf, explain) {
  let files;
  try { files = await unzip(buf, n => n === 'project.json'); } catch (e) { return { error: 'bad_file' }; }
  let pj; try { pj = JSON.parse(files['project.json']); } catch (e) { return { error: 'bad_file' }; }
  if (!pj || !Array.isArray(pj.targets)) return { error: 'bad_file' };
  const sprites = pj.targets.filter(t => !t.isStage), V = pj.targets.map(t => ({ t, v: view(t.blocks) }));
  const out = [[], [], []];
  const item = (r, id, label, max, got) => out[r].push({ id, label, max, got: Math.max(0, Math.min(max, Math.round(got * 100) / 100)) });
  const allBlocks = V.flatMap(x => x.v.list.map(b => ({ b, v: x.v, t: x.t })));

  /* 1) Ойыншыны басқару — 20 */
  item(0, '1.1', 'Кейіпкерлер: Ойыншы, Кедергі, Мәре (3 спрайт)', 2, sprites.length >= 3 ? 2 : sprites.length === 2 ? 1 : 0);
  const KEYS = ['up arrow', 'down arrow', 'left arrow', 'right arrow'], keyOk = {};
  let moveOk = 0;
  allBlocks.filter(x => x.b.opcode === 'event_whenkeypressed').forEach(x => {
    const k = x.v.fld(x.b, 'KEY_OPTION'); if (!KEYS.includes(k)) return;
    keyOk[k] = true;
    const chain = x.v.after(x.b);
    if (chain.some(c => (c.opcode === 'motion_changexby' && Math.abs(num(x.v.val(c, 'DX'))) === 10) || (c.opcode === 'motion_changeyby' && Math.abs(num(x.v.val(c, 'DY'))) === 10) || (c.opcode === 'motion_movesteps' && Math.abs(num(x.v.val(c, 'STEPS'))) === 10))) moveOk++;
  });
  item(0, '1.2', 'Төрт бағыттауыш перне оқиғасы (↑ ↓ ← →)', 8, Object.keys(keyOk).length * 2);
  item(0, '1.3', 'Әр перне 10 қадам жылжытады', 2, moveOk >= 4 ? 2 : moveOk >= 2 ? 1 : 0);

  /* 2) Кедергінің қозғалысы — 30 (ең жақсы спрайт алынады) */
  let best = { sc: -1, it: [] };
  V.filter(x => !x.t.isStage).forEach(x => {
    const forevers = x.v.list.filter(b => b.opcode === 'control_forever');
    let f = 0, reps = 0, up = false, down = false, w = 0;
    forevers.forEach(fb => {
      const inn = x.v.inner(fb), rp = inn.filter(b => b.opcode === 'control_repeat' && num(x.v.val(b, 'TIMES')) === 20);
      reps = Math.max(reps, rp.length); f = 3;
      rp.forEach(r => { const ri = x.v.inner(r); ri.forEach(c => { if (c.opcode === 'motion_changeyby') { const d = num(x.v.val(c, 'DY')); if (d === 10) up = true; if (d === -10) down = true; } if (c.opcode === 'control_wait' && Math.abs(num(x.v.val(c, 'DURATION')) - 0.05) < 1e-9) w++; }); });
    });
    const start = x.v.list.some(b => b.opcode === 'motion_gotoxy' && num(x.v.val(b, 'X')) === 0 && num(x.v.val(b, 'Y')) === -100);
    const it = [['2.1', 'Кедергі «әрқашан қайталау» ішінде қозғалады', 3, f], ['2.2', 'Екі «20 рет қайталау» циклі', 6, Math.min(2, reps) * 3], ['2.3', 'у-ті +10 және −10-ға өзгерту', 4, (up ? 2 : 0) + (down ? 2 : 0)], ['2.4', 'Әр қадамнан кейін 0,05 секунд күту', 3, w >= 2 ? 3 : w === 1 ? 1 : 0], ['2.5', 'Бастапқы орын (0; −100)', 2, start ? 2 : 0]];
    const sc = it.reduce((a, r) => a + r[3], 0);
    if (sc > best.sc) best = { sc, it };
  });
  (best.it.length ? best.it : [['2.1', 'Кедергі «әрқашан қайталау» ішінде қозғалады', 3, 0], ['2.2', 'Екі «20 рет қайталау» циклі', 6, 0], ['2.3', 'у-ті +10 және −10-ға өзгерту', 4, 0], ['2.4', 'Әр қадамнан кейін 0,05 секунд күту', 3, 0], ['2.5', 'Бастапқы орын (0; −100)', 2, 0]]).forEach(r => item(1, r[0], r[1], r[2], r[3]));

  /* 3) Жеңу/ұтылу — 30, анимация мен дыбыс — 10, түсіндіру — 10 */
  const until = allBlocks.filter(x => x.b.opcode === 'control_repeat_until').slice(0, 2);
  const tgt = [], msgs = [];
  let touch = 0, wait = 0, say1 = 0, stop = 0;
  until.forEach(x => {
    const cond = x.v.sub(x.b, 'CONDITION'), cb = cond && x.v.B[cond];
    let t = null;
    if (cb && cb.opcode === 'sensing_touchingobject') t = x.v.val(cb, 'TOUCHINGOBJECTMENU') || '?';
    else if (cb && x.v.all(cond).some(c => c.opcode === 'sensing_touchingobject')) t = '?';
    tgt.push(t);
    if (x.v.inner(x.b).some(c => c.opcode === 'control_wait' && Math.abs(num(x.v.val(c, 'DURATION')) - 0.1) < 1e-9)) wait++;
    const af = x.v.after(x.b);
    af.filter(c => c.opcode === 'looks_sayforsecs' || c.opcode === 'looks_say').forEach(c => { msgs.push(String(x.v.val(c, 'MESSAGE') || '')); if (c.opcode === 'looks_sayforsecs' && num(x.v.val(c, 'SECS')) === 1) say1++; });
    if (af.some(c => c.opcode === 'control_stop' && /all/i.test(String(x.v.fld(c, 'STOP_OPTION') || '')))) stop++;
  });
  touch = tgt.filter(Boolean).length; const sameT = tgt.length === 2 && tgt[0] && tgt[0] === tgt[1] && tgt[0] !== '?';
  const win = msgs.some(m => /жеңд/i.test(m)), lose = msgs.some(m => /қайта|байқап/i.test(m));
  item(2, '3.1', 'Екі «шарт орындалғанша қайталау» циклі', 6, until.length * 3);
  item(2, '3.2', 'Шарт: «кейіпкерге тиді ме?» (екі түрлі нысана)', 4, sameT ? touch : touch * 2);
  item(2, '3.3', 'Екі циклдің ішінде 0,1 секунд күту', 1, wait >= 2 ? 1 : 0);
  item(2, '3.4', 'Хабарлар: «Жеңдің!» және «Қайта байқап көр!»', 4, (win ? 2 : 0) + (lose ? 2 : 0));
  item(2, '3.5', 'Хабар 1 секунд көрсетіледі', 1, say1 >= 2 ? 1 : 0);
  item(2, '3.6', 'Циклден кейін «барлығын тоқтату»', 2, Math.min(2, stop));
  item(2, '3.7', 'Анимация: костюмдер және «келесі костюм»', 3, (sprites.some(s => (s.costumes || []).length >= 2) ? 2 : 0) + (allBlocks.some(x => x.b.opcode === 'looks_nextcostume' || x.b.opcode === 'looks_switchcostumeto') ? 1 : 0));
  item(2, '3.8', 'Дыбыс: қосылған және ойнатылады', 3, (pj.targets.some(s => (s.sounds || []).length >= 1) ? 1 : 0) + (allBlocks.some(x => x.b.opcode === 'sound_playuntildone') ? 2 : allBlocks.some(x => x.b.opcode === 'sound_play') ? 1 : 0));
  const ex = String(explain || '').toLowerCase();
  item(2, '3.9', 'Түсіндіру: үш циклдің қызметі', 6, (/рет қайталау|repeat|қайталау/.test(ex) ? 2 : 0) + (/әрқашан|forever|шексіз|үздіксіз/.test(ex) ? 2 : 0) + (/орындалғанша|until|тигенше|тиді|шарт/.test(ex) ? 2 : 0));

  /* Көшірілген жоба: блоктардың бірегей ID-лері бойынша саусақ ізі */
  const ids = allBlocks.length >= 15 ? Object.keys(Object.assign({}, ...V.map(x => x.v.B))).sort().join(',') : '';
  let fp = ''; if (ids) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ids))); fp = [...h.slice(0, 10)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  const sheets = out.map(items => ({ items, pts: Math.round(items.reduce((a, b) => a + b.got, 0) * 10) / 10 }));
  return { sheets, fp, blocks: allBlocks.length, sprites: sprites.length };
}
