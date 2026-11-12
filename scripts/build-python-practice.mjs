import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { theory } from './python-theory-data.mjs';
import { exercises } from './python-practice-exercises.mjs';
import { questions } from './python-practice-questions.mjs';
import { rotationQuestions } from './python-practice-rotation.mjs';

function question(row, index) {
  const [kind, subject, ...rest] = row;
  if (kind === 'o') return { code: subject, answer: rest[0], reason: rest[1] };
  const reason = rest.pop(), rotation = index % rest.length;
  const opts = rest.slice(rotation).concat(rest.slice(0, rotation));
  return { ...(kind === 'b' ? { code: subject } : { prompt: subject }), opts, correct: opts.indexOf(rest[0]), reason };
}

const bank = Object.fromEntries(Array.from({ length: 24 }, (_, index) => {
  const n = index + 1, items = questions[n], short = n <= 2;
  const warm = items.slice(0, short ? items.length : 2).map(question);
  const quiz = short ? [] : items.slice(2).map(question);
  if (!short && quiz.length < 10) {
    const lesson = theory.find(lesson => lesson.n === n);
    const [prompt, opts, correct, reason] = lesson.quiz;
    quiz.push({ prompt, opts, correct, reason });
    quiz.push({ code: lesson.code.join('\n'), input: lesson.input.length ? lesson.input.join('\n') : undefined,
      answer: lesson.steps.at(-1)[3], reason: lesson.steps.at(-1)[1] });
  }
  const code = exercises[n].map(([title, prompt, ref, cases, reason], index) => ({
    title, prompt, ref, cases, reason, level: index < 2 ? 'Оңай' : 'Орташа'
  }));
  if (quiz.length !== (short ? 0 : 10) || !warm.length || !code.length) throw new Error('Invalid practice for lesson ' + n);
  const extra = rotationQuestions[n];
  const rotation = extra && {
    count: short ? 15 : 10,
    only: short,
    pool: [...(short ? warm : quiz), ...extra.map(question)]
  };
  return [n, { warm, code, quiz, review: [6, 11, 16, 24].includes(n), ...(rotation ? { rotation } : {}) }];
}));
const file = new URL('../assets/python-practice-bank.json', import.meta.url);
const content = JSON.stringify(bank) + '\n';
if (!existsSync(file) || readFileSync(file, 'utf8') !== content) writeFileSync(file, content);
console.log('Python practice generated for all 24 lessons.');
