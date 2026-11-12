import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';
import { memoryD1 } from './d1-memory.mjs';
import { ustazaiTask } from '../src/ustazai-ai.js';

test('UstazAI uses the learner session, validates input and limits Gemini requests', async t => {
  const DB = memoryD1();
  t.after(() => DB.sqlite.close());
  const env = { DB, GEMINI_API_KEY: 'fake-server-key' };
  const origin = 'https://classroom.test';
  let cookie = '', sent = 0;
  const request = (path, body, headers) => worker.fetch(new Request(origin + '/api/account/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, ...headers },
    body: JSON.stringify(body)
  }), env, {});
  const payload = { kind: 'quiz', lang: 'kz', topic: 'Python циклі' };
  assert.equal((await request('ustazai', payload)).status, 401);
  const registered = await request('register', { name: 'Тексеру', email: 'ustazai@example.test', password: 'fixture-pass-42' });
  assert.equal(registered.status, 201);
  cookie = registered.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await request('ustazai', payload, { Origin: 'https://unrelated.test' })).status, 403);
  assert.equal((await request('ustazai', { kind: 'presentation', topic: 'Python', count: '99' })).status, 400);

  const quiz = {
    matching: Array.from({ length: 5 }, (_, i) => ({ left: 'A' + i, right: 'B' + i })),
    trueFalse: Array.from({ length: 5 }, (_, i) => ({ question: 'Сұрақ ' + i, answer: i % 2 === 0 }))
  };
  const presentation = { title: 'Python циклі', slides: [
    { type: 'title', title: 'Кіріспе', lines: ['Цикл түрлері'] },
    { type: 'content', title: 'for', lines: ['Тізбектегі мәндер'] },
    { type: 'two_col', title: 'Салыстыру', lines: ['for', 'while', 'Тізім', 'range()', 'Шарт', 'Санауыш'] },
    { type: 'end', title: 'Қайталау', lines: ['Шекараны тексеріңіз'] }
  ] };
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(new URL(url).host, 'generativelanguage.googleapis.com');
    assert.equal(init.headers['x-goog-api-key'], 'fake-server-key');
    const input = JSON.parse(init.body);
    assert.match(input.contents[0].parts[0].text, /Python циклі/);
    sent++;
    const output = input.generationConfig.responseSchema.properties.slides ? presentation : quiz;
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] });
  });
  const slides = await (await request('ustazai', { ...payload, kind: 'presentation', count: '4' })).json();
  assert.equal(slides.data.slides[0].subtitle, 'Цикл түрлері');
  assert.deepEqual(slides.data.slides[2].right_points, ['Шарт', 'Санауыш']);
  for (let n = 0; n < 7; n++) assert.deepEqual(await (await request('ustazai', payload)).json(), { ok: true, data: quiz });
  assert.equal((await request('ustazai', payload)).status, 429);
  assert.equal(sent, 8);
  assert(ustazaiTask({ kind: 'lesson', topic: 'Цикл', duration: 45 }));
  assert(ustazaiTask({ kind: 'questions', material: 'Цикл мысалы' }));
});
