/* Quiz ойнатқышы.
   Ағым: Мұқаба → [Кезең → Ереже → Сұрақтар (оқылады, «Келесі» басқанда таймер) → Парақтарды жинау → Жауаптар (алдымен сұрақ, «Келесі» басқанда жауап)] → Рақмет.
   Барлығы «Келесі» / «Артқа» арқылы басқарылады; «Авто» қосулы болса, таймерлер мен өтулер өздігінен жүреді.
   Сұрақ түрлері: open (қысқа жауап), choice (4 жауап), match (сәйкестендіру), photo, audio, video.
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
  const mmss = s => pad2(Math.floor(Math.max(0, s) / 60)) + ':' + pad2(Math.max(0, Math.floor(s)) % 60);

  const root = document.getElementById('player');
  const state = { quiz: null, steps: [], i: 0, started: false, paused: false, phase: 'reading', left: 0, total: 0,
    muted: store.get('qz-muted') === '1', auto: store.get('qz-auto') === '1', voice: store.get('qz-voice') === 'ayel' ? 'ayel' : 'er' };
  const voiceEl = new Audio();
  let tick = null, advance = null, audioCtx = null;
  const ui = {};

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
  const questionOf = s => roundOf(s).questions[s.qi];
  const audioKey = s => {
    const r = s.ri !== undefined ? roundOf(s) : null;
    return { welcome: 'welcome', end: 'end', round: r && r.id + '-intro', rules: r && r.id + '-rules', collect: r && r.id + '-collect',
      question: r && `${r.id}-q${s.qi + 1}`, answerq: r && `${r.id}-q${s.qi + 1}`, answer: r && `${r.id}-a${s.qi + 1}` }[s.kind];
  };
  const isTimed = s => s.kind === 'question' || s.kind === 'collect';
  const secondsOf = s => s.kind === 'collect' ? (state.quiz.collectSeconds || 30) : (questionOf(s).seconds || roundOf(s).seconds);

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
  const stopMedia = () => { try { ui.media?.pause(); } catch { /* жоқ */ } };
  const stopAll = () => { clearInterval(tick); clearTimeout(advance); tick = advance = null; stopVoice(); stopMedia(); };

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
  const clockIcon = () => svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'aria-hidden': 'true' }, svgEl('circle', { cx: 12, cy: 12, r: 9 }), svgEl('path', { d: 'M12 7v5l3 2' }));
  const timerChip = total => (ui.timerChip = el('span', { class: 'pl-timer idle' }, clockIcon(), ui.timerText = el('span', { text: mmss(total) })));
  const tick2 = () => el('span', { class: 'tick', 'aria-hidden': 'true' });
  function subbar(step, { count = true, right = null } = {}) {
    const r = roundOf(step);
    return el('div', { class: 'pl-subbar' }, el('span', { class: 'pl-chip', text: `${step.ri + 1}-кезең` }), el('span', { class: 'name', text: r.name }),
      step.qi !== undefined && count ? [el('span', { class: 'div' }), el('span', { class: 'count', text: `Сұрақ ${pad2(step.qi + 1)} / ${pad2(r.questions.length)}` }), wave()] : (count ? null : wave()),
      el('span', { class: 'sp' }), right);
  }
  function arches() {
    const stop = (o, c) => svgEl('stop', { offset: o, 'stop-color': c });
    return svgEl('svg', { class: 'pl-deco', viewBox: '0 0 520 640', preserveAspectRatio: 'xMaxYMid slice', 'aria-hidden': 'true' },
      svgEl('defs', {}, svgEl('linearGradient', { id: 'g1', x1: 0, y1: 0, x2: 1, y2: 1 }, stop(0, '#a9c0ff'), stop(1, '#3f6ced')), svgEl('linearGradient', { id: 'g2', x1: 0, y1: 0, x2: 1, y2: 1 }, stop(0, '#d3e0ff'), stop(1, '#6f93f5'))),
      svgEl('path', { d: 'M110 640V270A150 150 0 0 1 410 270V640H300V300A40 40 0 0 0 220 300V640Z', fill: 'url(#g1)' }),
      svgEl('path', { d: 'M250 640V480A110 110 0 0 1 470 480V640H400V500A30 30 0 0 0 320 500V640Z', fill: 'url(#g2)' }),
      svgEl('ellipse', { cx: 250, cy: 430, rx: 230, ry: 72, transform: 'rotate(-12 250 430)', fill: 'none', stroke: 'rgba(255,255,255,.5)', 'stroke-width': 1.5 }),
      svgEl('circle', { cx: 120, cy: 380, r: 12, fill: '#ff9f3d' }));
  }
  const paperArt = () => svgEl('svg', { class: 'paper', viewBox: '0 0 240 200', fill: 'none', stroke: '#dfe8ff', 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'aria-hidden': 'true' },
    svgEl('rect', { x: 30, y: 40, width: 120, height: 140, rx: 6, transform: 'rotate(-8 90 110)', opacity: .5 }),
    svgEl('rect', { x: 52, y: 30, width: 120, height: 140, rx: 6, transform: 'rotate(-3 112 100)', opacity: .75 }),
    svgEl('rect', { x: 74, y: 22, width: 120, height: 140, rx: 6, fill: '#112a66' }),
    ...[0, 1, 2].flatMap(k => [svgEl('rect', { x: 88, y: 44 + k * 32, width: 14, height: 14, rx: 3 }), svgEl('path', { d: `M112 ${51 + k * 32}h64` })]),
    svgEl('path', { d: 'M178 70l30-34 10 9-30 34-14 5z', fill: '#2f5be7' }));

  /* ---------- Сұрақ түрлері ---------- */
  const optionsGrid = (qq, showRight) => el('div', { class: 'pl-opts' }, qq.options.map((o, k) => el('div', { class: 'pl-opt' + (showRight && k === qq.correct ? ' right' : '') }, el('i', { text: LETTERS[k] }), el('span', { text: o }), showRight && k === qq.correct ? tick2() : null)));
  const matchGrid = qq => el('div', { class: 'pl-match' }, qq.left.map((l, k) => el('div', { class: 'pl-mrow' }, el('div', { class: 'pl-mcell l' }, el('b', { text: k + 1 + ' ·' }), l), el('div', { class: 'pl-mdots' }), el('div', { class: 'pl-mcell r' }, el('b', { text: LETTERS[k] + ' ·' }), qq.right[k]))));
  const matchAnswers = qq => el('div', { class: 'pl-match' }, qq.left.map((l, k) => el('div', { class: 'pl-mrow ok' }, el('div', { class: 'pl-mcell l' }, l), el('div', { class: 'arrow', text: '→' }), el('div', { class: 'pl-mcell r' }, qq.right[qq.map[k]], tick2()))));
  const answerCard = qq => el('div', { class: 'pl-answer-card' }, el('span', { text: qq.answer }), tick2());
  const info = text => text ? el('div', { class: 'pl-info', text }) : null;

  function audioPlayer(src) {
    const a = el('audio', { src, preload: 'auto' });
    const bars = Array.from({ length: 56 }, (_, i) => el('i', { style: `height:${18 + Math.abs(Math.sin(i * 1.7) * 60 + Math.cos(i * .6) * 22)}%` }));
    const time = el('span', { class: 'time', text: '00:00 / 00:00' });
    const btn = el('button', { class: 'play', type: 'button', 'aria-label': 'Ойнату', text: '▶' });
    const paint = () => {
      const d = a.duration || 0, p = d ? a.currentTime / d : 0;
      bars.forEach((b, i) => b.classList.toggle('on', i / bars.length < p));
      time.textContent = `${mmss(a.currentTime)} / ${mmss(d)}`;
      btn.textContent = a.paused ? '▶' : '❚❚';
    };
    ['timeupdate', 'loadedmetadata', 'play', 'pause', 'ended'].forEach(ev => a.addEventListener(ev, paint));
    btn.onclick = () => { if (a.paused) { a.muted = state.muted; a.play().catch(() => {}); } else a.pause(); };
    ui.media = a;
    return el('div', { class: 'pl-audio' }, a, btn, el('div', { class: 'wavef' }, bars), time, el('span', { class: 'vol', text: '♪' }));
  }
  function videoPlayer(src) {
    const v = el('video', { src, controls: '', playsinline: '', preload: 'auto' });
    ui.media = v;
    return el('div', { class: 'pl-video' }, v);
  }

  /* сұрақ денесі: mode = ask (таймермен) | review (жауап алдындағы сұрақ) | reveal (жауап) */
  function questionBody(step, mode) {
    const qq = questionOf(step), t = qq.type || 'choice', reveal = mode === 'reveal', media = mode === 'ask';
    const q = el('h1', { class: 'pl-q', text: qq.q });
    if (t === 'open') return reveal
      ? el('div', { class: 'pl-slide' }, el('p', { class: 'pl-hint', text: qq.q }), answerCard(qq), info(qq.note))
      : el('div', { class: 'pl-slide center' }, el('span', { class: 'pl-tag', text: 'Қысқа жауап' }), q);
    if (t === 'choice') return el('div', { class: 'pl-slide' }, q, optionsGrid(qq, reveal), reveal ? info(qq.note) : null);
    if (t === 'match') return reveal
      ? el('div', { class: 'pl-slide' }, el('h1', { class: 'pl-q', text: 'Дұрыс сәйкестіктер' }), matchAnswers(qq))
      : el('div', { class: 'pl-slide' }, q, matchGrid(qq), el('p', { class: 'pl-hint', style: 'text-align:center', text: qq.format || '' }));
    if (t === 'photo') return el('div', { class: 'pl-slide' }, el('div', { class: 'pl-photo' }, el('img', { src: qq.src, alt: qq.alt || '' }),
      el('div', { class: 'txt' }, el('span', { class: reveal ? 'pl-tag ok' : 'pl-tag', text: reveal ? 'Дұрыс жауап' : 'Фото сұрақ' }), reveal ? [answerCard(qq), info(qq.note)] : [el('h1', { class: 'pl-q', style: 'font-size:clamp(24px,min(3.6vw,6vh),48px)', text: qq.q }), el('div', { class: 'rule' }), el('p', { class: 'pl-hint', text: qq.hint || '' })])));
    if (t === 'audio') return reveal
      ? el('div', { class: 'pl-slide' }, q, answerCard(qq), info(qq.note))
      : el('div', { class: 'pl-slide' }, q, media ? audioPlayer(qq.src) : null, el('p', { class: 'pl-hint', style: 'text-align:center', text: qq.hint || '' }));
    if (t === 'video') return reveal
      ? el('div', { class: 'pl-slide' }, q, answerCard(qq), info(qq.note))
      : el('div', { class: 'pl-slide' }, q, media ? videoPlayer(qq.src) : null);
    return el('div', { class: 'pl-slide' }, q);
  }

  /* ---------- Экрандар ---------- */
  function render(step) {
    const q = state.quiz, r = step.ri !== undefined ? roundOf(step) : null;
    ui.timerChip = ui.timerText = ui.hint = ui.wave = ui.media = null;
    const parts = []; let theme = 'light';
    if (step.kind === 'welcome' || step.kind === 'end') {
      theme = 'dark';
      const end = step.kind === 'end', count = q.rounds.reduce((a, x) => a + x.questions.length, 0);
      const secs = q.rounds.reduce((a, x) => a + x.questions.reduce((s, y) => s + (y.seconds || x.seconds), 0) + (q.collectSeconds || 30), 0);
      parts.push(el('div', { class: 'pl-body' }, arches(), el('div', { class: 'pl-dark-slide' },
        el('p', { class: 'pl-kicker', text: end ? 'Рақмет' : q.tagline || 'Командалық ойын' }),
        el('h1', { class: 'pl-title', text: end ? 'Ойын аяқталды' : q.title }),
        end ? null : el('p', { class: 'pl-meta', text: `${q.rounds.length} кезең  •  ${count} сұрақ  •  ≈ ${Math.max(1, Math.round(secs / 60))} минут` }),
        end ? el('div', { class: 'pl-actions' }, el('button', { class: 'pl-cta', type: 'button', text: 'Қайта ойнау', onclick: () => go(0) }), el('a', { class: 'pl-cta ghost', href: '/quiz/', text: 'Каталогқа' }))
          : state.started ? el('div', { class: 'pl-actions' }, wave(), el('span', { class: 'pl-meta', text: 'Жүргізуші сәлемдесуде…' }))
            : el('div', { class: 'pl-actions' }, el('button', { class: 'pl-cta', type: 'button', text: 'Ойынды бастау →', onclick: () => { state.started = true; show(); } })),
        end || state.started ? null : el('p', { class: 'pl-note', text: 'Дыбысты қосып қойыңыз: жүргізуші ережені, сұрақтарды және жауаптарды дауыстап оқиды.' }))));
    } else if (step.kind === 'round') {
      theme = 'dark';
      parts.push(el('div', { class: 'pl-body' }, el('div', { class: 'pl-bignum', 'aria-hidden': 'true', text: pad2(step.ri + 1) }), el('div', { class: 'pl-dark-slide' },
        el('span', { class: 'pl-chip', style: 'justify-self:start;font-size:clamp(16px,2vw,24px);padding:6px 18px', text: `${step.ri + 1}-кезең` }),
        el('h1', { class: 'pl-title', text: r.name }), el('p', { class: 'pl-kicker', text: r.tagline || '' }),
        el('div', { class: 'pl-rounds' }, q.rounds.flatMap((x, k) => [k ? el('hr') : null, el('span', { class: k === step.ri ? 'now' : '' }, el('b', { text: pad2(k + 1) }), x.name)])), wave())));
    } else if (step.kind === 'rules') {
      parts.push(subbar(step, { count: false }));
      parts.push(el('div', { class: 'pl-body' }, el('div', { class: 'pl-slide center' }, el('h1', { class: 'pl-q', text: 'Бұл кезең қалай өтеді?' }),
        el('div', { class: 'pl-stats' }, [[r.questions.length, 'сұрақ'], [r.seconds, 'секунд'], [r.points || 1, 'ұпай']].map(([n, t]) => el('div', {}, el('b', { text: String(n) }), el('span', { text: t })))),
        el('p', { class: 'pl-hint', text: r.rulesNote || 'Жауапты қағазға жазыңыз.' }))));
    } else if (step.kind === 'question') {
      parts.push(subbar(step, { right: timerChip(secondsOf(step)) }));
      parts.push(el('div', { class: 'pl-body' }, questionBody(step, 'ask'), ui.hint = el('p', { class: 'pl-ready' })));
    } else if (step.kind === 'collect') {
      theme = 'dark withbar';
      parts.push(subbar({ ...step, qi: undefined }, { count: false, right: timerChip(secondsOf(step)) }));
      parts.push(el('div', { class: 'pl-body' }, el('div', { class: 'pl-collect' }, el('p', { class: 'pl-kicker', text: `${step.ri + 1}-кезең аяқталды` }), el('h1', { class: 'pl-title', text: 'Жауаптарды тапсырыңыз' }),
        el('p', { class: 'pl-sub', text: 'Команда парақтарын жүргізушіге беріңіз.' }), paperArt(), el('span', { class: 'pl-next-chip', text: 'Келесі: дұрыс жауаптарды талдау' }), ui.hint = el('p', { class: 'pl-kicker', style: 'min-height:1.4em' }))));
    } else if (step.kind === 'answerq') {
      parts.push(subbar(step, { right: el('span', { class: 'pl-tag', text: 'Жауаптарды тексереміз' }) }));
      parts.push(el('div', { class: 'pl-body' }, questionBody(step, 'review'), ui.hint = el('p', { class: 'pl-ready', text: '«Келесі» басқанда дұрыс жауап ашылады' })));
    } else if (step.kind === 'answer') {
      const qq = questionOf(step);
      parts.push(subbar(step, { right: el('span', { class: 'pl-tag ok' }, qq.type === 'match' ? `${qq.left.length} сәйкестік` : 'Дұрыс жауап') }));
      parts.push(el('div', { class: 'pl-body' }, questionBody(step, 'reveal')));
    }
    ui.stage.className = 'pl-stage ' + theme;
    ui.stage.replaceChildren(...parts);
  }
  const setHint = text => { if (ui.hint) ui.hint.textContent = text || ''; };
  function paintClock() {
    if (!ui.timerText) return;
    ui.timerText.textContent = mmss(Math.ceil(state.left));
    ui.timerChip.classList.toggle('idle', state.phase !== 'running');
    ui.timerChip.classList.toggle('low', state.phase === 'running' && state.left <= 5);
  }

  /* ---------- Ағым ---------- */
  function paintMenuState() { ui.menu.querySelectorAll('button.chip').forEach(b => b.classList.toggle('now', Number(b.dataset.i) === state.i)); }
  function show() {
    stopAll();
    const step = state.steps[state.i];
    state.phase = 'reading'; state.paused = false; syncPause();
    render(step);
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
      setHint(ui.media ? '«Келесі» басқанда таймер мен медиа басталады' : '«Келесі» басқанда таймер басталады');
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
    if (ui.media) { try { ui.media.muted = state.muted; ui.media.currentTime = 0; ui.media.play().catch(() => {}); } catch { /* медиа қолжетімсіз */ } }
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
    if (state.paused) { voiceEl.pause(); stopMedia(); } else if (voiceEl.src && voiceEl.currentTime > 0 && !voiceEl.ended && voiceEl.onended) voiceEl.play().catch(() => {});
  }
  function toggleMute() { state.muted = !state.muted; voiceEl.muted = state.muted; if (ui.media) ui.media.muted = state.muted; store.set('qz-muted', state.muted ? '1' : '0'); ui.muteBtn.setAttribute('aria-pressed', String(state.muted)); ui.muteBtn.querySelector('.ic').textContent = state.muted ? '🔇' : '🔊'; }
  function toggleVoice() { state.voice = state.voice === 'er' ? 'ayel' : 'er'; store.set('qz-voice', state.voice); ui.voiceBtn.querySelector('.lbl').textContent = 'Дауыс: ' + (state.voice === 'er' ? 'ер' : 'әйел'); if (state.started) show(); }
  function toggleAuto() { state.auto = !state.auto; store.set('qz-auto', state.auto ? '1' : '0'); ui.autoBtn.setAttribute('aria-pressed', String(state.auto)); ui.autoBtn.querySelector('.lbl').textContent = state.auto ? 'Авто: қосулы' : 'Авто: өшірулі'; }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* қолдау жоқ */ } }

  /* ---------- Кезеңдер мәзірі ---------- */
  function buildMenu() {
    const chip = (text, i) => el('button', { class: 'chip', type: 'button', 'data-i': i, text, onclick: () => { ui.menu.hidden = true; if (!state.started && i > 0) state.started = true; go(i); } });
    const idx = (kind, ri, qi) => state.steps.findIndex(s => s.kind === kind && s.ri === ri && (qi === undefined || s.qi === qi));
    ui.menu.replaceChildren(el('button', { class: 'pl-btn close', type: 'button', text: '✕ Жабу', onclick: () => { ui.menu.hidden = true; } }), el('h2', { text: 'Кезеңдер' }),
      chip('Мұқаба', 0),
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
    ui.muteBtn = btn('', state.muted ? '🔇' : '🔊', toggleMute, { 'aria-pressed': String(state.muted), 'aria-label': 'Дыбыс' });
    ui.voiceBtn = btn('Дауыс: ' + (state.voice === 'er' ? 'ер' : 'әйел'), '🎙', toggleVoice);
    ui.autoBtn = btn(state.auto ? 'Авто: қосулы' : 'Авто: өшірулі', '⏭', toggleAuto, { 'aria-pressed': String(state.auto) });
    const fs = btn('', '⛶', fullscreen, { 'aria-label': 'Толық экран' });
    const replay = btn('Қайта оқу', '↻', () => { if (state.started) show(); });
    ui.nextBtn = el('button', { class: 'pl-btn next', type: 'button', onclick: onNext }, el('span', { class: 'lbl', text: 'Келесі' }), ' →');
    ui.menu = el('div', { class: 'pl-menu', hidden: '' });
    const bar = el('div', { class: 'pl-bar' },
      el('a', { class: 'pl-brand', href: '/quiz/', 'aria-label': 'Каталог' }, 'BB', el('span', { text: '/' }), 'Куиз'),
      btn('Артқа', '←', () => go(state.i - 1)), btn('Кезеңдер', '☰', () => { paintMenuState(); ui.menu.hidden = false; }), ui.pauseBtn, replay,
      el('span', { class: 'sp' }), ui.autoBtn, ui.voiceBtn, ui.muteBtn, fs, ui.nextBtn);
    ui.stage = el('main', { class: 'pl-stage', id: 'stage', 'aria-live': 'polite' });
    root.replaceChildren(bar, ui.stage, ui.menu);
    document.addEventListener('keydown', e => {
      if (e.target.closest?.('input,textarea,select,video,audio')) return;
      if (e.key === 'ArrowRight') onNext(); else if (e.key === 'ArrowLeft') go(state.i - 1);
      else if (e.key === ' ') { e.preventDefault(); togglePause(); } else if (e.key === 'f' || e.key === 'F') fullscreen();
      else if (e.key === 'm' || e.key === 'M') toggleMute(); else if ((e.key === 'r' || e.key === 'R') && state.started) show(); else if (e.key === 'Escape') ui.menu.hidden = true;
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.started && !state.paused) { state.paused = true; syncPause(); voiceEl.pause(); stopMedia(); } });
    try { navigator.wakeLock?.request('screen').catch(() => {}); } catch { /* қолдау жоқ */ }
  }

  async function init() {
    try {
      const r = await fetch(`/quiz/data/${gameId}.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      state.quiz = await r.json();
    } catch {
      root.replaceChildren(el('main', { class: 'pl-stage dark' }, el('div', { class: 'pl-body' }, el('div', { class: 'pl-dark-slide' }, el('h1', { class: 'pl-title', text: 'Ойын табылмады' }), el('a', { class: 'pl-cta', href: '/quiz/', text: 'Каталогқа' })))));
      return;
    }
    document.title = state.quiz.title + ' — Куиз';
    state.steps = buildSteps(state.quiz);
    chrome(); buildMenu(); syncPause();
    show();
  }
  init();
})();
