/* АКТ · 2-тақырып: 4 тапсырма сайттың өзінде орындалады (барлығы 70 балл), ЖИ қажет емес.
   1-бөлім (30) = 1-тапсырма 12 + 2-тапсырма 12 + 3-тапсырма 6; 2-бөлім (32) = 4-тапсырма: түрі 8×2 + қызметі 8×2; 3-бөлім (8) = 4-тапсырма: байланыс мысалдары 2×4. */
export const A2_MAX = { 1: 30, 2: 32, 3: 8 };

/* 1-тапсырма: құрылғы → қызмет түрі (0 енгізу, 1 өңдеу, 2 сақтау, 3 шығару) */
const T1 = [['kbd', 'Пернетақта', 0], ['mouse', 'Тінтуір', 0], ['scan', 'Сканер', 0], ['mic', 'Микрофон', 0], ['cam', 'Веб-камера', 0], ['mon', 'Монитор', 3], ['prn', 'Принтер', 3], ['snd', 'Дыбыс жүйесі', 3], ['hdd', 'Қатты диск (HDD/SSD)', 2], ['ram', 'Жедел жад (RAM)', 2], ['cpu', 'Процессор (CPU)', 1], ['gpu', 'Бейне адаптері (GPU)', 1]];
const CAT = ['енгізу', 'өңдеу', 'сақтау', 'шығару'];
/* 2-тапсырма: бағдарлама → топ (0 жүйелік, 1 қолданбалы, 2 құралдық) және топтың қызметі */
const T2 = [['os', 'Операциялық жүйе', 0], ['drv', 'Драйвер', 0], ['arc', 'Архиватор', 0], ['br', 'Браузер', 1], ['txt', 'Мәтіндік редактор', 1], ['ide', 'Программалау ортасы', 2]];
const GRP = ['жүйелік', 'қолданбалы', 'құралдық'];
const GKW = [['басқар', 'аппарат', 'құрылғы', 'үйлестір', 'қамтамасыз', 'орындалу'], ['пайдаланушы', 'міндет', 'тапсырма', 'құжат', 'есеп', 'орында'], ['жаса', 'жаз', 'әзірле', 'тексер', 'өңде', 'құрал']];
/* 3-тапсырма: өз компьютерінің сипаттамасы */
const T3 = [['Процессор', s => /[a-zа-я0-9]{3,}/i.test(s) && /[a-zа-я]/i.test(s), 1], ['Жедел жад', s => /\d/.test(s), 1], ['Жедел жад өлшем бірлігі (ГБ)', s => /\d/.test(s) && /гб|gb|гигабайт|gigabyte/i.test(s), 1], ['Операциялық жүйе', s => /windows|linux|mac|android|ubuntu/i.test(s), 1], ['Жүйе түрі (32/64 бит)', s => /(32|64)/.test(s), 1], ['Дискідегі қолжетімді орын', s => /\d/.test(s), 1]];

/* 4-тапсырма: элементтер, дұрыс түрі, қызметін білдіретін сөз түбірлері */
export const A2_ROWS = [
  { id: 'cpu', nm: 'Процессор', hw: true, kw: ['есепт', 'өңде', 'орында', 'басқар', 'команд', 'нұсқау'], exact: ['ми', 'миы'] },
  { id: 'ram', nm: 'Жедел жад', hw: true, kw: ['уақытша', 'жылдам', 'оператив', 'орындалып', 'қазіргі', 'өшкен', 'өшсе', 'ұшқыш'], exact: [] },
  { id: 'ssd', nm: 'SSD', hw: true, kw: ['ұзақ', 'тұрақты', 'файл', 'диск', 'сақта', 'жинақта'], exact: [] },
  { id: 'mb', nm: 'Аналық тақша', hw: true, kw: ['байланыс', 'біріктір', 'қосыл', 'қосады', 'жалғ', 'барлық құрылғы', 'платформа', 'орналас'], exact: [] },
  { id: 'os', nm: 'Операциялық жүйе', hw: false, kw: ['басқар', 'интерфейс', 'ресурс', 'байланыс', 'іске қос', 'ортасын', 'негізгі'], exact: [] },
  { id: 'drv', nm: 'Драйвер', hw: false, kw: ['құрылғы', 'аппарат', 'байланыс', 'тану', 'таныт', 'арасындағы', 'делдал'], exact: [] },
  { id: 'br', nm: 'Браузер', hw: false, kw: ['интернет', 'сайт', 'веб', 'бет', 'іздеу', 'қарау', 'шолу', 'сілтеме', 'парақ'], exact: [] },
  { id: 'av', nm: 'Антивирус', hw: false, kw: ['вирус', 'қорға', 'қауіп', 'зиянды', 'тексер', 'жою', 'зарарсыз'], exact: [] }
];
const REL = ['басқар', 'жұмыс', 'орында', 'қолдан', 'көмегімен', 'арқылы', 'байланыс', 'қосыл', 'жүкте', 'тану', 'таныт', 'сақта', 'қорға', 'өңде', 'қажет', 'іске', 'қамтамасыз', 'тексер', 'қолдау'];
const clean = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 300);
const words = s => clean(s).split(/[^а-яәіңғүұқөһёa-z0-9]+/).filter(w => w.length >= 2);
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const plain = (txt, min = 8) => txt.length >= min && words(txt).length >= 2;

export function gradeA2(ans) {
  const a = obj(ans), A1 = obj(a.t1), A2 = obj(a.t2), A2s = obj(A2.sw), A2g = Array.isArray(A2.g) ? A2.g : [], A3 = Array.isArray(a.t3) ? a.t3 : [];
  const T = obj(a.types), F = obj(a.funcs);
  const r1 = [];
  T1.forEach(([id, nm, k]) => r1.push({ id: '1.' + id, label: '1-тапсырма · ' + nm + ' — ' + CAT[k] + (A1[id] === undefined || A1[id] === null || A1[id] === '' ? ' (таңдалмаған)' : A1[id] === k ? '' : ' (жауабы: ' + (CAT[A1[id]] || '?') + ')'), max: 1, got: Number(A1[id]) === k && A1[id] !== '' && A1[id] !== null ? 1 : 0 }));
  T2.forEach(([id, nm, k]) => r1.push({ id: '2.' + id, label: '2-тапсырма · ' + nm + ' — ' + GRP[k] + (A2s[id] === undefined || A2s[id] === null || A2s[id] === '' ? ' (таңдалмаған)' : Number(A2s[id]) === k ? '' : ' (жауабы: ' + (GRP[A2s[id]] || '?') + ')'), max: 1, got: A2s[id] !== '' && A2s[id] !== null && Number(A2s[id]) === k ? 1 : 0 }));
  GRP.forEach((g, i) => { const txt = clean(A2g[i]), got = !plain(txt) ? 0 : GKW[i].some(k => txt.includes(k)) ? 2 : 1; r1.push({ id: '2.g' + i, label: '2-тапсырма · ' + g + ' ПЖ қызметі' + (txt ? ' — «' + txt.slice(0, 80) + '»' : ' (жазылмаған)') + (got === 1 ? ' (негізгі сөз табылмады)' : ''), max: 2, got }); });
  const t3 = T3.map(([nm, ok, mx], i) => { const v = String(A3[[0, 1, 1, 2, 3, 4][i]] || '').trim().slice(0, 80); return { nm, v, ok: v && ok(v), mx }; });
  t3.forEach((x, i) => r1.push({ id: '3.' + (i + 1), label: '3-тапсырма · ' + x.nm + (x.v ? ' — «' + x.v + '»' : ' (жазылмаған)'), max: x.mx, got: x.ok ? x.mx : 0 }));

  const r2 = [];
  A2_ROWS.forEach((r, i) => {
    const t = T[r.id], ok = (t === 'hw') === r.hw && (t === 'hw' || t === 'sw');
    r2.push({ id: '4.t' + (i + 1), label: '4-тапсырма · ' + r.nm + ': түрі' + (t ? ' (жауабы: ' + (t === 'hw' ? 'аппараттық' : 'программалық') + ')' : ' (таңдалмаған)'), max: 2, got: ok ? 2 : 0 });
  });
  A2_ROWS.forEach((r, i) => {
    const txt = clean(F[r.id]), w = words(txt), hit = w.some(x => r.exact.includes(x)) || r.kw.some(k => txt.includes(k));
    const got = !plain(txt) ? 0 : hit ? 2 : 1;
    r2.push({ id: '4.f' + (i + 1), label: '4-тапсырма · ' + r.nm + ': қызметі' + (txt ? ' — «' + txt.slice(0, 90) + '»' : ' (жазылмаған)') + (got === 1 ? ' (қызметін білдіретін сөз табылмады)' : ''), max: 2, got });
  });

  const hwOf = {}, NM = {}; A2_ROWS.forEach(r => { hwOf[r.id] = r.hw; NM[r.id] = r.nm; });
  const P = Array.isArray(a.pairs) ? a.pairs.slice(0, 2) : [], seen = new Set(), r3 = [];
  for (let i = 0; i < 2; i++) {
    const p = obj(P[i]), x = String(p.a || ''), y = String(p.b || ''), known = x in hwOf && y in hwOf;
    const key = [x, y].sort().join('|'), mixed = known && hwOf[x] !== hwOf[y], fresh = !seen.has(key);
    if (mixed) seen.add(key);
    const txt = clean(p.t), why = txt.length >= 25 && words(txt).length >= 4 && REL.some(k => txt.includes(k));
    const g1 = mixed && fresh ? 2 : 0, g2 = g1 && why ? 2 : 0;
    r3.push({ id: '4.p' + (i + 1), label: '4-тапсырма · ' + (i + 1) + '-мысал: ' + (known ? NM[x] + ' ↔ ' + NM[y] : 'жұп таңдалмаған') + (known && !mixed ? ' (бір аппараттық, бір программалық болуы керек)' : known && !fresh ? ' (екінші мысал бірінші жұптан басқа болуы керек)' : '') + (txt ? ' — «' + txt.slice(0, 110) + '»' : ''), max: 4, got: g1 + g2 });
  }
  const sheets = [r1, r2, r3].map(items => ({ items, pts: items.reduce((s, i) => s + i.got, 0) }));
  /* Көшіруді анықтау үшін жазбаша жауаптардың саусақ ізі */
  const fpText = [A2g.map(clean).join('|'), t3.map(x => clean(x.v)).join('|'), A2_ROWS.map(r => clean(F[r.id])).join('|'), P.map(p => clean(obj(p).t)).join('|')].join('#');
  return { sheets, fpText: fpText.replace(/[#|]/g, '').length >= 120 ? fpText : '' };
}
