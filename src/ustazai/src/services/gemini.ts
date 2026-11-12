import { accountRequest } from './account';

export interface Question {
  text: string;
  hint?: string;
  answer: string;
}

async function generate<T>(input: object): Promise<T> {
  return (await accountRequest<{ data: T }>('/ustazai', input)).data;
}

export async function generateQuestions(material: string, lang: string, game: string): Promise<Question[]> {
  if (material.length > 12000) throw new Error('Сабақ мәтіні 12 000 таңбадан аспауы керек.');
  return (await generate<{ questions: Question[] }>({ kind: 'questions', material, lang, game })).questions;
}

export function generateLessonPlanJson(meta: { title: string; module_: string; type_: string; duration: string }, lang: string) {
  return generate({ kind: 'lesson', topic: meta.title, subject: meta.module_, type: meta.type_, duration: meta.duration, lang });
}

export function generatePresentationJson(topic: string, count: string, lang: string, extra: string) {
  return generate<{ title: string; slides: object[] }>({ kind: 'presentation', topic, count, lang, extra });
}

export function generateInteractiveGames(topic: string, lang: string) {
  return generate({ kind: 'quiz', topic, lang });
}
