/* Топтар (топ + пән + студент аккаунттары) және Журнал. Сервер: /api/teacher/classes/* */
window.TeacherClasses = function ({ h, btn, api, toast, download, csv, startLesson, onChange, openJournal, openInsights }) {
  const state = { data: null, group: 0, course: 0, journal: null, loading: false };
  const fmt = new Intl.NumberFormat('kk-KZ', { maximumFractionDigits: 1 });
  const dm = date => date.slice(8, 10) + '.' + date.slice(5, 7);
  const band = (score, threshold) => score >= 90 ? 'high' : score >= 75 ? 'good' : score >= threshold ? 'mid' : 'low';
  const label = text => h('label', { class: 'workspace-filter' }, [h('span', { text: text.title }), text.field]);
  const field = (title, input) => label({ title, field: input });
  const courseTitle = (id, catalog) => catalog?.[id] || id;
  const schoolYear = year => year + '–' + (year + 1);

  async function load(force) {
    if (state.data && !force) return state.data;
    const j = await api('classes');
    if (j.ok) { state.data = j; onChange && onChange(); }
    return state.data;
  }
  const refreshFrom = j => { if (j?.groups) { state.data = { ...state.data, groups: j.groups }; onChange && onChange(); } };

  function dialog(title, build) {
    if (document.querySelector('.workspace-dialog[open]')) return null;
    const box = h('dialog', { class: 'workspace-dialog classes-dialog', 'aria-label': title });
    const close = () => box.close();
    const body = h('div', { class: 'classes-form' });
    box.append(h('h2', { text: title }), body);
    box.addEventListener('close', () => box.remove(), { once: true });
    document.body.append(box);
    build(body, close);
    box.showModal();
    return box;
  }
  const courseSelect = catalog => h('select', { class: 'field' }, Object.entries(catalog).map(([id, title]) => h('option', { value: id, text: title })));

  /* ---------- Жаңа топ ---------- */
  function newGroup(root) {
    const { catalog, year } = state.data;
    dialog('Жаңа топ', (body, close) => {
      const name = h('input', { class: 'field', maxlength: '40', placeholder: 'Мысалы, ИФ-315', required: true });
      const course = courseSelect(catalog), subject = h('input', { class: 'field', maxlength: '120', placeholder: 'Мысалы, КМ3.5', required: true });
      const yr = h('input', { class: 'field', type: 'number', value: String(year), min: '2000', max: '2100' });
      const names = h('textarea', { class: 'field', rows: '6', placeholder: 'Әр жолға бір студент: Тегі Аты Әкесінің аты', 'aria-label': 'Студенттер' });
      const save = btn('Топты сақтау', async () => {
        save.disabled = true;
        const j = await api('classes', { name: name.value, course: course.value, subject: subject.value, year: Number(yr.value), names: names.value });
        save.disabled = false;
        if (!j.ok) return;
        refreshFrom(j); state.group = j.id; state.course = 0; close(); render(root); toast('Топ сақталды.');
      }, 'primary');
      const check = () => { save.disabled = !name.value.trim() || !subject.value.trim(); };
      name.oninput = subject.oninput = check; check();
      body.append(
        h('p', { class: 'sub', text: 'Топ пәнмен бірге сақталады: пәнсіз топ болмайды. Басқа пәнді кейін қосуға болады.' }),
        h('div', { class: 'classes-grid' }, [field('Топ атауы', name), field('Сайттағы курс', course), field('Пән / модуль', subject), field('Оқу жылының басы', yr)]),
        field('Студенттер (міндетті емес, кейін қосуға болады)', names),
        h('div', { class: 'workspace-actions' }, [btn('Бас тарту', close, 'sm'), save])
      );
      name.focus();
    });
  }

  /* ---------- Пән қосу ---------- */
  function addCourse(root, group) {
    const { catalog, year } = state.data;
    dialog(group.name + ' · пән қосу', (body, close) => {
      const course = courseSelect(catalog), subject = h('input', { class: 'field', maxlength: '120', placeholder: 'Мысалы, КМ3.5', required: true });
      const yr = h('input', { class: 'field', type: 'number', value: String(year) });
      const th = h('input', { class: 'field', type: 'number', value: '60', min: '1', max: '100' });
      const save = btn('Пәнді қосу', async () => {
        const j = await api('classes/course', { group: group.id, course: course.value, subject: subject.value, year: Number(yr.value), threshold: Number(th.value) });
        if (!j.ok) return;
        refreshFrom(j); state.course = j.id; close(); render(root);
      }, 'primary');
      save.disabled = true; subject.oninput = () => { save.disabled = !subject.value.trim(); };
      body.append(h('div', { class: 'classes-grid' }, [field('Сайттағы курс', course), field('Пән / модуль', subject), field('Оқу жылының басы', yr), field('Назар аудару межесі / 100', th)]),
        h('div', { class: 'workspace-actions' }, [btn('Бас тарту', close, 'sm'), save]));
    });
  }

  /* ---------- Студент аккаунты ---------- */
  function setAccount(root, student) {
    dialog(student.name, (body, close) => {
      const login = h('input', { class: 'field', value: student.login, placeholder: 'автоматты жасалады', autocomplete: 'off', maxlength: '40' });
      const pass = h('input', { class: 'field', type: 'text', placeholder: 'Кемінде 6 таңба', autocomplete: 'off', maxlength: '128' });
      const save = btn(student.login ? 'Парольді ауыстыру' : 'Аккаунт ашу', async () => {
        const j = await api('classes/account', { student: student.id, login: login.value, password: pass.value });
        if (!j.ok) return;
        refreshFrom(j); close(); render(root);
        toast('Логин: ' + j.login + ' · Пароль: ' + pass.value, false);
      }, 'primary');
      save.disabled = true; pass.oninput = () => { save.disabled = pass.value.length < 6; };
      body.append(h('p', { class: 'sub', text: 'Студент осы логин мен парольмен кіреді. Парольді сіз өзіңіз бересіз, сайт оны кейін көрсете алмайды.' }),
        h('div', { class: 'classes-grid' }, [field('Логин', login), field('Пароль', pass)]),
        h('div', { class: 'workspace-actions' }, [
          student.login ? btn('Аккаунтты өшіру', async () => {
            if (!confirm('Аккаунт өшірілсін бе? Бағалар сақталады.')) return;
            const j = await api('classes/account/' + student.id, null, 'DELETE');
            if (j.ok) { refreshFrom(j); close(); render(root); }
          }, 'sm danger') : null, h('span', { class: 'sp' }), btn('Бас тарту', close, 'sm'), save]));
      pass.focus();
    });
  }
  function bulkAccounts(root, group) {
    dialog('Барлығына аккаунт ашу', (body, close) => {
      const pass = h('input', { class: 'field', type: 'text', placeholder: 'Бастапқы пароль (кемінде 6 таңба)', autocomplete: 'off', maxlength: '128' });
      const save = btn('Аккаунттар ашу', async () => {
        const j = await api('classes/accounts', { group: group.id, password: pass.value });
        if (!j.ok) return;
        refreshFrom(j); close(); render(root);
        if (!j.made.length) return toast('Барлық студентте аккаунт бар.');
        const rows = [['Студент', 'Логин', 'Пароль'], ...j.made.map(m => [m.name, m.login, pass.value])];
        dialog('Ашылған аккаунттар', (box, done) => {
          box.append(h('p', { class: 'sub', text: 'Пароль — сіз енгізген ортақ пароль. Бұл тізімді қазір сақтап алыңыз.' }),
            h('div', { class: 'journal-scroll' }, h('table', { class: 'classes-table' }, [h('tbody', {}, rows.map((r, i) => h('tr', {}, r.map(c => h(i ? 'td' : 'th', { text: c })))))])),
            h('div', { class: 'workspace-actions' }, [btn('CSV жүктеу', () => download('аккаунттар-' + group.name + '.csv', csv(rows)), 'sm'), h('span', { class: 'sp' }), btn('Жабу', done, 'primary sm')]));
        });
      }, 'primary');
      save.disabled = true; pass.oninput = () => { save.disabled = pass.value.length < 6; };
      body.append(h('p', { class: 'sub', text: 'Аккаунты жоқ студенттерге логин өздігінен жасалады (тегі.аты), пароль бәріне бірдей. Кейін әрқайсысына жеке пароль бере аласыз.' }),
        field('Бастапқы пароль', pass), h('div', { class: 'workspace-actions' }, [btn('Бас тарту', close, 'sm'), save]));
      pass.focus();
    });
  }

  /* ---------- Google журналын импорттау ---------- */
  function importDialog(course, group, after) {
    dialog(group.name + ' · ' + course.subject + ' · журнал импорты', (body, close) => {
      const link = h('input', { class: 'field', type: 'url', value: course.sheet || '', placeholder: 'https://docs.google.com/spreadsheets/d/…/edit?gid=…', autocomplete: 'off' });
      const out = h('div', { class: 'classes-preview', role: 'status' });
      const commit = btn('Журналға енгізу', async () => {
        commit.disabled = true;
        const j = await api('classes/import', { course: course.id, sheet: link.value, commit: true });
        if (!j.ok) { commit.disabled = false; return; }
        close(); toast('Журнал енгізілді: ' + j.scores + ' балл, ' + j.marks + ' белгі.'); await load(true); after && after();
      }, 'primary');
      commit.disabled = true;
      const look = btn('Алдын ала қарау', async () => {
        commit.disabled = true; out.textContent = 'Кесте оқылуда…';
        const j = await api('classes/import', { course: course.id, sheet: link.value });
        if (!j.ok) { out.textContent = ({ sheet_access: 'Кестеге қол жеткізілмеді. Кестені «сілтемесі бар кез келген адам көре алады» етіп ашыңыз.', sheet_link: 'Сілтеме дұрыс емес. Нақты бет (gid бар) сілтемесін қойыңыз.', journal_header: 'Журнал үлгісі танылмады: «ТЕГІ, АТЫ, ӘКЕСІНІҢ АТЫ» бағаны табылмады.', journal_dates: 'Сабақ күндері (дд.мм) табылмады.' })[j.error] || 'Кестені оқу мүмкін болмады.'; return; }
        out.replaceChildren(...[
          h('p', {}, [h('b', { text: j.students + ' студент' }), j.newStudents ? ' (оның ' + j.newStudents + ' жаңасы топқа қосылады)' : '', ' · ', h('b', { text: j.lessons + ' сабақ' }), ' · ' + j.scores + ' балл · ' + j.marks + ' белгі (ж/с)']),
          j.unmatched.length ? h('p', { class: 'bad', text: 'Танылмаған жолдар: ' + j.unmatched.join(', ') }) : null,
          j.badValues ? h('p', { class: 'bad', text: j.badValues + ' ұяшықтағы мән түсініксіз болғандықтан өткізілді.' }) : null,
          j.replaces ? h('p', { class: 'sub', text: 'Қазіргі журнал (' + j.replaces + ' ұяшық) осы кестемен ауыстырылады. Сайттағы қолмен түзетулер жоғалады.' }) : null].filter(Boolean));
        commit.disabled = !j.students;
      }, 'sm');
      body.append(h('p', { class: 'sub', text: 'Кесте «сілтемесі бар кез келген адам көре алады» болуы керек. Журнал, студент аттары мен баллдар сайтқа көшіріледі.' }),
        field('Google Sheets бетінің сілтемесі', link), out, h('div', { class: 'workspace-actions' }, [look, h('span', { class: 'sp' }), btn('Жабу', close, 'sm'), commit]));
      link.focus();
    });
  }

  /* ---------- Пән жоспары (Word / Excel) ---------- */
  const toBase64 = bytes => { let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  async function planDialog(course, group, after) {
    const current = course.planCount ? (await api('classes/plan?course=' + course.id)).topics || [] : [];
    dialog(group.name + ' · ' + course.subject + ' · пән жоспары', (body, close) => {
      let topics = current.map(t => ({ ...t }));
      const file = h('input', { type: 'file', accept: '.docx,.xlsx', class: 'field', 'aria-label': 'Жоспар файлы' });
      const ai = h('input', { type: 'checkbox', checked: true, id: 'planAi' });
      const note = h('p', { class: 'sub', role: 'status', text: topics.length ? 'Сақталған жоспар. Қаласаңыз, жаңа файл жүктеп ауыстырыңыз.' : 'Күнтізбелік-тақырыптық жоспар файлын (.docx не .xlsx) жүктеңіз.' });
      const host = h('div', { class: 'journal-scroll plan-scroll' });
      const save = btn('Жоспарды сақтау', async () => {
        const j = await api('classes/plan', { course: course.id, topics: topics.map(t => ({ n: Number(t.n), title: t.title, hours: t.hours === '' || t.hours == null ? null : Number(t.hours) })) });
        if (!j.ok) return;
        close(); toast('Жоспар сақталды: ' + j.saved + ' тақырып.'); await load(true); after && after();
      }, 'primary');
      const paint = () => {
        save.disabled = !topics.length;
        if (!topics.length) { host.replaceChildren(); return; }
        const num = (value, set, label) => { const i = h('input', { class: 'cell-input plan-num', type: 'number', min: '0', value: value ?? '', 'aria-label': label }); i.oninput = () => set(i.value); return i; };
        host.replaceChildren(h('table', { class: 'classes-table' }, [
          h('thead', {}, h('tr', {}, ['№', 'Тақырып', 'Сағат', ''].map(t => h('th', { text: t })))),
          h('tbody', {}, topics.map((t, index) => {
            const title = h('input', { class: 'field plan-title', value: t.title, maxlength: '200', 'aria-label': 'Тақырып ' + t.n });
            title.oninput = () => { t.title = title.value; };
            return h('tr', {}, [h('td', {}, num(t.n, v => { t.n = v; }, 'Нөмірі')), h('td', {}, title), h('td', {}, num(t.hours, v => { t.hours = v; }, 'Сағат')),
              h('td', {}, btn('✕', () => { topics.splice(index, 1); paint(); }, 'sm danger'))]);
          }))]));
      };
      const read = btn('Файлды оқу', async () => {
        const f = file.files[0];
        if (!f) { toast('Алдымен файлды таңдаңыз.', true); return; }
        if (f.size > 2 * 1024 * 1024) { toast('Файл 2 МБ-тан үлкен.', true); return; }
        read.disabled = true; note.textContent = ai.checked ? 'Файл оқылуда, ЖИ тақырыптарды ажыратып жатыр…' : 'Файл оқылуда…';
        const j = await api('classes/plan/preview', { course: course.id, name: f.name, data: toBase64(new Uint8Array(await f.arrayBuffer())), ai: ai.checked });
        read.disabled = false;
        if (!j.ok) { note.textContent = 'Файлды оқу мүмкін болмады.'; return; }
        topics = j.topics.map(t => ({ ...t }));
        note.textContent = j.topics.length + ' тақырып табылды (' + (j.source === 'ai' ? 'ЖИ оқыды' : 'кестеден оқылды') + ')'
          + (j.ai ? '. ЖИ қолжетімсіз болды, кесте бойынша оқылды' : '') + '. Қажет болса түзетіп, сақтаңыз.';
        paint();
      }, 'sm');
      body.append(note, h('div', { class: 'plan-file' }, [file, h('label', { class: 'plan-ai', for: 'planAi' }, [ai, ' ЖИ-мен оқу']), read]), host,
        h('div', { class: 'workspace-actions' }, [
          course.planCount ? btn('Жоспарды өшіру', async () => { if (!confirm('Жоспар өшірілсін бе?')) return; const j = await api('classes/plan?course=' + course.id, null, 'DELETE'); if (j.ok) { close(); await load(true); after && after(); } }, 'sm danger') : null,
          h('span', { class: 'sp' }), btn('Жабу', close, 'sm'), save]));
      paint();
    });
  }

  /* ---------- Топтар экраны: жоғарыда Топ және Пән таңдағышы ---------- */
  async function render(root) {
    if (!state.data) root.replaceChildren(h('p', { class: 'workspace-empty', role: 'status', text: 'Жүктелуде…' }));
    const data = await load(!state.data);
    if (!data) { root.replaceChildren(h('div', { class: 'workspace-empty', role: 'alert' }, [h('p', { text: 'Топтарды жүктеу мүмкін болмады.' }), btn('Қайта жүктеу', () => render(root))])); return; }
    if (!data.groups.some(g => g.id === state.group)) state.group = data.groups[0]?.id || 0;
    const group = data.groups.find(g => g.id === state.group);
    if (group && !group.courses.some(c => c.id === state.course)) state.course = group.courses[0]?.id || 0;
    const course = group?.courses.find(c => c.id === state.course);

    const groupSel = h('select', { class: 'field', 'aria-label': 'Топ' }, data.groups.map(g => h('option', { value: g.id, text: g.name + ' · ' + g.students.filter(s => s.active).length + ' студент' })));
    groupSel.value = String(state.group);
    groupSel.onchange = () => { state.group = Number(groupSel.value); state.course = 0; render(root); };
    const courseSel = h('select', { class: 'field', 'aria-label': 'Пән' }, group?.courses.length
      ? group.courses.map(c => h('option', { value: c.id, text: c.subject + ' · ' + schoolYear(c.year) }))
      : [h('option', { value: '', text: 'Пән жоқ' })]);
    courseSel.value = String(state.course || '');
    courseSel.onchange = () => { state.course = Number(courseSel.value); render(root); };
    const bar = h('section', { class: 'workspace-card classes-bar' }, [
      h('div', { class: 'classes-filters' }, [field('Топ', groupSel), field('Пән', courseSel)]),
      h('div', { class: 'workspace-actions' }, [
        btn('+ Жаңа топ', () => newGroup(root), 'primary sm'),
        group ? btn('+ Пән қосу', () => addCourse(root, group), 'sm') : null,
        group ? btn('Атын өзгерту', async () => { const name = prompt('Топ атауы', group.name); if (name && name.trim()) { const j = await api('classes/group/' + group.id, { name }, 'PATCH'); if (j.ok) { refreshFrom(j); render(root); } } }, 'sm') : null,
        group ? btn('Топты жою', async () => {
          if (!confirm(group.name + ' тобы мен студенттері біржола жойылсын ба?')) return;
          const j = await api('classes/group/' + group.id, null, 'DELETE');
          if (j.ok) { refreshFrom(j); render(root); }
        }, 'sm danger') : null])]);
    if (!group) { root.replaceChildren(bar, h('p', { class: 'workspace-empty', text: 'Алдымен топ қосыңыз. Топ міндетті түрде пәнмен бірге жасалады.' })); return; }

    const courseCard = course ? h('section', { class: 'workspace-card classes-course-card' }, [
      h('div', {}, [h('h2', { text: course.subject }), h('small', { text: courseTitle(course.course, data.catalog) + ' · ' + schoolYear(course.year) + (course.imported ? ' · журнал бар' : ' · журнал әлі жоқ') })]),
      h('div', { class: 'workspace-actions' }, [
        btn('Журнал', () => openJournal(course.id), 'primary sm'),
        btn('Сабақ бастау', () => startLesson({ course: course.course, group_id: group.id, id: course.id, subject: course.subject, year: course.year }), 'sm'),
        btn('Google журналынан', () => importDialog(course, group, () => render(root)), 'sm'),
        btn(course.planCount ? 'Жоспар · ' + course.planCount : 'Жоспар жүктеу', () => planDialog(course, group, () => render(root)), 'sm'),
        btn('Пәнді өшіру', async () => { if (!confirm(course.subject + ' пәні топтан алынсын ба?')) return; const j = await api('classes/course/' + course.id, null, 'DELETE'); if (j.ok) { refreshFrom(j); state.course = 0; render(root); } }, 'sm danger')])])
      : h('p', { class: 'workspace-empty', text: 'Бұл топта пән жоқ. «+ Пән қосу» батырмасымен қосыңыз.' });

    const names = h('textarea', { class: 'field', rows: '4', placeholder: 'Әр жолға бір студент', 'aria-label': 'Қосылатын студенттер' });
    const rows = group.students.map((s, i) => h('tr', {}, [
      h('td', { text: String(i + 1) }), h('td', { text: s.name }),
      h('td', {}, s.login ? h('code', { text: s.login }) : h('span', { class: 'sub', text: 'аккаунт жоқ' })),
      h('td', { class: 'classes-row-actions' }, [
        btn(s.login ? 'Пароль' : 'Аккаунт ашу', () => setAccount(root, s), 'sm'),
        btn('Аты', async () => { const name = prompt('Студенттің аты-жөні', s.name); if (name && name.trim()) { const j = await api('students/' + s.id, { name }, 'PATCH'); if (j.ok) { await load(true); render(root); } } }, 'sm'),
        btn('Өшіру', async () => { if (!confirm(s.name + ' студентін өшіресіз бе? Оның жұмыстары мен бағалары да өшеді.')) return; const j = await api('students/' + s.id, null, 'DELETE'); if (j.ok) { await load(true); render(root); } }, 'sm danger')])]));
    const students = h('section', { class: 'workspace-card' }, [
      h('div', { class: 'row' }, [h('h2', { text: 'Студенттер · ' + group.students.filter(s => s.active).length }), h('span', { class: 'sp' }),
        group.students.some(s => !s.login) ? btn('Барлығына аккаунт ашу', () => bulkAccounts(root, group), 'sm') : null]),
      rows.length ? h('div', { class: 'journal-scroll' }, h('table', { class: 'classes-table' }, [h('thead', {}, h('tr', {}, ['№', 'Студент', 'Логин', ''].map(t => h('th', { text: t })))), h('tbody', {}, rows)]))
        : h('p', { class: 'workspace-empty', text: 'Студент жоқ. Төменнен қосыңыз немесе Google журналын импорттаңыз — аттар өздігінен қосылады.' }),
      h('details', {}, [h('summary', { text: '+ Студенттерді қосу' }), names, btn('Қосу', async () => {
        const j = await api('students', { group_id: group.id, names: names.value });
        if (j.ok) { names.value = ''; await load(true); render(root); }
      }, 'primary sm')])]);
    root.replaceChildren(bar, courseCard, students);
  }

  /* ---------- Журнал ---------- */
  async function renderJournal(root, courseId) {
    const data = await load(!state.data);
    if (!data) { root.replaceChildren(h('p', { class: 'workspace-empty', role: 'alert', text: 'Журналды жүктеу мүмкін болмады.' })); return; }
    const all = data.groups.flatMap(g => g.courses.map(c => ({ ...c, group: g })));
    if (!all.length) { root.replaceChildren(h('p', { class: 'workspace-empty', text: 'Журнал үшін алдымен «Топтар» бөлімінде топ пен пәнді қосыңыз.' })); return; }
    if (courseId) state.course = courseId;
    if (!all.some(c => c.id === state.course)) state.course = all[0].id;
    const current = all.find(c => c.id === state.course);
    const pick = h('select', { class: 'field', 'aria-label': 'Топ және пән' }, all.map(c => h('option', { value: c.id, text: c.group.name + ' · ' + c.subject + ' · ' + schoolYear(c.year) })));
    pick.value = String(state.course);
    pick.onchange = () => { state.course = Number(pick.value); renderJournal(root); };
    const bar = h('section', { class: 'workspace-card' }, [h('div', { class: 'classes-journal-bar' }, [field('Топ және пән', pick), h('div', { class: 'workspace-actions' }, [
      btn('Google журналынан импорттау', () => importDialog(current, current.group, () => renderJournal(root)), 'primary sm'),
      btn('+ Сабақ күні', () => addLesson(current, () => renderJournal(root)), 'sm'),
      btn('Топты талдау', () => openInsights(current.id), 'sm'),
      btn('Сабақ бастау', () => startLesson({ course: current.course, group_id: current.group.id, id: current.id, subject: current.subject, year: current.year }), 'sm')])])]);
    const host = h('div', {}, h('p', { class: 'workspace-empty', role: 'status', text: 'Журнал жүктелуде…' }));
    root.replaceChildren(bar, host);
    const ticket = state.course;
    const j = await api('classes/journal?course=' + state.course);
    if (ticket !== state.course) return;
    if (!j.ok) { host.replaceChildren(h('p', { class: 'workspace-empty', role: 'alert', text: 'Журналды жүктеу мүмкін болмады.' })); return; }
    paintJournal(host, j, current, () => renderJournal(root));
  }

  function addLesson(course, after) {
    dialog('Сабақ күнін қосу', (body, close) => {
      const date = h('input', { class: 'field', type: 'date', value: new Date().toISOString().slice(0, 10) });
      const kind = h('input', { class: 'field', maxlength: '12', placeholder: 'Сс, Жм, Ср…' });
      const hours = h('input', { class: 'field', type: 'number', min: '0', max: '12', placeholder: 'сағат' });
      const save = btn('Қосу', async () => { const j = await api('classes/lesson', { course: course.id, date: date.value, kind: kind.value, hours: hours.value }); if (j.ok) { close(); after(); } }, 'primary');
      body.append(h('div', { class: 'classes-grid' }, [field('Күні', date), field('Түрі', kind), field('Сағат', hours)]), h('div', { class: 'workspace-actions' }, [btn('Бас тарту', close, 'sm'), save]));
    });
  }

  function paintJournal(host, j, course, after) {
    if (!j.lessons.length) {
      host.replaceChildren(h('div', { class: 'workspace-empty' }, [h('p', { text: 'Бұл журналда әзірге сабақ жоқ. Google журналын импорттаңыз немесе сабақ күнін қосыңыз.' })]));
      return;
    }
    const students = j.students;
    const scores = students.map(s => j.summary[s.id]).filter(s => s?.avg !== null && s?.avg !== undefined);
    const groupAvg = scores.length ? scores.reduce((a, s) => a + s.avg, 0) / scores.length : null;
    const metrics = h('dl', { class: 'workspace-metrics' }, [
      ['Студенттер', students.length], ['Сабақ күндері', j.lessons.length], ['Топтың орташасы', groupAvg === null ? '—' : fmt.format(groupAvg)],
      ['Межеден төмен', scores.filter(s => s.avg < j.threshold).length]].map(([n, v]) => h('div', {}, [h('dt', { text: n }), h('dd', { text: String(v) })])));
    const head = [h('th', { class: 'journal-student', scope: 'col', text: 'Студент' }), ...j.lessons.map(l => h('th', { scope: 'col', class: l.source === 'site' ? 'is-site' : l.source === 'practice' ? 'is-practice' : '', title: l.title || '' }, [
      h('b', { text: dm(l.date) }), h('small', { text: l.source === 'journal' && l.number ? '№' + l.number : ' ' })])),
      h('th', { scope: 'col', text: 'Орташа' }), h('th', { scope: 'col', title: 'Сабаққа келмеген', text: 'НБ' }), h('th', { scope: 'col', title: 'Қайта тапсыру керек', text: 'Қайта' })];
    const cell = (student, lesson) => {
      const c = j.cells[student.id]?.[lesson.key];
      const own = lesson.source === 'journal';
      const td = h('td', { class: 'journal-cell' + (lesson.source === 'site' ? ' is-site' : lesson.source === 'practice' ? ' is-practice' : '') });
      const show = () => {
        td.className = 'journal-cell' + (lesson.source === 'site' ? ' is-site' : lesson.source === 'practice' ? ' is-practice' : '');
        td.replaceChildren(c ? h('span', { class: 'jc ' + (c.score !== null ? band(c.score, j.threshold) : c.mark === 'ж' ? 'abs' : 'ret'), text: c.score !== null ? fmt.format(c.score) : c.mark === 'ж' ? 'НБ' : 'қ' }) : '');
        if (!own) return;
        td.tabIndex = 0;
        td.onclick = td.onkeydown = e => { if (e.type === 'keydown' && e.key !== 'Enter') return; edit(); };
      };
      const edit = () => {
        const input = h('input', { class: 'cell-input', value: c ? (c.score !== null ? String(c.score) : c.mark) : '', 'aria-label': student.name + ' · ' + dm(lesson.date), maxlength: '6' });
        td.onclick = td.onkeydown = null;
        td.replaceChildren(input); input.focus(); input.select();
        let done = false;
        const finish = async save => {
          if (done) return; done = true;
          if (!save || input.value.trim() === (c ? (c.score !== null ? String(c.score) : c.mark) : '')) return show();
          const r = await api('classes/cell', { course: course.id, student: student.id, key: lesson.key, value: input.value.trim() });
          if (r.ok) after(); else show();
        };
        input.onkeydown = e => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); };
        input.onblur = () => finish(true);
      };
      show();
      return td;
    };
    const rows = students.map(s => { const sm = j.summary[s.id] || {}; return h('tr', {}, [
      h('th', { scope: 'row', class: 'journal-student' }, [h('button', { type: 'button', class: 'student-ai', title: 'Жеке талдау', on: { click: () => openInsights(course.id, s.id) } }, s.name)]), ...j.lessons.map(l => cell(s, l)),
      h('td', { class: 'journal-average' + (sm.avg !== null && sm.avg !== undefined && sm.avg < j.threshold ? ' low' : ''), text: sm.avg === null || sm.avg === undefined ? '—' : fmt.format(sm.avg) }),
      h('td', { text: String(sm.absent || 0) }), h('td', { text: String(sm.retake || 0) })]); });
    const exportRows = [['Студент', ...j.lessons.map(l => l.date), 'Орташа', 'НБ', 'Қайта'], ...students.map(s => [s.name, ...j.lessons.map(l => { const c = j.cells[s.id]?.[l.key]; return c ? (c.score !== null ? c.score : c.mark) : ''; }), j.summary[s.id]?.avg ?? '', j.summary[s.id]?.absent || 0, j.summary[s.id]?.retake || 0])];
    host.replaceChildren(metrics, h('section', { class: 'workspace-card journal-table-card' }, [
      h('p', { class: 'journal-legend', text: 'Ұяшықты басып балл (0–100) жазыңыз. «ж» — НБ, «с» — қайта тапсыру, бос қалдырсаңыз ұяшық тазаланады. Көк бағандар — сайтта өткен сабақтар, жасыл бағандар — студенттің өзіндік жаттығуы (пайыз, орташаға кірмейді); екеуі де автоматты.' }),
      h('div', { class: 'journal-scroll', tabindex: '0', 'aria-label': 'Журнал кестесі' }, h('table', { class: 'journal-table classes-journal' }, [h('thead', {}, h('tr', {}, head)), h('tbody', {}, rows)])),
      j.plan.length ? h('details', { class: 'journal-plan' }, [h('summary', { text: 'Пән жоспары · ' + j.plan.length + ' тақырып' }),
        h('ol', {}, j.plan.map(t => h('li', { value: t.n, class: j.lessons.some(l => Number(l.number) === t.n) ? 'done' : '' }, [t.title, t.hours ? h('small', { text: ' · ' + t.hours + ' сағ' }) : null])))]) : null,
      h('div', { class: 'workspace-actions' }, [btn('CSV жүктеу', () => download('журнал-' + course.group.name + '-' + course.subject + '.csv', csv(exportRows)), 'sm'),
        j.importedAt ? h('span', { class: 'sub', text: 'Соңғы импорт: ' + new Date(j.importedAt).toLocaleString('kk-KZ') }) : null])]));
  }

  return { render, renderJournal, reload: () => load(true) };
};
