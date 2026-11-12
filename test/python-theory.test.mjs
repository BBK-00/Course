import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { theory } from '../scripts/python-theory-data.mjs';
import { visuals } from '../scripts/python-theory-visuals.mjs';
import { parseIndex } from '../src/studio-pages.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const topics = parseIndex(read('../python/index.html'), 'python');
assert.deepEqual(topics.map(topic => topic.num), Array.from({ length: 24 }, (_, i) => i + 1));
assert(topics.every(topic => topic.open));
assert.deepEqual(topics.filter(topic => topic.fallback).map(topic => topic.num), theory.map(lesson => lesson.n));
for (const topic of topics) read('..' + topic.path + '.html');

const isWindows = process.platform === 'win32';
for (const lesson of theory) {
  const topic = topics[lesson.n - 1];
  const html = read('..' + topic.path + '.html');
  const demo = JSON.parse(html.match(/id="theoryData">([^<]+)<\/script>/)[1]);
  assert.deepEqual(demo.steps, lesson.steps, 'Rebuild theory page ' + lesson.n);
  const visual = visuals.get(lesson.n);
  assert.deepEqual(demo.cases, visual.cases, 'Rebuild the interactive comparison on lesson ' + lesson.n);
  assert(visual.cases.length >= 2);
  assert(lesson.steps.every(([line]) => line >= 1 && line <= lesson.code.length));
  const code = lesson.code.join('\n');
  const run = spawnSync(isWindows ? 'py' : 'python3', isWindows ? ['-3', '-c', code] : ['-c', code], {
    encoding: 'utf8',
    input: lesson.input.join('\n') + '\n',
    timeout: 5000,
    env: { ...process.env, PYTHONUTF8: '1' }
  });
  assert.equal(run.status, 0, run.stderr || String(run.error));
  assert.equal(run.stdout.replace(/\r\n/g, '\n').replace(/\n$/, ''), demo.steps.at(-1)[3], 'Lesson ' + lesson.n);
}
console.log('Python theory: 24 linked pages and all 18 worked examples verified.');
