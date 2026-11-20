/* Quiz ойнатқышы.
   Ағым: Бастау → [Кезең → Ереже → Сұрақтар (оқылады, «Келесі» басқанда таймер) → Парақтарды жинау (30 с) → Жауаптар (әр сұрақ бойынша)] → Рақмет.
   Барлығы «Келесі» / «Артқа» арқылы басқарылады; «Авто» қосулы болса, таймерлер мен өтулер өздігінен жүреді.
   Дауыс файлдарын scripts/quiz-voice.mjs жасайды (кілттер соның segments() функциясымен бірдей). */
(() => {
  const LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];
  const params = new URLSearchParams(location.search);
  const gameId = (params.get('g') || 'klassika').replace(/[^a-z0-9-]/gi, '');
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* жеке режим */ } } };
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }
    n.append(...kids.flat().filter(x => x !== null && x !== undefined && x !== false));
    return n;
  };
  const svgEl = (tag, attrs = {}, ...kids) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); n.append(...kids); return n; };
  const pad2 = n => String(n).padStart(2, '0');
  const mmss = s => pad2(Math.floor(Math.max(0, s) / 60)) + ':' + pad2(Math.max(0, s) % 60);

  const root = document.getElementById('player');
  const state = { quiz: null, steps: [], i: 0, started: false, paused: false, phase: 'reading', left: 0, total: 0,
    muted: store.get('qz-muted') === '1', auto: store.get('qz-auto') === '1', voice: store.get('qz-voice') === 'ayel' ? 'ayel' : 'er' };
  const voiceEl = new Audio();
  let tick = null, advance = null, audioCtx = null;
  const ui = {}; // stage, nextBtn, pauseBtn, muteBtn, voiceBtn, autoBtn, menu + ағымдағы экранның элементтері

  /* ---------- Қадамдар ---------- */
  function buildSteps(quiz) {
    const steps = [{ kind: 'welcome' }];
    quiz.rounds.forEach((r, ri) => {
      steps.push({ kind: 'round', ri }, { kind: 'rules', ri });
      r.questions.forEach((_, qi) => steps.push({ kind: 'question', ri, qi }));
      steps.push({ kind: 'collect', ri });
      // жауаптар: алдымен сұрақ шығады, «Келесі» басқанда жауабы ашылады
      r.questions.forEach((_, qi) => steps.push({ kind: 'answerq', ri, qi }, { kind: 'answer', ri, qi }));
    });
    steps.push({ kind: 'end' });
    return steps;
  }
  const roundOf = s => state.quiz.rounds[s.ri];
  const audioKey = s => {
    const r = s.ri !== undefined ? roundOf(s) : null;
    return { welcome: 'welcome', end: 'end', round: r && r.id + '-intro', rules: r && r.id + '-rules', collect: r && r.id + '-collect',
      question: r && `${r.id}-q${s.qi + 1}`, answerq: r && `${r.id}-q${s.qi + 1}`, answer: r && `${r.id}-a${s.qi + 1}` }[s.kind];
  };
  const isTimed = s => s.kind === 'question' || s.kind === 'collect';
  const secondsOf = s => s.kind === 'collect' ? (state.quiz.collectSeconds || 30) : roundOf(s).seconds;

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
  const stopVoice = () => { voiceEl.pause(); voiceEl.onended = voiceEl.onerror = null; if (ui.wave) ui.wave.style.visibility = 'hidden'; };
  const stopAll = () => { clearInterval(tick); clearTimeout(advance); tick = advance = null; stopVoice(); };

  function speak(step, done) {
    stopVoice();
    voiceEl.muted = state.muted;
    voiceEl.src = `/quiz/audio/${gameId}/${state.voice}/${audioKey(step)}.mp3`;
    let finished = false;
    const end = () => { if (finished) return; finished = true; if (ui.wave) ui.wave.style.visibility = 'hidden'; done(); };
    voiceEl.onended = end;
    voiceEl.onerror = () => { advance = setTimeout(end, 900); }; // файл жоқ: үнсіз жалғастыру
    if (ui.wave) ui.wave.style.visibility = 'visible';
    voiceEl.play().catch(() => { advance = setTimeout(end, 900); });
  }

  /* ---------- Кішкентай бөлшектер ---------- */
  const wave = () => (ui.wave = el('span', { class: 'pl-wave', 'aria-hidden': 'true', style: 'visibility:hidden' }, el('i'), el('i'), el('i'), el('i')));
  const pills = (count, now, labelFn = n => String(n)) => el('div', { class: 'pl-pills' }, Array.from({ length: count }, (_, k) => el('span', { class: k === now ? 'now' : k < now ? 'done' : '', text: labelFn(k + 1) })));
  const deco = () => {
    const c = (cx, cy, r, stroke, sw, extra = {}) => svgEl('circle', { cx, cy, r, fill: 'none', stroke, 'stroke-width': sw, ...extra });
    const svg = svgEl('svg', { class: 'pl-deco right', viewBox: '0 0 500 600', preserveAspectRatio: 'xMaxYMid meet', 'aria-hidden': 'true' },
      c(330, 200, 130, '#ff5a1f', 95), c(450, 470, 105, '#f2ecda', 70));
    [120, 160, 200, 240, 280].forEach(r => svg.append(c(215, 600, r, '#e9f26a', 2, { opacity: .85 })));
    return svg;
  };
  function smallClock(total) {
    const C = 2 * Math.PI * 44;
    ui.clockBox = el('div', { class: 'pl-clock' }, svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' }, svgEl('circle', { class: 'trk', cx: 50, cy: 50, r: 44 }), ui.arc = svgEl('circle', { class: 'arc', cx: 50, cy: 50, r: 44 })), ui.clockText = el('b', { text: mmss(total) }));
    ui.arc.style.strokeDasharray = C; ui.arc.style.strokeDashoffset = 0; ui.arcLen = C;
    return ui.clockBox;
  }
  function tickRing(total) {
    const R = 50, C = 2 * Math.PI * R;
    const mask = svgEl('mask', { id: 'tm' }, ui.maskArc = svgEl('circle', { cx: 60, cy: 60, r: R, fill: 'none', stroke: '#fff', 'stroke-width': 24, transform: 'rotate(-90 60 60)' }));
    ui.maskArc.style.strokeDasharray = C; ui.maskArc.style.strokeDashoffset = 0; ui.maskLen = C;
    const svg = svgEl('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' }, svgEl('defs', {}, mask),
      svgEl('circle', { class: 'tk dim', cx: 60, cy: 60, r: R }), svgEl('circle', { class: 'tk lit', cx: 60, cy: 60, r: R, mask: 'url(#tm)' }));
    return el('div', { class: 'pl-tick' }, svg, el('div', { class: 'center' }, ui.tickNum = el('b', { text: String(total) }), el('span', { text: 'секунд' })));
  }
  function paintClock() {
    const f = state.total ? Math.max(0, state.left / state.total) : 1;
    if (ui.clockText) { ui.clockText.textContent = mmss(Math.ceil(state.left)); ui.clockBox.classList.toggle('low', state.left <= 5 && state.phase === 'running'); }
    if (ui.arc) ui.arc.style.strokeDashoffset = ui.arcLen * (1 - f);
    if (ui.tickNum) { ui.tickNum.textContent = String(Math.max(0, Math.ceil(state.left))); ui.maskArc.style.strokeDashoffset = ui.maskLen * (1 - f); }
  }
  const setHint = text => { if (ui.hint) ui.hint.textContent = text || ''; };

  /* ---------- Экрандар ---------- */
  function slideFor(step) {
    const q = state.quiz, r = step.ri !== undefined ? roundOf(step) : null, total = q.rounds.length;
    const roundTag = () => `${step.ri + 1}-кезең`;
    ui.hint = ui.clockBox = ui.clockText = ui.arc = ui.tickNum = ui.wave = null;
    const extras = [];
    let slide;
    if (step.kind === 'welcome' || step.kind === 'end') {
      const end = step.kind === 'end', count = q.rounds.reduce((a, x) => a + x.questions.length, 0);
      const minutes = Math.round(q.rounds.reduce((a, x) => a + x.questions.length * x.seconds + (q.collectSeconds || 30), 0) / 60);
      extras.push(deco());
      slide = el('div', { class: 'pl-slide' },
        el('div', { class: 'pl-label', text: end ? 'Рақмет' : q.tagline || 'Командалық ойын' }),
        el('h1', { class: 'pl-title', text: end ? 'Ойын аяқталды' : q.title }),
        end ? null : el('p', { class: 'pl-meta', text: `${total} кезең · ${count} сұрақ · ≈ ${minutes} минут` }),
        end ? el('div', { class: 'pl-actions' }, el('button', { class: 'pl-cta', type: 'button', text: 'Қайта ойнау', onclick: () => go(0) }), el('a', { class: 'pl-cta ghost', href: '/quiz/', text: 'Каталогқа' }))
          : state.started ? el('div', { class: 'pl-actions' }, wave(), el('span', { class: 'pl-meta', text: 'Жүргізуші сәлемдесуде…' }))
            : el('div', { class: 'pl-actions' }, el('button', { class: 'pl-cta', type: 'button', text: 'Ойынды бастау →', onclick: () => { state.started = true; show(); } })),
        end || state.started ? null : el('p', { class: 'pl-note', text: 'Дыбысты қосып қойыңыз: жүргізуші ережені, сұрақтарды және жауаптарды дауыстап оқиды.' }));
    } else if (step.kind === 'round') {
      extras.push(el('div', { class: 'pl-bignum', 'aria-hidden': 'true', text: pad2(step.ri + 1) }));
      slide = el('div', { class: 'pl-slide' }, el('span', { class: 'pl-tag', text: roundTag() }), el('h1', { class: 'pl-title', text: r.name }),
        el('p', { class: 'pl-sub', text: r.tagline || '' }), el('div', { class: 'pl-actions' }, pills(total, step.ri, pad2), wave()));
    } else if (step.kind === 'rules') {
      slide = el('div', { class: 'pl-slide' }, el('span', { class: 'pl-tag', text: `${roundTag()} / ${r.name}` }), el('h1', { class: 'pl-title md', style: 'text-transform:none', text: 'Қалай ойнаймыз?' }),
        el('div', { class: 'pl-stats' }, [[r.questions.length, 'сұрақ'], [r.seconds, 'секунд', true], [r.points || 1, 'ұпай']].map(([n, t, hot]) => el('div', {}, el('b', { class: hot ? 'hot' : '', text: String(n) }), el('span', { text: t })))),
        el('p', { class: 'pl-arrow', text: 'Жауаптарды параққа жазыңыз.' }), wave());
    } else if (step.kind === 'question') {
      const qq = r.questions[step.qi], n = step.qi + 1, count = r.questions.length;
      slide = el('div', { class: 'pl-slide' },
        el('div', { class: 'pl-qcard' },
          el('div', { class: 'pl-qhead' }, el('span', { text: `${roundTag()} · ${r.name}` }), el('span', { class: 'count' }, wave(), ` ${pad2(n)} / ${pad2(count)}`)),
          el('h1', { class: 'pl-title q', text: qq.q }),
          qq.type === 'open' ? null : el('div', { class: 'pl-opts' }, qq.options.map((o, k) => el('div', { class: 'pl-opt' }, el('i', { text: LETTERS[k] }), el('span', { text: o }))))),
        el('div', { class: 'pl-qfoot' }, el('span', { class: 'lbl', text: `${n}-сұрақ` }), el('div', { class: 'mid' }, smallClock(r.seconds)), el('div', { class: 'pills' }, pills(count, step.qi))),
        ui.hint = el('p', { class: 'pl-hint' }));
    } else if (step.kind === 'answerq') {
      const qq = r.questions[step.qi], n = step.qi + 1, count = r.questions.length;
      slide = el('div', { class: 'pl-slide' },
        el('div', { class: 'pl-qcard' },
          el('div', { class: 'pl-qhead' }, el('span', { text: 'Жауаптарды тексереміз' }), el('span', { class: 'count' }, wave(), ` ${pad2(n)} / ${pad2(count)}`)),
          el('h1', { class: 'pl-title q', text: qq.q }),
          qq.type === 'open' ? null : el('div', { class: 'pl-opts' }, qq.options.map((o, k) => el('div', { class: 'pl-opt' }, el('i', { text: LETTERS[k] }), el('span', { text: o }))))),
        el('div', { class: 'pl-qfoot' }, el('span', { class: 'lbl', text: `${n}-сұрақ` }), el('span'), el('div', { class: 'pills' }, pills(count, step.qi))),
        ui.hint = el('p', { class: 'pl-hint', text: '«Келесі» басқанда дұрыс жауап ашылады' }));
    } else if (step.kind === 'collect') {
      slide = el('div', { class: 'pl-slide pl-collect' }, tickRing(secondsOf(step)),
        el('div', { style: 'display:grid;gap:clamp(10px,2vh,22px);justify-items:start' }, el('span', { class: 'pl-tag', text: `${roundTag()} аяқталды` }),
          el('h1', { class: 'pl-title md', text: 'Жауаптарды жинаймыз' }), el('p', { class: 'pl-sub', text: 'Парақтарыңызды жүргізушіге тапсырыңыз.' }), ui.hint = el('p', { class: 'pl-hint', style: 'text-align:left' }), wave()));
    } else if (step.kind === 'answer') {
      const qq = r.questions[step.qi], n = step.qi + 1, count = r.questions.length;
      const right = qq.type === 'open'
        ? el('p', { class: 'pl-bigans' }, qq.answer, el('span', { class: 'pl-check' }))
        : el('p', { class: 'pl-bigans' }, el('span', { class: 'let', text: LETTERS[qq.correct] }), qq.options[qq.correct], el('span', { class: 'pl-check' }));
      slide = el('div', { class: 'pl-slide' },
        el('div', { class: 'pl-qcard' },
          el('div', { class: 'pl-qhead' }, el('span', { text: 'Дұрыс жауап' }), el('span', { class: 'count' }, wave(), ` ${pad2(n)} / ${pad2(count)}`)),
          el('p', { class: 'pl-ansnote', style: 'font-weight:700', text: qq.q }), right, qq.note ? el('p', { class: 'pl-ansnote', text: qq.note }) : null),
        el('div', { class: 'pl-qfoot' }, el('span', { class: 'lbl', text: `${roundTag()} · ${r.name}` }), el('span'), el('div', { class: 'pills' }, pills(count, step.qi))));
    }
    return [slide, ...extras];
  }

  /* ---------- Ағым ---------- */
  function paintMenuState() {
    ui.menu.querySelectorAll('button.chip').forEach(b => b.classList.toggle('now', Number(b.dataset.i) === state.i));
  }
  function show() {
    stopAll();
    const step = state.steps[state.i];
    state.phase = 'reading'; state.paused = false; syncPause();
    root.classList.toggle('cream', step.kind === 'rules');
    ui.stage.replaceChildren(...slideFor(step));
    ui.nextBtn.classList.remove('pulse');
    paintMenuState();
    if (step.kind === 'welcome' && !state.started) return; // алғашқы басу — браузер дыбысқа рұқсат беруі үшін қажет
    speak(step, afterVoice);
  }

  /* дауыс біткен (немесе өткізілген) соң */
  function afterVoice() {
    const step = state.steps[state.i];
    if (state.paused) { advance = setTimeout(afterVoice, 300); return; }
    if (isTimed(step)) {
      state.phase = 'ready'; state.total = state.left = secondsOf(step); paintClock();
      setHint('«Келесі» басқанда таймер басталады');
      if (state.auto) beginTimer(); else ui.nextBtn.classList.add('pulse');
    } else {
      state.phase = 'done';
      if (step.kind !== 'end') { ui.nextBtn.classList.add('pulse'); if (state.auto) advance = setTimeout(() => go(state.i + 1), 1500); }
    }
  }

  function beginTimer() {
    const step = state.steps[state.i];
    clearTimeout(advance); clearInterval(tick);
    state.phase = 'running'; state.total = state.left = secondsOf(step); setHint('');
    ui.nextBtn.classList.remove('pulse'); paintClock();
    let last = performance.now(), lastWhole = Math.ceil(state.left);
    tick = setInterval(() => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      if (state.paused) return;
      state.left -= dt; paintClock();
      const whole = Math.ceil(state.left);
      if (whole !== lastWhole) { lastWhole = whole; if (whole > 0 && whole <= 5) beep(660, 120); }
      if (state.left <= 0) {
        clearInterval(tick); tick = null; state.left = 0; state.phase = 'done'; paintClock(); beep(440, 700);
        ui.nextBtn.classList.add('pulse');
        if (state.auto) advance = setTimeout(() => go(state.i + 1), 1500);
      }
    }, 100);
  }

  /* «Келесі»: оқып жатса — дауысты өткізіп жібереді; дайын болса — таймерді бастайды; таймер жүріп жатса не біткен соң — келесі қадамға өтеді */
  function onNext() {
    const step = state.steps[state.i];
    if (step.kind === 'welcome' && !state.started) { state.started = true; show(); return; }
    if (state.phase === 'reading') {
      stopVoice(); clearTimeout(advance);
      if (isTimed(step)) afterVoice(); else if (step.kind !== 'end') go(state.i + 1);
    } else if (state.phase === 'ready') beginTimer();
    else go(state.i + 1);
  }
  function go(i) { state.i = Math.max(0, Math.min(state.steps.length - 1, i)); show(); }

  function syncPause() { ui.pauseBtn.setAttribute('aria-pressed', String(state.paused)); ui.pauseBtn.querySelector('.lbl').textContent = state.paused ? 'Жалғастыру' : 'Кідірту'; }
  function togglePause() {
    if (!state.started) return;
    state.paused = !state.paused; syncPause();
    if (state.paused) voiceEl.pause(); else if (voiceEl.src && voiceEl.currentTime > 0 && !voiceEl.ended && voiceEl.onended) voiceEl.play().catch(() => {});
  }
  function toggleMute() { state.muted = !state.muted; voiceEl.muted = state.muted; store.set('qz-muted', state.muted ? '1' : '0'); ui.muteBtn.setAttribute('aria-pressed', String(state.muted)); ui.muteBtn.querySelector('.ic').textContent = state.muted ? '🔇' : '🔊'; }
  function toggleVoice() { state.voice = state.voice === 'er' ? 'ayel' : 'er'; store.set('qz-voice', state.voice); ui.voiceBtn.querySelector('.lbl').textContent = 'Дауыс: ' + (state.voice === 'er' ? 'ер' : 'әйел'); if (state.started) show(); }
  function toggleAuto() { state.auto = !state.auto; store.set('qz-auto', state.auto ? '1' : '0'); ui.autoBtn.setAttribute('aria-pressed', String(state.auto)); ui.autoBtn.querySelector('.lbl').textContent = state.auto ? 'Авто: қосулы' : 'Авто: өшірулі'; }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* қолдау жоқ */ } }

  /* ---------- Кезеңдер мәзірі ---------- */
  function buildMenu() {
    const chip = (text, i) => el('button', { class: 'chip', type: 'button', 'data-i': i, text, onclick: () => { ui.menu.hidden = true; if (!state.started && i > 0) state.started = true; go(i); } });
    const idx = (kind, ri, qi) => state.steps.findIndex(s => s.kind === kind && s.ri === ri && (qi === undefined || s.qi === qi));
    ui.menu.replaceChildren(el('button', { class: 'pl-btn close', type: 'button', text: '✕ Жабу', onclick: () => { ui.menu.hidden = true; } }), el('h2', { text: 'Кезеңдер' }),
      chip('Басы', 0),
      ...state.quiz.rounds.map((r, ri) => el('div', { class: 'grp' }, el('b', { text: `${ri + 1}-кезең · ${r.name}` }), el('div', { class: 'row' },
        chip('Кезең', idx('round', ri)), chip('Ереже', idx('rules', ri)),
        ...r.questions.map((_, qi) => chip(`${qi + 1}-сұрақ`, idx('question', ri, qi))),
        chip('Жинау', idx('collect', ri)),
        ...r.questions.map((_, qi) => chip(`${qi + 1}-жауап`, idx('answerq', ri, qi)))))),
      chip('Соңы', state.steps.length - 1));
  }

  function chrome() {
    const btn = (label, icon, on, extra = {}) => el('button', { class: 'pl-btn', type: 'button', onclick: on, ...extra }, el('span', { class: 'ic', text: icon }), el('span', { class: 'lbl', text: label }));
    ui.pauseBtn = btn('Кідірту', '❚❚', togglePause, { 'aria-pressed': 'false' });
    ui.muteBtn = btn('', state.muted ? '🔇' : '🔊', toggleMute, { 'aria-pressed': String(state.muted), 'aria-label': 'Дыбыс' }); ui.muteBtn.classList.add('icon');
    ui.voiceBtn = btn('Дауыс: ' + (state.voice === 'er' ? 'ер' : 'әйел'), '🎙', toggleVoice);
    ui.autoBtn = btn(state.auto ? 'Авто: қосулы' : 'Авто: өшірулі', '⏭', toggleAuto, { 'aria-pressed': String(state.auto) });
    const fs = btn('', '⛶', fullscreen, { 'aria-label': 'Толық экран' }); fs.classList.add('icon');
    const replay = btn('Қайта оқу', '↻', () => { if (state.started) show(); });
    ui.nextBtn = el('button', { class: 'pl-btn next', type: 'button', onclick: onNext }, el('span', { class: 'lbl', text: 'Келесі' }), ' →');
    ui.menu = el('div', { class: 'pl-menu', hidden: '' });
    const bar = el('div', { class: 'pl-bar' },
      el('a', { class: 'pl-brand', href: '/quiz/', 'aria-label': 'Каталог' }, el('i', { text: 'BB' }), 'КУИЗ'),
      btn('Артқа', '←', () => go(state.i - 1)), btn('Кезеңдер', '☰', () => { paintMenuState(); ui.menu.hidden = false; }), ui.pauseBtn, replay,
      el('span', { class: 'sp' }), ui.autoBtn, ui.voiceBtn, ui.muteBtn, fs, ui.nextBtn);
    ui.stage = el('main', { class: 'pl-stage', id: 'stage', 'aria-live': 'polite' });
    root.replaceChildren(bar, ui.stage, el('div', { class: 'pl-foot' }, el('a', { href: '/', text: 'Оқу кеңістігі' })), ui.menu);
    document.addEventListener('keydown', e => {
      if (e.target.closest?.('input,textarea,select')) return;
      if (e.key === 'ArrowRight') onNext(); else if (e.key === 'ArrowLeft') go(state.i - 1);
      else if (e.key === ' ') { e.preventDefault(); togglePause(); } else if (e.key === 'f' || e.key === 'F') fullscreen();
      else if (e.key === 'm' || e.key === 'M') toggleMute(); else if ((e.key === 'r' || e.key === 'R') && state.started) show(); else if (e.key === 'Escape') ui.menu.hidden = true;
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
      root.replaceChildren(el('main', { class: 'pl-stage' }, el('div', { class: 'pl-slide' }, el('h1', { class: 'pl-title', text: 'Ойын табылмады' }), el('a', { class: 'pl-cta', href: '/quiz/', text: 'Каталогқа' }))));
      return;
    }
    document.title = state.quiz.title + ' — Quiz';
    state.steps = buildSteps(state.quiz);
    chrome(); buildMenu(); syncPause();
    show();
  }
  init();
})();
