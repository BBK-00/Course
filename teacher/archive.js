window.createTeacherArchive = function ({ h, btn, api, subjects, topicInfo, topicName, dateText, open, analyze, progress, linkCourse, onFilter, reopen, changed, notify }) {
  const state = { trash: false, query: '', subject: '', group: '', from: '', to: '', kind: '', advanced: false, selected: new Set(), busy: false };
  let request = 0, rows = [], counts = { archive: 0, trash: 0 };
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' });
  const localDay = stamp => dayFormat.format(new Date(stamp * 1000));
  const hasWork = r => !!(r.work_count || r.homework || r.attempts || r.results_count || r.feedback_count);
  const empty = r => !r.att && !hasWork(r);
  const groupName = r => r.gname || (r.group_id ? 'Топ №' + r.group_id : 'Топсыз сабақ');
  const option = (value, text, current) => h('option', { value, text, selected: value === current });

  async function render(root, filters, fromAnotherView = false) {
    if (state.busy) return;
    if (filters) {
      state.group = String(filters.group || '');
      state.subject = filters.subject || '';
    }
    if (fromAnotherView) Object.assign(state, { trash: false, query: '', from: '', to: '', kind: '', advanced: false });
    const ticket = ++request, mode = state.trash;
    root.replaceChildren(h('p', { class: 'sub', role: 'status', text: 'Сабақтар жүктелуде…' }));
    const j = await api('sessions' + (mode ? '?trash=1' : ''));
    if (ticket !== request) return;
    if (!j.ok) {
      root.replaceChildren(h('div', { class: 'card archive-error' }, [
        h('p', { text: 'Архив жүктелмеді. Қайта көріңіз.' }), btn('Қайта жүктеу', () => render(root))
      ]));
      return;
    }
    rows = j.rows; counts = j.counts;
    state.selected.clear();
    mount(root);
  }

  function mount(root) {
    const tabs = h('div', { class: 'archive-tabs', 'aria-label': 'Архив көрінісі' });
    for (const [mode, title, count] of [[false, 'Сабақтар', counts.archive], [true, 'Себет', counts.trash]]) {
      const button = btn(title + ' · ' + count, () => { state.trash = mode; state.selected.clear(); render(root); }, state.trash === mode ? 'primary' : '');
      button.setAttribute('aria-pressed', String(state.trash === mode));
      tabs.append(button);
    }
    const refresh = btn('Жаңарту', () => render(root), 'sm');
    const search = h('input', { class: 'field', type: 'search', placeholder: 'Тақырып, топ немесе сабақ №', value: state.query, 'aria-label': 'Архивтен іздеу' });
    const subject = h('select', { class: 'field', 'aria-label': 'Архив пәні' }, [option('', 'Барлық пән', state.subject), ...subjects.map(s => option(s.id, s.name, state.subject))]);
    const groups = [...new Map(rows.map(r => [String(r.group_id || 0), groupName(r)])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'kk'));
    // Keep a selected group visible even if that view has no lessons from the group.
    if (state.group && !groups.some(([id]) => id === state.group)) groups.push([state.group, 'Таңдалған топ']);
    const group = h('select', { class: 'field', 'aria-label': 'Архив тобы' }, [option('', 'Барлық топ', state.group), ...groups.map(([id, name]) => option(id, name, state.group))]);
    const from = h('input', { class: 'field', type: 'date', value: state.from, 'aria-label': 'Басталу күні' });
    const to = h('input', { class: 'field', type: 'date', value: state.to, 'aria-label': 'Аяқталу күні' });
    const kind = h('select', { class: 'field', 'aria-label': 'Сабақ күйі' }, [
      option('', 'Барлық сабақ', state.kind), option('empty', 'Қатысушысыз, жұмыссыз', state.kind),
      option('work', 'Жұмыс сақталған', state.kind), option('closed', 'Аяқталған', state.kind),
      ...(!state.trash ? [option('open', 'Ашық сабақ', state.kind)] : [])
    ]);
    if (state.trash && state.kind === 'open') { state.kind = ''; kind.value = ''; }
    const count = h('span', { class: 'sub', role: 'status', 'aria-live': 'polite' });
    const selectAll = h('input', { type: 'checkbox', 'aria-label': 'Көрсетілген сабақтарды таңдау' });
    const selected = h('span');
    const clear = btn('Таңдауды алу', () => { state.selected.clear(); paint(); }, 'sm');
    const bulk = btn('', () => mutate(rows.filter(r => state.selected.has(r.id))), state.trash ? 'primary sm' : 'danger sm');
    const list = h('div', { class: 'archive-list', 'aria-label': 'Сабақтар тізімі' });
    const field = (text, input) => h('label', { class: 'archive-filter' }, [h('span', { text }), input]);
    const reset = btn('Сүзгіні тазалау', () => {
      for (const key of ['query', 'subject', 'group', 'from', 'to', 'kind']) state[key] = '';
      state.selected.clear(); onFilter(state); mount(root);
    }, 'sm');
    const invalidDates = () => state.from && state.to && state.from > state.to;
    const filtered = () => rows.filter(r => {
      const q = state.query.trim().toLocaleLowerCase('kk'), day = localDay(r.created_at);
      return !invalidDates() && (!state.subject || topicInfo(r.topic).subj.id === state.subject)
        && (!state.group || String(r.group_id || 0) === state.group)
        && (!state.from || day >= state.from) && (!state.to || day <= state.to)
        && (!q || (topicName(r.topic) + ' ' + groupName(r) + ' ' + r.id + ' ' + dateText(r.created_at)).toLocaleLowerCase('kk').includes(q))
        && (!state.kind || (state.kind === 'empty' ? empty(r) : state.kind === 'work' ? hasWork(r) : r.status === state.kind));
    });
    const filterChanged = (key, input) => {
      state[key] = input.value;
      state.selected.clear();
      if (key === 'group' || key === 'subject') onFilter(state);
      paint();
    };
    search.oninput = () => filterChanged('query', search);
    for (const [key, input] of [['subject', subject], ['group', group], ['from', from], ['to', to], ['kind', kind]]) input.onchange = () => filterChanged(key, input);
    selectAll.onchange = () => {
      const candidates = filtered().filter(r => state.trash || r.status !== 'open');
      if (selectAll.checked) candidates.forEach(r => state.selected.add(r.id)); else state.selected.clear();
      paint();
    };

    function paint() {
      const found = filtered(), candidates = found.filter(r => state.trash || r.status !== 'open');
      const visible = new Set(candidates.map(r => r.id));
      for (const id of state.selected) if (!visible.has(id)) state.selected.delete(id);
      count.textContent = invalidDates() ? 'Күн аралығын дұрыс таңдаңыз.' : found.length + ' / ' + rows.length + ' сабақ';
      selectAll.checked = !!candidates.length && state.selected.size === candidates.length;
      selectAll.indeterminate = state.selected.size > 0 && state.selected.size < candidates.length;
      selectAll.disabled = !candidates.length || state.busy;
      selected.textContent = state.selected.size ? state.selected.size + ' сабақ таңдалды' : 'Сабақтарды таңдау';
      bulk.textContent = state.trash ? 'Қалпына келтіру' : 'Өшіру';
      bulk.disabled = clear.disabled = !state.selected.size || state.busy;
      const header = h('div', { class: 'archive-columns', 'aria-hidden': 'true' }, [
        h('span'), h('span', { text: 'Сабақ' }), h('span', { text: 'Қатысым және жұмыс' }),
        h('span', { text: 'Күйі' }), h('span', { text: 'Әрекеттер' })
      ]);
      list.replaceChildren(...(found.length ? [header] : []), ...found.map(r => {
        const checkbox = h('input', { type: 'checkbox', 'aria-label': '№' + r.id + ' сабақты таңдау', checked: state.selected.has(r.id), disabled: state.busy || !state.trash && r.status === 'open' });
        checkbox.onchange = () => { checkbox.checked ? state.selected.add(r.id) : state.selected.delete(r.id); paint(); list.querySelector('[data-session="' + r.id + '"] input')?.focus(); };
        const actions = h('div', { class: 'archive-actions' });
        if (state.trash) actions.append(btn('Қалпына келтіру', () => mutate([r]), 'sm'));
        else {
          actions.append(btn(r.status === 'open' ? 'Барысы' : 'Жұмыстар', () => open(r.id), 'sm'));
          actions.append(btn('Талдау', () => analyze(r.id), 'sm'));
          const menu = h('details', { class: 'archive-menu' }, [h('summary', { title: 'Сабақ әрекеттері', 'aria-label': '№' + r.id + ' сабақ әрекеттері', text: '•••' })]);
          const remove = btn('Өшіру', () => mutate([r]), 'danger sm');
          remove.disabled = r.status === 'open';
          if (remove.disabled) remove.title = 'Алдымен жүріп жатқан сабақты аяқтаңыз.';
          menu.append(h('div', { class: 'archive-menu-body' }, [
            ...(r.group_id ? [
              btn('Топтың үлгерімі', () => { menu.open = false; progress(r); }, 'sm'),
              btn('Курс байланысы', () => { menu.open = false; linkCourse(r); }, 'sm')
            ] : []),
            ...(r.status !== 'open' ? [btn('Қайта ашу', async () => { if (await reopen(r.id)) render(root); }, 'sm')] : []), remove
          ]));
          menu.addEventListener('toggle', () => {
            if (menu.open) list.querySelectorAll('.archive-menu[open]').forEach(other => { if (other !== menu) other.open = false; });
          });
          actions.append(menu);
        }
        const topic = topicInfo(r.topic);
        return h('article', { class: 'archive-item' + (state.selected.has(r.id) ? ' selected' : ''), 'data-session': r.id }, [
          checkbox,
          h('div', { class: 'archive-main' }, [
            h('b', { text: topic.title }),
            h('small', { text: [topic.subj.name, groupName(r), dateText(r.created_at), '№' + r.id].filter(Boolean).join(' · ') }),
            ...(state.trash ? [h('small', { text: 'Себетке жіберілді · ' + dateText(r.removed_at) })] : [])
          ]),
          h('div', { class: 'archive-work' }, [
            h('b', { text: r.att + ' қатысушы' }),
            ...(r.work_count ? [h('small', { text: r.work_count + ' тапсырма · ' + r.subs + ' студент' })] : []),
            ...(r.results_count ? [h('small', { text: r.results_count + ' оқытушы жазбасы' })] : []),
            ...(r.homework ? [h('small', { text: r.homework + ' үй жұмысы' })] : [])
          ]),
          h('div', { class: 'archive-state' }, h('span', { class: 'state-badge ' + (r.status === 'open' ? 'ok' : 'muted'), text: state.trash ? 'Себетте' : r.status === 'open' ? 'Ашық' : empty(r) ? 'Бос сабақ' : 'Аяқталған' })),
          actions
        ]);
      }));
      if (!found.length) list.append(h('div', { class: 'analysis-empty' }, [
        h('b', { text: invalidDates() ? 'Басталу күні аяқталу күнінен кейін тұр' : rows.length ? 'Сүзгіге сай сабақ жоқ' : state.trash ? 'Өшірілген сабақ жоқ' : 'Әзірге сақталған сабақ жоқ' }),
        h('p', { class: 'sub', text: rows.length ? 'Сүзгілерді өзгертіп көріңіз.' : state.trash ? 'Өшірілген сабақтар осы жерде сақталады.' : 'Сабақ бастағаннан кейін осы жерде көрінеді.' })
      ]));
    }

    async function mutate(chosen) {
      if (state.busy || !chosen.length) return;
      const restoring = state.trash;
      const names = chosen.slice(0, 5).map(r => '• ' + topicInfo(r.topic).title + ' · ' + groupName(r) + ' · ' + dateText(r.created_at) + ' · №' + r.id);
      if (chosen.length > 5) names.push('… тағы ' + (chosen.length - 5) + ' сабақ');
      const workCount = chosen.reduce((n, r) => n + r.work_count, 0);
      const message = restoring
        ? chosen.length + ' сабақты қалпына келтіресіз бе?\n\n' + names.join('\n') + '\n\nБұрынғы бағалар журналға қайта кіреді. Сабақтар жабық күйінде қалады.'
        : chosen.length + ' сабақты себетке жібересіз бе?\n\n' + names.join('\n') + '\n\n' + workCount + ' тапсырма сақталған. Бұл сабақтар журнал мен үй жұмысы тізімінен алынады. Себеттен бағаларымен бірге қайтара аласыз.';
      if (!confirm(message)) return;
      state.busy = true;
      root.setAttribute('aria-busy', 'true');
      root.querySelectorAll('button,input,select,summary').forEach(el => { if (el.tagName === 'SUMMARY') el.tabIndex = -1; else el.disabled = true; });
      const result = await api('session/' + (restoring ? 'restore' : 'trash'), { ids: chosen.map(r => r.id) });
      state.busy = false;
      root.removeAttribute('aria-busy');
      if (!result.ok) { mount(root); return; }
      state.selected.clear();
      await changed(chosen.map(r => r.id));
      await render(root);
      notify(result.changed + (restoring ? ' сабақ қалпына келтірілді.' : ' сабақ себетке жіберілді.'));
    }

    const advanced = h('details', { class: 'archive-advanced', open: state.advanced }, [
      h('summary', { text: 'Күн және күй бойынша сүзу' }),
      h('div', { class: 'archive-filter-extra' }, [field('Күннен', from), field('Күнге дейін', to), field('Сабақ күйі', kind), reset])
    ]);
    advanced.ontoggle = () => { state.advanced = advanced.open; };
    root.replaceChildren(h('div', { class: 'workspace-card archive-filters' }, [
        h('div', { class: 'archive-head' }, [tabs, refresh]),
        h('div', { class: 'archive-filter-main' }, [search, subject, group]),
        advanced
      ]),
      h('div', { class: 'workspace-card archive-results' }, [
        h('div', { class: 'archive-selection' }, [h('label', { class: 'archive-select-label' }, [selectAll, selected]), count, h('span', { class: 'sp' }), clear, bulk]), list
      ])
    );
    paint();
  }

  return { render };
};
