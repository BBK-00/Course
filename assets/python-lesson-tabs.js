(() => {
  const tabs = [...document.querySelectorAll('.pt-lesson-tabs [role=tab]')];
  if (tabs.length !== 2) return;
  const panes = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  if (panes.some(pane => !pane)) return;

  let current = -1;
  const positions = [0, 0];
  const isTask = hash => hash === '#task' || hash.startsWith('#pp-');
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
      const next = { ArrowLeft: 1 - i, ArrowRight: 1 - i, Home: 0, End: 1, ' ': i }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      go(next);
      tabs[next].focus({ preventScroll: true });
    });
  }

  document.querySelector('.pt-outline a[href="#task"]')?.addEventListener('click', event => {
    event.preventDefault();
    go(1);
    tabs[1].focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => {
    select(isTask(location.hash) ? 1 : 0);
    const target = panes.find(pane => !pane.hidden)?.querySelectorAll('[id]');
    const anchor = target && [...target].find(element => '#' + element.id === location.hash);
    if (anchor) anchor.scrollIntoView({ block: 'start' });
  });
  select(isTask(location.hash) ? 1 : 0);
})();
