/* Python пәні. 7-сабақ: «Тармақталған алгоритмдер. if шарты операторы» (сессия идентификаторы 'P7').
   4 тапсырма, барлығы 100 балл: 1 — 4 шағын есеп (4×5), 2 — 2 практикалық есеп (20+20), 3 — 4 кодтағы қатені түзету (4×5), 4 — тест (5×4).
   Әр есеп жеке жіберіледі және нақты орындалады: бағдарлама әр тест жағдайына жеке енгізумен қосылады, шығыс күтілген нәтижемен салыстырылады.
   Бірінші әрекет толық балл береді. Қате кетсе, студент қатемен жұмыс жасап қайта жібере алады: жоғалтқан баллдың бір бөлігі қайтады.
   Модуль таза: код орындауды сырттан берілген `run` функциясы жасайды, сондықтан жергілікті Python-мен тексеруге болады. */

import { buildP8, P8_MAX, CHEST, chestPts, checkRiddle, RIDDLE_OF_HINT } from './py8.js';
import { buildP4, P4_MAX, OP_SKILLS, gradeTyped } from './py4.js';
export { CHEST, chestPts, checkRiddle, RIDDLE_OF_HINT };

export const PY_MAX = { 1: 20, 2: 40, 3: 20, 4: 20 };
export const PY_MAXS = { P4: P4_MAX, P7: PY_MAX, P8: P8_MAX };   /* тақырып → тапсырма → максимум балл */
export const pyTasks = topic => Object.keys(PY_MAXS[String(topic)] || PY_MAX).map(Number);
export const REV = { code: 0.7, quiz: 0.5 };          /* қайта жіберу арқылы қайтарылатын жоғалған баллдың үлесі */
export const REV_TRIES = { code: 3, quiz: 1 };        /* қайта жіберу әрекеттерінің саны */
export const REVISE_MIN = 15;                         /* жұмыс біткен соң қатемен жұмысқа берілетін минут */
export const reviseMin = topic => (String(topic) === 'P4' ? 10 : REVISE_MIN);   /* 4-сабақта 90 минутқа сыю үшін 10 минут */
export const PY_TOPICS = ['P4', 'P7', 'P8'];
export const isPy = t => PY_TOPICS.includes(String(t));

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (R, a) => a[Math.floor(R() * a.length)];
export function shuffle(arr, seed) { const R = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- Дағдылар және кеңестер ---------- */
export const SKILLS = {
  syntax: { name: 'Синтаксис: қос нүкте және шегініс', tip: 'if шартынан кейін қос нүкте (:) қойылады, ал шарт орындалатын жолдар 4 бос орынға (Tab) ығыстырылып жазылады.' },
  compare: { name: 'Салыстыру амалдары', tip: 'Теңдікті == тексереді, ал = айнымалыға мән береді. Салыстыру таңбалары: >, <, >=, <=, ==, !=.' },
  input: { name: 'Енгізуді санға айналдыру', tip: 'input() әрдайым мәтін қайтарады. Санмен салыстыру немесе есептеу үшін int(input()) жазу керек.' },
  boundary: { name: 'Шекаралық мәндер', tip: 'Шарттың шетіндегі санды тексер: ол шартқа кіре ме? «16 немесе жоғары» үшін >=, ал «16-дан жоғары» үшін > қолданылады.' },
  branch: { name: 'Шарт тармағын таңдау', tip: 'Алдымен шарт қашан орындалатынын сөзбен жаз, сосын оны Python шартына айналдыр. Шарт орындалмаса, if ішіндегі жол орындалмайды.' },
  nested: { name: 'Кірістірілген шарттар', tip: 'if ішіне екінші if жазуға болады. Екінші шарт тек бірінші шарт орындалғанда тексеріледі. Ішкі if тағы 4 бос орынға ығады.' },
  modulo: { name: '% амалы (қалдық)', tip: 'n % 2 санды 2-ге бөлгендегі қалдықты береді. Жұп санда қалдық 0 болады: n % 2 == 0.' },
  output: { name: 'Хабарламаны дұрыс шығару', tip: 'Хабарлама мәтіні тапсырмадағыдай дәл жазылады. Қажет жерде есептелген сан print ішінде шығарылады.' },
  ifelse: { name: 'if–else құрылымы', tip: 'else шартсыз, қос нүктемен (else:) жазылады және if-пен бір тік сызықта тұрады. Ол if шарты False болғанда орындалады, сондықтан екі блоктың біреуі міндетті орындалады.' },
  elif: { name: 'elif арқылы көп шарт', tip: 'Бірнеше шартты if → elif → else тізбегімен жаз. «else if» емес, тек elif деп жазылады. Python бірінші True шартта тоқтайды.' },
  order: { name: 'Шарттар реті', tip: 'Шарттар жоғарыдан төмен тексеріледі. Қатаң шартты (мысалы, >= 90) бірінші қой, әйтпесе жеңілірек шарт (>= 50) оны жауып кетеді. Бөлек if-тер бір-біріне тәуелсіз тексеріледі.' },
  logic: { name: 'Логика және есептеу', tip: 'Формуланы қағазда бір санмен тексеріп көр, содан кейін кодқа аудар.' },
  ...OP_SKILLS
};

/* ---------- Мәтінді салыстыру ---------- */
const norm = s => String(s || '').toLowerCase().replace(/[.!?:;,«»"'()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
const numsOf = s => (String(s || '').replace(/−/g, '-').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
const near = (a, b) => Math.abs(a - b) <= Math.max(0.011, Math.abs(b) * 0.0006);

/* Бір тест жағдайы: шығыста күтілген хабарлама/сандар бар, тыйым салынғандар жоқ, қате болмауы керек */
export function checkCase(c, res) {
  if (res.err) return false;
  const out = String(res.out || ''), lines = out.split(/\r?\n/).map(norm).filter(Boolean), nums = numsOf(out);
  const has = e => typeof e === 'number' ? nums.some(v => near(v, e)) : lines.some(l => l.includes(norm(e)));
  return (c.exp || []).every(has) && !(c.not || []).some(has);
}

/* ---------- Тапсырмалардың мазмұны (нұсқаға тәуелді) ---------- */
/* code: [{ id, title, text, starter, cases, skills, hints, ref, constraint? }]. cases: { in:[енгізулер], exp:[күтілетін], not:[болмауы керек], tag }.
   tag: below — шарт орындалмайды, edge — шекаралық мән, above — шарт орындалады, special — ерекше жағдай. */
function p1Age(R) {
  const A = pick(R, [14, 15, 16, 17, 18]), M = 'Жеке куәлік алуға болады';
  return { id: 11, title: 'Жас тексеру', skills: ['compare', 'boundary', 'input'],
    text: `Пайдаланушы жасын енгізеді. Егер жасы <b>${A} немесе одан жоғары</b> болса, «${M}» хабарламасын шығар. Әйтпесе ештеңе шығарма.`, sample: { in: [String(A + 4)], out: M },
    cases: [{ in: [A - 1], not: [M], tag: 'below' }, { in: [A], exp: [M], tag: 'edge' }, { in: [A + 4], exp: [M], tag: 'above' }, { in: [1], not: [M], tag: 'below' }, { in: [90], exp: [M], tag: 'above' }],
    hints: { edge: `Жас дәл ${A} болғанда да хабарлама шығуы керек. «${A} немесе жоғары» үшін >= жазылады, ал > дәл ${A}-ты қамтымайды.`, over: `Жас ${A}-тен кіші болғанда хабарлама шықпауы керек. Шартыңды тексер.`, under: `Жас ${A}-тен үлкен болғанда хабарлама шығуы керек.` },
    ref: `age = int(input())\nif age >= ${A}:\n    print("${M}")\n` };
}
function p1Parity(R) {
  const even = pick(R, [true, false]), M = even ? 'Жұп сан' : 'Тақ сан', r = even ? 0 : 1;
  return { id: 12, title: even ? 'Жұп сан' : 'Тақ сан', skills: ['modulo', 'compare', 'input'],
    text: `Пайдаланушы бүтін сан енгізеді. Егер сан <b>${even ? 'жұп' : 'тақ'}</b> болса, «${M}» хабарламасын шығар. Әйтпесе ештеңе шығарма.`, sample: { in: [even ? '8' : '7'], out: M },
    cases: [{ in: [even ? 8 : 7], exp: [M], tag: 'above' }, { in: [even ? 7 : 8], not: [M], tag: 'below' }, { in: [0], ...(even ? { exp: [M] } : { not: [M] }), tag: 'edge' }, { in: [even ? -4 : -3], exp: [M], tag: 'above' }, { in: [even ? 101 : 100], not: [M], tag: 'below' }],
    hints: { edge: 'Нөл де жұп сан: 0 % 2 == 0.', over: `Қалдықты тексеретін шартың қате: ${even ? 'жұп' : 'тақ'} емес санда хабарлама шықпауы керек.`, under: `${even ? 'Жұп' : 'Тақ'} санда хабарлама шығуы керек. n % 2 == ${r} шартын қолдан.` },
    ref: `n = int(input())\nif n % 2 == ${r}:\n    print("${M}")\n` };
}
function p1Temp(R) {
  const T = pick(R, [0, -5, -10, 5]), M = 'Аяз';
  return { id: 13, title: 'Ауа райы', skills: ['compare', 'boundary', 'input'],
    text: `Пайдаланушы температураны (бүтін сан) енгізеді. Егер температура <b>${T}-ден төмен</b> болса, «${M}» хабарламасын шығар. Әйтпесе ештеңе шығарма.`, sample: { in: [String(T - 6)], out: M },
    cases: [{ in: [T - 1], exp: [M], tag: 'above' }, { in: [T], not: [M], tag: 'edge' }, { in: [T + 12], not: [M], tag: 'below' }, { in: [T - 30], exp: [M], tag: 'above' }, { in: [T + 1], not: [M], tag: 'below' }],
    hints: { edge: `Температура дәл ${T} болғанда «${M}» шықпауы керек: «${T}-ден төмен» дегені ${T}-ты қамтымайды. Мұнда < қолдан, <= емес.`, over: `Температура ${T}-ден төмен болмағанда хабарлама шықпауы керек. Салыстыру бағытын (< не >) тексер.`, under: `Температура ${T}-ден төмен болғанда «${M}» шығуы керек.` },
    ref: `t = int(input())\nif t < ${T}:\n    print("${M}")\n` };
}
function p1Score(R) {
  const S = pick(R, [50, 55, 60, 40]), M = 'Емтиханнан өттіңіз';
  return { id: 14, title: 'Емтихан нәтижесі', skills: ['compare', 'boundary', 'input'],
    text: `Студент жинаған балды енгізеді. Егер балл <b>${S} немесе одан жоғары</b> болса, «${M}» хабарламасын шығар. Әйтпесе ештеңе шығарма.`, sample: { in: [String(S + 10)], out: M },
    cases: [{ in: [S - 1], not: [M], tag: 'below' }, { in: [S], exp: [M], tag: 'edge' }, { in: [100], exp: [M], tag: 'above' }, { in: [0], not: [M], tag: 'below' }, { in: [S + 1], exp: [M], tag: 'above' }],
    hints: { edge: `Балл дәл ${S} болғанда да «${M}» шығуы керек. >= қолдан.`, over: `Балл ${S}-тен аз болғанда хабарлама шықпауы керек.`, under: `Балл ${S} не одан жоғары болғанда хабарлама шығуы керек.` },
    ref: `score = int(input())\nif score >= ${S}:\n    print("${M}")\n` };
}
function p2Atm(R) {
  const B = pick(R, [1000, 1500, 2000, 5000]), take = pick(R, [200, 300, 400, 500]);
  const BAD = 'Қате сома', LOW = 'Қаражат жеткіліксіз';
  return { id: 21, title: 'Банкомат', skills: ['nested', 'compare', 'boundary', 'branch'], pts: 20,
    text: `Пайдаланушы шоттағы қалдықты, содан кейін алғысы келетін соманы (бүтін сандар) енгізеді. Бағдарлама:<ul><li>сома 0 не теріс болса, «${BAD}» шығарады;</li><li>сома қалдықтан көп болса, «${LOW}» шығарады;</li><li>әйтпесе соманы шегеріп, <b>қалған қалдықты</b> шығарады (тек санды, мысалы <code>${B - take}</code>).</li></ul>Қажет болса, бір <code>if</code> ішіне екінші <code>if</code> жаз.`, sample: { in: [String(B), String(take)], out: String(B - take) },
    cases: [{ in: [B, B + take], exp: [LOW], not: [BAD], tag: 'above' }, { in: [B, 0], exp: [BAD], not: [LOW], tag: 'edge' }, { in: [B, -50], exp: [BAD], not: [LOW], tag: 'special' }, { in: [B, take], exp: [B - take], not: [BAD, LOW], tag: 'below' }, { in: [B, B], exp: [0], not: [BAD, LOW], tag: 'edge' }],
    hints: { edge: 'Екі шетті тексер: сома 0 болса, «Қате сома» шығуы керек; сома қалдықпен тең болса, ақша беріледі (қалдық 0 болады).', over: `Қате жағдайда есептелген қалдықты шығармау керек. Алдымен «${BAD}» және «${LOW}» жағдайларын тексер.`, under: 'Дұрыс сома болғанда қалдық (қалдық − сома) шығуы керек. Шарттардың ретіне назар аудар: алдымен 0-ден үлкен ме, сосын қалдықтан аспай ма.', special: `Теріс сома үшін де «${BAD}» шығуы керек.` },
    ref: `balance = int(input())\namount = int(input())\nif amount <= 0:\n    print("${BAD}")\nelse:\n    if amount > balance:\n        print("${LOW}")\n    else:\n        print(balance - amount)\n` };
}
function p2Grant(R) {
  const G = pick(R, [85, 80, 75]), A = pick(R, [90, 85, 80]), M = 'Шәкіртақы тағайындалды';
  return { id: 22, title: 'Шәкіртақы', skills: ['nested', 'compare', 'boundary', 'branch'], constraint: 'and', pts: 20,
    text: `Студенттің орташа балы, содан кейін сабаққа қатысу пайызы (бүтін сандар) енгізіледі. Шәкіртақы тағайындалу үшін <b>орташа балл ${G} не одан жоғары</b>, ал <b>қатысу ${A}% не одан жоғары</b> болуы керек. Екі шарт та орындалса, «${M}» шығады, әйтпесе ештеңе шықпайды.<br><b>Талап:</b> <code>and</code> қолданбай, кірістірілген <code>if</code> арқылы жаз.`, sample: { in: [String(G + 5), String(A + 5)], out: M },
    cases: [{ in: [G, A], exp: [M], tag: 'edge' }, { in: [G - 1, A], not: [M], tag: 'edge' }, { in: [G, A - 1], not: [M], tag: 'edge' }, { in: [100, 100], exp: [M], tag: 'above' }],
    hints: { edge: `Шекаралық мәндерді тексер: балл ${G}, қатысу ${A}% болғанда да шәкіртақы тағайындалуы керек (>=). Біреуі шектен кем болса, тағайындалмайды.`, over: 'Екі шарттың біреуі орындалмаса да хабарлама шығып жатыр. Екінші if бірінші if ішінде тұрғанын тексер.', under: 'Екі шарт та орындалғанда хабарлама шығуы керек.' },
    ref: `gpa = int(input())\natt = int(input())\nif gpa >= ${G}:\n    if att >= ${A}:\n        print("${M}")\n` };
}

/* 3-тапсырма: қатесі бар код, студент түзетеді */
function f1(R) {
  const A = pick(R, [16, 18]), M = 'Кіруге рұқсат';
  return { id: 31, title: '1-код', skills: ['syntax'], bug: 'colon',
    text: 'Бағдарлама жасы берілген санға тең не одан үлкен адамға рұқсат беруі керек, бірақ іске қосылмайды. Қатені тауып түзет.',
    starter: `age = int(input())\nif age >= ${A}\n    print("${M}")\n`,
    cases: [{ in: [A - 1], not: [M], tag: 'below' }, { in: [A], exp: [M], tag: 'edge' }, { in: [A + 20], exp: [M], tag: 'above' }, { in: [3], not: [M], tag: 'below' }, { in: [100], exp: [M], tag: 'above' }],
    hints: { edge: `Жас дәл ${A} болғанда да «${M}» шығуы керек.`, over: 'Шарт қате жұмыс істеп тұр.', under: 'Шарт орындалғанда хабарлама шығуы керек.' },
    ref: `age = int(input())\nif age >= ${A}:\n    print("${M}")\n` };
}
function f2(R) {
  const d = pick(R, [2, 3]), M = d === 2 ? 'Жұп сан' : '3-ке еселік';
  return { id: 32, title: '2-код', skills: ['compare', 'modulo'], bug: 'assign',
    text: `Бағдарлама санның ${d === 2 ? 'жұп' : '3-ке бөлінетінін'} анықтауы керек, бірақ қате береді. Қатені тауып түзет.`,
    starter: `number = int(input())\nif number % ${d} = 0:\n    print("${M}")\n`,
    cases: [{ in: [d * 4], exp: [M], tag: 'above' }, { in: [d * 4 + 1], not: [M], tag: 'below' }, { in: [0], exp: [M], tag: 'edge' }, { in: [-d * 3], exp: [M], tag: 'above' }, { in: [d * 5 - 1], not: [M], tag: 'below' }],
    hints: { edge: 'Нөл де осы шартқа сәйкес келеді.', over: 'Шартың қате: бөлінбейтін санда хабарлама шықпауы керек.', under: 'Бөлінетін санда хабарлама шығуы керек.' },
    ref: `number = int(input())\nif number % ${d} == 0:\n    print("${M}")\n` };
}
function f3(R) {
  const S = pick(R, [50, 55, 60]), M = 'Емтихан тапсырылды';
  return { id: 33, title: '3-код', skills: ['syntax'], bug: 'indent',
    text: 'Бағдарлама емтихан тапсырылғанын хабарлауы керек, бірақ іске қосылмайды. Қатені тауып түзет.',
    starter: `score = int(input())\nif score >= ${S}:\nprint("${M}")\n`,
    cases: [{ in: [S - 1], not: [M], tag: 'below' }, { in: [S], exp: [M], tag: 'edge' }, { in: [100], exp: [M], tag: 'above' }, { in: [0], not: [M], tag: 'below' }, { in: [S + 7], exp: [M], tag: 'above' }],
    hints: { edge: `Балл ${S} болғанда да хабарлама шығуы керек.`, over: 'Шарт қате жұмыс істеп тұр.', under: 'Шарт орындалғанда хабарлама шығуы керек.' },
    ref: `score = int(input())\nif score >= ${S}:\n    print("${M}")\n` };
}
function f4(R) {
  const T = pick(R, [0, -5, 5]), M = 'Аяз';
  return { id: 34, title: '4-код', skills: ['boundary', 'compare'], bug: 'logic',
    text: `Бағдарлама температура <b>${T}-ден төмен</b> болғанда ғана «${M}» шығаруы керек. Код іске қосылады, бірақ кей санда қате жауап береді. Қатені тауып түзет.`,
    starter: `t = int(input())\nif t <= ${T}:\n    print("${M}")\n`,
    cases: [{ in: [T - 1], exp: [M], tag: 'above' }, { in: [T], not: [M], tag: 'edge' }, { in: [T + 10], not: [M], tag: 'below' }, { in: [T - 25], exp: [M], tag: 'above' }, { in: [T + 1], not: [M], tag: 'below' }],
    hints: { edge: `Температура дәл ${T} болғанда «${M}» шықпауы керек: «${T}-ден төмен» ${T}-ты қамтымайды. <= таңбасын < деп ауыстыр.`, over: 'Шектегі сан қате өңделіп тұр.', under: 'Шарт орындалғанда хабарлама шығуы керек.' },
    ref: `t = int(input())\nif t < ${T}:\n    print("${M}")\n` };
}

/* 4-тапсырма: тест. Дұрыс жауап орны әр студентке кездейсоқ араласады */
const QUIZ = [
  { id: 41, q: 'Шартты тексеру үшін қай оператор қолданылады?', o: ['input', 'if', 'print', 'int'], c: 1, why: 'Шартты тексеру үшін if операторы қолданылады. input — енгізу, print — шығару, int — санға айналдыру.', skill: 'branch' },
  { id: 42, q: 'Python тілінде теңдікті тексеретін таңба:', o: ['=', '==', '>', '!='], c: 1, why: '== теңдікті тексереді. Бір = таңбасы айнымалыға мән береді, != тең емес дегенді білдіреді.', skill: 'compare' },
  { id: 43, q: 'if шартынан кейін не қойылады?', o: ['Нүкте', 'Үтір', 'Қос нүкте', 'Нүктелі үтір'], c: 2, why: 'if шартынан кейін қос нүкте (:) қойылады, содан кейін орындалатын жолдар шегіністе жазылады.', skill: 'syntax' },
  { id: 44, q: 'x = 10. «if x > 5: print("Иә")» кодының нәтижесі қандай?', o: ['Жоқ', 'Иә', '10', 'Қате'], c: 1, why: '10 > 5 шарты ақиқат, сондықтан print орындалып, «Иә» шығады.', skill: 'branch' },
  { id: 45, q: 'Код блогындағы шегініс не үшін керек?', o: ['Әсемдеу үшін', 'Шарт орындалғанда жұмыс істейтін жолдарды белгілеу үшін', 'Айнымалы енгізу үшін', 'Санды түрлендіру үшін'], c: 1, why: 'Шегініс if шартына қай жолдар жататынын көрсетеді. Шегініссіз Python қате береді.', skill: 'syntax' }
];

/* ---------- Нұсқаны құру ---------- */
export function lessonP7(variant) {
  const v = Math.min(20, Math.max(1, parseInt(variant, 10) || 1)), R = rng(9100 + v * 131);
  const t1 = [p1Age(R), p1Parity(R), p1Temp(R), p1Score(R)].map(x => ({ ...x, kind: 'code', max: 5 }));
  const t2 = [p2Atm(R), p2Grant(R)].map(x => ({ ...x, kind: 'code', max: 20 }));
  const t3 = [f1(R), f2(R), f3(R), f4(R)].map(x => ({ ...x, kind: 'fix', max: 5 }));
  const t4 = QUIZ.map(q => ({ id: q.id, kind: 'quiz', max: 4, title: 'Сұрақ ' + (q.id - 40), q: q.q, why: q.why, skills: [q.skill], opts: q.o.map((t, i) => ({ i, t })), correct: q.c }));
  const T = [
    { n: 1, title: 'Есептерді Python тілінде орындау', items: t1 },
    { n: 2, title: 'Практикалық есептер', items: t2 },
    { n: 3, title: 'Кодтағы қателерді тап', items: t3 },
    { n: 4, title: 'Қорытынды тест', items: t4 }
  ];
  T.forEach(t => t.items.forEach(it => { it.task = t.n; if (it.kind !== 'quiz') { it.cases.forEach(c => { c.in = c.in.map(String); }); } }));
  return T;
}
export function lessonOf(topic, variant, pv) {
  if (String(topic) === 'P4') return buildP4(variant, { rng, shuffle }).map(t => { t.items.forEach(it => { it.task = t.n; if (it.kind === 'code') it.cases.forEach(c => { c.in = c.in.map(String); }); }); return t; });
  return String(topic) === 'P8' ? buildP8(variant, { rng, pick, shuffle }, pv).map(t => { t.items.forEach(it => { it.task = t.n; if (it.kind !== 'quiz') it.cases.forEach(c => { c.in = c.in.map(String); }); }); return t; }) : lessonP7(variant);
}
export function itemOf(variant, id) { for (const t of lessonP7(variant)) for (const it of t.items) if (it.id === id) return it; return null; }
export const allItemIds = () => lessonP7(1).flatMap(t => t.items.map(i => i.id));

/* Студентке жіберілетін көрініс: тест жағдайлары мен дұрыс жауап жасырылады */
export function publicLesson(variant, seedBase, topic = 'P7', pv) {
  return lessonOf(topic, variant, pv).map(t => ({ n: t.n, title: t.title, info: t.info || '', pair: !!t.pair, items: t.items.map(it => {
    if (it.typed) return { id: it.id, task: it.task, kind: 'quiz', typed: true, max: it.max, title: it.title, q: it.q, code: it.code || '', diff: '', opts: [] };
    if (it.kind === 'quiz') return { id: it.id, task: it.task, kind: 'quiz', max: it.max, title: it.title, tag: it.tag || '', q: it.q, code: it.code || '', diff: it.diff || '', opts: shuffle(it.opts, seedBase * 31 + it.id).map(o => ({ i: o.i, t: o.t })) };
    return { id: it.id, kind: it.kind, task: it.task, max: it.max, title: it.title, tag: it.tag || '', text: it.text, starter: it.starter || '', sample: it.sample || null, nCases: it.cases.length, fig: it.fig || '', formula: it.formula || '' };
  }) }));
}

/* ---------- Кодты орындау: бір сұраныста бірнеше бағдарлама, әрқайсысы барлық тест жағдайымен ---------- */
const b64 = s => { const u = new TextEncoder().encode(s); let b = ''; u.forEach(c => { b += String.fromCharCode(c); }); return btoa(b); };
/* progs: [{ code, cases }]. Әр бағдарлама бөлек компиляцияланады, әр тест жағдайы 1 секундпен шектеледі, тоқтап қалса, қалғаны өткізіледі (шексіз цикл басқаларын бұзбайды). */
export function harness(progs, nonce) {
  const data = progs.map(p => ({ s: String(p.code || ''), c: p.cases.map(c => c.in) }));
  return `import sys, json, io, builtins, base64, traceback, signal
PROGS = json.loads(base64.b64decode("${b64(JSON.stringify(data))}").decode("utf-8"))
NONCE = "${nonce}"
real_out = sys.stdout
def _alarm(sig, frm):
    raise TimeoutError("уақыт шегі асты")
HAS_ALARM = hasattr(signal, "SIGALRM")
if HAS_ALARM:
    try:
        signal.signal(signal.SIGALRM, _alarm)
    except Exception:
        HAS_ALARM = False
allres = []
for P in PROGS:
    try:
        code = compile(P["s"], "<student>", "exec")
    except SyntaxError as e:
        allres.append({"syntax": {"type": type(e).__name__, "msg": str(e.msg), "line": e.lineno, "text": (e.text or "").rstrip()}})
        continue
    res = []
    stuck = False
    for inp in P["c"]:
        if stuck:
            res.append({"out": "", "err": {"type": "TimeoutError", "msg": "уақыт шегі асты", "line": None}})
            continue
        buf = io.StringIO()
        it = iter(inp)
        def fake_input(prompt=""):
            try:
                return next(it)
            except StopIteration:
                raise EOFError("енгізу жетпейді")
        builtins.input = fake_input
        sys.stdout = buf
        err = None
        if HAS_ALARM:
            signal.alarm(1)
        try:
            exec(code, {"__name__": "__main__"})
        except SystemExit:
            pass
        except BaseException as e:
            ln = None
            for fr in traceback.extract_tb(e.__traceback__):
                if fr.filename == "<student>":
                    ln = fr.lineno
            err = {"type": type(e).__name__, "msg": str(e)[:200], "line": ln}
        if HAS_ALARM:
            signal.alarm(0)
        if err and err["type"] == "TimeoutError":
            stuck = True
        sys.stdout = real_out
        res.append({"out": buf.getvalue()[:1500], "err": err})
    allres.append(res)
real_out.write("\\n" + NONCE + json.dumps(allres) + "\\n")
real_out.flush()
`;
}
/* Консоль (онлайн компилятор сияқты): input() жолдың өзінде сұрайды. Енгізулер тізімі беріледі: орындалу басынан жүреді, енгізу жетпесе, консоль келесі мәнді сұрайды.
   Шығыста сұрау мәтіні мен студент жазған жауап (эхо) бар. Енгізу керек болса, stderr-де белгі қалады. */
export const NEED_MARK = '@@NEED_INPUT@@';
export function consoleHarness(code, inputs) {
  const data = { s: String(code || ''), i: (inputs || []).map(String) };
  return `import sys, json, base64, builtins, traceback
D = json.loads(base64.b64decode("${b64(JSON.stringify(data))}").decode("utf-8"))
it = iter(D["i"])
class _Need(BaseException):
    pass
def _input(prompt=""):
    sys.stdout.write(str(prompt))
    try:
        v = next(it)
    except StopIteration:
        raise _Need()
    sys.stdout.write(v + "\\n")
    return v
builtins.input = _input
try:
    code = compile(D["s"], "main.py", "exec")
except SyntaxError as e:
    traceback.print_exception(type(e), e, None)
    sys.exit(0)
try:
    exec(code, {"__name__": "__main__"})
except _Need:
    sys.stderr.write("${NEED_MARK}")
except SystemExit:
    pass
except BaseException as e:
    traceback.print_exception(type(e), e, e.__traceback__.tb_next)
`;
}
const nonce = () => { const a = new Uint8Array(8); crypto.getRandomValues(a); return 'R' + [...a].map(x => x.toString(16).padStart(2, '0')).join('') + ':'; };

/* run(source) → { ok, stdout, stderr, infra? }. Нәтиже: { infra } | { timeout } | { all: [ { syntax } | { results } ] } */
export async function execMulti(run, progs) {
  const nn = nonce(), r = await run(harness(progs, nn));
  if (r.infra) return { infra: true };
  const line = String(r.stdout || '').split(/\r?\n/).reverse().find(l => l.startsWith(nn));
  if (!line) return { timeout: true, stderr: String(r.stderr || '').slice(0, 300) };
  let j; try { j = JSON.parse(line.slice(nn.length)); } catch (e) { return { timeout: true, stderr: '' }; }
  return { all: j.map(x => Array.isArray(x) ? { results: x } : { syntax: x.syntax }) };
}
export async function execCases(run, code, cases) {
  const r = await execMulti(run, [{ code, cases }]);
  return r.all ? r.all[0] : r;
}

/* Кодтағы талап: and болмауы және кірістірілген if болуы */
export function stripCode(code) { return String(code || '').replace(/#.*$/gm, '').replace(/("""[\s\S]*?"""|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g, '""'); }
export function constraintOk(item, code) {
  if (item.constraint === 'else' || item.constraint === 'elif') {
    const t = stripCode(code), hasElse = /^\s*else\s*:/m.test(t), hasElif = /^\s*elif\b/m.test(t);
    if (item.constraint === 'else' && !hasElse) return { ok: false, text: 'Талап бұзылған: есепті if–else арқылы жаз. else: блогы жоқ.', skill: 'ifelse' };
    if (item.constraint === 'elif' && !(hasElif && hasElse)) return { ok: false, text: 'Талап бұзылған: бұл есепте if–elif–else тізбегін қолдан (elif және else болуы керек).', skill: 'elif' };
    return { ok: true };
  }
  if (item.constraint === 'expr') {   /* айнымалысыз есеп: жауапты санмен емес, өрнекпен жазу керек */
    const ops = (stripCode(code).match(/\*\*|\/\/|[-+*\/%]/g) || []).length;
    return ops >= (item.minOps || 1) ? { ok: true } : { ok: false, text: 'Талап бұзылған: жауапты өзің есептеп жазба. Өрнекті амалдарымен (жақша, дәреже, * - + /) print ішіне жаз.', skill: 'prec' };
  }
  if (item.constraint !== 'and') return { ok: true };
  const s = stripCode(code), hasAnd = /\band\b/.test(s), ifs = s.split(/\r?\n/).filter(l => /^\s*if\b/.test(l)), nested = ifs.length >= 2 && ifs.some(l => /^\s+if\b/.test(l));
  if (hasAnd) return { ok: false, text: 'Талап бұзылған: and қолдануға болмайды. Екі шартты кірістірілген if арқылы жаз.', skill: 'nested' };
  if (!nested) return { ok: false, text: 'Талап бұзылған: екінші if бірінші if ішінде (шегіністе) тұруы керек.', skill: 'nested' };
  return { ok: true };
}

/* ---------- Диагностика: қатені түсіндіріп, дұрыс бағыт көрсету ---------- */
function explainSyntax(s) {
  const m = String(s.msg || ''), line = s.line ? s.line + '-жол' : '';
  const where = (line ? line + ': ' : '') + (s.text ? '«' + String(s.text).trim().slice(0, 60) + '». ' : '');
  if (/expected ':'/.test(m) || (/invalid syntax/.test(m) && /^\s*(if|elif|else|while|for)\b[^:]*$/.test(s.text || ''))) return { skill: 'syntax', text: where + 'Шарттың соңында қос нүкте (:) жоқ. if жолы қос нүктемен аяқталуы керек.' };
  if (/expected an indented block/.test(m) || s.type === 'IndentationError' && /indent/.test(m) && !/unindent|unexpected/.test(m)) return { skill: 'syntax', text: where + 'if-тен кейінгі жол шегіністе болуы керек: оны 4 бос орынға (Tab) ығыстыр.' };
  if (/unexpected indent/.test(m)) return { skill: 'syntax', text: where + 'Бұл жолда артық шегініс бар. Шегіністі алып таста.' };
  if (/Maybe you meant '=='|cannot assign|invalid syntax.*=/.test(m) || /\bif\b[^=!<>]*[^=!<>]=[^=]/.test(s.text || '')) return { skill: 'compare', text: where + 'Шартта теңдікті тексеру үшін == жазылады. Бір = таңбасы — айнымалыға мән беру.' };
  return { skill: 'syntax', text: where + 'Синтаксис қатесі: ' + m + '. Жақшаның, тырнақшаның және қос нүктенің дұрыс қойылғанын тексер.' };
}
function explainRuntime(e) {
  const t = String(e.type), m = String(e.msg || ''), ln = e.line ? e.line + '-жол: ' : '';
  if (t === 'TimeoutError') return { skill: 'logic', text: 'Бағдарлама тоқтамай тұр. Шексіз цикл бар ма, не шарт ешқашан өзгермей ме, тексер.' };
  if (t === 'TypeError' && /not supported between/.test(m)) return { skill: 'input', text: ln + 'input() мәтін қайтарады, ал мәтінді санмен салыстыруға болмайды. int(input()) жазып, енгізуді санға айналдыр.' };
  if (t === 'TypeError') return { skill: 'input', text: ln + 'Түрлері сәйкес емес амал: ' + m.slice(0, 80) + '. Сан мен мәтінді араластырма, енгізуді int() арқылы санға айналдыр.' };
  if (t === 'NameError') return { skill: 'logic', text: ln + 'Анықталмаған айнымалы: ' + (/'(.+)'/.exec(m) || [, '?'])[1] + '. Айнымалыны қолданбай тұрып оған мән бер, жазылуын тексер.' };
  if (t === 'ValueError') return { skill: 'input', text: ln + 'int() ішіне сан емес мән түсті. input() ішіне түсініктеме мәтінін жазбай, int(input()) қолдан.' };
  if (t === 'EOFError') return { skill: 'input', text: 'Бағдарлама тапсырмада айтылғаннан көп input() сұрап тұр. Енгізулер санын тексер.' };
  if (t === 'ZeroDivisionError') return { skill: 'logic', text: ln + 'Нөлге бөлуге болмайды.' };
  return { skill: 'logic', text: ln + t + ': ' + m.slice(0, 100) };
}

/* Тексеру нәтижесінен диагностика тізімі (ең көбі 3 түрлі кеңес) */
export function diagnose(item, code, exec, results) {
  const out = [], add = d => { if (d && !out.some(x => x.text === d.text)) out.push(d); };
  if (exec && exec.syntax) { add(explainSyntax(exec.syntax)); return out; }
  if (exec && exec.timeout) { add({ skill: 'logic', text: 'Бағдарлама тоқтамай тұр немесе жауап бермеді. Шексіз цикл бар ма, input() саны дұрыс па, тексер.' }); return out; }
  const bad = [];
  results.forEach((r, i) => { if (!r.ok) bad.push({ c: item.cases[i], r: r.raw || {} }); });
  bad.forEach(b => { if (b.r.err) add(explainRuntime(b.r.err)); });
  const con = constraintOk(item, code); if (!con.ok) add({ skill: con.skill, text: con.text });
  const H = item.hints || {};
  bad.filter(b => !b.r.err).forEach(b => {
    if (item.arith) { const sk = item.skills[0]; if (b.c.tag === 'edge' && H.edge) add({ skill: sk, text: H.edge }); else if (H.under) add({ skill: sk, text: H.under }); return; }
    const c = b.c, shouldPrint = (c.exp || []).length > 0, printed = String(b.r.out || '').trim().length > 0;
    if (c.tag === 'edge' && H.edge) add({ skill: 'boundary', text: H.edge });
    else if (c.tag === 'special' && H.special) add({ skill: 'branch', text: H.special });
    else if (shouldPrint && H.under) add({ skill: 'branch', text: H.under });
    else if (!shouldPrint && H.over) add({ skill: 'branch', text: H.over });
    if (shouldPrint && printed) { const e = (c.exp || []).find(x => typeof x === 'string'); if (e) add({ skill: 'output', text: 'Хабарлама дәл «' + e + '» болуы керек. Жазылуын, әріптерін тексер.' }); }
  });
  return out.slice(0, 3);
}

/* ---------- Бір есепті бағалау ---------- */
export function gradeFromExec(item, code, ex) {
  const per = item.cases.map((c, i) => {
    const raw = ex.results && ex.results[i];
    return { ok: !!raw && checkCase(c, raw), raw: raw || null, tag: c.tag, in: c.in, exp: c.exp || [], not: c.not || [] };
  });
  const passed = per.filter(p => p.ok).length, con = constraintOk(item, code);
  /* талап бұзылса, балл 80%-дан аспайды */
  let frac = passed / item.cases.length;
  if (!con.ok) frac = item.constraint === 'expr' ? 0 : Math.min(frac, 0.8);
  const diag = diagnose(item, code, ex, per);
  return { frac, passed, total: item.cases.length, cases: per.map(p => ({ ok: p.ok, in: p.in, exp: p.exp, got: p.raw ? String(p.raw.out || '').trim().slice(0, 160) : '', err: p.raw && p.raw.err ? p.raw.err.type + (p.raw.err.line ? ' (' + p.raw.err.line + '-жол)' : '') : '', tag: p.tag })), diag, syntax: !!ex.syntax, constraint: con.ok };
}
export async function gradeCodeItem(run, item, code) {
  const ex = await execCases(run, code, item.cases);
  if (ex.infra) return { infra: true };
  return gradeFromExec(item, code, ex);
}
/* Бір тапсырманың бірнеше есебі: Judge0-ға бір сұраныс. list: [{ item, code }] → [grade | { infra }] */
export async function gradeCodeItems(run, list) {
  if (!list.length) return [];
  const r = await execMulti(run, list.map(x => ({ code: x.code, cases: x.item.cases })));
  if (r.infra) return list.map(() => ({ infra: true }));
  return list.map((x, i) => gradeFromExec(x.item, x.code, r.all ? r.all[i] : r));
}

export function gradeQuizItem(item, choice) {
  if (item.typed) return gradeTyped(item, choice);
  const ok = Number(choice) === item.correct;
  return { frac: ok ? 1 : 0, passed: ok ? 1 : 0, total: 1, cases: [], diag: ok ? [] : [{ skill: item.skills[0], text: item.why }], quiz: true };
}

/* ---------- Қайта жіберу арқылы балл ---------- */
/* attempts: { n, frac }[] — бірінші әрекет толық, келесілері қатемен жұмыс. */
export function itemScore(item, attempts, allowTypedRevision = false) {
  const kind = item.kind === 'quiz' ? 'quiz' : 'code', list = (attempts || []).slice().sort((a, b) => a.n - b.n);
  const revisions = item.typed && !allowTypedRevision && list.length < 2 ? 0 : REV_TRIES[kind];
  if (!list.length) return { pts: 0, f1: 0, best: 0, tries: 0, left: 1 + revisions, revLeft: revisions, done: false, full: false };
  const f1 = list[0].frac, best = Math.max(f1, ...list.slice(1).map(a => a.frac));
  const pts = Math.round(item.max * (f1 + REV[kind] * (best - f1)) * 100) / 100;
  const revUsed = list.length - 1, revLeft = Math.max(0, revisions - revUsed);
  return { pts, f1, best, tries: list.length, revLeft, done: true, full: best >= 1 || f1 >= 1, canRevise: f1 < 1 && best < 1 && revLeft > 0 };
}

/* Тапсырма деңгейіндегі жиынтық: submissions қатарына жазылады */
export function taskPayload(task, byItem) {
  const items = task.items.map(it => {
    const s = itemScore(it, byItem[it.id] || []);
    return { id: it.id, label: it.title + (s.done ? ' — ' + s.tries + ' әрекет' + (s.tries > 1 ? ' (қатемен жұмыс)' : '') + (s.f1 < 1 ? ', 1-әрекет ' + Math.round(s.f1 * 100) + '%' : '') : ' — жіберілмеген'), got: s.pts, max: it.max, done: s.done };
  });
  const pts = Math.round(items.reduce((a, i) => a + i.got, 0) * 10) / 10;
  return { items, pts, done: items.every(i => i.done) };
}

/* ---------- Дағды қорытындысы (студентке және оқытушыға) ---------- */
export function skillSummary(lesson, byItem, lastDiag) {
  const sk = {};
  lesson.forEach(t => t.items.forEach(it => {
    const sc = itemScore(it, byItem[it.id] || []); if (!sc.done) return;
    const slot = k => (sk[k] = sk[k] || { ok: 0, bad: 0, fixed: 0 });
    if (sc.f1 >= 1) { (it.skills || []).forEach(k => { slot(k).ok++; }); return; }
    const fail = (lastDiag[it.id] || []).map(d => d.skill), ks = new Set(fail.length ? fail : it.skills || []);
    ks.forEach(k => { if (sc.best >= 1) slot(k).fixed++; else slot(k).bad++; });
  }));
  return Object.entries(sk).map(([k, v]) => ({ skill: k, name: (SKILLS[k] || {}).name || k, tip: (SKILLS[k] || {}).tip || '', ...v, state: v.bad ? 'repeat' : v.fixed ? 'fixed' : 'ok' })).sort((a, b) => (b.bad - a.bad) || (b.fixed - a.fixed));
}
