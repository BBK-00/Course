/* Python, 8-сабақ: «Толық тармақталу: if–else және elif» (сессия идентификаторы 'P8').
   1-тапсырма (30 балл): 2 жеке есеп: оңай (if–else, 12) және орташа (elif, 18). 3-тапсырма (20 балл): 10 тест сұрағы (5 оңай, 3 орташа, 2 қиын), әр сұрақ 2 балл.
   2-тапсырма (жұптық «Сандық», 25 балл): оқытушы жұп құрады. Екі жұмбақ сұрақтың жауабын тапса, сандық ашылады. Білмесе, 4 кеңес есебін шешеді (әр сұраққа 2):
   әр кеңес — бір оңай/орташа есеп (код, тест, қатені тап, нәтижені тап). Дұрыс шешсе, кеңес мәтіні ашылады. Кеңес көп болған сайын сандықтың сыйлығы азаяды.
   4-тапсырма (үй жұмысы) кейін қосылады. Модуль таза: rng/pick/shuffle py.js-тен беріледі. */

export const P8_MAX = { 1: 30, 2: 25, 3: 20 };

/* 2-тапсырма баллы: 4 кеңес есебі × 4 = 16, сандық сыйлығы 9 (әр кеңес 2 балл, әр қате жауап 1 балл алады; ең азы 1) */
export const SLOT_PTS = 4;
export const CHEST = { max: 9, perHint: 2, perMiss: 1, min: 1 };
export const chestPts = (hints, misses) => Math.max(CHEST.min, CHEST.max - CHEST.perHint * hints - CHEST.perMiss * misses);

const SLOTS = [
  (R, pick) => { const P = pick(R, [500, 800, 1200]), Y = 'Сатып алуға болады', N = 'Ақша жетпейді';
    return { title: 'Дүкен', skills: ['ifelse', 'compare', 'input'],
      text: `Пайдаланушы қалтадағы ақшаны (бүтін сан), содан кейін тауар бағасын енгізеді. Ақша бағаға <b>жетсе не тең болса</b> «${Y}», әйтпесе «${N}» деп шығар.`, sample: { in: [String(P + 100), String(P)], out: Y },
      cases: [{ in: [P, P], exp: [Y], not: [N], tag: 'edge' }, { in: [P - 1, P], exp: [N], not: [Y], tag: 'edge' }, { in: [P + 700, P], exp: [Y], not: [N], tag: 'above' }, { in: [0, P], exp: [N], not: [Y], tag: 'below' }],
      hints: { edge: 'Ақша бағаға тең болғанда да сатып алуға болады: >= қолдан.', over: 'Ақша жетпегенде «' + Y + '» шықпауы керек.', under: 'Шарт орындалғанда да, орындалмағанда да хабарлама шығуы керек. else-ті тексер.' },
      ref: `m = int(input())
p = int(input())
if m >= p:
    print("${Y}")
else:
    print("${N}")
` }; },
  () => { const G = 'Алтын', S = 'Күміс', B = 'Қола', O = 'Қатысушы';
    const c = (v, e, tag) => ({ in: [v], exp: [e], not: [G, S, B, O].filter(x => x !== e), tag });
    return { title: 'Жарыс', skills: ['elif', 'compare', 'input'],
      text: `Жарыстағы орын (бүтін сан) енгізіледі. 1-орынға «${G}», 2-орынға «${S}», 3-орынға «${B}» деп шығар. Басқа орындарға «${O}» шығар. <code>elif</code> қолдан.`, sample: { in: ['2'], out: S },
      cases: [c(1, G, 'edge'), c(2, S, 'edge'), c(3, B, 'edge'), c(4, O, 'edge'), c(10, O, 'above')],
      hints: { edge: 'Әр орынды == арқылы тексер: 1, 2 және 3. 4 және одан кейінгі орындарға else орындалады.', over: 'Бір орынға бірнеше жауап шықпауы керек. if–elif–else тізбегін қолдан.', under: 'Әр орынға өз хабарламасы шығуы керек.' },
      ref: `place = int(input())
if place == 1:
    print("${G}")
elif place == 2:
    print("${S}")
elif place == 3:
    print("${B}")
else:
    print("${O}")
` }; },
  () => { const E = 'Тең қабырғалы', I = 'Тең бүйірлі', D = 'Әртүрлі қабырғалы';
    const c = (v, e, tag) => ({ in: v, exp: [e], not: [E, I, D].filter(x => x !== e), tag });
    return { title: 'Үшбұрыш', skills: ['elif', 'compare', 'logic'],
      text: `Үшбұрыштың үш қабырғасы (бүтін сандар) енгізіледі. Үшеуі де тең болса «${E}», тек екеуі тең болса «${I}», әйтпесе «${D}» деп шығар.`, sample: { in: ['3', '3', '4'], out: I },
      cases: [c([5, 5, 5], E, 'edge'), c([5, 5, 7], I, 'edge'), c([5, 7, 5], I, 'edge'), c([7, 5, 5], I, 'edge'), c([3, 4, 5], D, 'edge')],
      hints: { edge: 'Тең бүйірлі үшбұрышта кез келген екі қабырға тең болуы мүмкін: a == b, a == c немесе b == c. Алдымен үшеуінің теңдігін тексер.', over: 'Тең қабырғалы үшбұрыш «тең бүйірлі» болып та шықпауы керек. Алдымен ең қатаң шартты (үшеуі тең) тексер.', under: 'Әр үшбұрыш түріне өз хабарламасы шығуы керек.' },
      ref: `a = int(input())
b = int(input())
c = int(input())
if a == b and b == c:
    print("${E}")
elif a == b or a == c or b == c:
    print("${I}")
else:
    print("${D}")
` }; },
  () => { const W = 'Қыс', SP = 'Көктем', SU = 'Жаз', AU = 'Күз';
    const c = (v, e, tag) => ({ in: [v], exp: [e], not: [W, SP, SU, AU].filter(x => x !== e), tag });
    return { title: 'Жыл мезгілі', skills: ['elif', 'boundary', 'order'],
      text: `Ай нөмірі (1–12) енгізіледі. Желтоқсан, қаңтар, ақпан «${W}», наурыз–мамыр «${SP}», маусым–тамыз «${SU}», қыркүйек–қараша «${AU}» деп шығар.`, sample: { in: ['4'], out: SP },
      cases: [c(12, W, 'edge'), c(1, W, 'edge'), c(2, W, 'edge'), c(3, SP, 'edge'), c(5, SP, 'edge'), c(6, SU, 'edge'), c(8, SU, 'edge'), c(9, AU, 'edge'), c(11, AU, 'edge')],
      hints: { edge: 'Әр маусымның бірінші және соңғы айын тексер: 12 мен 1–2 «Қыс», 3–5 «Көктем», 6–8 «Жаз», 9–11 «Күз». Желтоқсан қыстың қатарына жатады, оны or арқылы қос.', over: 'Бір айға бірнеше жауап шықпауы керек. if–elif–else тізбегін қолдан.', under: 'Әр айға маусым хабарламасы шығуы керек.' },
      ref: `m = int(input())
if m == 12 or m <= 2:
    print("${W}")
elif m <= 5:
    print("${SP}")
elif m <= 8:
    print("${SU}")
else:
    print("${AU}")
` }; }
];

/* ---------- 2-тапсырма: кеңес есептері (код: SLOTS, қалғаны — төмендегі қорлар) ---------- */
const CODE2 = [SLOTS[0], SLOTS[1], SLOTS[3]];
const bugOpts = (a, c) => ({ o: a.map(n => n + '-жол'), c: a.indexOf(c) });
const Q2 = {
  test: [
    { q: 'Қай жазылым дұрыс?', o: ['else x > 5:', 'else:', 'else(x > 5):', 'else if:'], c: 1, why: 'else шартсыз, тек қос нүктемен жазылады: else:', skill: 'ifelse' },
    { q: 'Бірнеше шартты кезекпен тексеріп, біреуін таңдау үшін қай құрылым қолданылады?', o: ['if–elif–else', 'print–input', 'int–str', 'def–return'], c: 0, why: 'Көп шартты таңдау if → elif → else тізбегімен жазылады.', skill: 'elif' },
    { q: 'age = 18 болғанда, if age >= 18: шарты қалай орындалады?', o: ['Шарт орындалады', 'Шарт орындалмайды', 'Қате шығады', 'Белгісіз'], c: 0, why: '>= «үлкен не тең» дегенді білдіреді, сондықтан 18 де шартқа кіреді.', skill: 'boundary' },
    { q: 'Қай шарт «x саны 5-ке тең» дегенді тексереді?', o: ['x = 5', 'x == 5', 'x => 5', 'x != 5'], c: 1, why: 'Теңдік == арқылы тексеріледі. Бір = таңбасы айнымалыға мән береді.', skill: 'compare' },
    { q: 'elif қалай жазылады?', o: ['Шартсыз, else сияқты', 'Шартпен, if сияқты', 'Тек санмен', 'Тек мәтінмен'], c: 1, why: 'elif — «әйтпесе егер»: ол if сияқты өз шартымен жазылады.', skill: 'elif' },
    { q: 'Шарт орындалмаса және else жоқ болса, не болады?', o: ['Қате шығады', 'if ішіндегі жолдар өткізіледі', 'Бағдарлама тоқтайды', 'Шарт қайта тексеріледі'], c: 1, why: 'Шарт жалған болса, if блогы өткізіледі, ал бағдарлама әрі қарай жұмыс істейді.', skill: 'ifelse' }
  ],
  bug: [
    { code: '1  x = int(input())\n2  if x > 0\n3      print("Оң")\n4  else:\n5      print("Оң емес")', ...bugOpts([1, 2, 3, 5], 2), why: '2-жолда шарттан кейін қос нүкте жоқ: if x > 0:', skill: 'syntax' },
    { code: '1  n = int(input())\n2  if n = 10:\n3      print("Он")\n4  else:\n5      print("Он емес")', ...bugOpts([2, 3, 4, 5], 2), why: '2-жолда теңдікті тексеру үшін == керек. Бір = таңбасы мән береді.', skill: 'compare' },
    { code: '1  t = int(input())\n2  if t < 0:\n3  print("Суық")\n4  else:\n5      print("Жылы")', ...bugOpts([1, 2, 3, 5], 3), why: '3-жолда шегініс жоқ. if ішіндегі жол 4 бос орынға ығыстырылады.', skill: 'syntax' },
    { code: '1  s = int(input())\n2  if s >= 90:\n3      print("Үздік")\n4  elif s >= 50\n5      print("Жақсы")', ...bugOpts([2, 3, 4, 5], 4), why: '4-жолда elif шартынан кейін қос нүкте жоқ: elif s >= 50:', skill: 'syntax' },
    { code: '1  a = int(input())\n2  if a > 5:\n3      print("Үлкен")\n4  else a <= 5:\n5      print("Кіші")', ...bugOpts([2, 3, 4, 5], 4), why: '4-жолда else-ке шарт жазылған. else шартсыз жазылады: else:', skill: 'ifelse' },
    { code: '1  x = int(input())\n2  if x > 0:\n3      print("Оң")\n4  elif x < 0:\n5      print("Теріс")\n6  else x == 0:\n7      print("Нөл")', ...bugOpts([2, 4, 6, 7], 6), why: '6-жолда else-ке шарт жазылған. Дұрысы: else:', skill: 'ifelse' }
  ].map(b => ({ q: 'Кодта қате қай жолда?', code: b.code, o: b.o, c: b.c, why: b.why, skill: b.skill })),
  trace: [
    { q: 'Бағдарлама не шығарады?', code: 'n = 14\nif n % 7 == 0:\n    n = n // 7\nelif n % 2 == 0:\n    n = n // 2\nelse:\n    n = n + 1\nprint(n)', o: ['2', '7', '8', '15'], c: 0, why: '14 % 7 == 0 ақиқат, сондықтан n = 14 // 7 = 2. elif тексерілмейді.', skill: 'order' },
    { q: 'Бағдарлама не шығарады?', code: 'a = 6\nb = 4\nif a > b:\n    c = a - b\nelse:\n    c = b - a\nif c > 1:\n    c = c * 10\nprint(c)', o: ['2', '20', '10', '24'], c: 1, why: 'a > b, сондықтан c = 6 - 4 = 2. Содан кейін c > 1 ақиқат, c = 2 * 10 = 20.', skill: 'ifelse' },
    { q: 'Бағдарлама не шығарады?', code: 'x = 5\nif x > 3:\n    x = x + 2\nif x > 6:\n    x = x * 2\nelse:\n    x = 0\nprint(x)', o: ['0', '7', '14', '9'], c: 2, why: 'Бірінші if-тен кейін x = 7. Екінші if-те 7 > 6 ақиқат, сондықтан x = 14.', skill: 'order' },
    { q: 'Бағдарлама не шығарады?', code: 'p = 40\nif p >= 100:\n    p = p - 30\nelif p >= 50:\n    p = p - 10\nelif p >= 30:\n    p = p + 5\nelse:\n    p = 0\nprint(p)', o: ['10', '30', '35', '45'], c: 3, why: '40 >= 100 және 40 >= 50 жалған, ал 40 >= 30 ақиқат: p = 40 + 5 = 45.', skill: 'elif' },
    { q: 'Бағдарлама не шығарады?', code: 's = 0\nif s == 0:\n    s = 5\nelif s == 5:\n    s = 9\nprint(s)', o: ['0', '5', '9', '14'], c: 1, why: 'Бірінші шарт ақиқат, s = 5 болады. elif енді тексерілмейді, сондықтан 9 болмайды.', skill: 'order' },
    { q: 'Бағдарлама не шығарады?', code: 'k = 9\nif k % 3 == 0 and k > 10:\n    print("A")\nelif k % 3 == 0:\n    print("B")\nelse:\n    print("C")', o: ['A', 'B', 'C', 'A және B'], c: 1, why: '9 % 3 == 0 ақиқат, бірақ 9 > 10 жалған, сондықтан and шарты жалған. elif орындалып, «B» шығады.', skill: 'elif' }
  ]
};
const Q2KIND = [
  { tag: 'code', label: 'Код' },
  { tag: 'test', label: 'Тест' },
  { tag: 'bug', label: 'Қатені тап' },
  { tag: 'trace', label: 'Нәтижені тап' }
];

/* Сандық: екі жұмбақ сұрақ. Екеуінің жауабын тапқанда сандық ашылады.
   Төрт кеңес есебі екі сұраққа бөлінеді: 0-1-кеңес — 1-сұраққа, 2-3-кеңес — 2-сұраққа (әр сұраққа 2 кеңес мәтіні).
   Жауап жасырын: студентке тек riddles[].ask/lines/img жіберіледі (py/data-да), жауап пен кеңес мәтіні сервердегі lessonOf-та қалады. */
export const RIDDLES = [
  { ask: 'ОЛ деп жасырылған есімді атаңыз.',
    lines: ['ОЛАР – мәңгі жасайды!', 'ОЛ – Қилы заман.', 'ОЛ – Көк мұнар.', 'ОЛ – Отырар.', 'Әлжеліден осындай жазбаны көруге болады.'],
    keys: ['мухтар'],
    hints: ['Жауап — бір сөзден тұратын ер адамның есімі, 6 әріптен тұрады.', 'Бұл есімді қазақ әдебиетінің үш белгілі өкілі алып жүр: Әуезов, Мағауин, Шаханов.'] },
  { ask: 'Суретке қарап, компанияның атын табыңыздар.', img: '/assets/py8-1975.png', alt: '1975 жылының цифрлары: 9 мен 7 әдеттегіден өзгеше жазылған',
    keys: ['microsoft', 'майкрософт', 'микрософт', 'mikrosoft', 'maykrosoft', 'maikrosoft'],
    hints: ['Сурет — бір жыл. Сол жылы АҚШ-та әлемге әйгілі бағдарламалық жасақтама компаниясы құрылды.', 'Компанияның негізін Билл Гейтс пен Пол Аллен қалаған. Ол Windows және Office өнімдерін шығарады.'] }
];
/* жауапты салыстыруға келтіру: кіші әріп, қазақ әріптері → ұқсас орысша, бос орын мен тыныс белгілері алынады */
const FOLD = { 'ұ': 'у', 'ү': 'у', 'қ': 'к', 'ғ': 'г', 'ң': 'н', 'ө': 'о', 'һ': 'х', 'і': 'и', 'ә': 'а', 'ё': 'е', 'й': 'и' };
const fold = t => String(t).toLowerCase().replace(/[ұүқғңөһіәёй]/g, c => FOLD[c]).replace(/[^a-zа-я0-9]/g, '');
export const checkRiddle = (k, text) => { const R = RIDDLES[k], t = fold(text); return !!R && t.length >= 3 && R.keys.some(w => t.includes(fold(w))); };
export const RIDDLE_OF_HINT = i => (i < 2 ? 0 : 1);
export function chestOf() {
  return {
    intro: 'Сандықты ашу үшін екі сұрақтың жауабын табыңдар. Жауап білмесеңдер, кеңес алыңдар: әр сұраққа екі кеңес бар. Кеңес — төменде берілген есептерді шешсеңдер ашылады.',
    riddles: RIDDLES.map(({ ask, lines, img, alt }) => ({ ask, lines: lines || null, img: img || null, alt: alt || '' })),
    hints: RIDDLES.flatMap(R => R.hints)
  };
}

/* ---------- 1-тапсырма: оңай есептер (if–else) ---------- */
function eTicket(R, pick) {
  const A = pick(R, [7, 6, 5]), FREE = 'Тегін', PAID = 'Ақылы';
  return { id: 11, title: 'Автобус билеті', skills: ['ifelse', 'boundary', 'input'], constraint: 'else',
    text: `Пайдаланушы жасын енгізеді. Жасы <b>${A}-ден кіші</b> балаға «${FREE}», қалғандарға «${PAID}» деп шығар. <code>if–else</code> қолдан.`, sample: { in: [String(A + 20)], out: PAID },
    cases: [{ in: [A - 1], exp: [FREE], not: [PAID], tag: 'edge' }, { in: [A], exp: [PAID], not: [FREE], tag: 'edge' }, { in: [3], exp: [FREE], not: [PAID], tag: 'below' }, { in: [40], exp: [PAID], not: [FREE], tag: 'above' }, { in: [A + 9], exp: [PAID], not: [FREE], tag: 'above' }],
    hints: { edge: `Жас дәл ${A} болғанда билет ақылы: «${A}-ден кіші» ${A}-ты қамтымайды. Мұнда < қолдан, <= емес.`, over: `Ересек жаста «${FREE}» шықпауы керек.`, under: `Шарт орындалғанда да, орындалмағанда да хабарлама шығуы керек. else блогын тексер.` },
    ref: `age = int(input())\nif age < ${A}:\n    print("${FREE}")\nelse:\n    print("${PAID}")\n` };
}
function eCode(R, pick) {
  const C = pick(R, [1234, 2024, 777, 4321]), OK = 'Қош келдіңіз', BAD = 'Қате код';
  return { id: 11, title: 'Құпия код', skills: ['ifelse', 'compare', 'input'], constraint: 'else',
    text: `Пайдаланушы кодты (бүтін сан) енгізеді. Егер код <b>${C}</b> санына тең болса, «${OK}», әйтпесе «${BAD}» деп шығар. <code>if–else</code> қолдан.`, sample: { in: [String(C)], out: OK },
    cases: [{ in: [C], exp: [OK], not: [BAD], tag: 'edge' }, { in: [C + 1], exp: [BAD], not: [OK], tag: 'edge' }, { in: [C - 1], exp: [BAD], not: [OK], tag: 'edge' }, { in: [0], exp: [BAD], not: [OK], tag: 'below' }, { in: [9], exp: [BAD], not: [OK], tag: 'below' }],
    hints: { edge: 'Бір санға ғана айырмашылық болса да «' + BAD + '» шығуы керек. Теңдікті == арқылы тексер: бір = таңбасы айнымалыға мән береді.', over: `Қате кодта «${OK}» шықпауы керек.`, under: `Дұрыс кодта «${OK}», қате кодта «${BAD}» шығуы керек. else блогын тексер.` },
    ref: `code = int(input())\nif code == ${C}:\n    print("${OK}")\nelse:\n    print("${BAD}")\n` };
}
function eWeather(R, pick) {
  const T = pick(R, [15, 10, 20]), L = 'Жеңіл киім', W = 'Жылы киім';
  return { id: 11, title: 'Киім таңдау', skills: ['ifelse', 'boundary', 'input'], constraint: 'else',
    text: `Пайдаланушы температураны (бүтін сан) енгізеді. Температура <b>${T} не одан жоғары</b> болса «${L}», әйтпесе «${W}» деп шығар. <code>if–else</code> қолдан.`, sample: { in: [String(T + 8)], out: L },
    cases: [{ in: [T], exp: [L], not: [W], tag: 'edge' }, { in: [T - 1], exp: [W], not: [L], tag: 'edge' }, { in: [T + 12], exp: [L], not: [W], tag: 'above' }, { in: [-10], exp: [W], not: [L], tag: 'below' }, { in: [T + 1], exp: [L], not: [W], tag: 'above' }],
    hints: { edge: `Температура дәл ${T} болғанда «${L}» шығуы керек: «${T} не одан жоғары» үшін >= жазылады.`, over: `Температура ${T}-тен төмен болғанда «${L}» шықпауы керек.`, under: 'Шарт орындалғанда да, орындалмағанда да хабарлама шығуы керек. else блогын тексер.' },
    ref: `t = int(input())\nif t >= ${T}:\n    print("${L}")\nelse:\n    print("${W}")\n` };
}
function eMax(R) {
  return { id: 11, title: 'Үлкен сан', skills: ['ifelse', 'compare', 'input'], constraint: 'else',
    text: 'Пайдаланушы екі бүтін санды (алдымен a, содан кейін b) енгізеді. <b>Үлкен санды</b> шығар. <code>if–else</code> қолдан.', sample: { in: ['3', '7'], out: '7' },
    cases: [{ in: [3, 7], exp: [7], not: [3], tag: 'above' }, { in: [9, 2], exp: [9], not: [2], tag: 'above' }, { in: [5, 5], exp: [5], tag: 'edge' }, { in: [-1, -8], exp: [-1], not: [-8], tag: 'special' }, { in: [100, 99], exp: [100], not: [99], tag: 'edge' }],
    hints: { edge: 'Сандар тең не бір-бірінен 1-ге ғана айырмашылықты болғанда да дұрыс жұмыс істеу керек.', special: 'Теріс сандармен де тексер: -1 саны -8-ден үлкен.', over: 'Тек үлкен санды шығару керек, екеуін емес.', under: 'Шарт орындалғанда да, орындалмағанда да үлкен сан шығуы керек. else блогын тексер.' },
    ref: 'a = int(input())\nb = int(input())\nif a > b:\n    print(a)\nelse:\n    print(b)\n' };
}

/* ---------- 1-тапсырма: орташа есептер (elif) ---------- */
function mSpeed(R, pick) {
  const L = pick(R, [60, 80, 50]), W = L + 20, OK = 'Рұқсат', WARN = 'Ескерту', FINE = 'Айып';
  const c = (v, e, tag) => ({ in: [v], exp: [e], not: [OK, WARN, FINE].filter(x => x !== e), tag });
  return { id: 12, title: 'Жылдамдық бақылауы', skills: ['elif', 'boundary', 'order'], constraint: 'elif',
    text: `Көлік жылдамдығы (бүтін сан) енгізіледі. Жылдамдық <b>${L} не одан аз</b> болса «${OK}», <b>${L}-тан жоғары, бірақ ${W} не одан аз</b> болса «${WARN}», одан жоғары болса «${FINE}» деп шығар. <code>elif</code> қолдан.`, sample: { in: [String(L + 5)], out: WARN },
    cases: [c(L, OK, 'edge'), c(L + 1, WARN, 'edge'), c(W, WARN, 'edge'), c(W + 1, FINE, 'edge'), c(10, OK, 'below'), c(150, FINE, 'above')],
    hints: { edge: `Шекараларды тексер: ${L} әлі «${OK}», ${L + 1} «${WARN}», ${W} әлі «${WARN}», ${W + 1} «${FINE}». <= мен < таңбаларын дұрыс таңда.`, over: 'Бір жылдамдыққа бірнеше хабарлама шықпауы керек. Бөлек if емес, if–elif–else тізбегін қолдан.', under: 'Әр жылдамдық диапазонында өз хабарламасы шығуы керек. Шарттардың ретін тексер.' },
    ref: `v = int(input())\nif v <= ${L}:\n    print("${OK}")\nelif v <= ${W}:\n    print("${WARN}")\nelse:\n    print("${FINE}")\n` };
}
function mHello(R, pick) {
  const A = pick(R, [12, 11]), B = pick(R, [18, 17]), M = 'Қайырлы таң', D = 'Қайырлы күн', E = 'Қайырлы кеш';
  const c = (v, e, tag) => ({ in: [v], exp: [e], not: [M, D, E].filter(x => x !== e), tag });
  return { id: 12, title: 'Сәлемдесу', skills: ['elif', 'boundary', 'order'], constraint: 'elif',
    text: `Сағат (0-ден 23-ке дейінгі бүтін сан) енгізіледі. Сағат <b>${A}-ден кіші</b> болса «${M}», <b>${A} не одан үлкен, бірақ ${B}-ден кіші</b> болса «${D}», қалған жағдайда «${E}» деп шығар. <code>elif</code> қолдан.`, sample: { in: [String(A + 1)], out: D },
    cases: [c(A - 1, M, 'edge'), c(A, D, 'edge'), c(B - 1, D, 'edge'), c(B, E, 'edge'), c(0, M, 'below'), c(23, E, 'above')],
    hints: { edge: `Шекараларды тексер: ${A - 1} әлі «${M}», ${A} «${D}», ${B - 1} әлі «${D}», ${B} «${E}». < мен >= таңбаларын дұрыс таңда.`, over: 'Бір сағатқа бірнеше сәлемдесу шықпауы керек. if–elif–else тізбегін қолдан.', under: 'Әр уақыт аралығында өз сәлемдесуі шығуы керек. Шарттардың ретін тексер.' },
    ref: `h = int(input())\nif h < ${A}:\n    print("${M}")\nelif h < ${B}:\n    print("${D}")\nelse:\n    print("${E}")\n` };
}
function mPost(R, pick) {
  const [A, B] = pick(R, [[1, 10], [2, 10], [1, 5]]), L = 'Жеңіл', O = 'Орташа', H = 'Ауыр';
  const c = (v, e, tag) => ({ in: [v], exp: [e], not: [L, O, H].filter(x => x !== e), tag });
  return { id: 12, title: 'Сәлемдеме', skills: ['elif', 'boundary', 'order'], constraint: 'elif',
    text: `Сәлемдеменің салмағы (кг, бүтін сан) енгізіледі. Салмағы <b>${A} не одан аз</b> болса «${L}», <b>${A}-ден артық, бірақ ${B} не одан аз</b> болса «${O}», одан артық болса «${H}» деп шығар. <code>elif</code> қолдан.`, sample: { in: [String(B - 1)], out: O },
    cases: [c(A, L, 'edge'), c(A + 1, O, 'edge'), c(B, O, 'edge'), c(B + 1, H, 'edge'), c(0, L, 'below'), c(80, H, 'above')],
    hints: { edge: `Шекараларды тексер: ${A} әлі «${L}», ${A + 1} «${O}», ${B} әлі «${O}», ${B + 1} «${H}». <= мен < таңбаларын дұрыс таңда.`, over: 'Бір салмаққа бірнеше жауап шықпауы керек. if–elif–else тізбегін қолдан.', under: 'Әр салмақ аралығында өз жауабы шығуы керек. Шарттардың ретін тексер.' },
    ref: `w = int(input())\nif w <= ${A}:\n    print("${L}")\nelif w <= ${B}:\n    print("${O}")\nelse:\n    print("${H}")\n` };
}

/* ---------- 3-тапсырма: тест қоры ---------- */
const Q = {
  easy: [
    { q: 'else блогы қашан орындалады?', o: ['if шарты True болғанда', 'if шарты False болғанда', 'Әрқашан', 'Ешқашан'], c: 1, why: 'else — «әйтпесе». Ол if шарты жалған (False) болғанда орындалады.', skill: 'ifelse' },
    { q: 'Python-да «әйтпесе егер» дегенді білдіретін кілт сөз қайсысы?', o: ['else if', 'elseif', 'elif', 'elsif'], c: 2, why: 'Python-да «әйтпесе егер» бір сөзбен elif деп жазылады.', skill: 'elif' },
    { q: 'else сөзінен кейін не жазылады?', o: ['Шарт', 'Қос нүкте', 'Үтір', 'Нүкте'], c: 1, why: 'else-те шарт болмайды. Ол тек қос нүктемен жазылады: else:', skill: 'ifelse' },
    { q: 'x = 7', code: 'if x > 10:\n    print("A")\nelse:\n    print("B")', o: ['A', 'B', 'A және B', 'Қате'], c: 1, why: '7 > 10 жалған, сондықтан else блогы орындалып, «B» шығады.', skill: 'ifelse' },
    { q: 'if–else құрылымында неше блок орындалады?', o: ['Екеуі де', 'Тек біреуі', 'Ешқайсысы', 'Үшеуі'], c: 1, why: 'if–else екі жолдың біреуін таңдайды: не if блогы, не else блогы орындалады.', skill: 'ifelse' },
    { q: 'Қайсысы «тең емес» таңбасы?', o: ['==', '!=', '<>', '=!'], c: 1, why: 'Python-да «тең емес» таңбасы !=. Теңдік == арқылы тексеріледі.', skill: 'compare' },
    { q: 'n = 8', code: 'if n % 2 == 0:\n    print("Жұп")\nelse:\n    print("Тақ")', o: ['Жұп', 'Тақ', 'Жұп және Тақ', 'Қате'], c: 0, why: '8 % 2 == 0 шарты ақиқат, сондықтан «Жұп» шығады.', skill: 'ifelse' },
    { q: 'Қайсысында шарт жазылмайды?', o: ['if', 'elif', 'else', 'Үшеуінде де жазылады'], c: 2, why: 'if және elif шарт тексереді, ал else шартсыз жазылады: ол қалған барлық жағдайды қамтиды.', skill: 'ifelse' },
    { q: 'Python-да «else if» деп жазсақ не болады?', o: ['Дұрыс жұмыс істейді', 'Синтаксис қатесі шығады', 'Ештеңе шықпайды', 'Ескерту ғана шығады'], c: 1, why: 'Python-да else if жоқ. Оның орнына elif жазылады, әйтпесе синтаксис қатесі шығады.', skill: 'elif' },
    { q: 'else сөзінің шегінісі қандай болуы керек?', o: ['4 бос орын', 'if-пен бір тік сызықта', '8 бос орын', 'Шегініс керек емес'], c: 1, why: 'else — if-тің жұбы, сондықтан ол if-пен бір тік сызықта тұрады. Шегініс тек блок ішіндегі жолдарға қойылады.', skill: 'syntax' }
  ],
  med: [
    { q: 'score = 75', code: 'if score >= 90:\n    print("5")\nelif score >= 70:\n    print("4")\nelif score >= 50:\n    print("3")\nelse:\n    print("2")', o: ['5', '4', '3', '2'], c: 1, why: '75 >= 90 жалған, ал 75 >= 70 ақиқат. Бірінші True шартта тоқтайды, сондықтан «4» шығады.', skill: 'elif' },
    { q: 'x = 0', code: 'if x > 0:\n    print("Оң")\nelif x < 0:\n    print("Теріс")\nelse:\n    print("Нөл")', o: ['Оң', 'Теріс', 'Нөл', 'Ештеңе шықпайды'], c: 2, why: 'Нөл үшін екі шарт та жалған, сондықтан else орындалып, «Нөл» шығады.', skill: 'elif' },
    { q: 'score = 95. Қандай нәтиже шығады?', code: 'if score >= 50:\n    print("3")\nelif score >= 90:\n    print("5")', o: ['3', '5', '3 және 5', 'Ештеңе'], c: 0, why: '95 >= 50 бірінші тексеріледі және True болады, сондықтан elif-ке жетпейді. Қатаң шарттан бастау керек.', skill: 'order' },
    { q: 't = 20', code: 'if t < 0:\n    print("Суық")\nelif t < 25:\n    print("Жылы")\nelse:\n    print("Ыстық")', o: ['Суық', 'Жылы', 'Ыстық', 'Қате'], c: 1, why: '20 < 0 жалған, 20 < 25 ақиқат, сондықтан «Жылы» шығады.', skill: 'elif' },
    { q: 'a = 10. Екі бөлек if жазылған:', code: 'if a > 5:\n    print("A")\nif a > 7:\n    print("B")', o: ['A', 'B', 'A және B', 'Ештеңе'], c: 2, why: 'Бөлек if-тер бір-біріне тәуелсіз тексеріледі. Екі шарт та True болғандықтан, екеуі де шығады.', skill: 'order' },
    { q: 'elif-ті бір if–else тізбегінде неше рет қолдануға болады?', o: ['Бір рет', 'Екі рет', 'Қанша керек болса', 'Тек if жоқ кезде'], c: 2, why: 'elif-ті қажет болғанша қоюға болады. Тізбек if-тен басталып, else-пен аяқталады.', skill: 'elif' }
  ],
  hard: [
    { q: 'n = 15', code: 'if n % 3 == 0:\n    print("A")\nelif n % 5 == 0:\n    print("B")\nelse:\n    print("C")', o: ['A', 'B', 'A және B', 'C'], c: 0, why: '15 % 3 == 0 ақиқат, сондықтан «A» шығады. 15 саны 5-ке де бөлінеді, бірақ бірінші True шарттан кейін elif тексерілмейді.', skill: 'order' },
    { q: 'Кодта қате қай жолда?', code: '1  x = int(input())\n2  if x > 0:\n3      print("Оң")\n4  else x <= 0:\n5      print("Оң емес")', o: ['2-жол', '3-жол', '4-жол', '5-жол'], c: 2, why: '4-жолда else-ке шарт жазылған. else шартсыз жазылады: else:', skill: 'ifelse' },
    { q: 'x = 10. Нәтиже қандай?', code: 'if x > 5:\n    print(1)\nelif x > 8:\n    print(2)\nelse:\n    print(3)\nprint(4)', o: ['1', '1 және 4', '1, 2 және 4', '1, 2, 3 және 4'], c: 1, why: 'x > 5 ақиқат, сондықтан 1 шығады, elif пен else өткізіледі. Шегініссіз print(4) тізбекке жатпайды, ол әрқашан орындалады.', skill: 'order' },
    { q: 'score = 90. Қандай нәтиже шығады?', code: 'if score < 60:\n    print("Құлады")\nelif score < 90:\n    print("Өтті")\nelse:\n    print("Үздік")', o: ['Құлады', 'Өтті', 'Үздік', 'Қате'], c: 2, why: '90 < 60 жалған, 90 < 90 да жалған (90 тең, кіші емес). Сондықтан else орындалып, «Үздік» шығады.', skill: 'elif' }
  ]
};

export function buildP8(variant, { rng, pick, shuffle }, pv) {
  const v = Math.min(20, Math.max(1, parseInt(variant, 10) || 1)), R = rng(8200 + v * 173);
  const easy = pick(R, [eTicket, eCode, eWeather, eMax])(R, pick), med = pick(R, [mSpeed, mHello, mPost])(R, pick);
  const t1 = [{ ...easy, kind: 'code', max: 12 }, { ...med, kind: 'code', max: 18 }];
  const sel = [...shuffle(Q.easy, v * 7 + 1).slice(0, 5).map(q => ({ ...q, d: 'оңай' })), ...shuffle(Q.med, v * 7 + 2).slice(0, 3).map(q => ({ ...q, d: 'орташа' })), ...shuffle(Q.hard, v * 7 + 3).slice(0, 2).map(q => ({ ...q, d: 'қиын' }))];
  const t3 = shuffle(sel, v * 7 + 4).map((q, i) => ({ id: 30 + i, kind: 'quiz', max: 2, title: 'Сұрақ ' + (i + 1), diff: q.d, q: q.q, code: q.code || '', why: q.why, skills: [q.skill], opts: q.o.map((t, j) => ({ i: j, t })), correct: q.c }));
  const PV = parseInt(pv || variant, 10) || 1, R2 = rng(8800 + PV * 211);
  const q2 = (pool, k, salt, id) => { const q = shuffle(pool, PV * 11 + salt)[0], o = shuffle(q.o.map((t, j) => ({ i: j, t })), PV * 5 + salt); return { id, kind: 'quiz', max: SLOT_PTS, ...Q2KIND[k], title: Q2KIND[k].label, q: q.q, code: q.code || '', why: q.why, skills: [q.skill], opts: o, correct: q.c }; };
  const code2 = { ...pick(R2, CODE2)(R2, pick), id: 21, kind: 'code', max: SLOT_PTS, ...Q2KIND[0] };
  const t2 = [code2, q2(Q2.test, 1, 1, 22), q2(Q2.bug, 2, 2, 23), q2(Q2.trace, 3, 3, 24)];
  const chest = chestOf();
  return [
    { n: 1, title: 'Есептерді Python тілінде орындау', info: 'Екі есеп: біріншісі оңай (if–else), екіншісі орташа (elif). Ұсынылатын уақыт: 15 минут.', items: t1 },
    { n: 2, title: 'Сандық (жұптық)', pair: true, chest, info: 'Жұппен орындаңдар. Екі сұрақтың жауабын тапсаңдар, сандық ашылады. Білмесеңдер, кеңес алыңдар: әр сұраққа екі кеңес бар, кеңес есебін дұрыс шешсеңдер, кеңес ашылады. Кеңес көп болған сайын сандықтың сыйлығы азаяды. Ұсынылатын уақыт: 25 минут.', items: t2 },
    { n: 3, title: 'Тест: if–else және elif', info: '10 сұрақ: 5 оңай, 3 орташа, 2 қиын. Әр сұраққа бір жауап таңда. Ұсынылатын уақыт: 15 минут.', items: t3 }
  ];
}
