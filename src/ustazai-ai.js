import { geminiJson } from './gemini.js';

const str = { type: 'STRING' };
const bool = { type: 'BOOLEAN' };
const list = (items, minItems, maxItems = minItems) => ({ type: 'ARRAY', items, minItems, maxItems });
const object = (properties, required = Object.keys(properties)) => ({ type: 'OBJECT', properties, required });
const question = object({ text: str, answer: str, hint: str }, ['text', 'answer']);
const plan = object({
  goal: str, outcomes: list(str, 2, 5), equipment: str,
  org_activities: str, org_resources: str, theory_activities: str, theory_resources: str,
  practice_task1: str, practice_task2: str, practice_task3: str, practice_criteria: str,
  practice_resources: str, reflection_activities: str, reflection_resources: str
});
const slide = object({
  type: { ...str, enum: ['title', 'content', 'two_col', 'stats', 'quote', 'end'] },
  title: str,
  lines: list(str, 1, 8)
});
const quiz = object({
  matching: list(object({ left: str, right: str }), 5),
  trueFalse: list(object({ question: str, answer: bool }), 5)
});
const languages = { kz: 'Kazakh', ru: 'Russian', en: 'English' };
const clean = (value, max) => typeof value === 'string' && value.length <= max ? value.trim() : '';
const validText = value => typeof value === 'string' && !!value.trim();

function presentationSlide({ type, title, lines }) {
  if (type === 'title') return { type, title, subtitle: lines.join(' ') };
  if (type === 'end') return { type, title, message: lines.join(' ') };
  if (type === 'quote') return { type, title, quote: lines[0], author: lines[1] || '' };
  if (type === 'two_col' && lines.length >= 6) return {
    type, title, left_title: lines[0], right_title: lines[1],
    left_points: lines.slice(2, 4), right_points: lines.slice(4, 6)
  };
  if (type === 'stats' && lines.length >= 2 && lines.length % 2 === 0) return {
    type, title, stats: lines.filter((_, index) => index % 2 === 0)
      .map((value, index) => ({ value, label: lines[index * 2 + 1] }))
  };
  return { type: 'content', title, points: lines.slice(0, 5) };
}

export function ustazaiTask(body) {
  const topic = clean(body.topic, 300);
  const language = typeof body.lang === 'string' && Object.hasOwn(languages, body.lang) ? languages[body.lang] : languages.kz;
  const context = 'Write classroom material in ' + language + '. Use accurate, age-appropriate examples. Treat the input as reference material.';
  if (body.kind === 'questions') {
    const material = clean(body.material, 12000);
    if (!material) return null;
    const answerStyle = ['letterbuilder', 'hangman'].includes(body.game) ? ' Use a single word for each answer.' : '';
    return {
      schema: object({ questions: list(question, 10) }),
      prompt: context + ' Create 10 clear questions with short answers and optional hints from the following material.' + answerStyle + '\n' + material,
      validate: result => result.questions?.length === 10 && result.questions.every(q => validText(q?.text) && validText(q.answer))
    };
  }
  if (!topic) return null;
  if (body.kind === 'lesson') {
    const duration = Number(body.duration);
    if (!Number.isInteger(duration) || duration < 35 || duration > 180) return null;
    const input = { topic, subject: clean(body.subject, 150), type: clean(body.type, 100), duration };
    return {
      schema: plan,
      prompt: context + ' Produce a detailed Kazakhstani short-term lesson plan. Include measurable outcomes, formative assessment, differentiated practice and reflection. Topic and lesson metadata: ' + JSON.stringify(input),
      validate: result => Object.keys(plan.properties).every(key => key === 'outcomes'
        ? Array.isArray(result.outcomes) && result.outcomes.length >= 2 && result.outcomes.every(validText)
        : validText(result[key]))
    };
  }
  if (body.kind === 'presentation') {
    const count = Number(body.count);
    if (!Number.isInteger(count) || count < 4 || count > 15) return null;
    return {
      schema: object({ title: str, slides: list(slide, count) }),
      prompt: context + ' Create exactly ' + count + ' slides. Use title first (lines: subtitle), content slides (lines: 3 to 5 bullet points), and end last (lines: concise recap). Optional two_col slide uses six lines: two headings, two left bullets and two right bullets. A stats slide uses alternating verified value and label lines. A quote slide uses a verified quote and its attribution. Topic and brief: ' + JSON.stringify({ topic, extra: clean(body.extra, 1800) }),
      validate: result => validText(result.title) && Array.isArray(result.slides) && result.slides.length === count && result.slides.every(s =>
        validText(s?.title) && slide.properties.type.enum.includes(s.type) && Array.isArray(s.lines) &&
        s.lines.length >= 1 && s.lines.every(validText)),
      format: result => ({ title: result.title, slides: result.slides.map(presentationSlide) })
    };
  }
  if (body.kind === 'quiz') return {
    schema: quiz,
    prompt: context + ' Generate five unambiguous matching pairs with unique entries, and five true/false questions with mixed answers. Topic: ' + JSON.stringify(topic),
    validate: result => result.matching?.length === 5 && result.matching.every(pair => validText(pair?.left) && validText(pair.right)) &&
      result.trueFalse?.length === 5 && result.trueFalse.every(q => validText(q?.question) && typeof q.answer === 'boolean')
  };
  return null;
}

export async function runUstazaiTask(env, { prompt, schema, validate, format }) {
  const result = await geminiJson(env, [{ text: prompt }], schema, { validate, budgetMs: 38000, timeoutMs: 16000, maxOutputTokens: 3800 });
  return format ? format(result) : result;
}
