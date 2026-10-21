/* АКТ · 2-тақырып: 4-тапсырма (70 балл) сайттың өзінде орындалады, ЖИ қажет емес.
   1 · түрі (аппараттық / программалық) 8 × 3 = 24; 2 · қызметі 8 × 4 = 32; 3 · өзара байланыс мысалдары 2 × 7 = 14. */
export const A2_MAX = { 1: 24, 2: 32, 3: 14 };

/* Элементтер: id, дұрыс түрі, қызметін білдіретін сөз түбірлері */
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

export function gradeA2(ans) {
  const a = ans && typeof ans === 'object' ? ans : {}, T = a.types && typeof a.types === 'object' ? a.types : {}, F = a.funcs && typeof a.funcs === 'object' ? a.funcs : {};
    const r1 = [], r2 = [];
  A2_ROWS.forEach((r, i) => {
    const t = T[r.id], ok = (t === 'hw') === r.hw && (t === 'hw' || t === 'sw');
    r1.push({ id: '1.' + (i + 1), label: r.nm + ': түрі' + (t ? ' (жауабы: ' + (t === 'hw' ? 'аппараттық' : 'программалық') + ')' : ' (таңдалмаған)'), max: 3, got: ok ? 3 : 0 });
    const txt = clean(F[r.id]), w = words(txt), hit = w.some(x => r.exact.includes(x)) || r.kw.some(k => txt.includes(k));
    const got = !w.length || txt.length < 8 || w.length < 2 ? 0 : hit ? 4 : 1;
    r2.push({ id: '2.' + (i + 1), label: r.nm + ': қызметі' + (txt ? ' — «' + txt.slice(0, 90) + '»' : ' (жазылмаған)') + (got === 1 ? ' (қызметін білдіретін сөз табылмады)' : ''), max: 4, got });
  });
  const hwOf = {}, NM = {}; A2_ROWS.forEach(r => { hwOf[r.id] = r.hw; NM[r.id] = r.nm; });
  const P = Array.isArray(a.pairs) ? a.pairs.slice(0, 2) : [], seen = new Set(), r3 = [];
  for (let i = 0; i < 2; i++) {
    const p = P[i] || {}, x = String(p.a || ''), y = String(p.b || ''), known = x in hwOf && y in hwOf;
    const key = [x, y].sort().join('|'), mixed = known && hwOf[x] !== hwOf[y], fresh = !seen.has(key);
    if (mixed) seen.add(key);
    const w = words(p.t), txt = clean(p.t), why = txt.length >= 25 && w.length >= 4 && REL.some(k => txt.includes(k));
    const g1 = mixed && fresh ? 3 : 0, g2 = g1 && why ? 4 : 0;
    r3.push({ id: '3.' + (i + 1), label: (i + 1) + '-мысал: ' + (known ? NM[x] + ' ↔ ' + NM[y] : 'жұп таңдалмаған') + (known && !mixed ? ' (бір аппараттық, бір программалық болуы керек)' : known && !fresh ? ' (екінші мысал бірінші жұптан басқа болуы керек)' : '') + (txt ? ' — «' + txt.slice(0, 110) + '»' : ''), max: 7, got: g1 + g2 });
  }
  const rows = [r1, r2, r3].map(items => ({ items, pts: items.reduce((s, i) => s + i.got, 0) }));
  /* Көшіруді анықтау үшін түзілген қызметтердің саусақ ізі */
  const fpText = A2_ROWS.map(r => clean(F[r.id])).join('|') + '#' + P.map(p => clean(p && p.t)).join('|');
  return { sheets: rows, fpText: fpText.length >= 120 ? fpText : '' };
}
