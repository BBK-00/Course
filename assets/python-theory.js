(function () {
  'use strict';
  const { steps, correct, reason, cases } = JSON.parse(document.getElementById('theoryData').textContent);
  const lines = [...document.querySelectorAll('.pt-line')];
  const values = document.getElementById('traceValues');
  const caption = document.getElementById('traceCaption');
  const output = document.getElementById('traceOutput');
  const count = document.getElementById('traceCount');
  const back = document.getElementById('traceBack');
  const next = document.getElementById('traceNext');
  const play = document.getElementById('tracePlay');
  let current = 0;
  let timer = null;

  const choices = [...document.querySelectorAll('.pt-choices button')];
  const board = document.getElementById('visualBoard');
  const visualCode = document.getElementById('visualCode');
  const visualCaption = document.getElementById('visualCaption');
  choices.forEach((button, index) => button.addEventListener('click', () => {
    const [, code, explanation, tiles] = cases[index];
    choices.forEach((choice, i) => choice.setAttribute('aria-pressed', String(i === index)));
    board.replaceChildren(...tiles.map(([label, value, state = '']) => {
      const tile = document.createElement('div');
      tile.className = 'pt-tile';
      tile.dataset.state = state;
      const name = document.createElement('span');
      name.textContent = label;
      const text = document.createElement('strong');
      text.textContent = value;
      tile.append(name, text);
      return tile;
    }));
    visualCode.textContent = code;
    visualCaption.textContent = explanation;
  }));
  document.querySelector('.pt-choices').hidden = false;

  function paint() {
    const [line, description, fields, printed] = steps[current];
    lines.forEach((node, index) => node.classList.toggle('current', index + 1 === line));
    values.replaceChildren(...fields.map(([label, value]) => {
      const tile = document.createElement('div');
      const name = document.createElement('span');
      const shown = document.createElement('code');
      name.textContent = label;
      shown.textContent = value;
      tile.append(name, shown);
      return tile;
    }));
    caption.textContent = description;
    output.textContent = printed || 'Әзірге бос';
    output.classList.toggle('empty', !printed);
    const last = current === steps.length - 1;
    back.disabled = current === 0;
    next.disabled = last;
    play.textContent = timer !== null ? 'Ⅱ Кідірту' : last ? '↻ Қайта ойнату' : '▶ Ойнату';
    count.textContent = (current + 1) + ' / ' + steps.length + ' қадам';
  }
  function pause() {
    clearInterval(timer);
    timer = null;
  }
  function move(change) {
    pause();
    current = Math.max(0, Math.min(steps.length - 1, current + change));
    paint();
  }
  back.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  play.addEventListener('click', () => {
    if (timer !== null) pause();
    else {
      if (current === steps.length - 1) current = 0;
      timer = setInterval(() => {
        current++;
        if (current === steps.length - 1) pause();
        paint();
      }, 1550);
    }
    paint();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && timer !== null) { pause(); paint(); }
  });
  document.querySelector('.pt-controls').hidden = false;
  paint();

  const options = [...document.querySelectorAll('.pt-options button')];
  document.querySelector('.pt-options').hidden = false;
  const feedback = document.getElementById('checkFeedback');
  options.forEach((button, index) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      options.forEach((option, i) => option.setAttribute('aria-pressed', String(index === i)));
      feedback.dataset.result = index === correct ? 'right' : 'retry';
      feedback.textContent = (index === correct ? 'Дұрыс! ' : 'Қайта байқап көр. ') + reason;
    });
  });
})();
