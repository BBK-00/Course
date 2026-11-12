/* Логикалық өрнек қозғалтқышын нақты Python-мен салыстырады: node test/pybool.test.mjs */
import '../assets/py-bool.js';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs'; import { execFileSync } from 'node:child_process'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
const B = globalThis.PyBool; let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296, pick = a => a[Math.floor(rnd() * a.length)];
const atom = () => pick(['x', 'y', 'x', 'y', String(Math.floor(rnd() * 15)), 'x + 1', 'y - 2', 'x % 2', 'x * y', '(x + y)']);
const cmp = () => atom() + ' ' + pick(['<', '>', '<=', '>=', '==', '!=']) + ' ' + atom() + (rnd() < .12 ? ' ' + pick(['<', '>']) + ' ' + atom() : '');
function gen(d){ const r = rnd(); if (d <= 0 || r < .3) return cmp(); if (r < .42) return 'not ' + (rnd() < .5 ? '(' + gen(d - 1) + ')' : cmp()); if (r < .5) return '(' + gen(d - 1) + ')'; if (r < .55) return pick(['True', 'False']); return gen(d - 1) + ' ' + pick(['and', 'or']) + ' ' + gen(d - 1); }
const list = ['True or False and False', 'not True or True', 'x > 2 and x < 10', 'a == 1 or 2', 'x > 5 or x', 'not x > 5', '1 < x < 10', 'x % 2 == 0 and y % 2 == 0', 'x and y', 'x or y', '0 or 5', '3 and 0'];
while (list.length < 500) list.push(gen(3));
const cases = []; for (const s of list) for (const v of [[3, 4], [0, 9], [12, 0], [7, 7], [-2, 5]]) cases.push([s.replace(/\ba\b/g, 'x'), v[0], v[1]]);
const dir = mkdtempSync(join(tmpdir(), 'pb-')); writeFileSync(dir + '/c.json', JSON.stringify(cases));
writeFileSync(dir + '/e.py', 'import json,sys\ncs=json.load(open(sys.argv[1]));o=[]\nfor s,x,y in cs:\n    try: v=eval(s,{"x":x,"y":y}); o.append(repr(v))\n    except ZeroDivisionError: o.append("ZDE")\njson.dump(o,open(sys.argv[2],"w"))');
execFileSync('py', ['-3', dir + '/e.py', dir + '/c.json', dir + '/o.json']);
const py = JSON.parse(readFileSync(dir + '/o.json', 'utf8')); let bad = 0, stepBad = 0, n = 0;
cases.forEach(([s, x, y], i) => {
  n++; let mine; try { mine = B.fmt(B.evalTree(B.parse(s, { x, y }))); } catch (e) { mine = e.kk && /Нөлге/.test(e.kk) ? 'ZDE' : 'ERR ' + e.message; }
  if (mine !== py[i]) { bad++; if (bad < 12) console.log('DIFF', s, x, y, 'py', py[i], 'js', mine); return; }
  if (mine !== 'ZDE') { try { const fr = B.steps(s, { x, y }, t => t); if (B.fmt(fr[fr.length - 1].value) !== mine) { stepBad++; if (stepBad < 6) console.log('STEP', s, x, y, B.fmt(fr[fr.length - 1].value), mine); } } catch (e) { stepBad++; if (stepBad < 6) console.log('STEPERR', s, x, y, e.message); } }
});
ok(bad === 0, 'мән Python-мен сәйкес (' + n + ' жағдай)');
ok(stepBad === 0, 'қадамдық орындаудың соңғы мәні дұрыс');
const f = B.steps('x > 10 and x < 20', { x: 15 }, t => t);
ok(f.length >= 5 && /Айнымалылардың мәндері/.test(f[1].cap) && f[f.length - 1].value === true, 'қадамдар: айнымалы қойылады → екі салыстыру → and → нәтиже');
['x >', '(x > 3', 'x > 3)', 'x = 3', 'z > 3', 'x > 3 y', '5 // 0 > 1'].forEach(s => { let e = ''; try { B.steps(s, { x: 1 }, t => t); } catch (er) { e = er.kk || ''; } ok(!!e, 'қате өрнек түсінікті хабар береді: ' + s + ' → ' + e); });
console.log(fails ? '\nҚателер: ' + fails : '\nБәрі өтті');
process.exit(fails ? 1 : 0);
