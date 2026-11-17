/* Пән жоспарын Word (.docx) немесе Excel (.xlsx) файлынан оқу: кесте → тақырыптар тізімі (+ ЖИ көмегі). */
import { unzip, addr } from './xlsx.js';
import { geminiJson } from './gemini.js';

const MAX_TOPICS = 150;
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const xmlText = s => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/* ---------- Файлдан жолдар ---------- */
function docxRows(xml) {
  const text = block => clean(xmlText([...block.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(?:tab|br)\s*\/>/g)].map(m => m[1] ?? ' ').join('')));
  const rows = [];
  for (const m of xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>|<w:p[ >][\s\S]*?<\/w:p>/g)) {
    if (m[0].startsWith('<w:tr')) rows.push([...m[0].matchAll(/<w:tc[ >][\s\S]*?<\/w:tc>/g)].map(c => text(c[0])));
    else { const t = text(m[0]); if (t) rows.push([t]); }
  }
  return rows;
}

function xlsxRows(files) {
  const shared = [];
  for (const m of (files['xl/sharedStrings.xml'] || '').matchAll(/<si[ >][\s\S]*?<\/si>/g)) {
    shared.push(clean(xmlText([...m[0].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(t => t[1]).join(''))));
  }
  const sheet = Object.keys(files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))[0];
  if (!sheet) return [];
  const grid = new Map();
  for (const m of files[sheet].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
    if (!ref || !m[2]) continue;
    const type = /t="(\w+)"/.exec(m[1])?.[1];
    let value = '';
    if (type === 's') value = shared[Number(/<v>(\d+)<\/v>/.exec(m[2])?.[1])] ?? '';
    else if (type === 'inlineStr') value = clean(xmlText([...m[2].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
    else value = clean(xmlText(/<v>([\s\S]*?)<\/v>/.exec(m[2])?.[1] ?? ''));
    if (!value) continue;
    const { c, r } = addr(ref);
    if (!grid.has(r)) grid.set(r, []);
    grid.get(r)[c] = value;
  }
  return [...grid.entries()].sort((a, b) => a[0] - b[0]).map(([, cells]) => Array.from(cells, v => v ?? ''));
}

export async function officeRows(bytes, name) {
  const lower = String(name || '').toLowerCase();
  try {
    if (lower.endsWith('.docx')) {
      const files = await unzip(bytes, n => n === 'word/document.xml');
      if (!files['word/document.xml']) throw new Error('plan_file');
      return docxRows(files['word/document.xml']);
    }
    if (lower.endsWith('.xlsx')) {
      return xlsxRows(await unzip(bytes, n => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n)));
    }
  } catch (error) {
    if (error.message === 'zip_big') throw new Error('plan_file');
    throw new Error('plan_file');
  }
  throw new Error('plan_type');
}

/* ---------- Кестеден тақырыптар (ЖИ-сіз) ---------- */
const isNumber = value => /^\d{1,3}(?:[.,]0+)?$/.test(clean(value));
const skipTitle = value => /^(барлығы|жиыны|итого|всего|барлық сағат|№|р\/с)/i.test(value);

export function topicsFromRows(rows) {
  let header = -1, titleCol = -1, hoursCol = -1, numCol = -1;
  for (let i = 0; i < Math.min(rows.length, 40) && header < 0; i++) {
    if (rows[i].filter(c => clean(c)).length < 2) continue; // құжат атауы емес, нақты кесте жолы
    const t = rows[i].findIndex(c => /тақырып|тема\b|тақырыбы|мазмұны/i.test(c));
    if (t >= 0) {
      header = i; titleCol = t;
      hoursCol = rows[i].findIndex(c => /сағат|часы|час\b|көлемі/i.test(c));
      numCol = rows[i].findIndex(c => /^(№|n|р\/с|саны|сабақ)/i.test(clean(c)));
    }
  }
  const topics = [];
  const seen = new Set();
  for (const row of rows.slice(header + 1)) {
    let title = '';
    if (titleCol >= 0) title = clean(row[titleCol]);
    else title = row.map(clean).filter(c => c.length >= 8 && /\p{L}{3}/u.test(c) && !isNumber(c)).sort((a, b) => b.length - a.length)[0] || '';
    if (title.length < 4 || skipTitle(title) || !/\p{L}/u.test(title)) continue;
    const rawN = numCol >= 0 ? row[numCol] : row.find(isNumber);
    const hoursRaw = hoursCol >= 0 ? row[hoursCol] : '';
    const n = isNumber(rawN) ? parseInt(rawN, 10) : topics.length + 1;
    const key = n + '|' + title;
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push({ n: topics.some(t => t.n === n) ? topics.length + 1 : n, title: title.slice(0, 200), hours: isNumber(hoursRaw) ? parseInt(hoursRaw, 10) : null });
    if (topics.length >= MAX_TOPICS) break;
  }
  return topics;
}

/* ---------- ЖИ көмегі ---------- */
const aiSchema = {
  type: 'OBJECT',
  properties: { topics: { type: 'ARRAY', items: { type: 'OBJECT', properties: { n: { type: 'INTEGER' }, title: { type: 'STRING' }, hours: { type: 'INTEGER' } }, required: ['n', 'title'] } } },
  required: ['topics']
};

export async function topicsFromAi(env, rows) {
  const table = rows.map(r => r.map(clean).filter(Boolean).join(' | ')).filter(Boolean).join('\n').slice(0, 9000);
  const prompt = 'Төменде оқу пәнінің күнтізбелік-тақырыптық жоспарынан алынған мәтін. Сабақ тақырыптарын ретімен шығар. '
    + 'Әр тақырыпқа n (сабақ реттік нөмірі, 1-ден бастап), title (тақырып атауы, қазақша не файлдағы тілде, өзгертпе) және мәлім болса hours (сағат саны) бер. '
    + 'Тақырып емес жолдарды (мекеме, оқытушы, бөлім атаулары, жиынтық, қол қою) қоспа. Ойдан тақырып қоспа.\n\n' + table;
  const out = await geminiJson(env, [{ text: prompt }], aiSchema, {
    budgetMs: 20000, maxOutputTokens: 4000,
    validate: o => Array.isArray(o.topics) && o.topics.length > 0 && o.topics.every(t => Number.isInteger(t.n) && typeof t.title === 'string')
  });
  const seen = new Set();
  return out.topics.map(t => ({ n: t.n, title: clean(t.title).slice(0, 200), hours: Number.isInteger(t.hours) && t.hours > 0 && t.hours < 100 ? t.hours : null }))
    .filter(t => t.title.length >= 3 && t.n > 0 && !seen.has(t.n) && seen.add(t.n)).slice(0, MAX_TOPICS);
}

export const validTopics = list => Array.isArray(list) && list.length > 0 && list.length <= MAX_TOPICS && list.every(t => t
  && Number.isInteger(t.n) && t.n > 0 && t.n < 1000 && typeof t.title === 'string' && clean(t.title).length >= 2 && clean(t.title).length <= 200
  && (t.hours === null || t.hours === undefined || (Number.isInteger(t.hours) && t.hours >= 0 && t.hours < 100)))
  && new Set(list.map(t => t.n)).size === list.length;
