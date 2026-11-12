/* Python 12. Practice on for, range and conditions. Answer keys stay on the server. */
export const P12_MAX = { 1: 20, 2: 30, 3: 30, 4: 20 };
export const P12_MINUTES = { 1: 15, 2: 20, 3: 15, 4: 10 };
export const P12_SKILLS = {
  loop_range: { name: 'for және range()', tip: 'Циклдің әр қайталауында i диапазондағы келесі санды алады. stop шекарасы кірмейді.' },
  loop_step: { name: 'Цикл қадамы', tip: 'Өсу үшін оң, кему үшін теріс қадам қолданылады. Қадам 0 бола алмайды.' },
  loop_total: { name: 'Санауыш пен жинақтау', tip: 'Санауышқа 1, қосындыға i қосылады. Бастапқы мәнді циклдің алдында бір рет бер.' },
  loop_filter: { name: 'Цикл ішіндегі шарт', tip: 'Әр санға if шартын тексер. print немесе жинақтау жолы шарттың ішінде шегініп тұрады.' },
  loop_indent: { name: 'Циклдің жазылуы', tip: 'for жолының соңында қос нүкте тұрады. Шегініп тұрған жолдар қайталанады.' }
};
export const P12_CONCEPTS = {
  loop_range: { sym: 'range', name: 'Диапазон' },
  loop_step: { sym: 'step', name: 'Қадам' },
  loop_total: { sym: 'k / s', name: 'Санауыш пен қосынды' },
  loop_filter: { sym: 'if', name: 'Цикл ішіндегі шарт' },
  loop_indent: { sym: ':', name: 'Қос нүкте мен шегініс' }
};

const nums = (start, end, step = 1) => Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, i) => start + i * step);
const exact = (input, output, tag = 'above') => ({ in: input.map(String), exp: output.map(String), strictLines: true, tag });
function exercise(id, max, title, problem, input, output, cases, ref, skill, hint, conditional = false) {
  return {
    id, max, title, kind: 'code', problem, input, output, cases, ref,
    op: skill, skills: [skill], constraint: conditional ? 'for-if' : 'for-range',
    text: '<p>' + problem + '</p><p><b>Енгізу.</b> ' + input + '</p><p><b>Шығару.</b> ' + output + '</p>',
    starter: '', sample: { in: cases[0].in, out: cases[0].exp.join('\n') },
    hints: { under: hint, edge: hint, special: hint }
  };
}

const noInput = 'Мән енгізілмейді.';
const onePerLine = 'Әр сан жеке жолдан шықсын.';
const basics = [
  exercise(11, 4, '1-ден 12-ге дейін', '1-ден 12-ге дейінгі бүтін сандарды өсу ретімен шығар. 12 де шықсын.',
    noInput, onePerLine, [exact([], nums(1, 12))], 'for i in range(1, 13):\n    print(i)', 'loop_range',
    'Соңғы сан 12 болу үшін шекара 13 болуы керек.'),
  exercise(12, 4, 'Кері санау', '15-тен 1-ге дейін бір-бірден кемітіп сана. 15 пен 1 де шықсын.',
    noInput, onePerLine, [exact([], nums(15, 1, -1))], 'for i in range(15, 0, -1):\n    print(i)', 'loop_step',
    '15-тен баста. Қадам −1, ал кірмейтін шекара 0.'),
  exercise(13, 4, 'Жұп сандар', '2-ден 20-ға дейінгі жұп сандарды өсу ретімен шығар. 20 де шықсын.',
    noInput, onePerLine, [exact([], nums(2, 20, 2))], 'for i in range(2, 21, 2):\n    print(i)', 'loop_step',
    '2-ден баста, қадам 2. Соңғы сан 20 болу үшін шекара 21.'),
  exercise(14, 4, '5 қадаммен санау', '5-тен 50-ге дейін 5 қадаммен сана. 5 пен 50 де шықсын.',
    noInput, onePerLine, [exact([], nums(5, 50, 5))], 'for i in range(5, 51, 5):\n    print(i)', 'loop_step',
    '5-тен баста, қадам 5. 50 шығу үшін шекара 50-ден үлкен болсын.'),
  exercise(15, 4, 'Алты рет қайталау', '«Сәлем!» сөзін 6 рет шығар.',
    noInput, 'Әр қайталау жаңа жолда болсын. Тырнақша мен жол нөмірін шығарма.',
    [exact([], Array(6).fill('Сәлем!'))], 'for i in range(6):\n    print("Сәлем!")', 'loop_range',
    'range(6) алты мән береді. print жолын цикл денесіне қой.')
];

const math = [
  exercise(21, 8, '1-ден 20-ға дейінгі қосынды', '1-ден 20-ға дейінгі бүтін сандардың қосындысын циклмен есепте. 20-ны да қос.',
    noInput, 'Цикл аяқталған соң қосындыны бір жолға шығар.', [exact([], [210])],
    's = 0\nfor i in range(1, 21):\n    s = s + i\nprint(s)', 'loop_total',
    's = 0 цикл алдында тұрады. Әр қайталауда s-ке i қос. print(s) цикл аяқталғанда орындалады.'),
  exercise(22, 8, '1-ден 7-ге дейінгі көбейтінді', '1-ден 7-ге дейінгі бүтін сандардың көбейтіндісін циклмен есепте. 7-ні де көбейт.',
    noInput, 'Көбейтіндіні бір жолға шығар.', [exact([], [5040])],
    'p = 1\nfor i in range(1, 8):\n    p = p * i\nprint(p)', 'loop_total',
    'Көбейтіндінің бастапқы мәні 1 болады. Циклде p = p * i деп жаңарт.'),
  exercise(23, 14, 'Жұп сандардың қосындысы', '2-ден 20-ға дейінгі жұп сандардың қосындысын тап. 20-ны да қос.',
    noInput, 'Қосындыны бір жолға шығар.', [exact([], [110])],
    's = 0\nfor i in range(2, 21, 2):\n    s = s + i\nprint(s)', 'loop_total',
    '2-ден бастап 2 қадаммен жүр. Әр санды қосындыға жина.')
];

const conditions = [
  exercise(31, 12, '4-ке бөлінетін сандар', '1–30 аралығындағы сандарды бір-бірден арала. if арқылы 4-ке қалдықсыз бөлінетін сандарды ғана шығар.',
    noInput, onePerLine, [exact([], nums(4, 28, 4))],
    'for i in range(1, 31):\n    if i % 4 == 0:\n        print(i)', 'loop_filter',
    'i % 4 == 0 болғанда ғана print(i) орындалсын.', true),
  exercise(32, 18, 'Жұп сандардың саны мен қосындысы', '1-ден n-ге дейінгі сандарды арала. if арқылы жұп сандарды таңдап, олардың санын және қосындысын тап. n-ді де тексер.',
    'Бір бүтін n саны беріледі (1 ≤ n ≤ 100).',
    'Бірінші жолда жұп сандардың санын, екінші жолда қосындысын шығар.',
    [exact([7], [3, 12]), exact([1], [0, 0], 'edge'), exact([8], [4, 20]), exact([100], [50, 2550], 'special')],
    'n = int(input())\nk = 0\ns = 0\nfor i in range(1, n + 1):\n    if i % 2 == 0:\n        k = k + 1\n        s = s + i\nprint(k)\nprint(s)', 'loop_filter',
    'Жұп сан табылғанда k-ға 1, s-ке i қос. Екеуін де цикл аяқталған соң шығар.', true)
];

/* Тест: 10 сұрақ, әрқайсысы 2 балл. 6 оңай, 2 орташа, 2 тұзақ сұрақ (қателестіреді).
   Әр студентке 6 нұсқаның бірі беріледі: сандар мен код өзгереді, ал жауап нұсқаларының реті мен сұрақтардың реті де алмасады. */
const seq = (a, b) => nums(a, b).join(', ');
const pickV = (list, v) => list[(v - 1) % list.length];
const mix = (list, seed) => {
  const a = list.slice();
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
function question(id, diff, title, q, code, options, correct, why, skill) {
  return { id, kind: 'quiz', max: 2, diff, title, q, code, opts: options.map((t, i) => ({ i, t })), correct, why, op: skill, skills: [skill] };
}
function written(id, diff, title, q, code, answer, why, skill) {
  return { ...question(id, diff, title, q, code, [], null, why, skill), typed: true, ans: answer, accepted: [answer], answerFormat: 'numbers' };
}

export function quizFor(variant = 1) {
  const v = Math.max(1, parseInt(variant, 10) || 1);
  const stopN = pickV([5, 4, 6, 3, 7, 8], v);
  const colonCode = pickV([
    'for i in range(3)\n    print(i)', 'for k in range(4)\n    print(k * 2)', 'for i in range(2, 6)\n    print(i)',
    'for n in range(5)\n    print("Сәлем")', 'for i in range(1, 4)\n    print(i + 1)', 'for x in range(6)\n    print(x)'], v);
  const [a, b] = pickV([[2, 5], [1, 4], [3, 7], [4, 8], [0, 3], [5, 9]], v);
  const [initName, initRight, initWhy] = pickV([
    ['көбейтінді жинайтын p', 1, 'Көбейтінді 1-ден басталады. 0-ге көбейткенде нәтиже 0 болады.'],
    ['санауыш k', 0, 'Санауыш 0-ден басталады, әр жағдайда оған 1 қосылады.'],
    ['қосынды жинайтын s', 0, 'Қосынды 0-ден басталады, әр санды қосып барамыз.']], v);
  const times = pickV([4, 6, 5, 7, 3, 8], v);
  const from = pickV([10, 8, 9, 12, 6, 7], v);
  const resetN = pickV([4, 5, 6, 4, 5, 6], v);
  const [sumN, sumM] = pickV([[6, 2], [7, 3], [9, 2], [10, 3], [8, 2], [11, 3]], v);
  const sumAns = nums(1, sumN - 1).filter(i => i % sumM === 0).reduce((x, y) => x + y, 0);
  const trapK = pickV([3, 4, 3, 5, 4, 3], v);
  const top = pickV([5, 6, 4, 7, 5, 6], v);
  let run = 0; const shown = [], evens = [];
  for (let i = top; i >= 1; i--) { if (i % 2 === 0) { run += i; evens.push(run); } shown.push(run); }

  const items = {
    41: question(41, 'Оңай', 'range(stop)', 'range(' + stopN + ') қандай сандарды береді?', '',
      [seq(1, stopN), seq(0, stopN - 1), seq(0, stopN), 'Тек ' + stopN], 1,
      'Бір аргумент болса, санау 0-ден басталады. ' + stopN + ' шекарасы кірмейді.', 'loop_range'),
    42: question(42, 'Оңай', 'Қос нүкте', 'Кодта қандай синтаксис қатесі бар?', colonCode,
      ['print жолы тым ішке жазылған', 'for жолында қос нүкте жоқ', 'range() ішінде сан жазуға болмайды', 'Қате жоқ'], 1,
      'for тақырыбының соңына қос нүкте (:) қойылады.', 'loop_indent'),
    43: written(43, 'Оңай', 'Өсу реті', 'Экранға шыққан сандарды ретімен жаз. Арасын бос орынмен немесе үтірмен бөл.',
      'for i in range(' + a + ', ' + b + '):\n    print(i)', nums(a, b - 1).join(' '),
      a + '-ден басталады. ' + b + ' кірмейтіндіктен, соңғы сан ' + (b - 1) + ' болады.', 'loop_range'),
    44: question(44, 'Оңай', 'Бастапқы мән', 'Цикл алдында ' + initName + ' айнымалысына қандай мән береміз?', '',
      ['0', '1', '−1', '10'], initRight, initWhy, 'loop_total'),
    45: question(45, 'Оңай', 'Қайталау саны', 'Бағдарлама «Сәлем» сөзін неше рет шығарады?', 'for i in range(' + times + '):\n    print("Сәлем")',
      [String(times - 1), String(times), String(times + 1), 'Шексіз рет'], 1,
      'range(' + times + ') ' + times + ' мән береді, сондықтан цикл денесі ' + times + ' рет орындалады.', 'loop_range'),
    46: question(46, 'Оңай', 'Кері санау қадамы', from + '-нан 1-ге дейін кері санау үшін range(' + from + ', 0, ?) ішіндегі қадам қандай болу керек?', '',
      ['1', '−1', '0', String(from)], 1, 'Сандар кемуі үшін қадам теріс болады. Бір-бірден кемісе, қадам −1.', 'loop_step'),
    47: question(47, 'Орташа', 'Қосынды неге жиналмады?', '1-ден ' + (resetN - 1) + '-ге дейінгі сандардың қосындысы ' + (resetN * (resetN - 1) / 2) + ' болу керек, бірақ экранға ' + (resetN - 1) + ' шығады. Қандай логикалық қате бар?',
      's = 0\nfor i in range(1, ' + resetN + '):\n    s = 0\n    s = s + i\nprint(s)',
      ['print(s) циклден кейін тұрғаны қате', 's әр қайталауда қайтадан нөлге теңестіріледі', 'range(1, ' + resetN + ') соңғы санды қамтымайды', 's-ке i орнына әрқашан 1 қосу керек'], 1,
      's = 0 цикл алдында бір рет тұрады. Цикл ішінде қайта нөлдесек, бұрынғы қосынды жоғалады.', 'loop_total'),
    48: written(48, 'Орташа', 'Шартпен қосу', 'Экранға қандай сан шығады?',
      's = 0\nfor i in range(1, ' + sumN + '):\n    if i % ' + sumM + ' == 0:\n        s = s + i\nprint(s)', String(sumAns),
      'Шартқа ' + nums(1, sumN - 1).filter(i => i % sumM === 0).join(', ') + ' сандары сай келеді. Қосындысы ' + sumAns + '.', 'loop_filter'),
    49: question(49, 'Тұзақ', 'Тырнақшадағы i', 'Экранға не шығады?', 'for i in range(' + trapK + '):\n    print("i")',
      [seq(0, trapK - 1), Array(trapK).fill('i').join(', '), 'Python қате береді', 'Ештеңе шықпайды'], 1,
      'Тырнақшадағы "i" — айнымалы емес, i әрпі. Сондықтан әр қайталауда i әрпі шығады.', 'loop_range'),
    50: question(50, 'Тұзақ', 'Аралық нәтижелер', 'Экранға шыққан жолдар қандай ретпен келеді? Нұсқаларда жолдар үтірмен бөлінген.',
      's = 0\nfor i in range(' + top + ', 0, -1):\n    if i % 2 == 0:\n        s = s + i\n    print(s)',
      [String(run), evens.join(', '), shown.join(', '), nums(1, top).reverse().join(', ')], 2,
      'print(s) for ішінде, if-тен тыс тұр. Сондықтан әр қайталауда s шығады. s тек жұп i келгенде өзгереді.', 'loop_indent')
  };
  const easy = [41, 42, 43, 44, 45, 46], hard = [47, 48, 49, 50];
  const order = v === 1 ? [...easy, ...hard] : [...mix(easy, 100 + v), ...mix(hard, 200 + v)];
  return order.map(id => items[id]);
}
export const P12_QUIZ = quizFor(1);

const tasksFor = variant => [

  { n: 1, title: 'Қарапайым есептер', info: '5 есеп. Әрқайсын for және range() арқылы орында. Нәтижені жеке жолдарға шығар.', items: basics },
  { n: 2, title: 'Математикалық есептер', info: '3 есеп. Қосынды мен көбейтіндіні циклмен есепте.', items: math },
  { n: 3, title: 'Цикл және шарт', info: '2 есеп. Цикл ішінде if қолданып, шартқа сай сандарды іріктеу.', items: conditions },
  { n: 4, title: 'Аралас тест', info: '10 сұрақ. Әр дұрыс жауап 2 балл. Қате жауап 0 балл.', items: quizFor(variant) }
];

export function buildP12(variant = 1) {
  return tasksFor(variant).map(task => ({ ...task, items: task.items.map(item => ({ ...item, task: task.n })) }));
}
