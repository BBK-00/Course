/* for/range қадамдық моделін нақты Python-мен салыстырады: node test/pytrace.test.mjs */
import '../assets/py-trace.js';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs'; import { execFileSync } from 'node:child_process'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
const T = globalThis.PyTrace; let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✕ ') + m); if (!c) fails++; };

/* 1) range мәндері */
const rc = []; for (let a = -6; a <= 6; a += 2) for (let b = -6; b <= 8; b += 3) for (const c of [1, 2, 3, -1, -2, -3]) rc.push([a, b, c]);
/* 2) бағдарламалар */
const progs = T.PRESETS.map(p => p.code);
for (const [a, b, c] of [[0, 5, 1], [1, 6, 1], [10, 0, -3], [5, 5, 1], [3, 1, 1], [0, 20, 5], [-3, 3, 1], [2, 11, 2]]) {
  const r = c === 1 && a === 0 ? 'range(' + b + ')' : c === 1 ? 'range(' + a + ', ' + b + ')' : 'range(' + a + ', ' + b + ', ' + c + ')';
  progs.push('for i in ' + r + ':\n    print(i)');
  progs.push('s = 0\nfor i in ' + r + ':\n    s += i\nprint(s)');
  progs.push('n = 0\nfor i in ' + r + ':\n    n = n + 1\nprint("қайталау:", n)');
}
progs.push('for i in range(3):\n    for j in range(2):\n        print(i, j)');
progs.push('for i in range(1, 4):\n    print("a" + str(i))');
progs.push('x = 7\nfor i in range(3):\n    x = x * 2 - i\nprint(x)');
progs.push('t = 100\nfor day in range(1, 8):\n    t = t + 300\nprint(t)');
progs.push('for i in range(1, 4):\n    print(i ** 2, i // 2, i % 2, -i)');
progs.push('s = 0\nfor i in range(10, 0, -3):\n    s = s * 2 + i\nprint(s)');
progs.push('for i in range(2):\n    print("*" * (i + 1))   # түсініктеме');
progs.push('a = 5\nb = 2\nprint(a // b, a % b, a ** b, -a // b, -a % b)');
progs.push('for i in range(1, 4):\n    print(i / 2)');
progs.push('for i in range(1, 11):\n    if i % 2 == 0:\n        print(i)');
progs.push('s = 0\nfor i in range(1, 11):\n    if i % 3 == 0:\n        s = s + i\nprint(s)');
progs.push('k = 0\ns = 0\nfor i in range(1, 8):\n    if i % 2 == 0:\n        k = k + 1\n        s = s + i\nprint(k)\nprint(s)');
progs.push('for i in range(1, 6):\n    if i > 2 and i < 5:\n        print(i)\n    else:\n        print("-")');
progs.push('x = 5\nif x > 3 or x < 0:\n    print("иә")\nelse:\n    print("жоқ")');
progs.push('for i in range(1, 6):\n    if not i == 3:\n        print(i)');
progs.push('n = 0\nfor i in range(10):\n    if i % 4 == 0:\n        n += 1\nprint(n)');
progs.push('for i in range(1, 5):\n    if i == 2:\n        print("екі")');
progs.push('for i in range(1, 31):\n    if i % 4 == 0:\n        print(i)');
progs.push('a = 3\nb = 0\nprint(a and b, a or b, not a, a > 2, a == 3.0)');
const dir = mkdtempSync(join(tmpdir(), 'pt-')); writeFileSync(dir + '/p.json', JSON.stringify({ rc, progs }));
writeFileSync(dir + '/e.py', 'import json,sys,io,contextlib\nd=json.load(open(sys.argv[1],encoding="utf-8"));o={"rc":[list(range(a,b,c)) for a,b,c in d["rc"]],"p":[]}\nfor p in d["progs"]:\n    g={};buf=io.StringIO()\n    with contextlib.redirect_stdout(buf): exec(p,g)\n    v={k:x for k,x in g.items() if not k.startswith("__")}\n    t=buf.getvalue();o["p"].append({"out":t.split("\\n")[:-1] if t else [],"vars":v})\njson.dump(o,open(sys.argv[2],"w",encoding="utf-8"))');
execFileSync('py', ['-3', dir + '/e.py', dir + '/p.json', dir + '/o.json']);
const py = JSON.parse(readFileSync(dir + '/o.json', 'utf8'));

const badR = rc.filter((c, i) => JSON.stringify(T.rangeVals(...c)) !== JSON.stringify(py.rc[i]));
ok(badR.length === 0, 'range мәндері Python-мен сәйкес (' + rc.length + ' жағдай)');
ok(T.rangeVals(1, 5, 0) === null, 'step = 0 танылады');
let badP = 0, badF = 0;
progs.forEach((p, i) => {
  const r = T.run(p), want = py.p[i];
  if (!r.ok) { badP++; if (badP < 6) console.log('ҚАТЕ', JSON.stringify(p), r.msg); return; }
  const outOk = JSON.stringify(r.out) === JSON.stringify(want.out);
  const varsOk = Object.keys(want.vars).every(k => r.vars[k] === want.vars[k]) && Object.keys(r.vars).length === Object.keys(want.vars).length;
  if (!outOk || !varsOk) { badP++; if (badP < 6) console.log('DIFF', JSON.stringify(p), '\n js', JSON.stringify(r.out), JSON.stringify(r.vars), '\n py', JSON.stringify(want.out), JSON.stringify(want.vars)); }
  const f = r.frames; if (!f.length || !f[f.length - 1].done || !f.every((x, k) => k === 0 || x.n >= 0) || f.some(x => x.line < 0 || x.line >= r.lines.length)) badF++;
});
ok(badP === 0, 'бағдарламалар Python-мен бірдей нәтиже мен айнымалылар береді (' + progs.length + ' бағдарлама)');
ok(badF === 0, 'кадрлар: соңғысы done, жол нөмірлері дұрыс');

/* кадр құрылымы: сәлем × 5 */
const h = T.run(T.PRESETS[0].code), it = h.frames.filter(f => f.kind === 'iter');
ok(it.length === 5 && it[0].tape.pos === 0 && it[4].tape.pos === 4 && h.frames.find(f => f.kind === 'end').tape.pos === 5 && h.out.length === 5, 'Сәлем × 5: 5 қайталау, робот орны 0…4, соңында stop');
const sm = T.run(T.PRESETS[2].code).frames; ok(sm.filter(f => f.kind === 'assign').length === 6 && sm[sm.length - 1].out[0] === '15' && sm.find(f => f.kind === 'assign' && f.vars.find(v => v.n === 's' && v.v === '3' && v.ch)), 'қосынды: s өзгерген кадрлар белгіленеді (ch)');
ok(T.run('for i in range(0):\n    print(i)').frames.some(f => /бос/.test(f.cap)), 'бос диапазон: түсініктеме бар');

/* қате жағдайлар */
const E = (src, re, name) => { const r = T.run(src); ok(!r.ok && re.test(r.msg), name + ': ' + (r.msg || '').slice(0, 70)); };
E('for i in range(5)\n    print(i)', /қос нүкте/, 'қос нүкте жоқ');
E('for i in range(5):\nprint(i)', /шегінген жол/, 'шегініс жоқ');
E('for i in range(1, 5, 0):\n    print(i)', /қадамы 0/, 'step = 0');
E('print(x)', /«x» айнымалысы әлі жасалмаған/, 'жасалмаған айнымалы');
E('s += 1', /әлі жасалмаған/, 'жасалмаған айнымалыға +=');
E('for i in range(2.5):\n    print(i)', /бүтін сан/, 'range ішінде бөлшек');
E('for i in range(1000):\n    print(i)', /тым ұзақ/, 'тым ұзақ цикл');
E('for x in [1, 2]:\n    print(x)', /тек «for i in range/, 'тізім бойынша цикл қолдау таппайды');
E('print("a" + 1)', /мәтін мен санды қосуға болмайды/, 'мәтін + сан');
E('x = 1\n    y = 2', /шегінісі артық/, 'артық шегініс');
E('print(5 // 0)', /нөлге бөлуге/, 'нөлге бөлу');
E('print("abc)', /тырнақ/, 'тырнақ жабылмаған');
E('x = 1\nif x > 0\n    print(x)', /қос нүкте/, 'if: қос нүкте жоқ');
E('x = 1\nif x > 0:\nprint(x)', /if-тен кейін шегінген жол/, 'if: шегініс жоқ');
E('print("a" < 1)', /салыстыруға болмайды/, 'мәтінді санмен салыстыру');
const cf = T.run('for i in range(1, 5):\n    if i % 2 == 0:\n        print(i)').frames.filter(f => f.kind === 'cond');
ok(cf.length === 4 && cf.map(f => f.cond).join() === 'false,true,false,true' && /True/.test(cf[1].cap) && /i % 2 == 0/.test(cf[0].cap), 'cond кадрлары: шарт нәтижесі мен түсініктемесі');
console.log(fails ? '\nҚателер: ' + fails : '\nБәрі өтті'); process.exit(fails ? 1 : 0);
