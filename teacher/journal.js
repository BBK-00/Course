window.createTeacherJournal = function ({ h, btn, api, subjects, topicInfo, open, progress, archive, onFilter, download, csv, notify }) {
  const state = { group: '', subject: '', query: '', mode: 'scores', sort: 'name' };
  const format = new Intl.NumberFormat('kk-KZ', { maximumFractionDigits: 1 });
  const average = marks => marks.length ? marks.reduce((sum, mark) => sum + mark.total, 0) / marks.length : null;
  const display = value => value === null ? '—' : format.format(value);
  const scoreClass = value => value >= 90 ? 'high' : value >= 75 ? 'good' : value >= 60 ? 'mid' : 'low';
  const spreadsheetValue = value => typeof value === 'string' && /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
  let request = 0;

  async function render(root, filters) {
    if (filters) Object.assign(state, { group: String(filters.group || ''), subject: filters.subject || '' });
    const ticket = ++request;
    root.replaceChildren(h('p', { class: 'workspace-empty', role: 'status', text: 'Журнал жүктелуде…' }));
    const data = await api('journal');
    if (ticket !== request) return;
    if (!data.ok) {
      root.replaceChildren(h('div', { class: 'workspace-empty', role: 'alert' }, [
        h('p', { text: 'Журналды жүктеу мүмкін болмады.' }), btn('Қайта жүктеу', () => render(root))
      ]));
      return;
    }
    mount(root, data);
  }

  function mount(root, data) {
    const select = (label, key, options) => {
      const field = h('select', { class: 'field', 'aria-label': label },
        options.map(([value, text]) => h('option', { value, text })));
      field.value = state[key];
      if (field.selectedIndex < 0) { field.selectedIndex = 0; state[key] = field.value; }
      field.onchange = () => {
        state[key] = field.value;
        if (key === 'subject' || key === 'group') onFilter(state);
        paint();
      };
      return h('label', { class: 'workspace-filter' }, [h('span', { text: label }), field]);
    };
    const search = h('input', { class: 'field', type: 'search', placeholder: 'Студентті іздеу', value: state.query, 'aria-label': 'Студентті іздеу' });
    search.oninput = () => { state.query = search.value; paint(); };
    const filters = h('div', { class: 'workspace-filters' }, [
      h('label', { class: 'workspace-filter' }, [h('span', { text: 'Іздеу' }), search]),
      select('Топ', 'group', [['', 'Барлық топ'], ...data.groups.map(group => [String(group.id), group.name])]),
      select('Пән', 'subject', [['', 'Барлық пән'], ...subjects.map(subject => [subject.id, subject.name])]),
      select('Баға түрі', 'mode', [['scores', 'Үздік қорытынды'], ['recent', 'Соңғы әрекет']]),
      select('Реттеу', 'sort', [['name', 'Аты бойынша'], ['avg', 'Орташа балл бойынша']])
    ]);
    const metrics = h('dl', { class: 'workspace-metrics' });
    const tableHost = h('div');
    const copy = btn('Көшіру', async () => {
      try {
        await navigator.clipboard.writeText(exportRows.map(row => row.map(value => String(value).replace(/[\t\r\n]/g, ' ')).join('\t')).join('\n'));
        notify('Журнал көшірілді.');
      } catch { notify('Көшіру мүмкін болмады. CSV файлын жүктеп алыңыз.', true); }
    }, 'sm');
    const file = btn('CSV жүктеу', () => download('бағалар-журналы.csv', csv(exportRows)), 'sm');
    let exportRows = [];
    const routeFilters = () => ({ group: state.group, subject: state.subject });
    const legend = h('p', { class: 'journal-legend', text: '«Аралық» белгісі бар балдар орташаға кірмейді. Ұяшықты басып, студенттің жұмысын ашыңыз.' });
    root.replaceChildren(h('section', { class: 'workspace-card' }, [
      filters, h('div', { class: 'workspace-actions' }, [
        btn('Үлгерімді қарау', () => progress(routeFilters()), 'primary sm'),
        btn('Сабақ архиві', () => archive(routeFilters()), 'sm'),
        h('span', { class: 'sp' }), copy, file
      ])
    ]), metrics, h('section', { class: 'workspace-card journal-table-card' }, [legend, tableHost]));

    function paint() {
      const groups = data.groups.filter(group => !state.group || String(group.id) === state.group);
      const gradedTopics = state.group ? new Set(groups.flatMap(group => group.students.flatMap(student => Object.keys(student.scores)))) : null;
      const topics = data.topics.filter(topic => (!state.subject || topicInfo(topic).subj.id === state.subject)
          && (!gradedTopics || gradedTopics.has(topic)))
        .sort((a, b) => {
          const x = topicInfo(a), y = topicInfo(b);
          return x.subj.name.localeCompare(y.subj.name, 'kk') || (Number(x.n) || 0) - (Number(y.n) || 0);
        });
      const query = state.query.trim().toLocaleLowerCase('kk');
      const rows = groups.flatMap(group =>
        group.students.filter(student => student.name.toLocaleLowerCase('kk').includes(query)).map(student => {
          const marks = topics.map(topic => student[state.mode]?.[topic] || null);
          return { group, student, marks, avg: average(marks.filter(mark => mark?.finalized)) };
        })
      );
      const byName = (a, b) => a.group.name.localeCompare(b.group.name, 'kk') || a.student.name.localeCompare(b.student.name, 'kk');
      rows.sort(state.sort === 'avg' ? (a, b) => (b.avg ?? -1) - (a.avg ?? -1) || byName(a, b) : byName);
      const marks = rows.flatMap(row => row.marks.filter(mark => mark?.total != null));
      const final = marks.filter(mark => mark.finalized);
      metrics.replaceChildren(...[
        ['Студенттер', rows.length], ['Қорытынды бағалар', final.length],
        ['Аралық балдар', marks.length - final.length], ['Орташа балл', display(average(final))]
      ].map(([name, value]) => h('div', {}, [h('dt', { text: name }), h('dd', { text: value })])));

      const titleOf = topic => {
        const { subj, n, title } = topicInfo(topic);
        return subj.name ? subj.name + ' · ' + n + '-сабақ · ' + title : data.titles[topic];
      };
      exportRows = [
        ['Студент', 'Топ', ...topics.map(titleOf), 'Орташа қорытынды'],
        ...rows.map(({ student, group, marks, avg }) => [
          student.name, group.name, ...marks.map(mark => mark?.total != null ? mark.finalized ? mark.total : mark.total + ' (аралық)' : ''),
          avg === null ? '' : Math.round(avg * 10) / 10
        ])
      ].map(row => row.map(spreadsheetValue));
      copy.disabled = file.disabled = !topics.length || !rows.length;
      if (copy.disabled) {
        tableHost.replaceChildren(h('p', { class: 'workspace-empty', text: !rows.length ? 'Сүзгіге сай студент табылмады.' : 'Бұл пән бойынша журналда баға әзірге жоқ.' }));
        return;
      }
      const cell = (mark, student) => {
        if (mark?.total == null) return h('td', { class: 'journal-blank', text: '—', 'aria-label': 'Баға жоқ', title: mark ? 'Қатысым тіркелмеген' : false });
        const detail = mark.finalized ? mark.edited ? 'Оқытушы қойған' : '' : 'Аралық · ' + mark.sent + '/' + mark.taskCount;
        return h('td', {}, h('button', {
          type: 'button', class: 'journal-mark ' + (mark.finalized ? scoreClass(mark.total) : 'interim'),
          'aria-label': student.name + ' · ' + titleOf(mark.topic) + ' · ' + mark.total + ' балл' + (detail ? ' · ' + detail : ''),
          on: { click: () => open(mark.session, student.id) }
        }, [h('b', { text: mark.total }), detail ? h('small', { text: detail }) : null]));
      };
      const heads = [h('th', { scope: 'col', class: 'journal-student', text: 'Студент' })];
      for (const topic of topics) {
        const { subj, n, title } = topicInfo(topic);
        heads.push(h('th', { scope: 'col', title: titleOf(topic) }, [
          h('b', { text: subj.name ? subj.name + ' · ' + n : topic }), h('small', { text: title })
        ]));
      }
      heads.push(h('th', { scope: 'col', text: 'Орташа' }));
      const body = rows.map(row => h('tr', {}, [
        h('th', { scope: 'row', class: 'journal-student' }, [h('b', { text: row.student.name }), h('small', { text: row.group.name })]),
        ...row.marks.map(mark => cell(mark, row.student)), h('td', { class: 'journal-average', text: display(row.avg) })
      ]));
      const foot = [
        h('th', { scope: 'row', class: 'journal-student', text: 'Орташа қорытынды' }),
        ...topics.map((_, index) => {
          const grades = rows.map(row => row.marks[index]).filter(mark => mark?.finalized);
          return h('td', { text: display(average(grades)) });
        }),
        h('td', { text: display(average(final)) })
      ];
      const left = tableHost.firstElementChild?.scrollLeft || 0;
      const scroll = h('div', { class: 'journal-scroll', tabindex: '0', 'aria-label': 'Бағалар кестесі' }, h('table', { class: 'journal-table' }, [
        h('thead', {}, h('tr', {}, heads)), h('tbody', {}, body), h('tfoot', {}, h('tr', {}, foot))
      ]));
      tableHost.replaceChildren(scroll);
      scroll.scrollLeft = left;
    }
    paint();
  }
  return { render };
};
