import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseIndex } from '../src/studio-pages.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const bank = JSON.parse(read('../assets/python-practice-bank.json'));
const topics = parseIndex(read('../python/index.html'), 'python');
assert.equal(topics.length, 24);
const jobs = [];
const expected = [];
function check(code, cases, label) {
  jobs.push([code, cases.map(([input]) => input)]);
  expected.push({ label, outputs: cases.map(([, out]) => out) });
}
for (const topic of topics) {
  const html = read('..' + topic.path + '.html');
  assert(topic.num === 12 ? html.includes('PyWork.mount') : html.includes('data-python-practice="' + topic.num + '"'));
  if (topic.num !== 12) assert(!/Join.mount|PyWork.mount|60 МИНУТ|60 минут/.test(html));
  const lesson = bank[topic.num];
  assert(lesson.warm.length >= 2 && lesson.code.length >= 2);
  assert.equal(lesson.quiz.length, topic.num <= 2 ? 0 : 10);
  if (lesson.review) assert(lesson.code.length >= 5);
  if (lesson.rotation) {
    const { only, count, pool } = lesson.rotation;
    assert(html.includes('data-practice-rotation'));
    assert(pool.length > count && new Set(pool.map(item => JSON.stringify(item))).size === pool.length);
    assert.equal(count + (only ? 0 : lesson.warm.length + lesson.code.length), 15);
    assert.equal(only, topic.num <= 2);
  }
  if ([4, 7, 8, 9, 10, 12].includes(topic.num)) assert(!html.includes('data-practice-rotation'));
  for (const item of lesson.code) check(item.ref, item.cases, topic.num + ' ' + item.title);
  const items = [...lesson.warm, ...lesson.quiz, ...(lesson.rotation?.pool || [])];
  for (const item of new Map(items.map(value => [JSON.stringify(value), value])).values()) {
    assert(item.reason);
    if (item.opts) {
      assert(item.correct >= 0 && item.correct < item.opts.length);
      assert.equal(new Set(item.opts).size, item.opts.length);
    }
    else check(item.code, [[item.input || '', item.answer]], topic.num + ' quiz');
  }
}

const worker = read('../assets/python-practice-worker.js');
const source = worker.slice(worker.indexOf('import builtins'), worker.indexOf('_job ='));
const driver = source + '\nimport sys\nprint(json.dumps([check_code(code, cases) for code, cases in json.load(sys.stdin)], ensure_ascii=False))';
const win = process.platform === 'win32';
const result = spawnSync(win ? 'py' : 'python3', win ? ['-3', '-c', driver] : ['-c', driver], {
  input: JSON.stringify(jobs), encoding: 'utf8', timeout: 10000,
  env: { ...process.env, PYTHONUTF8: '1' }
});
assert.equal(result.status, 0, result.stderr || String(result.error));
const rows = JSON.parse(result.stdout);
rows.forEach((results, index) => {
  assert.deepEqual(results.map(r => r.out?.trim()), expected[index].outputs.map(out => out.trim()), expected[index].label);
});
console.log('24 practice pages and ' + jobs.length + ' reference programs / written outputs verified.');
