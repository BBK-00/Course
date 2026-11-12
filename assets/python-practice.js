(function () {
  'use strict';

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === 'class') node.className = value;
      else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  }
  const button = (text, primary = false) => el('button', { type: 'button', class: 'btn' + (primary ? ' primary' : '') }, text);
  const pre = text => el('pre', {}, text);
  const normalize = value => String(value ?? '').normalize('NFC').trim().split(/\r?\n/).map(line => line.trim().replace(/[ \t]+/g, ' ')).join('\n');
  const numberLine = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  function matchesOutput(actual, expected) {
    const a = normalize(actual), b = normalize(expected);
    if (a === b) return true;
    const actualLines = a.split('\n'), expectedLines = b.split('\n');
    return actualLines.length === expectedLines.length && expectedLines.every((line, i) => {
      const target = line.split(' '), got = actualLines[i].split(' ');
      return target.length === got.length && target.every((value, j) => numberLine.test(value) && numberLine.test(got[j]) &&
        Number.isFinite(Number(got[j])) && Math.abs(Number(value) - Number(got[j])) <= Math.max(1, Math.abs(Number(value))) * 1e-9);
    });
  }
  const inputText = text => text === '' ? 'Енгізу жоқ' : text === '\n' ? 'Бос жол' : text;
  const outputText = text => text.trim() || 'Экран бос';
  const read = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

  let worker, active;
  function execute(code, inputs) {
    if (active) return Promise.reject(new Error('Бір код тексеріліп жатыр. Аяқталған соң қайта бас.'));
    return new Promise((resolve, reject) => {
      const finish = (error, results, reset = false) => {
        if (!active) return;
        clearTimeout(active.timeout);
        active = null;
        if (reset) { worker?.terminate(); worker = null; }
        if (error) reject(new Error(error));
        else resolve(results);
      };
      active = { timeout: setTimeout(() => finish('Python ортасы жүктелмеді. Байланысты тексеріп, қайта көр.', null, true), 45000) };
      try {
        worker ||= new Worker('/assets/python-practice-worker.js?v=1', { type: 'module' });
        worker.onmessage = ({ data }) => {
          if (data.ready) {
            clearTimeout(active.timeout);
            active.timeout = setTimeout(() => finish('Код аяқталмады. Цикл шарты мен айнымалының жаңаруын тексер.', null, true), 5500);
          } else finish(data.error, data.results, !!data.error);
        };
        worker.onerror = event => { event.preventDefault(); finish('Python ортасы жүктелмеді. Байланысты тексеріп, қайта көр.', null, true); };
        worker.postMessage({ code, inputs });
      } catch {
        finish('Бұл браузерде Python ортасын ашу мүмкін болмады.', null, true);
      }
    });
  }

  const errors = {
    SyntaxError: 'Қос нүктені, жақшаны, тырнақшаны және оператордың жазылуын тексер.',
    IndentationError: 'Блок денесіндегі шегіністердің деңгейін тексер.',
    TabError: 'Шегіністі біркелкі бос орындармен жаз.',
    NameError: 'Айнымалының атауын және оған мән берілгенін тексер.',
    TypeError: 'Қолданылған мәндердің типтерін тексер. input() мәтін қайтарады.',
    ValueError: 'Енгізу пішімін және int() немесе float() арқылы түрлендіруді тексер.',
    IndexError: 'Индексті және тізімнің ұзындығын тексер. Бірінші индекс 0.',
    ZeroDivisionError: 'Бөлгіштің нөл болған жағдайын тексер.',
    EOFError: 'Код мысалда берілгеннен артық енгізу жолын оқуға тырысты.'
  };
  function diagnosis(result) {
    const line = result.line ? result.line + '-жол. ' : '';
    return line + result.error + (result.message ? ' · ' + result.message : '') + '. ' + (errors[result.error] || '');
  }

  function editor(value, label) {
    const field = el('textarea', { class: 'pp-editor', rows: '7', maxlength: '6000', spellcheck: 'false', 'aria-label': label }, value);
    field.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing || event.ctrlKey || event.metaKey) return;
      const prefix = field.value.slice(0, field.selectionStart);
      const line = prefix.slice(prefix.lastIndexOf('\n') + 1);
      const indent = /^[ \t]*/.exec(line)[0] + (line.trimEnd().endsWith(':') ? '    ' : '');
      if (!indent || field.value.length - (field.selectionEnd - field.selectionStart) + indent.length + 1 > field.maxLength) return;
      event.preventDefault();
      field.setRangeText('\n' + indent, field.selectionStart, field.selectionEnd, 'end');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return field;
  }
  function solution(reason, example) {
    const details = el('details', { class: 'pp-solution' }, el('summary', {}, 'Шығару жолын көру'), el('p', {}, reason));
    if (example !== undefined) details.append(pre(example));
    return details;
  }
  function sample(input, out) {
    return el('div', { class: 'pp-io' },
      el('div', {}, el('b', {}, 'Енгізу'), pre(inputText(input))),
      el('div', {}, el('b', {}, 'Күтілетін нәтиже'), pre(outputText(out))));
  }

  function mount(root, lesson, n) {
    const key = 'bbk-python-practice-v1-' + n;
    const state = read(key);
    const groups = [
      { id: 'pp-understand', title: 'Түсініп көр', items: lesson.warm, weight: 1 },
      { id: 'pp-code', title: lesson.review ? 'Бөлімді қайталау' : 'Код жаз', items: lesson.code, weight: 3 },
      { id: 'pp-test', title: 'Бекіту тесті', items: lesson.quiz, weight: 1 }
    ].filter(group => group.items.length);
    const total = groups.reduce((sum, group) => sum + group.items.length * group.weight, 0);
    const count = groups.reduce((sum, group) => sum + group.items.length, 0);
    const meter = el('progress', { max: '100', value: '0', 'aria-label': 'Өзіндік жаттығу нәтижесі' });
    const score = el('strong', { role: 'status' });
    const summaries = [...document.querySelectorAll('[data-practice-summary]')];
    const statusByStage = new Map();

    function updateScore() {
      let points = 0, attempted = 0;
      groups.forEach(group => {
        let earned = 0;
        group.items.forEach((_, i) => {
          const record = state[group.id + '-' + i];
          if (record?.best !== undefined) { earned += record.best; attempted++; }
        });
        points += earned;
        statusByStage.get(group.id).textContent = (Math.round(earned * 10) / 10) + ' / ' + (group.items.length * group.weight) + ' балл';
      });
      const result = Math.round(points / total * 100);
      meter.value = result;
      score.textContent = 'Үздік нәтиже ' + result + ' / 100 · ' + attempted + ' / ' + count + ' орындалды';
      summaries.forEach(summary => { summary.textContent = score.textContent; });
    }
    function record(id, points, value) {
      state[id] = { ...state[id], value, last: points, best: Math.max(state[id]?.best ?? 0, points) };
      save(key, state);
      updateScore();
    }

    function shortTask(item, id, index) {
      const label = item.opts ? (item.code ? 'Кодты талдау' : 'Теория') : 'Нәтижені жаз';
      const question = item.prompt || (item.opts ? 'Код туралы дұрыс тұжырымды таңда.' : 'Экранға не шығады?');
      const header = el('h4', {}, (index + 1) + '. ' + question);
      const form = el('form', { class: 'pp-question' }, el('span', { class: 'pp-tag' }, label), header);
      if (item.code) form.append(pre(item.code));
      if (item.input !== undefined) form.append(el('b', {}, 'Берілген енгізу'), pre(inputText(item.input)));
      const prev = state[id];
      const feedback = el('p', { class: 'pp-feedback', role: 'status' });
      let answer;
      if (item.opts) {
        const options = el('div', { class: 'pp-options', role: 'group', 'aria-label': question });
        item.opts.forEach((text, i) => {
          const radio = el('input', { type: 'radio', name: id, value: String(i) });
          radio.checked = prev?.value === String(i);
          options.append(el('label', {}, radio, el('span', {}, text)));
        });
        answer = () => options.querySelector('input:checked')?.value ?? '';
        form.append(options);
      } else {
        const field = item.answer.includes('\n')
          ? el('textarea', { rows: '3', maxlength: '250', 'aria-label': 'Әр нәтиже жеке жолда' })
          : el('input', { type: 'text', maxlength: '250', autocomplete: 'off', 'aria-label': 'Экрандағы нәтиже' });
        field.className = 'pp-answer';
        field.value = prev?.value || '';
        if (item.answer.includes('\n')) field.placeholder = 'Әр нәтижені жеке жолға жаз';
        answer = () => field.value;
        form.append(field);
      }
      const expected = item.opts ? item.opts[item.correct] : item.answer;
      function show(ok) {
        feedback.dataset.state = ok ? 'good' : 'bad';
        feedback.textContent = (ok ? 'Дұрыс · 1 балл. ' : 'Бұл жауап сәйкес келмеді. Дұрысы — ' + expected.replace(/\n/g, ' → ') + '. ') + item.reason;
      }
      if (prev?.last !== undefined) show(prev.last === 1);
      form.addEventListener('submit', event => {
        event.preventDefault();
        const value = answer();
        if (!value.trim()) { feedback.dataset.state = 'bad'; feedback.textContent = 'Алдымен жауабыңды енгіз немесе таңда.'; return; }
        const ok = item.opts ? Number(value) === item.correct : normalize(value) === normalize(item.answer);
        record(id, ok ? 1 : 0, value);
        show(ok);
      });
      form.append(el('div', { class: 'pp-actions' }, el('button', { type: 'submit', class: 'btn' }, 'Тексеру')), feedback,
        solution(item.reason, expected));
      return form;
    }

    function codeTask(item, id, index, weight) {
      const details = el('details', { class: 'pp-exercise' });
      details.open = index === 0;
      const draft = state[id]?.draft || '';
      const source = editor(draft, item.title + ' коды');
      source.placeholder = '# Python кодын осы жерге жаз';
      const check = button('Кодты тексеру', true);
      const feedback = el('div', { class: 'pp-feedback', role: 'status' });
      if (state[id]?.best !== undefined) feedback.textContent = 'Сақталған үздік балл ' + state[id].best + ' / ' + weight + '.';
      source.addEventListener('input', () => { state[id] = { ...state[id], draft: source.value }; save(key, state); });
      check.addEventListener('click', async () => {
        const code = source.value;
        if (!code.trim()) { feedback.textContent = 'Алдымен Python кодын жаз.'; return; }
        check.disabled = source.disabled = true;
        feedback.dataset.state = '';
        feedback.textContent = 'Python коды тексеріліп жатыр…';
        try {
          const results = await execute(code, item.cases.map(([input]) => input));
          const failures = [];
          results.forEach((result, i) => {
            if (result.error || !matchesOutput(result.out, item.cases[i][1])) failures.push(i);
          });
          const passed = results.length - failures.length;
          const points = Math.round(passed / results.length * weight * 10) / 10;
          record(id, points, '');
          feedback.dataset.state = failures.length ? 'bad' : 'good';
          feedback.replaceChildren(el('b', {}, passed + ' / ' + results.length + ' тексеру өтті · ' + points + ' / ' + weight + ' балл'));
          if (failures.length) {
            const i = failures[0], failed = results[i];
            const [input, expected] = item.cases[i];
            feedback.append(el('p', {}, failed.error ? diagnosis(failed) : 'Бұл енгізуде экрандағы нәтиже күтілген мәнге сәйкес келмеді.'),
              sample(input, expected));
            if (!failed.error) feedback.append(el('b', {}, 'Сенің нәтижең'), pre(outputText(failed.out)));
            feedback.append(el('p', {}, item.reason));
          } else feedback.append(el('p', {}, 'Барлық енгізуде нәтиже дұрыс шықты.'));
        } catch (error) {
          feedback.dataset.state = 'bad';
          feedback.textContent = error.message;
        } finally { check.disabled = source.disabled = false; }
      });
      details.append(el('summary', {}, el('b', {}, (index + 1) + '. ' + item.title),
        el('span', { class: 'pp-tag' }, item.level + ' · ' + weight + ' балл')),
        el('div', { class: 'pp-workspace' },
          el('div', { class: 'pp-brief' }, el('p', {}, item.prompt), sample(...item.cases[0])),
          el('div', { class: 'pp-code-area' }, el('b', {}, 'Python редакторы'), source,
            el('div', { class: 'pp-actions' }, check))),
        feedback, solution(item.reason, item.ref));
      return details;
    }

    const links = el('nav', { class: 'pp-nav', 'aria-label': 'Жаттығу бөлімдері' });
    root.replaceChildren(el('header', { class: 'pp-hero' },
      el('span', { class: 'pp-tag' }, 'PYTHON · ' + n + '-САБАҚ'),
      el('h2', {}, 'Өзіндік жаттығу'),
      el('p', {}, 'Жауапты осы бетте тексер. Әр есептің шығару жолын ашып, қатеңді түзете аласың. Нәтиже осы браузерде сақталады.'),
      el('div', { class: 'pp-score' }, score, meter), links));
    groups.forEach((group, stage) => {
      const caption = el('span', { class: 'pp-stage-score' });
      statusByStage.set(group.id, caption);
      links.append(el('a', { href: '#' + group.id, class: 'btn' }, String(stage + 1) + '. ' + group.title));
      const title = el('header', { class: 'pp-stage-head' }, el('h3', {}, String(stage + 1) + '. ' + group.title), caption);
      const section = el('section', { class: 'pp-stage', id: group.id }, title);
      if (group.id === 'pp-code') section.append(el('p', { class: 'pp-stage-note' }, 'Енгізу мәндері тексеру кезінде автоматты түрде беріледі. Шартта сұралған нәтижені print() арқылы шығар.'));
      group.items.forEach((item, i) => section.append(group.id === 'pp-code'
        ? codeTask(item, group.id + '-' + i, i, group.weight) : shortTask(item, group.id + '-' + i, i)));
      root.append(section);
    });
    updateScore();
    if (location.hash.startsWith('#pp-')) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
  }

  window.PyPractice = {
    playground(host, starter) {
      const source = editor(starter || '', 'Еркін Python коды');
      const input = el('textarea', { rows: '2', class: 'pp-answer', placeholder: 'input() үшін әр мәнді жаңа жолға жаз', 'aria-label': 'Консольге енгізу' });
      const result = pre('Экран әзірге бос');
      result.setAttribute('role', 'status');
      const run = button('Орындау', true);
      run.addEventListener('click', async () => {
        run.disabled = true;
        result.textContent = 'Орындалып жатыр…';
        try {
          const [output] = await execute(source.value, [input.value]);
          result.textContent = output.error ? diagnosis(output) : outputText(output.out);
        } catch (error) { result.textContent = error.message; }
        finally { run.disabled = false; }
      });
      host.append(source, el('div', { class: 'pp-console' }, input, run, result));
    }
  };

  const root = document.querySelector('[data-python-practice]');
  if (!root) return;
  const n = Number(root.dataset.pythonPractice);
  async function load() {
    root.textContent = 'Жаттығулар ашылып жатыр…';
    try {
      const response = await fetch('/assets/python-practice-bank.json?v=1');
      if (!response.ok) throw new Error();
      const bank = await response.json();
      mount(root, bank[n], n);
    } catch {
      const retry = button('Қайта жүктеу');
      retry.onclick = load;
      root.replaceChildren(el('p', { role: 'status' }, 'Жаттығуларды ашу мүмкін болмады.'), retry);
    }
  }
  load();
})();
