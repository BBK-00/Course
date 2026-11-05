/* Run this function in a browser tab on the isolated local Wrangler server.
   It exercises the real UI and creates only local test data. */
async function teacherStartBrowserTest() {
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(location.origin)) throw new Error('Local test server only');
  const passed = [], check = (condition, label) => { if (!condition) throw new Error(label); passed.push(label); };
  const wait = async (condition, label) => { for (let i = 0; i < 180; i++) { if (condition()) return; await new Promise(r => setTimeout(r, 50)); } throw new Error('Timed out: ' + label); };
  const $ = s => document.querySelector(s);
  const button = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent === text);
  const change = (input, value) => { input.value = value; input.dispatchEvent(new Event('change', { bubbles: true })); };
  const nav = route => $('[data-route="' + route + '"]').click();
  const originalFetch = window.fetch.bind(window), originalPrompt = window.prompt, originalConfirm = window.confirm;
  try {
    if (!sessionStorage.getItem('ttok')) {
      $('#pw').value = 'test123'; $('#fLogin').requestSubmit();
      await wait(() => !$('#app').hidden, 'teacher login');
    }
    const api = async (path, body) => (await originalFetch('/api/teacher/' + path, {
      method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + sessionStorage.getItem('ttok'), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    })).json();
    await api('session/close', {}); nav('live');
    await wait(() => $('#s-live .lesson-start-form'), 'initial lesson form');
    const initialSessions = (await api('sessions')).rows.length;
    nav('roster'); await wait(() => $('#s-roster .group-directory'), 'groups');
    const query = $('#s-roster input[type=search]'); query.value = 'Ешбір топ табылмайтын сүзгі'; query.dispatchEvent(new Event('input'));
    const name = 'Жаңа топ QA ' + Date.now();
    window.prompt = () => name;
    button($('#s-roster'), '+ Топ қосу').click();
    await wait(() => $('#s-roster h2')?.textContent === name, 'created group');
    window.prompt = originalPrompt;
    const group = (await api('roster')).groups.find(g => g.name === name);
    check(!!group, 'Group is saved');
    check($('#s-roster input[type=search]').value === '', 'Old group search is cleared after adding a group');
    check(!!button($('#s-roster'), 'Сабақ бастау'), 'Selected group has a start lesson button');
    nav('live');
    const inlineGroup = $('#s-live select[aria-label="Топ"]');
    check([...inlineGroup.options].some(o => o.value === String(group.id)), 'New group appears in the existing lesson form without reloading');
    change($('#s-live select[aria-label="Пән"]'), 'py'); change($('#s-live select[aria-label="Тақырып"]'), 'P4'); change(inlineGroup, String(group.id));
    button($('#pageHeading'), 'Жаңа сабақ').click();
    let modal = $('#newLessonBody');
    check(modal.querySelector('[aria-label="Пән"]').value === 'py' && modal.querySelector('[aria-label="Тақырып"]').value === 'P4' && modal.querySelector('[aria-label="Топ"]').value === String(group.id), 'Reopening lesson form retains subject, topic and group');
    $('#closeNewLesson').click();
    const archived = (await api('sessions')).rows.find(r => r.status === 'closed');
    if (archived) {
      nav('archive');
      await wait(() => $('#s-archive [data-session="' + archived.id + '"]'), 'archive lesson row');
      button($('#s-archive [data-session="' + archived.id + '"]'), 'Нәтиже').click();
      await wait(() => $('#lessonStatus').textContent === 'Архив', 'archive context');
    }
    nav('roster');
    await wait(() => $('#s-roster h2')?.textContent === name, 'selected group persists');
    button($('#s-roster'), 'Сабақ бастау').click();
    modal = $('#newLessonBody');
    check(modal.querySelector('[aria-label="Топ"]').value === String(group.id), 'Start from group preselects that group');
    const form = modal.querySelector('form');
    const submit = form.querySelector('[data-start-submit]');
    check(submit.scrollWidth <= submit.clientWidth, 'Start button label is fully visible');
    window.fetch = (url, options) => String(url).endsWith('/session/start') ? Promise.reject(new Error('QA offline')) : originalFetch(url, options);
    form.requestSubmit();
    await wait(() => !form.querySelector('[role=alert]').hidden, 'failed start error');
    window.fetch = originalFetch;
    check(!$('#newLessonDialog').hidden && form.querySelector('[aria-label="Топ"]').value === String(group.id), 'Failed start keeps the form and selections');
    if (archived) check(JSON.parse(sessionStorage.getItem('teacher-dashboard-ui')).view === archived.id, 'Failed start preserves the viewed archive lesson');
    check((await api('sessions')).rows.length === initialSessions, 'Failed start creates no lesson');
    let startCalls = 0;
    window.fetch = async (url, options) => {
      if (String(url).endsWith('/session/start')) { startCalls++; await new Promise(r => setTimeout(r, 100)); }
      return originalFetch(url, options);
    };
    form.requestSubmit(); form.requestSubmit();
    await wait(() => $('#newLessonDialog').hidden && $('#s-live .entry-code') && $('#contextBar [aria-label="Топты таңдау"]')?.value === String(group.id), 'new lesson dashboard');
    window.fetch = originalFetch;
    let live = await api('live');
    check(startCalls === 1, 'Repeated submit starts exactly one lesson');
    check(live.session.status === 'open' && live.session.group_id === group.id && live.session.topic === 'P4', 'Empty new group can start the selected lesson');
    check($('#s-live').classList.contains('on') && /^\d{4}$/.test($('.entry-code').textContent.trim()), 'Starting from Groups opens the live dashboard and code');
    check((await api('sessions')).rows.length === initialSessions + 1, 'Exactly one lesson is stored');
    nav('roster'); await wait(() => $('#s-roster h2')?.textContent === name, 'group roster');
    $('#s-roster .roster-add').open = true;
    $('#s-roster textarea').value = 'Тексеру Әли\nТексеру Аружан';
    button($('#s-roster'), 'Тізімді сақтау').click();
    await wait(() => $('#s-roster').textContent.includes('2 белсенді студент'), 'saved students');
    nav('live');
    await wait(() => $('#s-live').textContent.includes('Тексеру Әли') && $('#s-live').textContent.includes('Тексеру Аружан'), 'students in live lesson');
    check(true, 'Students added after starting appear in the live lesson');
    window.confirm = () => true;
    button($('#pageHeading'), 'Сабақты аяқтау').click();
    await wait(() => $('#s-live .lesson-start-form'), 'lesson closes');
    const next = $('#s-live .lesson-start-form');
    check(next.querySelector('[aria-label="Тақырып"]').value === 'P4' && next.querySelector('[aria-label="Топ"]').value === String(group.id), 'Closed lesson returns to the chosen subject and group');
    check(next.querySelector('[aria-label="Топ"] option:checked').textContent.includes('2 студент'), 'Student count refreshes in lesson form');
    next.requestSubmit();
    await wait(() => $('#s-live .entry-code'), 'start from inline form');
    live = await api('live');
    check(live.session.group_id === group.id && live.session.topic === 'P4', 'Inline form starts the correct group and lesson');
    check((await api('sessions')).rows.length === initialSessions + 2, 'Two separate starts store exactly two lessons');
    check(!JSON.parse(sessionStorage.getItem('teacher-dashboard-ui')).view, 'New lesson clears the archived session selection');
    button($('#pageHeading'), 'Жаңа сабақ').click();
    window.fetch = (url, options) => String(url).includes('/api/teacher/live') ? Promise.reject(new Error('QA reload offline')) : originalFetch(url, options);
    $('#newLessonBody form').requestSubmit();
    await wait(() => $('#s-live').textContent.includes('Байланыс қалпына келгенде'), 'start succeeds but live reload fails');
    check(!$('#s-live .entry-code') && $('#s-live button').textContent === 'Қайта жүктеу', 'Failed refresh hides old lesson controls and offers retry');
    window.fetch = originalFetch;
    button($('#s-live'), 'Қайта жүктеу').click();
    await wait(() => $('#s-live .entry-code'), 'live refresh retry');
    live = await api('live');
    check(live.session.group_id === group.id && live.session.topic === 'P4', 'Retry loads the lesson already started on the server');
    check((await api('sessions')).rows.length === initialSessions + 3, 'Retrying the display creates no duplicate lesson');
    return { passed, groupId: group.id, sessionId: live.session.id };
  } finally {
    window.fetch = originalFetch; window.prompt = originalPrompt; window.confirm = originalConfirm;
  }
}
