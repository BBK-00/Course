/* Минималды .xlsx жазу/оқу: ZIP (сығусыз жазу, deflate оқу), ұяшықтар, ортақ формулалар. Сыртқы кітапхана жоқ. */
const enc = new TextEncoder(), dec = new TextDecoder();
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

export const colName = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
export const colIdx = L => { let n = 0; for (const ch of L) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
export const addr = a => { const m = /^([A-Z]+)(\d+)$/.exec(a); return { c: colIdx(m[1]), r: +m[2] }; };
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function zip(files) {
  const out = [], cen = []; let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const n = enc.encode(name), d = enc.encode(text), c = crc32(d);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, c, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, n.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true);
    ch.setUint32(16, c, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, n.length, true); ch.setUint32(42, off, true);
    out.push(new Uint8Array(lh.buffer), n, d); cen.push(new Uint8Array(ch.buffer), n);
    off += 30 + n.length + d.length;
  }
  const cdSize = cen.reduce((a, u) => a + u.length, 0), eo = new DataView(new ArrayBuffer(22)), cnt = Object.keys(files).length;
  eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, cnt, true); eo.setUint16(10, cnt, true); eo.setUint32(12, cdSize, true); eo.setUint32(16, off, true);
  const all = [...out, ...cen, new Uint8Array(eo.buffer)], res = new Uint8Array(off + cdSize + 22); let p = 0;
  all.forEach(u => { res.set(u, p); p += u.length; });
  return res;
}

export async function unzip(buf, want) {
  const u = new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let e = u.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
  for (let i = 0; i < n; i++) {
    if (p + 46 > u.length || dv.getUint32(p, true) !== 0x02014b50) throw new Error('zip');
    const meth = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), us = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(u.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
    if (!want(name)) continue;
    if (us > 8e6) throw new Error('zip_big');
    const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = u.subarray(ds, ds + cs);
    if (meth === 0) out[name] = dec.decode(raw);
    else if (meth === 8) out[name] = dec.decode(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else throw new Error('zip');
  }
  return out;
}

/* ---------- Жазу ---------- */
const FONTS = '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font></fonts>';
const FILLS = '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E8FB"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF4C2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill></fills>';
const BORDERS = '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border></borders>';
/* font, fill, border, numFmt, center */
const XF = [[0, 0, 0, 0], [2, 0, 0, 0], [1, 2, 1, 0, 1], [0, 0, 1, 0], [0, 0, 1, 3], [0, 3, 1, 4], [0, 4, 1, 9], [1, 0, 1, 0], [3, 0, 0, 0], [0, 0, 0, 0], [1, 2, 0, 0], [0, 4, 1, 4], [0, 3, 1, 0]];
export const ST = { title: 1, head: 2, text: 3, int: 4, ans: 5, pct: 6, label: 7, owner: 8, note: 9, nhead: 10, given: 11, ansText: 12 };
const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + FONTS + FILLS + BORDERS + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + XF.length + '">' +
  XF.map(([f, fl, b, nf, ce]) => '<xf numFmtId="' + nf + '" fontId="' + f + '" fillId="' + fl + '" borderId="' + b + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"' + (ce ? ' applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' : '/>')).join('') + '</cellXfs></styleSheet>';

/* sheets: [{name, widths:[..], cells:[{a, v, s}]}] */
export function buildXlsx(sheets) {
  const sx = sh => {
    const rows = {};
    sh.cells.forEach(c => { const { r } = addr(c.a); (rows[r] = rows[r] || []).push(c); });
    const data = Object.keys(rows).map(Number).sort((a, b) => a - b).map(r => '<row r="' + r + '">' + rows[r].sort((x, y) => addr(x.a).c - addr(y.a).c).map(c =>
      c.f ? '<c r="' + c.a + '" s="' + (c.s || 0) + '"' + (typeof c.v === 'string' ? ' t="str"' : '') + '><f>' + esc(c.f) + '</f><v>' + esc(c.v) + '</v></c>' :
      c.v === null || c.v === undefined ? '<c r="' + c.a + '" s="' + (c.s || 0) + '"/>' : typeof c.v === 'number' ? '<c r="' + c.a + '" s="' + (c.s || 0) + '"><v>' + c.v + '</v></c>' : '<c r="' + c.a + '" s="' + (c.s || 0) + '" t="inlineStr"><is><t xml:space="preserve">' + esc(c.v) + '</t></is></c>').join('') + '</row>').join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"' + (sh === sheets[0] ? ' tabSelected="1"' : '') + '/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>' +
      sh.widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols><sheetData>' + data + '</sheetData>' + (sh.cf || []).map((r, i) => '<conditionalFormatting sqref="' + r + '"><cfRule type="cellIs" priority="' + (i + 1) + '" operator="greaterThan"><formula>1</formula></cfRule></conditionalFormatting>').join('') + '</worksheet>';
  };
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' +
      sheets.map((s, i) => '<sheet name="' + esc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets><calcPr fullCalcOnLoad="1"/></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': STYLES
  };
  sheets.forEach((s, i) => { files['xl/worksheets/sheet' + (i + 1) + '.xml'] = sx(s); });
  return zip(files);
}

/* ---------- Оқу ---------- */
export function shiftFormula(f, dr, dc) {
  return f.replace(/(?<![A-Za-z0-9_.])(\$?)([A-Z]{1,3})(\$?)(\d{1,7})(?![\dA-Za-z(])/g, (m, ca, L, ra, N) => (ca ? '$' + L : colName(colIdx(L) + dc)) + (ra ? '$' + N : String(+N + dr)));
}
const attr = (tag, n) => { const m = new RegExp('(?:^|[\\s<])' + n + '="([^"]*)"').exec(tag); return m ? unesc(m[1]) : ''; };

/* Қайтарады: [{name, cells: Map(adr -> {f, v}), cf: ['G5:G14', ...]}] */
export async function readXlsx(buf) {
  const files = await unzip(buf, n => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(n));
  if (!files['xl/workbook.xml']) throw new Error('not_xlsx');
  const rels = {}; (files['xl/_rels/workbook.xml.rels'] || '').replace(/<Relationship\b[^>]*>/g, t => { rels[attr(t, 'Id')] = attr(t, 'Target'); return ''; });
  const sst = []; (files['xl/sharedStrings.xml'] || '').replace(/<si\b[^>]*>([\s\S]*?)<\/si>/g, (_, b) => { sst.push(unesc([...b.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''))); return ''; });
  const out = [];
  for (const tag of files['xl/workbook.xml'].match(/<sheet\b[^>]*>/g) || []) {
    let t = rels[attr(tag, 'r:id')] || ''; t = t.replace(/^\//, ''); if (!t.startsWith('xl/')) t = 'xl/' + t;
    const xml = files[t]; if (xml === undefined) continue;
    const cells = new Map(), sh = {};
    for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = attr(m[1], 'r'), ty = attr(m[1], 't'), inner = m[2] || '';
      if (!a) continue;
      let f = null, v = null;
      const fm = /<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/.exec(inner);
      if (fm) {
        const si = attr(fm[1], 't') === 'shared' ? attr(fm[1], 'si') : null, text = fm[2] ? unesc(fm[2]) : '';
        if (si !== null && text) { sh[si] = { f: text, ...addr(a) }; f = text; }
        else if (si !== null && sh[si]) { const p = addr(a); f = shiftFormula(sh[si].f, p.r - sh[si].r, p.c - sh[si].c); }
        else f = text;
      }
      const vm = /<v>([\s\S]*?)<\/v>/.exec(inner);
      if (ty === 'inlineStr') v = unesc([...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
      else if (vm) { const raw = unesc(vm[1]); v = ty === 's' ? (sst[+raw] === undefined ? null : sst[+raw]) : (ty === 'str' || ty === 'e') ? raw : ty === 'b' ? +raw : (raw === '' ? null : Number(raw)); if (typeof v === 'number' && !isFinite(v)) v = null; }
      if (f !== null || v !== null) cells.set(a, { f, v });
    }
    const cf = []; for (const m of xml.matchAll(/<conditionalFormatting\b([^>]*)>([\s\S]*?)<\/conditionalFormatting>/g)) if (/<cfRule\b/.test(m[2])) attr(m[1], 'sqref').split(/\s+/).forEach(r => r && cf.push(r));
    out.push({ name: attr(tag, 'name'), cells, cf });
  }
  return out;
}

/* ZIP ішіндегі файлдар тізімі (аты, ашылған көлемі) — ашпай-ақ */
export function zipList(buf) {
  const u = new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let e = u.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = [];
  for (let i = 0; i < n; i++) {
    if (p + 46 > u.length || dv.getUint32(p, true) !== 0x02014b50) throw new Error('zip');
    const us = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    out.push({ name: dec.decode(u.subarray(p + 46, p + 46 + nl)), size: us }); p += 46 + nl + el + cl;
  }
  return out;
}
