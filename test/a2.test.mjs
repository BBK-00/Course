/* АКТ 2: 1–4 тапсырмаларды бағалау (src/a2.js) */
import { gradeA2, A2_MAX } from '../src/a2.js';
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
const sum = g => g.sheets.map(s => s.pts);
const GOOD = {
  t1: { kbd: 0, mouse: 0, scan: 0, mic: 0, cam: 0, mon: 3, prn: 3, snd: 3, hdd: 2, ram: 2, cpu: 1, gpu: 1 },
  t2: { sw: { os: 0, drv: 0, arc: 0, br: 1, txt: 1, ide: 2 }, g: ['Аппаратты басқарады, құрылғылардың жұмысын үйлестіреді', 'Пайдаланушының нақты міндеттерін орындайды', 'Жаңа бағдарламаларды жасауға арналған'] },
  t3: ['Intel Core i5-10400F', '8 ГБ', 'Windows 11', '64-биттік', '237 ГБ'],
  types: { cpu: 'hw', ram: 'hw', ssd: 'hw', mb: 'hw', os: 'sw', drv: 'sw', br: 'sw', av: 'sw' },
  funcs: { cpu: 'Барлық есептеулерді орындайды, компьютердің миы', ram: 'Деректерді уақытша және жылдам сақтайды', ssd: 'Файлдарды ұзақ мерзімге сақтайды', mb: 'Барлық құрылғыларды бір-бірімен байланыстырады', os: 'Компьютердің жұмысын басқарады, интерфейс береді', drv: 'ОЖ мен құрылғы арасындағы байланысты қамтамасыз етеді', br: 'Интернеттегі сайттарды қарауға арналған', av: 'Компьютерді вирустардан қорғайды' },
  pairs: [{ a: 'os', b: 'cpu', t: 'Операциялық жүйе процессордың жұмысын басқарады және программаларды орындатады' }, { a: 'drv', b: 'mb', t: 'Драйвер аналық тақтадағы құрылғыны жүйеге таныту үшін қажет' }]
};
{
  let g = gradeA2(GOOD); ok(sum(g).join() === [A2_MAX[1], A2_MAX[2], A2_MAX[3]].join() && sum(g).reduce((a, b) => a + b) === 70, 'толық жауап: ' + sum(g).join('/') + ' = 70');
  g = gradeA2({}); ok(sum(g).join() === '0,0,0', 'бос жауап: 0');
  g = gradeA2({ ...GOOD, t1: { kbd: 1, mouse: 0 } }); ok(g.sheets[0].items.filter(i => i.id.startsWith('1.')).reduce((a, i) => a + i.got, 0) === 1, '1-тапсырма: қате/жоқ жауап ұпай бермейді');
  g = gradeA2({ ...GOOD, t2: { sw: { os: 1, drv: 0 }, g: ['қысқа', '', 'жаңа бағдарлама жасау'] } }); ok(g.sheets[0].items.filter(i => i.id.startsWith('2.')).reduce((a, i) => a + i.got, 0) === 1 + 2, '2-тапсырма: 1 топ дұрыс + 1 қызмет мәтіні (2)');
  g = gradeA2({ ...GOOD, t3: ['', '8', 'Windows', '64', '237'] }); ok(g.sheets[0].items.filter(i => i.id.startsWith('3.')).reduce((a, i) => a + i.got, 0) === 4, '3-тапсырма: өлшем бірлігі жоқ → ұпай кемиді');
  g = gradeA2({ ...GOOD, types: { cpu: 'sw', ram: 'hw' } }); ok(g.sheets[1].items.filter(i => i.id.startsWith('4.t')).reduce((a, i) => a + i.got, 0) === 2, '4: түрі қате/жоқ');
  g = gradeA2({ ...GOOD, funcs: { ...GOOD.funcs, cpu: 'не білмеймін мен', ram: 'x' } }); ok(g.sheets[1].items.find(i => i.id === '4.f1').got === 1 && g.sheets[1].items.find(i => i.id === '4.f2').got === 0, '4: кілт сөзсіз мәтін = 1, тым қысқа = 0');
  g = gradeA2({ ...GOOD, pairs: [{ a: 'cpu', b: 'ram', t: 'Процессор жедел жадпен жұмыс істейді және деректі алады' }, GOOD.pairs[1]] }); ok(g.sheets[2].items[0].got === 0 && g.sheets[2].items[1].got === 4, 'екі аппараттық жұп қабылданбайды');
  g = gradeA2({ ...GOOD, pairs: [GOOD.pairs[0], { a: 'cpu', b: 'os', t: GOOD.pairs[0].t }] }); ok(g.sheets[2].items[1].got === 0, 'қайталанған жұп қабылданбайды');
  g = gradeA2(null); ok(sum(g).join() === '0,0,0', 'null қауіпсіз');
  g = gradeA2({ t1: 'x', t2: 5, t3: 'q', types: 1, funcs: 'abc', pairs: 'x' }); ok(g.sheets.length === 3, 'бұзылған кіріс қауіпсіз');
  ok(gradeA2(GOOD).fpText.length > 120 && gradeA2({}).fpText === '', 'саусақ ізі тек толық жауапта');
  process.exit(fails ? 1 : 0);
}
