import { accountMessages, learnerAccount } from '../../../../assets/learner-auth.js';

export interface Account {
  name: string;
  email: string;
}

export class AccountError extends Error {
  constructor(public code: string) {
    const messages: Record<string, string> = {
      ...accountMessages,
      auth: 'ЖИ құралын қолдану үшін Оқу кеңістігі аккаунтына кіріңіз.',
      wait: 'Сұрау шегіне жеттіңіз. Біраздан кейін қайта көріңіз.',
      fields: 'Енгізілген деректерді тексеріңіз.',
      ai_config: 'ЖИ қызметі әлі бапталмаған.',
      ai_unavailable: 'ЖИ қазір жауап бермеді. Кейінірек қайта көріңіз.',
    };
    super(messages[code] || 'Байланыс үзілді. Қайта көріңіз.');
  }
}

export async function accountRequest<T>(path = '', input?: object): Promise<T> {
  const result = await learnerAccount(path, input);
  if (!result.ok) throw new AccountError(result.error);
  return result as T;
}
