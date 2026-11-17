import { learnerAccount } from './learner-auth.js?v=1';

const host = document.getElementById('myJournal');
const fmt = new Intl.NumberFormat('kk-KZ', { maximumFractionDigits: 1 });
const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...kids.filter(k => k !== null && k !== undefined && k !== false));
  return node;
};
const band = (score, threshold) => score >= 90 ? 'high' : score >= 75 ? 'good' : score >= threshold ? 'mid' : 'low';
const dm = date => date.slice(8, 10) + '.' + date.slice(5, 7);

function note(text, ...extra) { host.replaceChildren(el('p', { class: 'my-journal-note' }, text), ...extra); }

function loginPrompt() {
  const open = el('button', { type: 'button', class: 'lr-btn lr-primary' }, 'Кіру');
  open.onclick = () => document.querySelector('[data-learner-top] .learner-top-actions button')?.click();
  note('Журналды көру үшін оқытушы берген логин мен парольмен кіріңіз.', open);
}

function subjectCard(course) {
  const marks = course.lessons.filter(l => course.cells[l.key]);
  const s = course.summary || {};
  const head = course.lessons.map(l => el('th', { scope: 'col' }, dm(l.date), el('small', {}, l.kind || ' ')));
  const row = course.lessons.map(l => {
    const c = course.cells[l.key];
    if (!c) return el('td');
    const kind = c.score !== null ? band(c.score, course.threshold) : c.mark === 'ж' ? 'abs' : 'ret';
    const text = c.score !== null ? fmt.format(c.score) : c.mark === 'ж' ? 'НБ' : 'қайта';
    return el('td', {}, el('span', { class: 'mj ' + kind }, text));
  });
  return el('section', { class: 'my-journal-card' },
    el('h2', {}, course.subject, el('small', {}, course.year + '–' + (course.year + 1))),
    el('dl', { class: 'my-journal-stats' },
      el('div', {}, el('dt', {}, 'Орташа балл'), el('dd', { class: s.avg !== null && s.avg !== undefined && s.avg < course.threshold ? 'low' : '' }, s.avg === null || s.avg === undefined ? '—' : fmt.format(s.avg))),
      el('div', {}, el('dt', {}, 'Бағаланған сабақ'), el('dd', {}, String(s.count || 0))),
      el('div', {}, el('dt', {}, 'НБ'), el('dd', {}, String(s.absent || 0))),
      el('div', {}, el('dt', {}, 'Қайта тапсыру'), el('dd', {}, String(s.retake || 0)))),
    marks.length ? el('div', { class: 'my-journal-scroll', tabindex: '0', role: 'region', 'aria-label': course.subject + ' бағалары' },
      el('table', {}, el('thead', {}, el('tr', {}, ...head)), el('tbody', {}, el('tr', {}, ...row)))) : el('p', { class: 'my-journal-note' }, 'Әзірге баға қойылмаған.'));
}

async function load() {
  const result = await learnerAccount('/journal');
  if (result.error === 'auth') return loginPrompt();
  if (!result.ok) return note('Журналды жүктеу мүмкін болмады. Кейінірек қайталаңыз.');
  if (!result.journal) return note('Бұл аккаунт топ журналына байланбаған. Оқытушыдан студент логинін сұраңыз.');
  const { student, courses } = result.journal;
  host.replaceChildren(el('p', { class: 'my-journal-who' }, el('b', {}, student.name), ' · ' + student.group),
    ...(courses.length ? courses.map(subjectCard) : [el('p', { class: 'my-journal-note' }, 'Топқа әлі пән қосылмаған.')]));
}

document.addEventListener('learner-account', event => { if (event.detail?.account) load(); else loginPrompt(); });
load();
