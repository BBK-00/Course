/* Quiz жүргізушісінің дауысын жасайды: node scripts/quiz-voice.mjs klassika
   Мәтін өзгермесе, файл қайта жасалмайды (хэш бойынша). Дауыс: Microsoft Neural (kk-KZ).
   ЕСКЕРТУ: node-edge-tts Edge-тің оқу қызметін қолданады; өндіріске шығарар алдында ресми Azure Speech-ке ауыстыру керек. */
import { EdgeTTS } from 'node-edge-tts';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const LETTERS = ['А', 'Б', 'В', 'Г'];
export const VOICES = { er: 'kk-KZ-DauletNeural', ayel: 'kk-KZ-AigulNeural' };
const ORD = ['бірінші', 'екінші', 'үшінші', 'төртінші', 'бесінші', 'алтыншы', 'жетінші', 'сегізінші', 'тоғызыншы', 'оныншы', 'он бірінші', 'он екінші', 'он үшінші', 'он төртінші', 'он бесінші'];
const ordinal = n => ORD[n - 1] || n + '-сұрақ';

/* Дауысталатын сегменттер: кілт → мәтін. Ойнатқыш (quiz/player.js) дәл осы кілттерді қолданады. */
export function segments(quiz) {
  const out = { welcome: quiz.welcome, end: quiz.end };
  for (const r of quiz.rounds) {
    out[r.id + '-intro'] = r.intro;
    out[r.id + '-collect'] = r.collect;
    const parts = [];
    r.questions.forEach((q, i) => {
      const n = i + 1, opts = (q.sayOptions || q.options);
      // сұрақ тек оқылады; дұрыс жауап кезең соңында бәрі бірге айтылады
      out[`${r.id}-q${n}`] = `${ordinal(n)} сұрақ. ${q.sayQ || q.q} ` + opts.map((o, k) => `${LETTERS[k]} нұсқасы — ${o}.`).join(' ') + ' Уақыт басталды!';
      parts.push(`${ordinal(n)} сұрақ. Дұрыс жауап — ${LETTERS[q.correct]} нұсқасы: ${opts[q.correct]}.`);
    });
    out[r.id + '-answers'] = 'Дұрыс жауаптарды тексереміз. ' + parts.join(' ');
  }
  return out;
}

const hash = (voice, text) => createHash('sha1').update(voice + '\n' + text).digest('hex').slice(0, 12);

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error('Қолданылуы: node scripts/quiz-voice.mjs <quiz-id>');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'quiz');
  const quiz = JSON.parse(readFileSync(join(root, 'data', id + '.json'), 'utf8'));
  const dir = join(root, 'audio', id);
  const manifestFile = join(dir, 'manifest.json');
  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
  const segs = segments(quiz);
  let made = 0;
  for (const [who, voice] of Object.entries(VOICES)) {
    mkdirSync(join(dir, who), { recursive: true });
    const tts = new EdgeTTS({ voice, lang: 'kk-KZ', outputFormat: 'audio-24khz-48kbitrate-mono-mp3', timeout: 40000 });
    for (const [key, text] of Object.entries(segs)) {
      const file = join(dir, who, key + '.mp3'), tag = who + '/' + key, h = hash(voice, text);
      if (manifest[tag] === h && existsSync(file)) continue;
      for (let attempt = 1; ; attempt++) {
        try { await tts.ttsPromise(text, file); break; }
        catch (e) { if (attempt >= 5) throw e; console.log('қайталау', tag, e.message); await new Promise(r => setTimeout(r, 6000 * attempt)); }
      }
      await new Promise(r => setTimeout(r, 1500)); // қызмет жиі сұрауды 429-пен тоқтатады
      manifest[tag] = h; made++;
      writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
      console.log('жасалды', tag);
    }
  }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
  console.log('дайын:', made, 'файл жаңартылды');
}
if (process.argv[1]?.endsWith('quiz-voice.mjs')) main();
