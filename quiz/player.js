/* Quiz ойнатқышы: жүргізуші дауысы сұрақты, жауаптарды, ережені оқиды; таймер дауыс біткен соң басталады.
   Дауыс файлдарын scripts/quiz-voice.mjs жасайды (кілттер соның segments() функциясымен бірдей). */
(() => {
  const LETTERS = ['А', 'Б', 'В', 'Г'];
  const params = new URLSearchParams(location.search);
  const gameId = (params.get('g') || 'klassika').replace(/[^a-z0-9-]/gi, '');
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* жеке режим */ } } };
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }
    n.append(...kids.flat().filter(x => x !== null && x !== undefined && x !== false));
    return n;
  };

  const root = document.getElementById('player');
  const state = { auto: store.get('qz-auto') === '1', quiz: null, steps: [], i: 0, started: false, paused: false, muted: store.get('qz-muted') === '1', voice: store.get('qz-voice') === 'ayel' ? 'ayel' : 'er', left: 0, total: 0 };
  const voiceEl = new Audio();
  const svgEl = (tag, attrs) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const ringSvg = () => {
    const svg = svgEl('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' });
    ring = svgEl('circle', { cx: 60, cy: 60, r: 52, class: 'pl-ring-bar' });
    svg.append(svgEl('circle', { cx: 60, cy: 60, r: 52, class: 'pl-ring-track' }), ring);
    return svg;
  };
  let ring = null, tick = null, advance = null, audioCtx = null, stageEl, barEl, dotsEl, nextBtn, pauseBtn, muteBtn, voiceBtn, autoBtn;

  /* ---------- Қадамдар ---------- */
  function buildSteps(quiz) {
    const steps = [{ kind: 'welcome', audio: 'welcome' }];
    for (const r of quiz.rounds) {
      steps.push({ kind: 'round', r, audio: r.id + '-intro' });
      r.questions.forEach((q, k) => {
        const n = k + 1;
        steps.push({ kind: 'question', r, q, n, count: r.questions.length, audio: `${r.id}-q${n}` });
      });
      steps.push({ kind: 'collect', r, audio: r.id + '-collect' }, { kind: 'answers', r, audio: r.id + '-answers' });
    }
    steps.push({ kind: 'end', audio: 'end' });
    return steps;
  }

  /* ---------- Дыбыс ---------- */
  function beep(freq, ms) {
    if (state.muted) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; g.gain.value = .08; o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + ms / 1000);
    } catch { /* дыбыс қолжетімсіз */ }
  }
  const stopAll = () => { clearInterval(tick); clearTimeout(advance); tick = advance = null; voiceEl.pause(); voiceEl.onended = voiceEl.onerror = null; };

  function speak(step, done) {
    voiceEl.pause();
    voiceEl.muted = state.muted;
    voiceEl.src = `/quiz/audio/${gameId}/${state.voice}/${step.audio}.mp3`;
    let finished = false;
    const end = () => { if (finished) return; finished = true; stageEl.classList.remove('speaking'); done(); };
    voiceEl.onended = end;
    voiceEl.onerror = () => { advance = setTimeout(end, 900); }; // файл жоқ: үнсіз жалғастыру
    stageEl.classList.add('speaking');
    voiceEl.play().catch(() => { advance = setTimeout(end, 900); });
  }

  /* ---------- Көрініс ---------- */
  const wave = () => el('span', { class: 'pl-wave', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('i'));
  function slideFor(step) {
    const q = state.quiz;
    if (step.kind === 'welcome') {
      return el('div', { class: 'pl-slide' }, el('div', { class: 'pl-kicker', text: 'Quiz' }), el('h1', { class: 'pl-title', text: q.title }), el('p', { class: 'pl-sub', text: q.subtitle || '' }),
        state.started ? wave() : el('button', { class: 'pl-start', type: 'button', text: 'Бастау →', onclick: () => { state.started = true; show(); } }),
        state.started ? null : el('p', { class: 'pl-note', text: 'Дыбысты қосып қойыңыз: жүргізуші ережені және сұрақтарды дауыстап оқиды.' }));
    }
    if (step.kind === 'round') return el('div', { class: 'pl-slide' }, el('div', { class: 'pl-kicker', text: (q.rounds.indexOf(step.r) + 1) + '-кезең' }), el('h1', { class: 'pl-title', text: step.r.name }), el('p', { class: 'pl-sub', text: step.r.questions.length + ' сұрақ · әр сұраққа ' + step.r.seconds + ' секунд' }), wave());
    if (step.kind === 'collect') return el('div', { class: 'pl-slide' }, el('div', { class: 'pl-kicker', text: step.r.name }), el('h1', { class: 'pl-title', text: 'Парақтарды жинаймыз' }), el('p', { class: 'pl-sub', text: 'Жауаптарды жазып бітіріңіздер, команда атын жазуды ұмытпаңыз' }),
      el('div', { class: 'pl-ring' }, ringSvg(), el('b', { id: 'sec', text: '…' })));
    if (step.kind === 'answers') return el('div', { class: 'pl-slide' }, el('div', { class: 'pl-kicker', text: step.r.name }), el('h1', { class: 'pl-title sm', text: 'Дұрыс жауаптар' }),
      el('ol', { class: 'pl-answers' }, step.r.questions.map(qq => el('li', {}, el('span', { class: 'qt', text: qq.q }), el('span', { class: 'ans' }, el('i', { text: LETTERS[qq.correct] }), qq.options[qq.correct])))));
    if (step.kind === 'end') return el('div', { class: 'pl-slide' }, el('div', { class: 'pl-kicker', text: q.title }), el('h1', { class: 'pl-title', text: 'Рақмет!' }), el('p', { class: 'pl-sub', text: 'Ойын аяқталды' }),
      el('div', { style: 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap' }, el('button', { class: 'pl-start', type: 'button', text: 'Қайта ойнау', onclick: () => go(0) }), el('a', { class: 'pl-btn', href: '/quiz/', text: 'Каталогқа' })));
    const opts = el('div', { class: 'pl-opts' }, step.q.options.map((o, k) => el('div', { class: 'pl-opt' }, el('i', { text: LETTERS[k] }), el('span', { text: o }))));
    const foot = el('div', { class: 'pl-timer' }, el('div', { class: 'pl-track' }, barEl = el('div', { class: 'pl-fill' })), el('div', { class: 'pl-sec', id: 'sec', text: 'Тыңдаңыз…' }));
    return el('div', { class: 'pl-slide' }, el('div', { class: 'pl-kicker', text: step.r.name + ' · ' + step.n + ' / ' + step.count }), el('h1', { class: 'pl-q', text: step.q.q }), opts, foot);
  }

  function paintDots() {
    dotsEl.replaceChildren(...state.steps.map((_, k) => el('i', { class: k < state.i ? 'done' : k === state.i ? 'now' : '' })));
  }

  /* ---------- Таймер ---------- */
  /* таймер біткенде: «Келесі» жыпылықтайды; «Авто» қосулы болса, өзі өтеді */
  function finished() {
    nextBtn.classList.add('pulse');
    if (state.auto) advance = setTimeout(() => go(state.i + 1), 1200);
  }
  function countdown(seconds) {
    state.total = state.left = seconds;
    const sec = document.getElementById('sec');
    const R = 2 * Math.PI * 52;
    const paint = () => {
      if (sec) sec.textContent = String(Math.max(0, Math.ceil(state.left)));
      const f = Math.max(0, state.left / state.total);
      if (barEl) { barEl.style.transform = `scaleX(${f})`; barEl.classList.toggle('low', state.left <= 5); }
      if (ring) { ring.style.strokeDasharray = R; ring.style.strokeDashoffset = R * (1 - f); ring.classList.toggle('low', state.left <= 5); }
    };
    paint();
    let last = performance.now(), lastWhole = Math.ceil(state.left);
    clearInterval(tick);
    tick = setInterval(() => {
      const now = performance.now(); const dt = (now - last) / 1000; last = now;
      if (state.paused) return;
      state.left -= dt; paint();
      const whole = Math.ceil(state.left);
      if (whole !== lastWhole) { lastWhole = whole; if (whole > 0 && whole <= 5) beep(660, 120); }
      if (state.left <= 0) { clearInterval(tick); tick = null; beep(440, 600); finished(); }
    }, 100);
  }

  /* ---------- Басқару ---------- */
  function show() {
    stopAll();
    const step = state.steps[state.i];
    stageEl.replaceChildren(slideFor(step));
    paintDots();
    nextBtn.classList.toggle('pulse', false);
    if (step.kind === 'welcome' && !state.started) return; // алғашқы басу — дыбыс рұқсаты үшін қажет
    const afterVoice = () => {
      if (state.paused) { advance = setTimeout(afterVoice, 300); return; }
      if (step.kind === 'question') countdown(step.r.seconds);
      else if (step.kind === 'collect') countdown(state.quiz.collectSeconds || 30);
      else if (step.kind !== 'end') finished(); // барлығы «Келесі» / «Артқа» арқылы басқарылады
    };
    speak(step, afterVoice);
  }
  function go(i) { state.i = Math.max(0, Math.min(state.steps.length - 1, i)); state.paused = false; syncPause(); show(); }
  function syncPause() { pauseBtn.setAttribute('aria-pressed', String(state.paused)); pauseBtn.querySelector('.lbl').textContent = state.paused ? 'Жалғастыру' : 'Кідірту'; }
  function togglePause() {
    if (!state.started) return;
    state.paused = !state.paused; syncPause();
    if (state.paused) voiceEl.pause(); else if (voiceEl.src && voiceEl.currentTime > 0 && !voiceEl.ended) voiceEl.play().catch(() => {});
  }
  function toggleMute() { state.muted = !state.muted; voiceEl.muted = state.muted; store.set('qz-muted', state.muted ? '1' : '0'); muteBtn.setAttribute('aria-pressed', String(state.muted)); muteBtn.querySelector('.lbl').textContent = state.muted ? 'Дыбысты қосу' : 'Дыбысты өшіру'; }
  function toggleVoice() { state.voice = state.voice === 'er' ? 'ayel' : 'er'; store.set('qz-voice', state.voice); voiceBtn.querySelector('.lbl').textContent = 'Дауыс: ' + (state.voice === 'er' ? 'ер' : 'әйел'); if (state.started) show(); }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* қолдау жоқ */ } }

  function chrome() {
    const btn = (label, icon, on, extra = {}) => el('button', { class: 'pl-btn', type: 'button', onclick: on, ...extra }, icon, el('span', { class: 'lbl', text: label }));
    pauseBtn = btn('Кідірту', '❚❚', togglePause, { 'aria-pressed': 'false' });
    muteBtn = btn(state.muted ? 'Дыбысты қосу' : 'Дыбысты өшіру', '🔊', toggleMute, { 'aria-pressed': String(state.muted) });
    autoBtn = btn(state.auto ? 'Авто: қосулы' : 'Авто: өшірулі', '⏭', () => { state.auto = !state.auto; store.set('qz-auto', state.auto ? '1' : '0'); autoBtn.setAttribute('aria-pressed', String(state.auto)); autoBtn.querySelector('.lbl').textContent = state.auto ? 'Авто: қосулы' : 'Авто: өшірулі'; }, { 'aria-pressed': String(state.auto) });
    voiceBtn = btn('Дауыс: ' + (state.voice === 'er' ? 'ер' : 'әйел'), '🎙', toggleVoice);
    nextBtn = el('button', { class: 'pl-btn next', type: 'button', onclick: () => go(state.i + 1) }, el('span', { class: 'lbl', text: 'Келесі' }), '→');
    const bar = el('div', { class: 'pl-bar' },
      el('a', { class: 'pl-btn', href: '/quiz/', 'aria-label': 'Каталог' }, '⌂', el('span', { class: 'lbl', text: 'Каталог' })),
      btn('Артқа', '←', () => go(state.i - 1)), btn('Қайта оқу', '↻', () => { if (state.started) show(); }), pauseBtn,
      el('span', { class: 'sp' }), autoBtn, voiceBtn, muteBtn, btn('Толық экран', '⛶', fullscreen), nextBtn);
    stageEl = el('main', { class: 'pl-stage', id: 'stage', 'aria-live': 'polite' });
    dotsEl = el('div', { class: 'pl-dots', 'aria-hidden': 'true' });
    root.replaceChildren(bar, stageEl, dotsEl);
    document.addEventListener('keydown', e => {
      if (e.target.closest?.('input,textarea,select')) return;
      if (e.key === 'ArrowRight') { go(state.i + 1); } else if (e.key === 'ArrowLeft') { go(state.i - 1); }
      else if (e.key === ' ') { e.preventDefault(); togglePause(); } else if (e.key === 'f' || e.key === 'F') fullscreen(); else if (e.key === 'm' || e.key === 'M') toggleMute();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.started && !state.paused) { state.paused = true; syncPause(); voiceEl.pause(); } });
    try { navigator.wakeLock?.request('screen').catch(() => {}); } catch { /* қолдау жоқ */ }
  }

  async function init() {
    try {
      const r = await fetch(`/quiz/data/${gameId}.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      state.quiz = await r.json();
    } catch {
      root.replaceChildren(el('main', { class: 'pl-stage' }, el('div', { class: 'pl-slide' }, el('h1', { class: 'pl-title', text: 'Ойын табылмады' }), el('a', { class: 'pl-start', href: '/quiz/', text: 'Каталогқа' }))));
      return;
    }
    document.title = state.quiz.title + ' — Quiz';
    state.steps = buildSteps(state.quiz);
    chrome();
    show();
  }
  init();
})();
