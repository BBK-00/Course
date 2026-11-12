/* Студия сабақтарын (D<id>) бар Python қозғалтқышына тіркеу. Жарияланған нұсқа (pub_tasks) қолданылады, сондықтан
   оқытушы жобаны өңдегенде өтіп жатқан сабақтың есептері өзгермейді. Сабақ өшірілсе де/жасырылса да, тіркеу қалады. */
import { NEW_LESSONS, PY_MAXS, PY_TOPICS, WIN_TOPICS, HW_MAX_PTS } from './py.js';
import { TOPICS, MAXT } from './grading.js';
import { compileDef, buildData, hasTasks } from './data-lessons.js';

export const DATA_META = {};          /* topic → { id, subject, slug, title } */
let last = 0;

export function registerData(row, d) {
  const topic = 'D' + row.id, def = compileDef(d, row.pub_title || row.title);
  NEW_LESSONS[topic] = { build: (variant, o) => buildData(d, def, variant, o), def };
  PY_MAXS[topic] = { ...def.withHw, 5: HW_MAX_PTS };
  MAXT[topic] = PY_MAXS[topic];
  TOPICS[topic] = { title: row.pub_title || row.title || 'Сабақ', variants: new Array(20).fill(0), limits: { ...def.minutes, 5: 0 }, xlsx: true };
  if (!PY_TOPICS.includes(topic)) PY_TOPICS.push(topic);
  if (!WIN_TOPICS.includes(topic)) WIN_TOPICS.push(topic);
  DATA_META[topic] = { id: row.id, subject: row.subject, slug: row.slug, title: row.pub_title || row.title, hw: d.hw.on, def };
  return topic;
}

/* Жарияланған тапсырмалары бар барлық сабақты оқып тіркеу (15 секунд кэш) */
export async function ensureData(DB, force) {
  if (!force && Date.now() - last < 15000) return;
  last = Date.now();
  const rows = (await DB.prepare("SELECT id, subject, slug, title, pub_title, pub_tasks FROM lessons WHERE pub_tasks IS NOT NULL AND pub_tasks != '[]' AND pub_tasks != ''").all()).results || [];
  rows.forEach(r => { try { const d = JSON.parse(r.pub_tasks); if (hasTasks(d)) registerData(r, d); } catch (e) { /* бүлінген сабақты өткізіп жібереміз */ } });
}
