(function () {
  const messages = {
    course_fields: 'Топты, пәнді, курсты, оқу жылын және журнал парағының сілтемесін тексеріңіз.',
    journal_header: 'Кестеден студенттің аты-жөні көрсетілген тақырып табылмады. Журналды бірінші жолынан бастап көшіріңіз.',
    journal_dates: 'Таңдалған оқу жылына сай сабақ күндері табылмады.',
    journal_format: 'Журнал пішімі немесе көлемі жарамсыз. Бір топтың парағын тақырыбымен бірге таңдаңыз.',
    journal_empty: 'Сәйкес студенттердің сақтайтын бағалары табылмады.',
    journal_changed: 'Журнал жаңарды. Алдын ала қарауды қайта ашыңыз.',
    sheet_link: 'Байланыс баптауында Google Sheets парағының сілтемесін енгізіңіз.',
    sheet_config: 'Сайтта Google Sheets-ті оқу рұқсаты бапталмаған. Ұяшықтарды көшіріп енгізуге болады.',
    sheet_auth: 'Google қызметтік аккаунтының баптауын тексеріңіз.',
    sheet_access: 'Сайттың қызметтік аккаунтына осы Google файлын қарау рұқсатын беріңіз.',
    sheet_tab: 'Сілтемедегі парақ табылмады.',
    sheet_unavailable: 'Google Sheets-ті оқу сәтсіз болды. Кейін қайта көріңіз.',
    ai_config: 'Gemini кілті серверде бапталмаған.',
    ai_unavailable: 'Gemini қазір жауап бермеді. Кейін қайта көріңіз.',
    no_scores: 'ЖИ қорытындысын жасау үшін бағалар керек.'
  };
  const errorText = error => messages[error] || 'Әрекет орындалмады. Қайта көріңіз.';
  const format = value => value === null ? '—' : String(value).replace('.', ',');
  const score = value => value === null ? '—' : format(value) + ' / 100';
  const dateText = iso => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);
  const shortDate = iso => dateText(iso).slice(0, 5);
  const requests = new WeakMap();
  const preferences = new Map();
  const schoolDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayYear = () => {
    const date = schoolDate.format(new Date());
    return Number(date.slice(0, 4)) - (date.slice(5, 7) < '09' ? 1 : 0);
  };

  window.TeacherProgress = async function (options) {
    const { root, h, api, startLesson, demo = false, selection, onSelect, onUpdate, openArchive, openJournal } = options;
    const ticket = (requests.get(root) || 0) + 1;
    requests.set(root, ticket);
    const current = () => requests.get(root) === ticket;
    root.replaceChildren(h('p', { class: 'workspace-empty', role: 'status', text: 'Курстар жүктелуде…' }));
    const data = await api('progress');
    if (!current()) return;
    const option = (value, text) => h('option', { value: String(value), text });
    const field = (label, control) => h('label', { class: 'progress-field' }, [h('span', { text: label }), control]);
    const button = (text, click, primary = false) => h('button', { type: 'button', class: 'btn' + (primary ? ' primary' : ''), text, on: { click } });
    const card = (title, content) => h('div', { class: 'card progress-card' }, [h('h2', { text: title }), ...content]);
    if (!data.ok) {
      root.replaceChildren(h('div', { class: 'workspace-empty', role: 'alert' }, [
        h('p', { text: errorText(data.error) }), button('Қайта жүктеу', () => window.TeacherProgress(options))
      ]));
      return;
    }
    const matches = data.courses.filter(c => (!selection?.group || c.group_id === +selection.group)
      && (!selection?.subject || c.course === selection.subject) && (!selection?.year || c.year === +selection.year));
    const scoped = Boolean(selection?.group || selection?.subject || selection?.year);
    const label = course => course.group_name + ' · ' + course.subject + ' · ' + course.year + '–' + (course.year + 1);
    const chosen = h('select', { class: 'field', 'aria-label': 'Курс байланысы' }, [
      option('', 'Курсты таңдаңыз'), ...matches.map(c => option(c.id, label(c))),
      ...data.courses.filter(c => !matches.includes(c)).map(c => option(c.id, label(c)))
    ]);
    const body = h('div', { class: 'progress-content' });
    const controls = h('div', { class: 'workspace-card progress-course-picker' }, [field('Топ пен курс', chosen)]);
    const courseMeta = h('div', { class: 'progress-course-meta', hidden: true });
    let courseView = 0;

    function courseForm(course) {
      const view = ++courseView;
      courseMeta.hidden = true;
      const group = h('select', { class: 'field', required: true }, [option('', 'Топты таңдаңыз'), ...data.groups.map(g => option(g.id, g.name))]);
      const catalog = h('select', { class: 'field', required: true }, Object.entries(data.catalog).map(([id, title]) => option(id, title)));
      const subject = h('input', { class: 'field', required: true, maxlength: 120, placeholder: 'Мысалы, КМ 3.5' });
      const year = h('input', { class: 'field', type: 'number', min: 2000, max: 2100, required: true, value: selection?.year || todayYear() });
      const threshold = h('input', { class: 'field', type: 'number', min: 1, max: 100, required: true, value: 60 });
      const sheet = h('input', { class: 'field', type: 'url', placeholder: 'Google Sheets парағының сілтемесі' });
      const status = h('p', { role: 'status', class: 'sub' });
      const save = h('button', { type: 'submit', class: 'btn primary', text: 'Сақтау' });
      const form = h('form', { class: 'progress-form' }, [
        h('div', { class: 'progress-fields' }, [field('Топ', group), field('Сайттағы курс', catalog), field('Пән немесе модуль', subject), field('Оқу жылының басы', year), field('Назар аудару межесі / 100', threshold)]),
        field('Google Sheets парағы', sheet),
        h('div', { class: 'progress-toolbar' }, [save, button('Жабу', () => openCourse(false, false))]), status
      ]);
      if (course) {
        for (const [control, value] of [[group, course.group_id], [catalog, course.course], [subject, course.subject], [year, course.year], [threshold, course.threshold], [sheet, course.sheet]]) control.value = value;
        for (const control of [group, catalog, subject, year]) control.disabled = true;
      } else {
        if (data.groups.some(g => g.id === +selection?.group)) group.value = String(selection.group);
        if (selection?.subject && Object.hasOwn(data.catalog, selection.subject)) catalog.value = selection.subject;
      }
      form.onsubmit = async event => {
        event.preventDefault();
        save.disabled = true;
        const result = await api('progress/course', { group: +group.value, course: catalog.value, subject: subject.value, year: +year.value, threshold: +threshold.value, sheet: sheet.value });
        save.disabled = false;
        if (!result.ok) { status.textContent = errorText(result.error); return; }
        onUpdate?.();
        if (!current() || view !== courseView) return;
        const next = { course: result.id, group: +group.value, subject: catalog.value, year: +year.value };
        onSelect?.(next);
        await window.TeacherProgress({ ...options, selection: next });
      };
      body.replaceChildren(card(course ? 'Байланыс баптауы' : 'Топ пен пәнді байланыстыру', [form]));
    }

    function openCourse(fromSelect = false, allowForm = true) {
      const view = ++courseView;
      const course = data.courses.find(c => String(c.id) === chosen.value);
      if (!course) {
        courseMeta.hidden = true;
        if (allowForm && (!data.courses.length || !matches.length && scoped)) { courseForm(); return; }
        const message = !data.courses.length ? 'Алдымен топ пен курсты байланыстырыңыз.'
          : selection?.course && !requested ? 'Бұл курс байланысы табылмады. Тізімнен курсты таңдаңыз.'
          : 'Үлгерімді ашу үшін тізімнен курс пен оқу жылын таңдаңыз.';
        body.replaceChildren(h('p', { class: 'workspace-empty', text: message }));
        return;
      }
      const prefKey = (demo ? 'demo:' : '') + course.id;
      const preference = preferences.get(prefKey) || { source: course.imported_at ? 'journal' : 'site', mode: 'year', person: '' };
      if (!fromSelect && selection?.source) preference.source = selection.source;
      if (demo) preference.source = 'site';
      preferences.set(prefKey, preference);
      const filters = { course: course.id, group: course.group_id, subject: course.course, year: course.year };
      const syncRoute = () => onSelect?.({ ...filters, source: preference.source });
      syncRoute();
      const importBox = h('details', { class: 'card progress-card' });
      const textarea = h('textarea', { class: 'field', rows: 4, placeholder: 'Google Sheets-тен көшірілген ұяшықтар', 'aria-label': 'Журнал ұяшықтары' });
      const preview = h('div', { class: 'progress-preview', role: 'status' });
      let request = 0, importing = false;
      async function inspect(direct) {
        if (importing) return;
        const token = ++request;
        const payload = { id: course.id, text: textarea.value };
        preview.textContent = 'Журнал тексеріліп жатыр…';
        const result = await api(direct ? 'progress/google' : 'progress/preview', direct ? { id: course.id } : payload);
        if (token !== request || view !== courseView || !current()) return;
        if (!result.ok) { preview.textContent = errorText(result.error); return; }
        const save = button('Журналға сақтау', async () => {
          if (importing) return;
          importing = true; save.disabled = true; textarea.disabled = true;
          const stored = await api('progress/import', { ...(direct ? { id: course.id, cells: result.cells } : payload), revision: result.revision });
          importing = false; textarea.disabled = false;
          if (stored.ok) onUpdate?.();
          if (token !== request || view !== courseView || !current()) return;
          if (!stored.ok) { save.disabled = false; status.textContent = errorText(stored.error); return; }
          textarea.value = '';
          preview.textContent = stored.unchanged ? 'Бұл бағалар журналда бар.' : 'Журнал сақталды.';
          source.value = preference.source = 'journal'; syncRoute();
          await loadReport();
        }, true);
        save.disabled = !result.sample.length;
        const status = h('p', { class: 'sub', role: 'status' });
        const info = h('p', { text: result.matched + ' студент · ' + result.lessons + ' сабақ бағаны · ' + result.scores + ' сандық баға' });
        const problems = h('ul', {}, result.issues.slice(0, 12).map(issue => h('li', {
          text: issue.row + '-жол · ' + issue.name + ' · ' + ({ unmatched: 'топтан табылмады', ambiguous: 'сәйкестігін тексеріңіз', value: (issue.column || '') + '-бағандағы мәнді тексеріңіз' })[issue.kind]
        })));
        preview.replaceChildren(info);
        if (result.sample.length) preview.append(h('p', { class: 'sub', text: 'Үлгі · ' + result.sample.map(e => shortDate(e.date) + ' ' + (e.score ?? e.mark)).join(' · ') }));
        if (result.issues.length) preview.append(h('p', { text: result.issues.length + ' сәйкестенбеген жол немесе ұяшық' }), problems);
        if (result.changed) preview.append(h('p', { text: result.changed + ' бұрынғы мән жаңартылады.' }));
        if (result.removed) preview.append(h('p', { class: 'bad', text: 'Осы нұсқаны сақтасаңыз, ' + result.removed + ' бұрынғы мән ағымдағы көріністен алынады. Бұрынғы импорт дерекқорда сақталады.' }));
        preview.append(save, status);
      }
      textarea.oninput = () => { request++; preview.replaceChildren(); };
      importBox.append(h('summary', { text: 'Google Sheets журналын енгізу' }),
        h('p', { class: 'sub', text: 'Журналдың сабақ күндері мен студенттер тізімі бар бөлігін тақырыптарымен бірге көшіріңіз.' }),
        textarea, h('div', { class: 'progress-toolbar' }, [
          button('Алдын ала қарау', () => inspect(false)),
          ...(course.sheet ? [button('Google Sheets-тен оқу', () => inspect(true)),
            h('a', { class: 'btn', href: course.sheet, target: '_blank', rel: 'noopener', text: 'Журналды ашу' })] : [])
        ]), preview);
      const source = h('select', { class: 'field', 'aria-label': 'Баға дереккөзі' }, [option('journal', 'Импортталған журнал'), option('site', 'Сайттағы қорытынды бағалар')]);
      source.value = preference.source;
      let mode = preference.mode;
      const modes = h('div', { class: 'progress-modes', role: 'group', 'aria-label': 'Талдау түрі' });
      for (const [value, text] of [['year', 'Динамика'], ['now', 'Қолдау'], ['forecast', 'Болжам']]) {
        const tab = button(text, () => {
          mode = preference.mode = value;
          for (const peer of modes.children) peer.setAttribute('aria-pressed', String(peer === tab));
          if (report) renderReport();
        });
        tab.setAttribute('aria-pressed', String(mode === value));
        modes.append(tab);
      }
      const person = h('select', { class: 'field', 'aria-label': 'Студент' }, [option('', 'Топ бойынша')]);
      const reportRoot = h('div', { class: 'progress-content', 'aria-live': 'polite' });
      const stamp = h('div', { class: 'sub progress-stamp' });
      let report, reportRequest = 0;

      function renderReport() {
        const profile = report.profiles.find(p => String(p.id) === person.value);
        const note = h('div', { class: 'progress-preview', role: 'status' });
        const aiLabel = { now: 'ЖИ ұсынысын алу', year: 'Жылдық ЖИ қорытындысы', forecast: 'Болжамды ЖИ-мен түсіндіру' }[mode];
        const ai = button(aiLabel, async () => {
          ai.disabled = true;
          note.textContent = 'ЖИ талдап жатыр…';
          const result = await api('progress/ai', { id: course.id, source: source.value, mode, student: profile?.id });
          ai.disabled = false;
          if (!result.ok) { note.textContent = errorText(result.error); return; }
          note.replaceChildren(h('p', { text: result.summary }), h('p', { text: result.action }));
        });
        ai.disabled = profile ? !profile.count : !report.assessed;
        const rows = profile ? [profile] : report.profiles;
        const activeRows = profile ? rows : rows.filter(p => p.active);
        const follow = p => {
          const recent = p.daily.slice(-2).map(d => shortDate(d.date) + ' · ' + format(d.score)).join(' / ');
          return p.reason === 'low' ? 'Екі күн де межеден төмен (' + recent + ')' :
            format(p.previousAverage) + ' → ' + format(p.recentAverage) + ' (' + format(p.drop) + ' балға төмендеді)';
        };
        const series = profile?.daily || report.daily;
        const latest = series.at(-1);
        let title;
        const nodes = [];
        if (mode === 'now') {
          title = 'Қазір назар аудару';
          const flagged = activeRows.filter(p => p.reason).sort((a, b) => a.recentAverage - b.recentAverage);
          nodes.push(metrics([
            ['Қолдау ұсынылған', flagged.length, 'студент'],
            ['Екі күн межеден төмен', flagged.filter(p => p.reason === 'low').length, 'студент'],
            ['Үлгерімі төмендеген', flagged.filter(p => p.reason === 'drop').length, 'студент']
          ]));
          nodes.push(h('p', { class: 'sub', text: 'Меже — ' + course.threshold + ' балл. Соңғы екі күннің бағасы межеден төмен болса немесе олардың орташа балы алдыңғы екі күнмен салыстырғанда кемінде 10 балға төмендесе, жүйе белгі береді.' }));
          nodes.push(makeTable(['Студент', 'Негізі', 'Ұсынылатын әрекет'], flagged.map(p => [
            studentButton(p), follow(p), p.reason === 'low'
              ? 'Соңғы екі жұмысты бірге қарап, ұқсас қысқа есеп беріңіз.'
              : 'Соңғы екі жұмысты алдыңғы жұмыстармен салыстырып, қай қадам қиын болғанын анықтаңыз.'
          ])) || h('p', { class: 'progress-empty', text: (profile ? profile.count : report.assessed)
            ? 'Қолдау белгісі анықталмады.' : 'Бағалар әлі енгізілмеді.' }));
        } else if (mode === 'forecast') {
          title = 'Келесі ұқсас сабаққа болжам';
          nodes.push(metrics(profile ? [
            ['Болжамды балл', format(profile.forecast), '/ 100'],
            ['Бағаланған күн', profile.daily.length, 'кемінде 3 күн қажет'],
            ['Соңғы нақты балл', format(latest?.score ?? null), '/ 100']
          ] : [
            ['Орташа болжам', format(report.forecast), '/ 100'],
            ['Болжам қамтуы', report.forecastCount + ' / ' + report.total, 'студент'],
            ['Межеден төмен', report.belowThreshold, course.threshold + ' балдан төмен']
          ]));
          nodes.push(h('p', { class: 'sub', text: 'Болжам — соңғы үш бөлек бағаланған күннің орташа балы. Келесі бағаланатын сабаққа қатысты.' }));
          if (profile && profile.forecast !== null) {
            nodes.push(h('p', { class: 'progress-evidence', text: 'Есепке алынған бағалар · ' + profile.daily.slice(-3)
              .map(day => shortDate(day.date) + ' — ' + format(day.score)).join('  /  ') }));
          }
          const forecastRows = [...activeRows].sort((a, b) => (a.forecast ?? Infinity) - (b.forecast ?? Infinity));
          nodes.push(makeTable(['Студент', 'Бағаланған күн', 'Болжам', 'Мәртебе'], forecastRows.map(p => [
            studentButton(p), p.daily.length, score(p.forecast), p.forecast === null ? 'Дерек аз' :
              p.forecast < course.threshold ? h('span', { class: 'progress-low', text: 'Межеден төмен' }) : 'Межеде немесе жоғары'
          ])));
        } else {
          title = profile ? profile.name + ' · үлгерім тарихы' : 'Топтың үлгерім динамикасы';
          nodes.push(metrics(profile ? [
            ['Орташа балл', format(profile.average), '/ 100'],
            ['Бағаланған күн', profile.daily.length, profile.count + ' баға'],
            ['Соңғы нақты балл', format(latest?.score ?? null), latest ? dateText(latest.date) : 'баға енгізілмеген']
          ] : [
            ['Орташа балл', format(report.average), '/ 100'],
            ['Бағаланған студент', report.assessed + ' / ' + report.total, 'оқу жылы бойынша'],
            ['Қолдау белгісі', report.attention, 'студент'],
            ['Соңғы сабақ', format(latest?.score ?? null), latest ? dateText(latest.date) : 'баға енгізілмеген']
          ]));
          if (latest) nodes.push(chart(series, course.threshold, !!profile));
          else nodes.push(h('p', { class: 'progress-empty', text: 'Динамиканы көрсету үшін бағалар қажет.' }));
          if (!profile) {
            const recent = series.slice(-8).filter(day => day.count >= Math.max(3, Math.ceil(report.total / 2)));
            const lowest = recent.reduce((min, day) => !min || day.score < min.score ? day : min, null);
            if (lowest && recent.length > 1) {
              nodes.push(h('p', { class: 'progress-evidence', text: 'Соңғы ' + Math.min(8, series.length) + ' бағаланған күндегі ең төмен топтық нәтиже · ' +
                dateText(lowest.date) + (lowest.title ? ' · ' + lowest.title : '') + ' · ' + score(lowest.score) + ' · ' + lowest.count + ' студент',
                title: 'Топтың кемінде жартысы және кемінде үш студент бағаланған күндер салыстырылды.' }));
            }
          }
          nodes.push(profile
            ? makeTable(['Күні', 'Сабақ', 'Баға'], profile.history.map(e => [dateText(e.date), e.title || e.number || '—', e.score === null ? e.mark : format(e.score)]))
            : makeTable(['Студент', 'Бағаланған күн', 'Орташа балл'], rows.map(p => [studentButton(p), p.daily.length, score(p.average)])));
        }
        if (!demo) nodes.push(ai, note);
        reportRoot.replaceChildren(card(title, nodes));
      }
      function metrics(items) {
        return h('dl', { class: 'progress-metrics' }, items.map(([label, value, detail]) =>
          h('div', {}, [h('dt', { text: label }), h('dd', {}, [
            h('strong', { text: value }), h('small', { text: detail })
          ])])));
      }
      function chart(series, threshold, individual) {
        const recent = series.slice(-8);
        return h('div', { class: 'progress-trend' }, [
          h('div', { class: 'progress-chart-head' }, [
            h('h3', { text: recent.length + ' бағаланған күн' }), h('span', { text: 'Меже · ' + threshold + ' балл' })
          ]),
          h('div', { class: 'progress-chart' }, recent.map(day => h('div', {
            class: 'progress-bar', title: [dateText(day.date), day.title, score(day.score), individual ? '' : day.count + ' студент'].filter(Boolean).join(' · ')
          }, [
            h('div', { class: 'progress-bar-track', 'aria-hidden': 'true' }, [
              h('div', { class: 'progress-bar-fill' + (day.score < threshold ? ' low' : ''), style: 'height:' + day.score + '%' }),
              h('div', { class: 'progress-bar-line', style: 'bottom:' + threshold + '%' })
            ]),
            h('strong', { text: format(day.score) }),
            h('span', { text: shortDate(day.date) }),
            ...(individual ? [] : [h('small', { text: day.count + ' студ.' })])
          ])))
        ]);
      }
      function studentButton(p) {
        return h('button', { type: 'button', class: 'progress-person', text: p.name, on: {
          click: () => { person.value = preference.person = String(p.id); renderReport(); person.focus({ preventScroll: true }); }
        } });
      }
      function makeTable(headers, rows) {
        if (!rows.length) return null;
        return h('div', { class: 'tw progress-table' }, h('table', { class: 't' }, [
          h('thead', {}, h('tr', {}, headers.map(text => h('th', { scope: 'col', text })))),
          h('tbody', {}, rows.map(row => h('tr', {}, row.map(value => value instanceof Node ? h('td', {}, value) : h('td', { text: String(value) })))))
        ]));
      }
      async function loadReport() {
        const token = ++reportRequest, keep = preference.person;
        report = null;
        stamp.textContent = '';
        reportRoot.replaceChildren(h('p', { class: 'sub', text: 'Үлгерім жүктеліп жатыр…' }));
        const result = await api('progress/report?id=' + course.id + '&source=' + source.value);
        if (token !== reportRequest || view !== courseView || !current()) return;
        if (!result.ok) {
          reportRoot.replaceChildren(h('div', { class: 'workspace-empty', role: 'alert' }, [
            h('p', { text: errorText(result.error) }), button('Қайта жүктеу', loadReport)
          ]));
          return;
        }
        report = result.report;
        if (source.value === 'journal' && result.importedAt) {
          stamp.textContent = 'Журнал жаңартылған күн · ' + new Date(result.importedAt).toLocaleDateString('kk-KZ', { timeZone: 'Asia/Qyzylorda' });
        } else if (source.value === 'journal') {
          stamp.append(h('span', { text: 'Бұл курсқа журнал әлі енгізілмеген.' }),
            button('Журнал енгізу', () => { importBox.open = true; textarea.focus(); }));
        } else if (!demo && result.site) {
          const { linkedSessions, unassignedSessions } = result.site;
          stamp.append(h('span', { text: linkedSessions + ' сабақ қаралды' + (unassignedSessions ? ' · ' + unassignedSessions + ' сабаққа курс таңдау қажет' : '') }));
          if (unassignedSessions && openArchive) stamp.append(button('Сабақтарды байланыстыру', () => openArchive(filters)));
        }
        person.replaceChildren(option('', 'Топ бойынша'), ...report.profiles.map(p => option(p.id, p.name)));
        if (report.profiles.some(p => String(p.id) === keep)) person.value = keep;
        renderReport();
      }
      source.onchange = () => { preference.source = source.value; syncRoute(); loadReport(); };
      person.onchange = () => { preference.person = person.value; if (report) renderReport(); };
      const linkActions = [button('Курс баптауы', () => courseForm(course))];
      if (openJournal) linkActions.push(button('Бағалар журналы', () => openJournal(filters)));
      if (openArchive) linkActions.push(button('Сабақ архиві', () => openArchive(filters)));
      if (course.year === todayYear()) {
        linkActions.push(button('Сабақ бастау', () => startLesson(course), true));
      }
      courseMeta.replaceChildren(
        h('p', { class: 'sub', text: (data.catalog[course.course] || course.course) + ' · Қолдау межесі ' + course.threshold + ' / 100' }),
        h('div', { class: 'progress-toolbar' }, linkActions)
      );
      courseMeta.hidden = false;
      body.replaceChildren(...(demo ? [] : [importBox]), h('div', { class: 'progress-report-controls workspace-card' }, [
        modes, h('div', { class: 'progress-toolbar' }, [...(demo ? [] : [field('Баға дереккөзі', source)]), field('Студент', person)])
      ]), stamp, reportRoot);
      loadReport();
    }

    chosen.onchange = () => openCourse(true);
    const requested = data.courses.find(c => c.id === +selection?.course);
    chosen.value = String(requested?.id || (selection?.course ? '' : scoped ? matches.length === 1 && matches[0].id : data.courses[0]?.id) || '');
    controls.append(button('+ Курс байланыстыру', () => courseForm(), true), courseMeta);
    root.replaceChildren(...(demo ? [] : [controls]), body);
    openCourse();
  };
})();
