/* Shared Gemini transport. Never log API keys or student images. */
export function geminiKeys(env) {
  const values = [env.GEMINI_API_KEY, env.GEMINI_API_KEYS, env.GEMINI_API_KEY_2, env.GEMINI_API_KEY_3];
  return [...new Set(values.flatMap(value => {
    if (!value) return [];
    try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(String); } catch {}
    return String(value).split(/[\s,;]+/);
  }).map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean))];
}

export class GeminiError extends Error {
  constructor(kind, attempts = []) { super('Gemini: ' + kind); this.kind = kind; this.attempts = attempts; }
}

let cursor = 0;
async function nextKey(env, count) {
  if (env.DB) {
    // Atomic across concurrent requests and Worker instances; no keys are stored in D1.
    const row = await env.DB.prepare("INSERT INTO ai_rotation (name,next_key) VALUES ('gemini',?) ON CONFLICT(name) DO UPDATE SET next_key=(next_key+1)%? RETURNING next_key").bind(1 % count, count).first();
    return (row.next_key + count - 1) % count;
  }
  const index = cursor % count; cursor = (cursor + 1) % count; return index;
}

export async function geminiJson(env, parts, schema, options = {}) {
  const keys = geminiKeys(env);
  if (!keys.length) throw new GeminiError('config');
  const models = [...new Set([options.model || env.GEMINI_MODEL || 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-flash-latest'])];
  const start = await nextKey(env, keys.length), began = Date.now(), attempts = [], badKeys = new Set();
  const budget = options.budgetMs || 28000, timeout = options.timeoutMs || 8000;
  let kind = 'unavailable';
  for (const model of models) {
    for (let offset = 0; offset < keys.length; offset++) {
      const index = (start + offset) % keys.length;
      if (badKeys.has(index)) continue;
      const remaining = budget - (Date.now() - began);
      if (remaining < 100) throw new GeminiError(kind, attempts);
      let status = 0;
      try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[index] },
          signal: AbortSignal.timeout(Math.min(timeout, remaining)),
          body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: {
            temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema,
            maxOutputTokens: options.maxOutputTokens || 1800,
            ...(/^gemini-2\.5-flash/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {})
          } })
        });
        status = res.status;
        const j = await res.json();
        attempts.push({ key: index + 1, model, status });
        if (!res.ok) {
          const message = String(j.error?.message || '');
          if (status === 429) { kind = 'quota'; continue; }
          if (status >= 500) { kind = 'unavailable'; break; } // Service overload is model-wide.
          if (status === 401 || status === 403 || /API.?key.*(invalid|expired|not valid)/i.test(message)) { kind = 'auth'; badKeys.add(index); continue; }
          if (status === 404) { kind = 'model'; continue; }
          if (/image|mime|base64/i.test(message)) throw new GeminiError('image', attempts);
          kind = 'invalid_response'; continue;
        }
        const text = (j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
        const result = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
        if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid JSON object');
        if (options.validate && !options.validate(result)) throw new Error('Invalid grading response');
        return result;
      } catch (error) {
        if (error instanceof GeminiError) throw error;
        kind = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'timeout' : status === 200 ? 'invalid_response' : 'unavailable';
        if (!status) attempts.push({ key: index + 1, model, status: 0, error: kind });
      }
    }
  }
  throw new GeminiError(kind, attempts);
}
