// These are prompts for teacher verification, never an authorship probability or a grade penalty.
const kinds = ['ai_interface', 'ai_reference', 'outside_lesson'];
export const REVIEW_SCHEMA = { type: 'OBJECT', properties: { findings: { type: 'ARRAY', items: {
  type: 'OBJECT', properties: { kind: { type: 'STRING', enum: kinds }, excerpt: { type: 'STRING' }, reason: { type: 'STRING' }, question: { type: 'STRING' } }, required: ['kind', 'excerpt', 'reason', 'question']
} } }, required: ['findings'] };
export const REVIEW_INSTRUCTIONS = [
  'Separately return review: {findings: []} for the TEACHER ONLY. The score and student comment must depend ONLY on the scoring rubric. Never lower the score because of suspected AI use. Never estimate an AI percentage or claim that authorship is proven.',
  'Add at most 3 findings ONLY for specific visible evidence: ai_interface = a visible AI assistant conversation interface, ai_reference = an explicit reference to AI assistance in the submitted work, outside_lesson = a specific advanced construct outside beginner input/print/variables/formatting whose meaning the teacher may ask the student to explain. An advanced construct is only an understanding check, not evidence of AI use.',
  'For each finding give kind, excerpt (the exact short visible text or code fragment, never invented), reason (one short Kazakh sentence describing what is visible and why to clarify it), question (one short Kazakh question about that fragment to check understanding). If text is unreadable, do not fabricate it; return findings: [].',
  'Simple or correct code, neat handwriting, typed screenshots, polished formatting, English variable names, f-strings, comments and lack of mistakes are NOT evidence of AI use and must NOT be flagged. Do not invent suspicion to fill this field. If no concrete visible evidence exists, return findings: [].'
].join('\n');
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function validHomeworkReview(review) {
  return !!review && Array.isArray(review.findings) && review.findings.length <= 3 && review.findings.every(f => f && kinds.includes(f.kind) && ['excerpt', 'reason', 'question'].every(k => typeof f[k] === 'string' && !!f[k].trim()));
}
export function normalizeHomeworkReview(review) {
  if (!validHomeworkReview(review)) return null; // Old grades remain distinguishable from a completed check.
  return { version: 1, findings: review.findings.map(f => ({ kind: f.kind, excerpt: text(f.excerpt, 240), reason: text(f.reason, 350), question: text(f.question, 250) })) };
}
