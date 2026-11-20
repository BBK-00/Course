/* «Ән мен әнші» куизіне әуендер жасайды: қоғамдық меншіктегі әуендерді (авторлық құқық мерзімі өткен) WAV етіп синтездейді.
   Іске қосу: node scripts/make-melodies.mjs  →  quiz/media/ani/r1-*.wav */
import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 22050, BPM = 112, BEAT = 60 / BPM;
const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = name => { const m = /^([A-G]#?)(\d)$/.exec(name); return 440 * 2 ** ((NOTES[m[1]] + 12 * (Number(m[2]) + 1) - 69) / 12); };

/* әуен: [нота, ұзақтығы (бит)] */
const TUNES = {
  'r1-1': [['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1], ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['E4', 1.5], ['D4', .5], ['D4', 2]], // Қуаныш гимні (Бетховен)
  'r1-2': [['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2], ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2]], // Туған күніңмен
  'r1-3': [['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['G4', 1], ['C4', 1.5], ['D4', .5], ['E4', 3]], // Jingle Bells
  'r1-4': [['E5', .5], ['D#5', .5], ['E5', .5], ['D#5', .5], ['E5', .5], ['B4', .5], ['D5', .5], ['C5', .5], ['A4', 1.5], ['C4', .5], ['E4', .5], ['A4', .5], ['B4', 1.5], ['E4', .5], ['G#4', .5], ['B4', .5], ['C5', 2]], // Элиза үшін (Бетховен)
  'r1-5': [['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2]] // Жылтыр жұлдызша (Моцарт)
};

function render(tune) {
  const total = tune.reduce((a, [, d]) => a + d, 0) * BEAT + 1.2;
  const n = Math.floor(RATE * total), out = new Float32Array(n);
  let t0 = 0.15;
  for (const [name, beats] of tune) {
    const f = freq(name), dur = beats * BEAT, len = Math.floor(RATE * (dur + 0.35));
    for (let i = 0; i < len; i++) {
      const t = i / RATE, idx = Math.floor((t0 + t) * RATE); if (idx >= n) break;
      // жұмсақ «пианино/металлофон» тембрі: гармоникалар + әлсірейтін дыбыс
      const env = Math.min(1, t / 0.012) * Math.exp(-t * (2.4 / Math.max(.4, dur))) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.35));
      const v = Math.sin(2 * Math.PI * f * t) + .45 * Math.sin(4 * Math.PI * f * t) + .2 * Math.sin(6 * Math.PI * f * t) + .08 * Math.sin(8 * Math.PI * f * t);
      out[idx] += v * env * 0.28;
    }
    t0 += dur;
  }
  const buf = Buffer.alloc(44 + n * 2);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, out[i])) * 32767, 44 + i * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  return { buf, seconds: total };
}

mkdirSync('quiz/media/ani', { recursive: true });
for (const [id, tune] of Object.entries(TUNES)) {
  const { buf, seconds } = render(tune);
  writeFileSync(`quiz/media/ani/${id}.wav`, buf);
  console.log(id, seconds.toFixed(1) + ' с', Math.round(buf.length / 1024) + ' КБ');
}
