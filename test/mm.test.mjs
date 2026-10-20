/* Куиз-презентацияны тексеру сынағы: node test/mm.test.mjs */
import { gradePptx, designGrade, compose } from '../src/mm.js';

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fail++; };
import { pptx } from './mmproj.mjs';
const stub = { GEMINI_STUB: '1' };
const tot = async (b, name = 'АБДОЛЛА_ЖАНГҮЛ') => { const g = await gradePptx(b, name); if (g.error) return g; const r = compose(g, await designGrade(stub, new ArrayBuffer(5))); return { g, r, pts: r.map(x => x.pts) }; };

let x = await tot(pptx());
ok(!x.error && x.pts[0] === 20 && x.pts[1] === 30, 'толық құрылым: сұрақ+жауап 20, медиа 30: ' + x.pts);
ok(x.pts[2] === 14, 'дизайн қатаң: 1,4,7,10-слайд 2, қалғаны 1 → 14 (' + x.pts[2] + ')');
x = await tot(pptx({ cut: ['1vid'] })); ok(x.pts[1] === 28, 'бейне жоқ: медиа 28 (' + x.pts[1] + ')');
ok(x.r[2].items[0].got === 1, 'талап толық емес слайдқа дизайн ең көбі 1 (1-слайд: ' + x.r[2].items[0].got + ')');
x = await tot(pptx({ noReveal: [2, 3] })); ok(x.pts[0] === 18, 'жауап басқанда ашылмаса −1: ' + x.pts[0]);
x = await tot(pptx({ slides: 8 })); ok(x.pts[0] === 16 && x.pts[1] === 24, '8 слайд ғана: жоқ слайдтар 0 (' + x.pts + ')');
x = await tot(pptx({ tiny: true })); ok(x.pts[1] === 0, 'бос/кішкентай медиа файлдар есептелмейді');
x = await tot(pptx(), 'ЕРЛАН_СЕРІКОВ'); ok(x.error === 'no_author', 'бірінші слайдта автордың аты жоқ → бас тартылады');
x = await gradePptx(new Uint8Array([1, 2, 3]).buffer, 'Тест'); ok(x.error === 'bad_pptx', 'pptx емес файл → bad_pptx');
x = await tot(pptx()); const y = await tot(pptx({ author: 'Абдолла Жангүл', slides: 10 }));
ok(x.g.fp && x.g.fp === y.g.fp, 'бірдей мәтін → бірдей саусақ ізі (көшіруді тану)');

console.log(fail ? '\n' + fail + ' қате' : '\nБарлығы дұрыс'); process.exit(fail ? 1 : 0);
