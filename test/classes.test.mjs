import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryD1 } from './d1-memory.mjs';
import worker from '../src/index.js';
import { sign } from '../src/auth.js';
import { suggestLogin } from '../src/classes.js';

const origin = 'https://classroom.test';
const csv = [
  ',,,,,,,,,',
  ',Бағдарлама атауы,КМ3.5,,,,,48/36,,',
  ',,САБАҚ ӨТКІЗІЛГЕН КҮНДЕР,,,,,,ҮЛГЕРІМ,',
  ',,1,2,3,,,,,',
  '№,"ТЕГІ, АТЫ, ӘКЕСІНІҢ АТЫ",01.09,08.09,16.09,ҚРТ,"Қайта',
  'тапсыру",баға,,',
  ',,1,2,0,,,,,',
  'р/с,(толық),Сс,Жм,Ср,,,,,',
  '1,КЫДБЕКОВА АРУЖАН КАНАТОВНА,,80,40,60,0,4,,',
  '2,САҒЫНБАЙ ДОСХАН ЕРКЕБҰЛАНҰЛЫ,ж,с,70,70,0,1,,'
].join('\n');

// ensureSchema бір процесте бір рет жұмыс істейді, сондықтан барлық тест бір дерекқорды бөліседі.
const DB = memoryD1();
test.after(() => DB.sqlite.close());

async function harness() {
  const env = { DB, TEACHER_PASSWORD: 'local-test', GEMINI_STUB: '1' };
  const token = await sign(env, { r: 't' }, 600);
  const call = async (path, body, method) => {
    const response = await worker.fetch(new Request(origin + '/api/teacher/' + path, {
      method: method || (body ? 'POST' : 'GET'), headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }), env, {});
    return { status: response.status, ...(await response.json()) };
  };
  const learner = async (path, body, cookie = '') => {
    const response = await worker.fetch(new Request(origin + '/api/account/' + path, {
      method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: body ? JSON.stringify(body) : undefined
    }), env, {});
    return { response, ...(await response.json()) };
  };
  return { call, learner };
}

test('login suggestion transliterates Kazakh names', () => {
  assert.equal(suggestLogin('Қыдбекова Аружан Канатовна'), 'kydbekova.aruzhan');
  assert.equal(suggestLogin('САҒЫНБАЙ ДОСХАН'), 'sagynbai.doshan');
});

test('group cannot be created without a subject', async t => {
  const { call } = await harness();
  assert.equal((await call('classes', { name: 'ИФ-315' })).error, 'group_needs_subject');
  assert.equal((await call('classes', { name: 'ИФ-315', course: 'sm' })).error, 'group_needs_subject');
  assert.equal((await call('classes', { name: 'ИФ-315', course: 'nope', subject: 'КМ3.5' })).error, 'group_needs_subject');
  const made = await call('classes', { name: 'ИФ-315', course: 'sm', subject: 'КМ3.5', year: 2026, names: 'Бір Студент\nЕкі Студент' });
  assert.equal(made.ok, true);
  const [group] = made.groups;
  assert.equal(group.courses.length, 1);
  assert.equal(group.students.length, 2);
  assert.equal((await call('classes', { name: 'ИФ-315', course: 'sm', subject: 'КМ3.5' })).error, 'group_exists');
});

test('journal import from a public sheet creates students, keeps marks and averages', async t => {
  const { call } = await harness();
  const made = await call('classes', { name: 'ИФ-316', course: 'sm', subject: 'КМ3.5', year: 2026 });
  const course = made.groups.find(g => g.id === made.id).courses[0].id;
  const link = 'https://docs.google.com/spreadsheets/d/abcdefghij123/edit?gid=77#gid=77';
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(String(url));
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
  });

  const preview = await call('classes/import', { course, sheet: link });
  assert.equal(preview.ok, true);
  assert.equal(urls[0], 'https://docs.google.com/spreadsheets/d/abcdefghij123/export?format=csv&gid=77');
  assert.deepEqual([preview.students, preview.newStudents, preview.lessons, preview.scores, preview.marks], [2, 2, 3, 3, 2]);
  assert.equal((await call('classes/journal?course=' + course)).lessons.length, 0, 'preview must not write');

  const done = await call('classes/import', { course, sheet: link, commit: true });
  assert.equal(done.ok, true);
  const view = await call('classes/journal?course=' + course);
  assert.deepEqual(view.students.map(s => s.name), ['Кыдбекова Аружан Канатовна', 'Сағынбай Досхан Еркебұланұлы']);
  assert.deepEqual(view.lessons.map(l => [l.date, l.kind, l.hours]), [['2026-09-01', 'Сс', 1], ['2026-09-08', 'Жм', 2], ['2026-09-16', 'Ср', 0]]);
  const [aruzhan, doskhan] = view.students;
  assert.equal(view.summary[aruzhan.id].avg, 60);
  assert.deepEqual([view.summary[doskhan.id].absent, view.summary[doskhan.id].retake, view.summary[doskhan.id].avg], [1, 1, 70]);
  assert.equal(view.course.sheet, link.split('#')[0]);

  // қайта импорт студентті көбейтпейді
  await call('classes/import', { course, commit: true });
  assert.equal((await call('classes')).groups[0].students.length, 2);

  // ұяшықты өзгерту және жаңа сабақ қосу
  const key = view.lessons[0].key;
  assert.equal((await call('classes/cell', { course, student: aruzhan.id, key, value: '95,5' })).ok, true);
  assert.equal((await call('classes/cell', { course, student: aruzhan.id, key, value: '120' })).error, 'cell_value');
  assert.equal((await call('classes/cell', { course, student: aruzhan.id, key: 's1', value: '5' })).error, 'cell_readonly');
  assert.equal((await call('classes/lesson', { course, date: '2026-11-20', kind: 'Ср', hours: 2 })).ok, true);
  const edited = await call('classes/journal?course=' + course);
  assert.equal(edited.cells[aruzhan.id][key].score, 95.5);
  assert.equal(edited.lessons.length, 4);
  assert.equal(edited.summary[aruzhan.id].avg, 71.83);
  await call('classes/cell', { course, student: aruzhan.id, key, value: '' });
  assert.equal((await call('classes/journal?course=' + course)).cells[aruzhan.id][key], undefined);

  // жабық кесте
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }));
  assert.equal((await call('classes/import', { course, sheet: link })).error, 'sheet_access');
  assert.equal((await call('classes/import', { course, sheet: 'https://evil.test/x' })).error, 'sheet_link');
});

test('teacher-created student accounts sign in with a login and see only their own marks', async t => {
  const { call, learner } = await harness();
  const made = await call('classes', { name: 'ИФ-317', course: 'sm', subject: 'КМ3.5', year: 2026, names: 'Қыдбекова Аружан\nСағынбай Досхан' });
  const course = made.groups.find(g => g.id === made.id).courses[0].id;
  t.mock.method(globalThis, 'fetch', async () => new Response(csv.replace('КЫДБЕКОВА АРУЖАН КАНАТОВНА', 'Қыдбекова Аружан').replace('САҒЫНБАЙ ДОСХАН ЕРКЕБҰЛАНҰЛЫ', 'Сағынбай Досхан'), { headers: { 'Content-Type': 'text/csv' } }));
  assert.equal((await call('classes/import', { course, sheet: 'https://docs.google.com/spreadsheets/d/abcdefghij123/edit?gid=1', commit: true })).ok, true);

  assert.equal((await call('classes/accounts', { group: made.id, password: '123' })).error, 'password_short');
  const bulk = await call('classes/accounts', { group: made.id, password: 'student-pass' });
  assert.deepEqual(bulk.made.map(m => m.login).sort(), ['kydbekova.aruzhan', 'sagynbai.doshan']);
  assert.equal((await call('classes/accounts', { group: made.id, password: 'student-pass' })).made.length, 0);

  assert.equal((await learner('login', { email: 'kydbekova.aruzhan', password: 'wrong-pass' })).response.status, 401);
  const login = await learner('login', { email: 'Kydbekova.Aruzhan', password: 'student-pass' });
  assert.equal(login.response.status, 200);
  assert.equal(login.account.student, true);
  const cookie = login.response.headers.get('Set-Cookie').split(';')[0];
  const mine = await learner('journal', null, cookie);
  assert.equal(mine.journal.student.group, 'ИФ-317');
  assert.equal(mine.journal.courses[0].subject, 'КМ3.5');
  assert.equal(mine.journal.courses[0].summary.avg, 60);
  assert.equal(JSON.stringify(mine).includes('Досхан'), false, 'must not leak classmates');
  assert.equal((await learner('journal')).response.status, 401);

  // оқытушы паролін ауыстырады → ескі сессия жабылады, жаңа пароль жұмыс істейді
  const student = bulk.made.find(m => m.login === 'kydbekova.aruzhan').student;
  assert.equal((await call('classes/account', { student, password: 'new-pass-77' })).login, 'kydbekova.aruzhan');
  assert.equal((await learner('journal', null, cookie)).response.status, 401);
  assert.equal((await learner('login', { email: 'kydbekova.aruzhan', password: 'new-pass-77' })).response.status, 200);
  assert.equal((await call('classes/account', { student, login: 'sagynbai.doshan', password: 'new-pass-77' })).error, 'login_taken');

  // студенттер өздері email-мен тіркелуі қалай болса солай қалады
  assert.equal((await learner('register', { name: 'Өзі', email: 'x@y.kz', password: 'short' })).response.status, 400);
  assert.equal((await learner('register', { name: 'Өзі', email: 'kydbekova.aruzhan', password: 'long-enough-1' })).response.status, 400);
});

test('group with history cannot be deleted, an empty one can', async t => {
  const { call } = await harness();
  const a = await call('classes', { name: 'А-1', course: 'py', subject: 'Python' });
  assert.equal((await call('classes/group/' + a.id, null, 'DELETE')).ok, true);
  const b = await call('classes', { name: 'Б-1', course: 'sm', subject: 'КМ3.5', year: 2026, names: 'Бір Студент' });
  const course = b.groups.find(g => g.id === b.id).courses[0].id;
  t.mock.method(globalThis, 'fetch', async () => new Response(csv.replace('КЫДБЕКОВА АРУЖАН КАНАТОВНА', 'Бір Студент'), { headers: { 'Content-Type': 'text/csv' } }));
  await call('classes/import', { course, sheet: 'https://docs.google.com/spreadsheets/d/abcdefghij123/edit?gid=1', commit: true });
  assert.equal((await call('classes/group/' + b.id, null, 'DELETE')).error, 'group_has_history');
  assert.equal((await call('classes/course/' + course, null, 'DELETE')).error, 'course_has_data');
});


/* ---------- Пән жоспары: Word / Excel ---------- */
import { zip } from '../src/xlsx.js';
import { officeRows, topicsFromRows } from '../src/plan-import.js';

const b64 = bytes => Buffer.from(bytes).toString('base64');
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const cell = text => `<w:tc><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`;
const row = (...cells) => `<w:tr>${cells.map(cell).join('')}</w:tr>`;
const docx = () => zip({
  '[Content_Types].xml': '<Types/>',
  'word/document.xml': `<w:document ${W}><w:body>
    <w:p><w:r><w:t>Күнтізбелік-тақырыптық жоспар</w:t></w:r></w:p>
    <w:tbl>${row('№', 'Сабақ тақырыбы', 'Сағат')}${row('1', 'Сызықтық теңдеулер жүйесі', '2')}${row('2', 'Гаусс әдісі &amp; оның қадамдары', '2')}${row('3', 'Гаусс–Зейдель әдісі', '4')}${row('', 'Барлығы', '8')}</w:tbl></w:body></w:document>`
});
const sharedStrings = ['№', 'Тақырып', 'Сағат', 'Интерполяция', 'Аппроксимация'];
const xlsx = () => zip({
  '[Content_Types].xml': '<Types/>',
  'xl/sharedStrings.xml': `<sst>${sharedStrings.map(s => `<si><t>${s}</t></si>`).join('')}</sst>`,
  'xl/worksheets/sheet1.xml': `<worksheet><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
    <row r="2"><c r="A2"><v>1</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>2</v></c></row>
    <row r="3"><c r="A3"><v>2</v></c><c r="B3" t="s"><v>4</v></c><c r="C3"><v>2</v></c></row></sheetData></worksheet>`
});

test('plan files: Word and Excel tables become ordered topics', async () => {
  const word = topicsFromRows(await officeRows(docx(), 'plan.docx'));
  assert.deepEqual(word, [
    { n: 1, title: 'Сызықтық теңдеулер жүйесі', hours: 2 },
    { n: 2, title: 'Гаусс әдісі & оның қадамдары', hours: 2 },
    { n: 3, title: 'Гаусс–Зейдель әдісі', hours: 4 }
  ]);
  assert.deepEqual(topicsFromRows(await officeRows(xlsx(), 'plan.xlsx')), [
    { n: 1, title: 'Интерполяция', hours: 2 }, { n: 2, title: 'Аппроксимация', hours: 2 }
  ]);
  await assert.rejects(officeRows(new Uint8Array([1, 2, 3]), 'plan.docx'), /plan_file/);
  await assert.rejects(officeRows(new Uint8Array([1]), 'plan.pdf'), /plan_type/);
  // тақырып бағаны жоқ еркін кесте де жұмыс істейді
  assert.equal(topicsFromRows([['1', 'Кіріспе дәріс және негізгі ұғымдар'], ['2', 'Қателіктер теориясы']]).length, 2);
});

test('plan upload: preview, edit, save, show in journal and student view', async t => {
  const { call, learner } = await harness();
  const made = await call('classes', { name: 'ИФ-318', course: 'sm', subject: 'КМ3.5', year: 2026, names: 'Қыдбекова Аружан' });
  const course = made.groups.find(g => g.id === made.id).courses[0].id;

  assert.equal((await call('classes/plan/preview', { course, name: 'plan.docx', data: 'not-base64!!' })).error, 'plan_file');
  assert.equal((await call('classes/plan/preview', { course, name: 'plan.pdf', data: b64([1, 2, 3]) })).error, 'plan_type');
  const preview = await call('classes/plan/preview', { course, name: 'plan.docx', data: b64(docx()), ai: true });
  assert.equal(preview.ok, true);
  assert.equal(preview.source, 'table');
  assert.equal(preview.topics.length, 3);

  assert.equal((await call('classes/plan', { course, topics: [{ n: 1, title: 'x' }] })).error, 'plan_topics');
  assert.equal((await call('classes/plan', { course, topics: [{ n: 1, title: 'Бір' }, { n: 1, title: 'Қайта' }] })).error, 'plan_topics');
  assert.equal((await call('classes/plan', { course, topics: preview.topics })).saved, 3);
  assert.equal((await call('classes/plan?course=' + course)).topics.length, 3);

  // жоспардың 1-тақырыбы журналдағы 1-сабақ күніне сәйкес келеді
  t.mock.method(globalThis, 'fetch', async () => new Response(csv.replace('КЫДБЕКОВА АРУЖАН КАНАТОВНА', 'Қыдбекова Аружан'), { headers: { 'Content-Type': 'text/csv' } }));
  await call('classes/import', { course, sheet: 'https://docs.google.com/spreadsheets/d/abcdefghij123/edit?gid=1', commit: true });
  const view = await call('classes/journal?course=' + course);
  assert.deepEqual(view.lessons.map(l => l.title), ['Сызықтық теңдеулер жүйесі', 'Гаусс әдісі & оның қадамдары', 'Гаусс–Зейдель әдісі']);
  assert.equal(view.plan.length, 3);

  const bulk = await call('classes/accounts', { group: made.id, password: 'student-pass' });
  const login = await learner('login', { email: bulk.made[0].login, password: 'student-pass' });
  const mine = await learner('journal', null, login.response.headers.get('Set-Cookie').split(';')[0]);
  assert.equal(mine.journal.courses[0].plan.length, 3);

  assert.equal((await call('classes/plan?course=' + course, null, 'DELETE')).ok, true);
  assert.equal((await call('classes/plan?course=' + course)).topics.length, 0);
});

test('AI journal analysis: facts are computed on the server, AI failure still returns them', async t => {
  const { call } = await harness();
  const made = await call('classes', { name: 'ИФ-319', course: 'sm', subject: 'КМ3.5', year: 2026 });
  const course = made.groups.find(g => g.id === made.id).courses[0].id;
  assert.equal((await call('classes/ai', { course })).ai, 'no_scores');
  t.mock.method(globalThis, 'fetch', async () => new Response(csv, { headers: { 'Content-Type': 'text/csv' } }));
  await call('classes/import', { course, sheet: 'https://docs.google.com/spreadsheets/d/abcdefghij123/edit?gid=1', commit: true });
  const group = await call('classes/ai', { course });
  assert.equal(group.facts.students, 2);
  assert.equal(group.facts.average, 65);
  assert.deepEqual(group.facts.belowThreshold, []);
  assert.equal(typeof group.summary, 'string'); // тесттегі GEMINI_STUB режимі
  const view = await call('classes/journal?course=' + course);
  const one = await call('classes/ai', { course, student: view.students[0].id });
  assert.deepEqual(one.facts.scores, [80, 40]);
  assert.equal((await call('classes/ai', { course, student: 999999 })).error, 'not_found');
});
