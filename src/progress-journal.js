export { summarizeProgress } from '../assets/progress-metrics.js';

const clean = value => String(value ?? '').trim();
const nameKey = value => clean(value).normalize('NFKC').replace(/\s+/g, ' ').toLowerCase();

export function readJournalPaste(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && (quoted || !value)) {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === '\t' || ch === '\n' || ch === '\r')) {
      row.push(value);
      value = '';
      if (ch === '\t') continue;
      rows.push(row);
      row = [];
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else value += ch;
  }
  if (quoted) throw new Error('journal_format');
  rows.push([...row, value]);
  return rows;
}

function lessonDate(value, year) {
  const m = clean(value).match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?$/);
  if (!m) return null;
  const month = +m[2], day = +m[1], y = m[3] ? +m[3] : year + (month < 9 ? 1 : 0);
  if (y !== year + (month < 9 ? 1 : 0)) return null;
  const date = new Date(Date.UTC(y, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) return null;
  return date.toISOString().slice(0, 10);
}

export function parseJournal(rows, students, year) {
  const isNameHeader = value => {
    const key = nameKey(value);
    return key === 'аты-жөні' || (key.includes('тегі') && key.includes('әкесінің аты'));
  };
  const headerIndex = rows.slice(0, 25).findIndex(row => row.some(isNameHeader));
  if (headerIndex < 0) throw new Error('journal_header');
  const header = rows[headerIndex];
  const nameColumn = header.findIndex(isNameHeader);
  const lessons = header.flatMap((value, column) => {
    const date = lessonDate(value, year);
    return column > nameColumn && date ? [{ column, date, number: clean(rows[headerIndex - 1]?.[column]) }] : [];
  });
  if (!lessons.length) throw new Error('journal_dates');
  const names = new Map();
  for (const student of students) {
    const key = nameKey(student.name);
    names.set(key, [...(names.get(key) || []), student]);
  }
  const entries = [], issues = [], matched = new Set();
  /* Атау бағанасы бос/«(толық)» жолдар — сабақ сағаты мен түрі (Сс, Жм, Ср). */
  const meta = new Map(lessons.map(l => [l.column, { column: l.column, date: l.date, number: l.number, hours: null, kind: '' }]));
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const name = clean(rows[index][nameColumn]);
    if (name && !/^\(толық\)$/i.test(name)) break;
    for (const { column } of lessons) {
      const value = clean(rows[index][column]);
      if (!value) continue;
      if (/^\d+(?:[.,]\d+)?$/.test(value)) meta.get(column).hours = Number(value.replace(',', '.'));
      else meta.get(column).kind = value.slice(0, 12);
    }
  }
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index], name = clean(row[nameColumn]);
    if (!name || /^\(толық\)$/i.test(name)) continue;
    const candidates = names.get(nameKey(name)) || [];
    if (candidates.length !== 1 || matched.has(candidates[0].id)) {
      issues.push({ row: index + 1, name: name.slice(0, 100), kind: candidates.length === 0 ? 'unmatched' : 'ambiguous' });
      continue;
    }
    const student = candidates[0];
    matched.add(student.id);
    for (const { column, date, number } of lessons) {
      const value = clean(row[column]);
      if (!value) continue;
      const n = /^\d+(?:[.,]\d+)?$/.test(value) ? Number(value.replace(',', '.')) : null;
      if (n === null ? !/^[сж]$/iu.test(value) : n > 100) {
        issues.push({ row: index + 1, name: name.slice(0, 100), kind: 'value', column: column + 1 });
        continue;
      }
      entries.push({ student: student.id, name: student.name, date, column, number: /^\d{1,4}$/.test(number) ? number : '', score: n, mark: n === null ? value : '' });
    }
  }
  return { entries, issues, matched: matched.size, lessons: lessons.length, columns: [...meta.values()] };
}

/* Google Sheets CSV экспорты: тырнақшадағы үтір мен жол үзілімін қолдайды. */
export function readCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"' && !value) quoted = true;
    else if (ch === ',') { row.push(value); value = ''; }
    else if (ch === '\n' || ch === '\r') {
      row.push(value); value = ''; rows.push(row); row = [];
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else value += ch;
  }
  if (quoted) throw new Error('journal_format');
  if (value || row.length) rows.push([...row, value]);
  return rows;
}
