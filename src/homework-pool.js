/* Жеке үй тапсырмасы: сабақ тақырыбы бойынша тапсырмалар қоры және студент деңгейіне қарай таңдау.
   Нашар меңгергенге тапсырма көп әрі жеңіл, жақсы меңгергенге аз әрі қиын. Таңдау студентке қарай ауысады (екі студентте бірдей тізім болмайды). */

export const LEVELS = { easy: 'Оңай', mid: 'Орташа', hard: 'Қиын' };

export const HOMEWORK_POOL = {
  12: [
    { id: 'e1', level: 'easy', title: '1-ден 10-ға дейін', prompt: '1-ден 10-ға дейінгі сандарды әрқайсын жаңа жолға шығар. for және range() қолдан.' },
    { id: 'e2', level: 'easy', title: 'Кері санау', prompt: '10-нан 1-ге дейін кері санап шығар. range() ішінде үшінші параметр -1 болады.' },
    { id: 'e3', level: 'easy', title: 'Тақ сандар', prompt: '1-ден 20-ға дейінгі тақ сандарды шығар: 1, 3, 5, … range(1, 21, 2) қадамын қолдан.' },
    { id: 'e4', level: 'easy', title: 'Қосынды', prompt: 'n саны беріледі. 1-ден n-ге дейінгі сандардың қосындысын тап.' },
    { id: 'e5', level: 'easy', title: 'Көбейту кестесі', prompt: 'n саны беріледі. n × 1-ден n × 10-ға дейінгі көбейту кестесін жолма-жол шығар.' },
    { id: 'm1', level: 'mid', title: 'Жұп сандардың қосындысы', prompt: 'a және b беріледі. a-дан b-ға дейінгі жұп сандардың қосындысын тап.' },
    { id: 'm2', level: 'mid', title: 'Квадраттар', prompt: 'n саны беріледі. 1-ден n-ге дейінгі сандардың квадраттарын бір жолға бос орынмен бөліп шығар.' },
    { id: 'm3', level: 'mid', title: '3-ке еселіктер', prompt: 'a және b беріледі. a-дан b-ға дейін 3-ке бөлінетін сандардың санын тап.' },
    { id: 'm4', level: 'mid', title: 'Факториал', prompt: 'n саны беріледі. n! = 1 · 2 · … · n мәнін цикл арқылы есепте.' },
    { id: 'h1', level: 'hard', title: 'Жұлдызшалы үшбұрыш', prompt: 'n саны беріледі. n жол шығар: i-ші жолда i жұлдызша (*) болсын.' },
    { id: 'h2', level: 'hard', title: 'Жай сан', prompt: 'n саны беріледі. Ол жай сан ба, соны тексер: «Иә» немесе «Жоқ» шығар. Цикл ішінде бөлінуді тексер.' },
    { id: 'h3', level: 'hard', title: 'Цифрлар қосындысы', prompt: 'Натурал n беріледі. Оның цифрларының қосындысын тап. Санды жолға айналдырып, for арқылы жүр.' }
  ]
};

/* Деңгей: 0–100 (болжамның негізгі деңгейі × қатысу). null — баға жоқ, базалық деңгей беріледі. */
export const BANDS = [
  { key: 'support', label: 'Қолдау', min: 0, plan: { easy: 4, mid: 1, hard: 0 } },
  { key: 'base', label: 'Базалық', min: 50, plan: { easy: 2, mid: 2, hard: 0 } },
  { key: 'good', label: 'Жақсы', min: 70, plan: { easy: 0, mid: 2, hard: 1 } },
  { key: 'top', label: 'Жоғары', min: 85, plan: { easy: 0, mid: 1, hard: 2 } }
];

export const bandOf = level => {
  const v = typeof level === 'number' && Number.isFinite(level) ? level : 60;
  return [...BANDS].reverse().find(b => v >= b.min) || BANDS[0];
};

const pickFrom = (list, n, seed) => {
  if (!list.length || n <= 0) return [];
  const start = Math.abs(seed) % list.length;
  return Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(start + i) % list.length]);
};

export function planHomework(topic, level, seed = 0) {
  const pool = HOMEWORK_POOL[topic];
  if (!pool) return { band: bandOf(level), tasks: [] };
  const band = bandOf(level);
  const tasks = ['easy', 'mid', 'hard'].flatMap((lv, i) => pickFrom(pool.filter(t => t.level === lv), band.plan[lv], seed + i));
  return { band, tasks: tasks.map(t => ({ ...t, levelLabel: LEVELS[t.level] })) };
}
