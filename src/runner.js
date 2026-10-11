/* Кодты нақты орындау: Judge0 CE (ce.judge0.com), болмаса Wandbox. Ақысыз, кілтсіз. Worker арқылы шақырылады, сондықтан нәтижені студент өзгерте алмайды. */
const J0 = { python: 100, cpp: 105, javascript: 97, java: 91, c: 103 };
const WB = { python: 'cpython-3.12.7', cpp: 'gcc-13.2.0', javascript: 'nodejs-20.17.0', java: 'openjdk-jdk-21+35', c: 'gcc-13.2.0-c' };
export const LANGS = Object.keys(J0);
const cut = s => String(s || '').slice(0, 4000);

async function judge0(lang, code, stdin) {
  const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(22000),
    body: JSON.stringify({ language_id: J0[lang], source_code: code, stdin, cpu_time_limit: 5, wall_time_limit: 10 })
  });
  if (!res.ok) throw new Error('judge0 ' + res.status);
  const j = await res.json(), id = j.status && j.status.id;
  if (!id || id === 13 || id === 1 || id === 2) throw new Error('judge0 status ' + id);
  const extra = id === 5 ? '\nУақыт шегі асты (5 сек).' : '';
  return { ok: id === 3, stdout: cut(j.stdout), stderr: cut((j.compile_output || '') + (j.stderr || '') + extra), status: j.status.description, backend: 'judge0' };
}
async function wandbox(lang, code, stdin) {
  const res = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(28000),
    body: JSON.stringify({ compiler: WB[lang], code, stdin, options: '' })
  });
  if (!res.ok) throw new Error('wandbox ' + res.status);
  const j = await res.json();
  return { ok: j.status === '0', stdout: cut(j.program_output), stderr: cut((j.compiler_error || '') + (j.program_error || '')), status: j.status === '0' ? 'Accepted' : 'Error', backend: 'wandbox' };
}

export async function runCode(env, lang, code, stdin) {
  if (env.RUNNER_STUB) return { ok: true, stdout: env.RUNNER_STUB, stderr: '', status: 'stub', backend: 'stub' };
  if (!J0[lang]) return { ok: false, stdout: '', stderr: 'Бұл тіл қолдау таппайды.', status: 'bad_lang', backend: '' };
  code = String(code || '').slice(0, 20000); stdin = String(stdin || '').slice(0, 2000);
  try { return await judge0(lang, code, stdin); } catch (e) { /* келесі қызметке өтеміз */ }
  try { return await wandbox(lang, code, stdin); } catch (e) { /* ештеңе істей алмадық */ }
  return { ok: false, infra: true, stdout: '', stderr: 'Орындау қызметі жауап бермеді. Бірнеше секундтан кейін қайта көр.', status: 'unavailable', backend: '' };
}
