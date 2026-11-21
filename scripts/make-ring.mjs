/* Телефон қоңырауы (өзіміз синтездейміз): quiz/media/ani2/ring.wav */
import { writeFileSync, mkdirSync } from 'node:fs';
const RATE = 22050, total = 4.2, n = Math.floor(RATE * total), buf = Buffer.alloc(44 + n * 2);
for (let i = 0; i < n; i++) {
  const t = i / RATE; let v = 0;
  for (const st of [0.2, 2.2]) {
    const d = t - st;
    if (d >= 0 && d < 1.6) { // 1,6 с қоңырау, 20 Гц дірілмен
      const am = 0.55 + 0.45 * Math.sin(2 * Math.PI * 20 * d), edge = Math.min(1, d / 0.02, (1.6 - d) / 0.05);
      v += (Math.sin(2 * Math.PI * 440 * d) + Math.sin(2 * Math.PI * 480 * d)) * 0.3 * am * edge;
    }
  }
  buf.writeInt16LE(Math.max(-1, Math.min(1, v)) * 32767, 44 + i * 2);
}
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
mkdirSync('quiz/media/ani2', { recursive: true });
writeFileSync('quiz/media/ani2/ring.wav', buf);
console.log('ring.wav', Math.round(buf.length / 1024) + ' КБ');
