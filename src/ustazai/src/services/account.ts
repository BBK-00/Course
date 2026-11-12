export interface Account {
  name: string;
  email: string;
}

export class AccountError extends Error {
  constructor(public code: string) {
    const messages: Record<string, string> = {
      auth: 'ЖИ құралын қолдану үшін Оқу кеңістігі аккаунтына кіріңіз.',
      wait: 'Сұрау шегіне жеттіңіз. Біраздан кейін қайта көріңіз.',
      credentials: 'Электрондық пошта немесе құпиясөз дұрыс емес.',
      email_taken: 'Бұл электрондық пошта тіркелген. Аккаунтқа кіріңіз.',
      fields: 'Енгізілген деректерді тексеріңіз.',
      ai_config: 'ЖИ қызметі әлі бапталмаған.',
      ai_unavailable: 'ЖИ қазір жауап бермеді. Кейінірек қайта көріңіз.',
    };
    super(messages[code] || 'Байланыс үзілді. Қайта көріңіз.');
  }
}

export async function accountRequest<T>(path = '', input?: object): Promise<T> {
  const response = await fetch('/api/account' + path, input ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  } : undefined);
  const result = await response.json();
  if (!response.ok || !result.ok) throw new AccountError(result.error);
  return result as T;
}
