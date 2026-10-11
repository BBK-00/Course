// Жергілікті тест үшін: сайт файлдарын .dev-site қалтасына көшіреді (wrangler dev .wrangler өзгерісінен қайта жүктелмес үшін).
// Windows-та бақылаушы файлды ұстап тұрады, сондықтан файлдарды өшірмей, мазмұнын жазамыз.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
const copy = (from, to) => {
  if (statSync(from).isDirectory()) { mkdirSync(to, { recursive: true }); readdirSync(from).forEach(n => copy(from + '/' + n, to + '/' + n)); return; }
  const b = readFileSync(from);
  if (!existsSync(to) || !readFileSync(to).equals(b)) writeFileSync(to, b);
};
['index.html', 'assets', 'sandyq-adister', 'teacher'].forEach(p => copy(p, '.dev-site/' + p));
console.log('dev-site дайын');
