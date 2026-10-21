/* АКТ 2: 4-тапсырманы бағалау (src/a2.js) */
import { gradeA2, A2_MAX } from '../src/a2.js';
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const sum = g => g.sheets.map(s => s.pts);
const GOOD = {
  types: { cpu: 'hw', ram: 'hw', ssd: 'hw', mb: 'hw', os: 'sw', drv: 'sw', br: 'sw', av: 'sw' },
  funcs: { cpu: 'Барлық есептеулерді орындайды, компьютердің миы', ram: 'Деректерді уақытша және жылдам сақтайды', ssd: 'Файлдарды ұзақ мерзімге сақтайды', mb: 'Барлық құрылғыларды бір-бірімен байланыстырады', os: 'Компьютердің жұмысын басқарады, интерфейс береді', drv: 'ОЖ мен құрылғы арасындағы байланысты қамтамасыз етеді', br: 'Интернеттегі сайттарды қарауға арналған', av: 'Компьютерді вирустардан қорғайды' },
  pairs: [{ a: 'os', b: 'cpu', t: 'Операциялық жүйе процессордың жұмысын басқарады және программаларды орындатады' }, { a: 'drv', b: 'mb', t: 'Драйвер аналық тақтадағы құрылғыны жүйеге таныту үшін қажет' }]
};
let g = gradeA2(GOOD); ok(sum(g).join() === [A2_MAX[1], A2_MAX[2], A2_MAX[3]].join(), 'толық жауап: ' + sum(g).join('/') + ' = 70');
g = gradeA2({}); ok(sum(g).join() === '0,0,0', 'бос жауап: 0');
g = gradeA2({ ...GOOD, types: { cpu: 'sw', ram: 'hw' } }); ok(g.sheets[0].pts === 3, 'түрі қате/жоқ: тек 1 дұрыс = 3');
g = gradeA2({ ...GOOD, funcs: { ...GOOD.funcs, cpu: 'не білмеймін мен', ram: 'x' } }); ok(g.sheets[1].items[0].got === 1 && g.sheets[1].items[1].got === 0, 'кілт сөзсіз мәтін = 1, тым қысқа = 0');
g = gradeA2({ ...GOOD, pairs: [{ a: 'cpu', b: 'ram', t: 'Процессор жедел жадпен жұмыс істейді және деректі алады' }, GOOD.pairs[1]] }); ok(g.sheets[2].items[0].got === 0 && g.sheets[2].items[1].got === 7, 'екі аппараттық жұп қабылданбайды');
g = gradeA2({ ...GOOD, pairs: [GOOD.pairs[0], { a: 'cpu', b: 'os', t: GOOD.pairs[0].t }] }); ok(g.sheets[2].items[1].got === 0, 'қайталанған жұп (кері ретпен) қабылданбайды');
g = gradeA2({ ...GOOD, pairs: [{ a: 'os', b: 'cpu', t: 'қысқа' }, GOOD.pairs[1]] }); ok(g.sheets[2].items[0].got === 3, 'жұп дұрыс, түсініктеме қысқа = 3');
g = gradeA2(null); ok(sum(g).join() === '0,0,0', 'null қауіпсіз');
g = gradeA2({ types: { cpu: 'hw' }, funcs: 'abc', pairs: 'x' }); ok(Array.isArray(g.sheets) && g.sheets.length === 3, 'бұзылған кіріс қауіпсіз');
console.log(g.fpText === '' ? '' : ''); ok(gradeA2(GOOD).fpText.length > 120 && gradeA2({}).fpText === '', 'саусақ ізі тек толық жауапта');
process.exit(fails ? 1 : 0);
