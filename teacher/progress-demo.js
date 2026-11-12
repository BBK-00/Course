import { summarizeProgress } from '../assets/progress-metrics.js';

const course = { id: 1, group_id: 1, group_name: 'Демо топ', subject: 'Python', course: 'py', year: 2026, threshold: 70 };
const lessons = [
  ['2026-09-10', 'Енгізу және шығару'],
  ['2026-09-17', 'Арифметикалық өрнектер'],
  ['2026-09-24', 'Салыстыру және логикалық амалдар'],
  ['2026-10-01', 'if операторы'],
  ['2026-10-08', 'Құрама шарттар'],
  ['2026-10-15', 'Тармақталу практикасы'],
  ['2026-10-22', 'for және range()'],
  ['2026-10-29', 'while циклі']
];
const grades = [
  [78, 81, 83, 80, 72, 65, 61, 66],
  [85, 83, 87, 85, 88, 90, 73, 76],
  [69, 73, 72, 77, 76, 69, 62, 64],
  [75, 79, 83, 84, 87, 83, 72, 71],
  [55, 61, 63, 68, 65, 67, 73, 75],
  [71, 75, 74, 76, 71, 64, 68, 72],
  [91, 93, 91, 94, 92, 95, 89, 94],
  [87, 84, 86, 83, 88, 86, 79, 87],
  [68, 74, 76, 78, 82, 79, 75, 81],
  [83, 82, 85, 86, 84, 88, 81, 86],
  [89, 90, 91, 92, 93, 89, 84, 90],
  [73, 71, 75, 79, 77, 78, 72, 80],
  [82, 84, 78, 81, 84, 85, 78, 83],
  [74, 76, 78, 81, 77, null, 71, 79],
  [null, null, null, null, 75, null, null, 72],
  [null, null, null, null, null, null, null, null]
];
const students = grades.map((_, index) => ({ id: index + 1, name: 'Студент ' + String(index + 1).padStart(2, '0'), active: 1 }));
const entries = grades.flatMap((row, index) => row.flatMap((score, column) => score === null ? [] : [{
  student: students[index].id, date: lessons[column][0], title: lessons[column][1], column, score
}]));
const report = summarizeProgress(students, entries, course.threshold);

function h(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'text') element.textContent = value;
    else if (key === 'on') {
      for (const [event, listener] of Object.entries(value)) element.addEventListener(event, listener);
    } else if (value !== false && value !== undefined) element.setAttribute(key, value);
  }
  element.append(...[children].flat().filter(child => child != null));
  return element;
}

async function api(path) {
  if (path === 'progress') return { ok: true, groups: [{ id: 1, name: course.group_name }], courses: [course], catalog: { py: 'Python' } };
  if (path === 'progress/report?id=1&source=site') return { ok: true, report };
  return { ok: false };
}

window.TeacherProgress({ root: document.getElementById('demo-report'), h, api, demo: true });
