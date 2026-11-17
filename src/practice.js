/* Python «өзіндік жаттығу» нәтижесін серверде қайта тексеру және студент бойынша сақтау.
   Жауаптар клиентте көрінетіндіктен, мұғалімге баратын балл тек осы жерде есептеледі. */
import bank from '../assets/python-practice-bank.json' with { type: 'json' };
import { runCode } from './runner.js';

const WEIGHT = { warm: 1, code: 3, test: 1 };
export const normalize = value => String(value ?? '').normalize('NFC').trim().split(/\r?\n/).map(line => line.trim().replace(/[ \t]+/g, ' ')).join('\n');
const numberLine = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export function matchesOutput(actual, expected) {
  const a = normalize(actual), b = normalize(expected);
  if (a === b) return true;
  const actualLines = a.split('\n'), expectedLines = b.split('\n');
  return actualLines.length === expectedLines.length && expectedLines.every((line, i) => {
    const target = line.split(' '), got = actualLines[i].split(' ');
    return target.length === got.length && target.every((value, j) => numberLine.test(value) && numberLine.test(got[j]) &&
      Number.isFinite(Number(got[j])) && Math.abs(Number(value) - Number(got[j])) <= Math.max(1, Math.abs(Number(value))) * 1e-9);
  });
}

export const hasLesson = lesson => Number.isInteger(lesson) && Object.hasOwn(bank, String(lesson));

function testItems(lesson) {
  const l = bank[String(lesson)];
  return l.rotation ? l.rotation.pool : l.quiz;
}

/* Сабақтың максимум салмағы: клиенттегі есепті қайталайды (жылдам жаттығу + код + тест). */
export function lessonTotal(lesson) {
  const l = bank[String(lesson)];
  const testCount = l.rotation ? l.rotation.count : l.quiz.length;
  if (l.rotation?.only) return testCount * WEIGHT.test;
  return l.warm.length * WEIGHT.warm + l.code.length * WEIGHT.code + testCount * WEIGHT.test;
}

export function itemOf(lesson, kind, index) {
  const l = bank[String(lesson)];
  const list = kind === 'warm' ? l.warm : kind === 'code' ? l.code : kind === 'test' ? testItems(lesson) : null;
  return list && Number.isInteger(index) && index >= 0 && index < list.length ? list[index] : null;
}

/* Бір тапсырманы тексереді. Код үшін Judge0/Wandbox арқылы нақты орындайды. */
export async function gradeItem(env, lesson, kind, index, value) {
  const item = itemOf(lesson, kind, index);
  if (!item || typeof value !== 'string' || value.length > 6000) return null;
  const weight = WEIGHT[kind];
  if (kind === 'code') {
    if (!value.trim()) return null;
    let passed = 0;
    for (const [input, expected] of item.cases) {
      const out = await runCode(env, 'python', value, input);
      if (out.ok && matchesOutput(out.stdout, expected)) passed++;
    }
    return { points: Math.round(passed / item.cases.length * weight * 10) / 10, weight };
  }
  if (!value.trim()) return null;
  const ok = item.opts ? Number(value) === item.correct : normalize(value) === normalize(item.answer);
  return { points: ok ? 1 : 0, weight };
}

export async function savePractice(DB, studentId, lesson, kind, index, points, weight, now = Math.floor(Date.now() / 1000)) {
  await DB.prepare(`INSERT INTO practice_results (student_id, lesson, item, best, last, weight, at) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(student_id, lesson, item) DO UPDATE SET best=MAX(best, excluded.best), last=excluded.last, at=excluded.at`)
    .bind(studentId, lesson, kind + ':' + index, points, points, weight, now).run();
}

/* Студент+сабақ бойынша 0–100 пайыз (үздік нәтижелер, тест көп болса тек `count` үздігі). */
export function percentOf(lesson, rows) {
  const l = bank[String(lesson)];
  const testLimit = l.rotation ? l.rotation.count : l.quiz.length;
  const parts = { warm: [], code: [], test: [] };
  for (const row of rows) parts[row.item.split(':')[0]]?.push(row.best);
  const sum = list => list.reduce((a, v) => a + v, 0);
  const tests = parts.test.sort((a, b) => b - a).slice(0, testLimit);
  const earned = l.rotation?.only ? sum(tests) : sum(parts.warm) + sum(parts.code) + sum(tests);
  const total = lessonTotal(lesson);
  return total ? Math.min(100, Math.round(earned / total * 1000) / 10) : 0;
}
