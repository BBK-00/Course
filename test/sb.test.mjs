/* Scratch жобасын тексеру сынағы: node test/sb.test.mjs */
import { zip } from '../src/xlsx.js';
import { gradeSb3 } from '../src/scratch.js';

let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fail++; };

import { project } from './sbproj.mjs';
const sb3 = pj => zip({ 'project.json': JSON.stringify(pj) }).buffer;
const EX = 'Рет қайталау циклі қадамдарды 20 рет қайталайды. Әрқашан қайталау ойын бітпейінше тоқтамайды. Шарт орындалғанша қайталау кейіпкер мәреге тигенше күтеді.';
const pts = r => r.sheets.map(s => s.pts);
const tot = r => pts(r).reduce((a, b) => a + b, 0);

let r = await gradeSb3(sb3(project()), EX);
ok(!r.error && pts(r)[0] === 20 && pts(r)[1] === 30 && pts(r)[2] === 50, 'толық дұрыс ойын 20/30/50: ' + pts(r));
if (r.sheets) r.sheets.forEach(s => s.items.filter(x => x.got < x.max).forEach(x => console.log('    жоғалды', x.id, x.got, '/', x.max)));
ok(r.fp && r.fp.length === 20, 'жоба саусақ ізі бар');

r = await gradeSb3(sb3(project({ cut: ['keys'] })), EX); ok(pts(r)[0] === 4, 'пернелерсіз 1-бөлім 4 (тек спрайттар): ' + pts(r)[0]);
r = await gradeSb3(sb3(project({ cut: ['obst'] })), EX); ok(pts(r)[1] === 0, 'кедергісіз 2-бөлім 0: ' + pts(r)[1]);
r = await gradeSb3(sb3(project({ cut: ['until'] })), EX); ok(pts(r)[2] === 17 && pts(r)[0] === 20, 'шартты циклсіз 3-бөлім тек анимация+дыбыс+түсіндіру (' + pts(r)[2] + ')');
r = await gradeSb3(sb3(project()), ''); ok(pts(r)[2] === 40, 'түсіндірусіз 3-бөлім 40: ' + pts(r)[2]);
r = await gradeSb3(sb3(project({ costumes: 1, sounds: 0 })), EX); ok(pts(r)[2] === 50 - 3 - 2, 'костюм жоқ, дыбыс файлы жоқ: ' + pts(r)[2]);
r = await gradeSb3(sb3({ targets: [{ isStage: true, name: 'Stage', blocks: {}, costumes: [], sounds: [] }] }), '');
ok(!r.error && tot(r) === 0 && r.fp === '', 'бос жоба 0 балл, саусақ ізі жоқ');
r = await gradeSb3(zip({ 'a.txt': 'x' }).buffer, ''); ok(r.error === 'bad_file', 'project.json жоқ → bad_file');
r = await gradeSb3(new Uint8Array([1, 2, 3]).buffer, ''); ok(r.error === 'bad_file', 'Scratch емес файл → bad_file');
const a = await gradeSb3(sb3(project({ seed: 'a' })), EX), b = await gradeSb3(sb3(project({ seed: 'b' })), EX);
ok(a.fp !== b.fp, 'екі студенттің жобасының ізі әртүрлі (ID-лер бірегей)');

console.log(fail ? '\n' + fail + ' қате' : '\nБарлығы дұрыс'); process.exit(fail ? 1 : 0);
