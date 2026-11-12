/* Студияда жасалған тапсырмалар: оқытушы толтырған деректерді бар Python тапсырма қозғалтқышының пішініне айналдыру.
   Таза функциялар (D1/Judge0 жоқ). Тақырып id: 'D<сабақ id>'. */
import { richText, esc } from './studio-render.js';

export const MAX_TASKS = 4, MAX_ITEMS = 15, HW_PTS = 25;
const str = (v, n) => String(v === undefined || v === null ? '' : v).slice(0, n);
const KINDS = ['code', 'fix', 'quiz', 'short'];
export const isDataTopic = t => /^D\d+$/.test(String(t));
export const lessonIdOf = t => +String(t).slice(1);

/* ---------- Тазалау ---------- */
function cleanItem(x) {
  const source = x && typeof x === 'object' ? x : {};
  x = source;
  const k = KINDS.includes(x.k) ? x.k : 'code', o = { k, title: str(x.title, 100) };
  if (k === 'short') {
    o.q = str(x.q, 1500);
    o.code = str(x.code, 1500);
    o.why = str(x.why, 600);
    o.answers = str(x.answers, 240).split('\n').map(s => s.trim().slice(0, 20)).filter(Boolean).slice(0, 8).join('\n');
  } else if (k === 'quiz') {
    o.q = str(x.q, 1500); o.code = str(x.code, 1500); o.why = str(x.why, 600);
    o.opts = (Array.isArray(x.opts) ? x.opts : []).slice(0, 6).map(t => str(t, 200));
    o.correct = Number.isInteger(x.correct) && x.correct >= 0 && x.correct < o.opts.length ? x.correct : 0;
  } else {
    o.text = str(x.text, 3000); o.starter = k === 'fix' ? str(x.starter, 4000) : str(x.starter, 2000); o.ref = str(x.ref, 4000); o.hint = str(x.hint, 600);
    o.cases = (Array.isArray(x.cases) ? x.cases : []).slice(0, 10).map(c => ({ in: str(c && c.in, 400), out: str(c && c.out, 400), not: str(c && c.not, 400) }));
  }
  return o;
}
export function sanitizeTasks(input) {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const tasks = (Array.isArray(src.tasks) ? src.tasks : []).slice(0, MAX_TASKS).map(t => ({
    title: str(t && t.title, 80) || 'Тапсырма', info: str(t && t.info, 400),
    minutes: Math.min(90, Math.max(1, parseInt(t && t.minutes, 10) || 10)), pts: Math.min(100, Math.max(0, Number(t && t.pts) || 0)),
    items: (Array.isArray(t && t.items) ? t.items : []).slice(0, MAX_ITEMS).map(cleanItem)
  }));
  const h = src.hw && typeof src.hw === 'object' ? src.hw : {};
  const hw = { on: h.on === true || (h.on !== false && !!(h.title || h.lead || (h.items && h.items.length))), title: str(h.title, 120), lead: str(h.lead, 600), how: str(h.how, 300) || 'Кодты дәптерге жазып фотосын түсір, не бағдарламаның скриншотын ал.',
    items: (Array.isArray(h.items) ? h.items : []).slice(0, 8).map(t => str(t, 300)).filter(Boolean), crit: (Array.isArray(h.crit) ? h.crit : []).slice(0, 8).map(c => ({ t: str(c && c.t, 200), pts: Math.min(25, Math.max(0, Number(c && c.pts) || 0)) })).filter(c => c.t) };
  return { v: 1, tasks, hw, ...(src.grading === 'manual' ? {grading:'manual'} : {}) };
}
export const hasTasks = d => !!(d && d.tasks && d.tasks.some(t => t.items.length));

/* ---------- Тексеру (жариялар алдында) ---------- */
export function validateTasks(d) {
  const p = [];
  if (!d.tasks.length) p.push('Тапсырма жоқ.');
  if (d.grading === 'manual') {
    const max = d.hw.on ? 75 : 100;
    const total = d.tasks.reduce((sum, task) => sum + task.pts, 0);
    if (total !== max) p.push('Тапсырма балдарының қосындысы ' + max + ' болуы керек. Қазір ' + total + '.');
    d.tasks.forEach((task, index) => {
      if (!Number.isInteger(task.pts) || task.pts < Math.max(1, task.items.length))
        p.push((index + 1) + '-тапсырмаға есеп санына жететін бүтін балл қойыңыз.');
    });
  }
  d.tasks.forEach((t, ti) => {
    const T = (ti + 1) + '-тапсырма';
    if (!t.items.length) p.push(T + ': есеп жоқ.');
    if (t.items.some(x => x.k === 'short') && t.items.some(x => x.k !== 'short')) p.push(T + ': қысқа жауаптарды бөлек тапсырмаға жинаңыз.');
    t.items.forEach((x, i) => {
      const W = T + ', ' + (i + 1) + '-есеп';
      if (x.k === 'short') {
        if (!x.q.trim()) p.push(W + ': сұрақ жазылмаған.');
        if (!x.answers.trim()) p.push(W + ': қабылданатын жауап енгізіңіз.');
      } else if (x.k === 'quiz') {
        if (!x.q.trim()) p.push(W + ': сұрақ жазылмаған.');
        if (x.opts.filter(o => o.trim()).length < 2) p.push(W + ': кемінде 2 жауап керек.');
        else if (!x.opts[x.correct] || !x.opts[x.correct].trim()) p.push(W + ': дұрыс жауап бос.');
        if (new Set(x.opts.map(o => o.trim())).size < x.opts.length) p.push(W + ': жауаптар қайталанып тұр.');
      } else {
        if (!x.text.trim()) p.push(W + ': есеп шарты жазылмаған.');
        if (!x.ref.trim()) p.push(W + ': дұрыс шешім (эталон) жоқ.');
        if (x.k === 'fix' && !x.starter.trim()) p.push(W + ': қателі код жоқ.');
        const good = x.cases.filter(c => c.out.trim());
        if (!good.length) p.push(W + ': кемінде бір тест жағдайы (күтілетін шығару) керек.');
      }
    });
  });
  if (d.hw.on) {
    if (!d.hw.title.trim()) p.push('Үй жұмысы: атауы жоқ.');
    if (!d.hw.crit.length) p.push('Үй жұмысы: бағалау критерийі жоқ.');
    else if (Math.abs(d.hw.crit.reduce((a, c) => a + c.pts, 0) - HW_PTS) > 0.01) p.push('Үй жұмысы: критерий баллдарының қосындысы ' + HW_PTS + ' болуы керек (қазір ' + d.hw.crit.reduce((a, c) => a + c.pts, 0) + ').');
  }
  return p;
}

/* ---------- Ұпайды 5-ке бөлу ---------- */
/* total-ды unit қадаммен салмаққа қарай бөледі (ең үлкен қалдық әдісі), әрқайсысына кемінде 1 қадам */
export function distribute(total, weights, unit) {
  const n = weights.length; if (!n) return [];
  const units = Math.round(total / unit), tot = weights.reduce((x, y) => x + y, 0), w = tot > 0 ? weights : weights.map(() => 1);
  const ws = w.reduce((a, b) => a + b, 0), q = w.map(x => x / ws * units), base = q.map(Math.floor);
  if (units >= n) base.forEach((v, i) => { if (v < 1) base[i] = 1; });
  let left = units - base.reduce((a, b) => a + b, 0);
  const order = q.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k++, left--) base[order[k % n][1]]++;
  for (let k = n - 1; left < 0; k = (k - 1 + n) % n) { if (base[order[k][1]] > 1) { base[order[k][1]]--; left++; } }
  return base.map(v => v * unit);
}
const bumpUnit = (total, count) => (total / count >= 5 ? 5 : 1);

/* Автордың баптауынан қозғалтқыш анықтамасы: тапсырма ұпайлары (үй жұмысыз 100, үй жұмысымен 75), есеп ұпайлары, уақыт, үй жұмысы */
export function compileDef(d, title) {
  const T = d.tasks.filter(t => t.items.length);
  const requested = T.map(t => t.pts);
  const validManual = d.grading === 'manual' && requested.reduce((sum, points) => sum + points, 0) === (d.hw.on ? 75 : 100);
  const noW = validManual && !d.hw.on ? requested : distribute(100, T.map(t => t.pts > 0 ? t.pts : t.items.length), 5);
  const withW = validManual && d.hw.on ? requested : distribute(100 - HW_PTS, noW, 5);
  const def = { noHw: {}, withHw: {}, minutes: {}, titles: {}, itemPts: { noHw: {}, withHw: {} }, concepts: {}, hwDefault: d.hw.on };
  T.forEach((t, i) => {
    const n = i + 1; def.noHw[n] = noW[i]; def.withHw[n] = withW[i]; def.minutes[n] = t.minutes; def.titles[n] = t.title; def.concepts['t' + n] = { sym: String(n), name: t.title };
    const weights = t.items.map(() => 1);
    def.itemPts.noHw[n] = distribute(noW[i], weights, noW[i] % 5 ? 1 : bumpUnit(noW[i], t.items.length));
    def.itemPts.withHw[n] = distribute(withW[i], weights, withW[i] % 5 ? 1 : bumpUnit(withW[i], t.items.length));
  });
  def.titles[5] = 'Үй жұмысы';
  const h = d.hw;
  def.hw = { title: h.title || 'Үй жұмысы', lead: h.lead, items: h.items, how: h.how,
    prompt: 'TASK GIVEN TO THE STUDENT: ' + [h.title, h.lead, ...h.items].filter(Boolean).join('. ') + '\nSCORE 0-25: ' + (h.crit.length ? h.crit.map(c => c.t + ' (' + c.pts + ')').join('; ') : 'correct solution of the task (20); readability (5)') };
  return def;
}

/* ---------- Қозғалтқышқа арналған тапсырмалар ---------- */
const lines = s => String(s || '').replace(/\r/g, '').split('\n');
const normLine = s => String(s).toLowerCase().replace(/[.!?:;,«»"'()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
/* тест жағдайлары: күтілетін жолдар + басқа жағдайлардың жолдарынан «болмауы керек» тізімі (қате жауап өтіп кетпеуі үшін) */
export function buildCases(cases) {
  const good = cases.filter(c => c.out.trim()), exps = good.map(c => lines(c.out).map(s => s.trim()).filter(Boolean));
  return good.map((c, i) => {
    const mine = exps[i], mineN = mine.map(normLine), not = [];
    exps.forEach((o, j) => { if (j !== i) o.forEach(l => { const n = normLine(l); if (n && !mineN.some(m => m.includes(n) || n.includes(m)) && !not.some(x => normLine(x) === n)) not.push(l); }); });
    const extra = lines(c.not).map(s => s.trim()).filter(Boolean);
    return { in: lines(c.in).filter((s, k, a) => !(k === a.length - 1 && s === '')), exp: mine, not: [...not, ...extra], tag: i === 0 ? 'above' : 'above' };
  });
}
const IO = c => '<p><b>Енгізу:</b> ' + (c && c.in.length ? esc(c.in.join('; ')) : 'жоқ') + '</p><p><b>Шығару:</b> ' + (c ? esc(c.exp.join('; ')) : '') + '</p>';
export function buildData(d, def, variant, { shuffle } = {}) {
  const T = d.tasks.filter(t => t.items.length);
  return T.map((t, ti) => {
    const n = ti + 1;
    return { n, title: t.title, info: t.info || '', items: t.items.map((x, ii) => {
      const id = n * 100 + ii + 1, max = (def.itemPts.withHw[n] || [])[ii] || 1, title = x.title || (x.k === 'quiz' ? 'Сұрақ ' + (ii + 1) : 'Есеп ' + (ii + 1));
      if (x.k === 'short') {
        const accepted = x.answers.split('\n').filter(Boolean);
        return { id, kind: 'quiz', typed: true, max, title, op: 't' + n, q: x.q, code: x.code, ans: accepted[0], accepted, why: x.why || 'Дұрыс жауап: ' + accepted[0], skills: ['logic'], opts: [] };
      }
      if (x.k === 'quiz') return { id, kind: 'quiz', max, title, op: 't' + n, q: x.q, code: x.code, why: x.why || 'Дұрыс жауап: ' + x.opts[x.correct], skills: ['logic'], opts: x.opts.map((tx, i) => ({ i, t: tx })), correct: x.correct };
      const cases = buildCases(x.cases), hint = x.hint || 'Шартты қайта оқып, кодыңды тест мысалдарымен салыстыр.';
      return { id, kind: x.k, max, title, op: 't' + n, skills: ['logic'], text: richText(x.text) + IO(cases[0]), starter: x.starter || '', sample: { in: cases[0] ? cases[0].in : [], out: cases[0] ? cases[0].exp.join('\n') : '' }, cases, hints: { edge: hint, under: hint, over: hint, special: hint }, ref: x.ref };
    }) };
  });
}
