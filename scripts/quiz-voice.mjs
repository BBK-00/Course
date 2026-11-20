/* Quiz жүргізушісінің дауысын жасайды: node scripts/quiz-voice.mjs klassika
   Мәтін өзгермесе, файл қайта жасалмайды (хэш бойынша). Дауыс: Microsoft Neural (kk-KZ).
   ЕСКЕРТУ: node-edge-tts Edge-тің оқу қызметін қолданады; өндіріске шығарар алдында ресми Azure Speech-ке ауыстыру керек. */
import { EdgeTTS } from 'node-edge-tts';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const LETTERS = ['А', 'Б', 'В', 'Г'];
export const VOICES = { er: 'kk-KZ-DauletNeural', ayel: 'kk-KZ-AigulNeural' };
const ORD = ['бірінші', 'екінші', 'үшінші', 'төртінші', 'бесінші', 'алтыншы', 'жетінші', 'сегізінші', 'тоғызыншы', 'оныншы', 'он бірінші', 'он екінші', 'он үшінші', 'он төртінші', 'он бесінші', 'он алтыншы', 'он жетінші', 'он сегізінші', 'он тоғызыншы', 'жиырмасыншы'];
const ordinal = n => ORD[n - 1] || n + '-ші';
const ONES = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз'], TENS = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан'];
export const numWords = n => n >= 100 ? String(n) : n === 0 ? 'нөл' : [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ');

/* Дауысталатын сегменттер: кілт → мәтін. Ойнатқыш (quiz/player.js) дәл осы кілттерді қолданады. */
export function segments(quiz) {
  const out = { welcome: quiz.welcome, end: quiz.end };
  quiz.rounds.forEach((r, ri) => {
    out[r.id + '-intro'] = `${ordinal(ri + 1)} кезең — «${r.name}». ${r.tagline || ''}`.trim();
    out[r.id + '-rules'] = `Бұл кезеңде ${numWords(r.questions.length)} сұрақ. Әр сұраққа ${numWords(r.seconds)} секунд беріледі. Дұрыс жауап үшін ${numWords(r.points || 1)} ұпай. Жауаптарыңызды қағазға жазыңыздар.`;
    out[r.id + '-collect'] = r.collect;
    r.questions.forEach((q, i) => {
      const n = i + 1, opts = q.sayOptions || q.options, lead = { photo: 'Суретке қараңыз. ', audio: 'Дыбысты тыңдаңыз. ', video: q.blind ? 'Экран қара болады, тек дыбысты мұқият тыңдаңыз. ' : 'Видеоға назар аударыңыз. ' }[q.type] || '';
      // сұрақ тек оқылады (нұсқалар / сәйкестік тізімі де); дұрыс жауап кезең соңында әр сұрақ бойынша бөлек айтылады
      const qt = String(q.sayQ || q.q).trim(); // дауыс үзілісі үшін сұрақ соңында тыныс белгісі болсын
      let read = `${ordinal(n)} сұрақ. ${lead}${qt}${/[.?!]$/.test(qt) ? '' : '.'}`;
      if (q.type === 'choice') read += ' ' + opts.map((o, k) => `${LETTERS[k]} нұсқасы — ${o}.`).join(' ');
      if (q.type === 'match') read += ' Сол жақта: ' + q.left.map((o, k) => `${k + 1} — ${o}`).join('; ') + '. Оң жақта: ' + q.right.map((o, k) => `${LETTERS[k]} — ${o}`).join('; ') + '.';
      out[`${r.id}-q${n}`] = read;
      let right;
      if (q.type === 'choice') right = `${LETTERS[q.correct]} нұсқасы: ${opts[q.correct]}`;
      else if (q.type === 'match') right = q.left.map((l, k) => `${l} — ${q.right[q.map[k]]}`).join('; ');
      else right = q.sayAnswer || q.answer;
      out[`${r.id}-a${n}`] = `${ordinal(n)} сұрақтың дұрыс жауабы — ${right}. ${q.sayNote || q.note || ''}`.trim();
    });
  });
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
  for (const [who] of Object.entries(VOICES)) {
    for (const file of existsSync(join(dir, who)) ? readdirSync(join(dir, who)) : []) {
      const key = file.replace(/.mp3$/, '');
      if (!(key in segs)) { unlinkSync(join(dir, who, file)); delete manifest[who + '/' + key]; console.log('өшірілді', who + '/' + file); }
    }
  }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
  console.log('дайын:', made, 'файл жаңартылды');
}
if (process.argv[1]?.endsWith('quiz-voice.mjs')) main();
