(() => {
  const bar = document.querySelector('.pt-lesson-tabs');
  if (!bar || bar.querySelectorAll('[role=tab]').length !== 2) return;
  const theory = document.getElementById('theory');
  const taskPane = document.getElementById('task');
  if (!theory || !taskPane) return;

  /* Үшінші қойынды «Қорытынды»: бет ішіндегі негізгі ұғымдар мен жаттығу нәтижесінен өздігінен құрылады. */
  const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    node.append(...kids);
    return node;
  };
  const summaryTab = el('a', { href: '#summary', id: 'pt-tab-summary', role: 'tab', 'aria-controls': 'summary', 'aria-selected': 'false' }, 'Қорытынды');
  bar.append(summaryTab);
  const ideas = theory.querySelector('.pt-ideas');
  const recap = el('div', { class: 'pt-ideas' });
  if (ideas) for (const item of ideas.children) recap.append(item.cloneNode(true));
  const tips = [...theory.querySelectorAll('.pt-tip')].map(tip => tip.cloneNode(true));
  const neighbors = document.querySelector('.pt-neighbors');
  const toTask = el('button', { type: 'button', class: 'btn', 'data-go-task': '' }, '← Тапсырмаларға қайту');
  const summary = el('section', { id: 'summary', class: 'pt-section pt-summary', role: 'tabpanel', 'aria-labelledby': 'pt-tab-summary', hidden: '' },
    el('span', { class: 'pt-overline' }, 'ЕСТЕ САҚТА'),
    el('h2', { id: 'summary-title' }, 'Бүгінгі негізгі ойлар'),
    ...(ideas ? [recap] : []), ...tips,
    el('div', { class: 'pt-summary-score' }, el('b', {}, 'Менің нәтижем'),
      el('p', { 'data-practice-summary': '' }, 'Жаттығу әлі орындалмаған. «Тапсырмалар» қойындысынан бастаңыз.')),
    el('div', { class: 'stepbar' }, toTask));
  taskPane.after(summary);
  if (neighbors) summary.after(neighbors);

  const tabs = [...bar.querySelectorAll('[role=tab]')];
  const panes = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const last = tabs.length - 1;
  const positions = tabs.map(() => 0);
  let current = -1;
  const indexOf = hash => hash === '#summary' ? 2 : (hash === '#task' || hash.startsWith('#pp-')) ? 1 : 0;

  function select(index, scroll = false) {
    if (current === index) return;
    if (current >= 0) positions[current] = window.scrollY;
    current = index;
    for (let i = 0; i < tabs.length; i++) {
      const active = i === current;
      tabs[i].setAttribute('aria-selected', String(active));
      tabs[i].tabIndex = active ? 0 : -1;
      panes[i].hidden = !active;
    }
    if (scroll) window.scrollTo({ top: positions[index], behavior: 'instant' });
  }
  function go(index) {
    if (current === index) return;
    history.pushState(null, '', tabs[index].hash);
    select(index, true);
  }

  for (const [i, tab] of tabs.entries()) {
    tab.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      go(i);
    });
    tab.addEventListener('keydown', event => {
      const next = { ArrowLeft: Math.max(0, i - 1), ArrowRight: Math.min(last, i + 1), Home: 0, End: last, ' ': i }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      go(next);
      tabs[next].focus({ preventScroll: true });
    });
  }
  toTask.addEventListener('click', () => { go(1); tabs[1].focus({ preventScroll: true }); });
  document.querySelector('.pt-outline a[href="#task"]')?.addEventListener('click', event => {
    event.preventDefault();
    go(1);
    tabs[1].focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => {
    select(indexOf(location.hash));
    const target = panes.find(pane => !pane.hidden)?.querySelectorAll('[id]');
    const anchor = target && [...target].find(element => '#' + element.id === location.hash);
    if (anchor) anchor.scrollIntoView({ block: 'start' });
  });
  select(indexOf(location.hash));
})();
