/* Excel жұмысының тексерісі: файл жасау, оқу, бағалау, бөгде файлды қабылдамау. node test/xl.test.mjs */
import { dataFor, buildFile, gradeFile } from '../src/excel.js';
import { readXlsx, shiftFormula } from '../src/xlsx.js';
import { solution as sol } from './xlsol.mjs';

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const STAMP = 'a1b2c3d4e5', owner = 'Студент: Тест · Топ · ID ' + STAMP;
const D = dataFor(5, 2);
const solution = (D, opt = {}) => sol(D, opt, opt.stamp || STAMP);

const total = r => r.sheets.map(s => s.pts);

console.log('Бос шаблон');
const tpl = buildFile(D, owner);
ok(tpl.length > 3000, 'файл жасалды (' + tpl.length + ' байт)');
const wb = await readXlsx(tpl.buffer);
ok(wb.length === 3 && wb[0].name === '1-Оңай', 'үш лист оқылды');
ok(String(wb[0].cells.get('A2').v).includes(STAMP), 'иесінің ID жолы бар');
ok(wb[1].cells.get('B3').v === D.s2.disc, 'бастапқы мәндер оқылады');
let r = await gradeFile(D, tpl.buffer, STAMP);
ok(!r.error && total(r).every(x => x === 0), 'бос шаблон 0 балл: ' + total(r));

console.log('Толық дұрыс жұмыс');
r = await gradeFile(D, solution(D).buffer, STAMP);
ok(!r.error && total(r)[0] === 14 && total(r)[1] === 20 && total(r)[2] === 25, 'сұрыпталмаған дұрыс жұмыс 14/20/25 (1.7 жоқ): ' + total(r));
if (!r.error) r.sheets.forEach((s, i) => s.items.filter(x => x.got < x.max).forEach(x => console.log('    жоғалды', i + 1, x.id, x.got, '/', x.max)));

console.log('Сұрыпталған кесте (1.7)');
r = await gradeFile(D, solution(D, { sort: true }).buffer, STAMP);
ok(!r.error && total(r)[0] === 15, 'сұрыпталғаннан кейін де 15/15: ' + total(r));

console.log('$ қойылмаса');
r = await gradeFile(D, solution(D, { noAbs: true }).buffer, STAMP);
ok(!r.error && total(r)[1] < 20 && total(r)[1] > 10, 'абсолютті сілтеме қате → 2-лист аз: ' + total(r));

console.log('Бөгде файл');
r = await gradeFile(D, solution(D, { stamp: '0000000000' }).buffer, STAMP);
ok(r.error === 'not_yours', 'басқа ID → бас тартылады');
const D2 = dataFor(6, 2);
r = await gradeFile(D2, solution(D).buffer, STAMP);
ok(r.error === 'not_yours', 'басқа студенттің деректері (өз ID қойылса да) → бас тартылады');
const other = JSON.stringify(dataFor(5, 2)) === JSON.stringify(dataFor(6, 2));
ok(!other, 'екі студенттің сандары әртүрлі');
r = await gradeFile(D, new Uint8Array([1, 2, 3, 4]).buffer, STAMP);
ok(r.error === 'bad_file', 'жарамсыз файл → bad_file');

console.log('Ортақ формула (Excel көшіргенде жазатын түрі)');
ok(shiftFormula('$A2*B$1', 3, 2) === '$A5*D$1', 'shiftFormula: $A2*B$1 → $A5*D$1');
ok(shiftFormula('SUM(B2:B5)+LOG10(A1)', 1, 0) === 'SUM(B3:B6)+LOG10(A2)', 'shiftFormula: функция аттары бұзылмайды');
{
  const tpl2 = await readXlsx(solution(D).buffer);
  ok(tpl2[2].cells.get('C7').f === '$A7*C$5', 'формулалар оқылады');
}

console.log(fail ? '\n' + fail + ' қате' : '\nБарлығы дұрыс');
process.exit(fail ? 1 : 0);
