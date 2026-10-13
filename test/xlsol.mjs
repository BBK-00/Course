import { buildXlsx, colName } from '../src/xlsx.js';

/* Дұрыс шешімді қолмен жинаймыз (грейдерден тәуелсіз) */
export function solution(D, opt = {}, STAMP = 'a1b2c3d4e5') {
  const S = [{ name: '1-Оңай', widths: [20], cells: [], cf: ['G5:G14'] }, { name: '2-Орташа', widths: [20], cells: [], cf: [] }, { name: '3-Күрделі', widths: [20], cells: [], cf: ['B6:I13'] }];
  const put = (i, a, v, f) => S[i].cells.push({ a, v, f, s: 0 });
  const stamp = opt.stamp || STAMP;
  S.forEach((s, i) => put(i, 'A2', 'Студент: Тест · Топ · ID ' + stamp));
  /* 1 */
  let rows = D.s1.map(g => ({ ...g, e: g.price * g.qty, f: g.qty * g.del })).map(r => ({ ...r, g: r.e + r.f }));
  if (opt.sort) rows.sort((a, b) => b.g - a.g);
  rows.forEach((r, i) => { const x = 5 + i; put(0, 'A' + x, r.name); put(0, 'B' + x, r.price); put(0, 'C' + x, r.qty); put(0, 'D' + x, r.del); put(0, 'E' + x, r.e, `B${x}*C${x}`); put(0, 'F' + x, r.f, `C${x}*D${x}`); put(0, 'G' + x, r.g, `E${x}+F${x}`); });
  const G = rows.map(r => r.g), sum = a => a.reduce((x, y) => x + y, 0);
  put(0, 'E15', sum(rows.map(r => r.e)), 'SUM(E5:E14)'); put(0, 'F15', sum(rows.map(r => r.f)), 'SUM(F5:F14)'); put(0, 'G15', sum(G), 'SUM(G5:G14)');
  put(0, 'G16', Math.max(...G), 'MAX(G5:G14)'); put(0, 'G17', Math.min(...G), 'MIN(G5:G14)'); put(0, 'G18', sum(G) / 10, 'AVERAGE(G5:G14)');
  /* 2 */
  const { disc, vat, thr } = D.s2; put(1, 'B3', disc); put(1, 'B4', vat); put(1, 'B5', thr);
  const R2 = D.s2.rows.map(g => { const c = g.price * disc, d = g.price - c, e = d * vat, f = d + e; return { ...g, c, d, e, f }; });
  R2.forEach((r, i) => { const x = 8 + i; put(1, 'A' + x, r.name); put(1, 'B' + x, r.price); put(1, 'C' + x, r.c, opt.noAbs ? `B${x}*B3` : `B${x}*$B$3`); put(1, 'D' + x, r.d, `B${x}-C${x}`); put(1, 'E' + x, r.e, `D${x}*$B$4`); put(1, 'F' + x, r.f, `D${x}+E${x}`); put(1, 'G' + x, r.f > thr ? 'Қымбат' : 'Арзан', `IF(F${x}>$B$5,"Қымбат","Арзан")`); });
  const alt = D.s2.rows.reduce((a, g) => a + g.price * 0.75 * 1.12, 0), sF = sum(R2.map(r => r.f));
  put(1, 'C16', sum(R2.map(r => r.c)), 'SUM(C8:C15)'); put(1, 'F16', sF, 'SUM(F8:F15)'); put(1, 'B18', alt); put(1, 'B19', sF - alt, 'F16-B18');
  /* 3 */
  const { rm, cm, rates, emp, thr: t3 } = D.s3;
  cm.forEach((v, j) => put(2, colName(1 + j) + '5', v)); rm.forEach((v, i) => put(2, 'A' + (6 + i), v));
  const M = rm.map((a, i) => cm.map((b, j) => { const c = colName(1 + j), x = 6 + i; put(2, c + x, a * b, `$A${x}*${c}$5`); return a * b; })), flat = M.flat();
  put(2, 'B15', sum(flat), 'SUM(B6:I13)'); put(2, 'B16', sum(flat) / 64, 'AVERAGE(B6:I13)'); put(2, 'B17', Math.max(...flat), 'MAX(B6:I13)'); put(2, 'B18', flat.filter(x => x > t3).length, `COUNTIF(B6:I13,">${t3}")`);
  rates.forEach((v, j) => put(2, colName(2 + j) + '21', v));
  const B = emp.map((e, i) => { put(2, 'A' + (22 + i), e.name); put(2, 'B' + (22 + i), e.sal); return rates.map((r, j) => { const c = colName(2 + j), x = 22 + i; put(2, c + x, e.sal * r, `$B${x}*${c}$21`); return e.sal * r; }); });
  rates.forEach((_, j) => { const c = colName(2 + j); put(2, c + '27', sum(B.map(r => r[j])), `SUM(${c}22:${c}26)`); });
  put(2, 'B29', Math.max(...B.flat()), 'MAX(C22:F26)');
  return buildXlsx(S);
}
