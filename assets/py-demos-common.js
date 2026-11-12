/* Python сабақтарына ортақ интерактивті бөліктер (9, 10-сабақ): қысқа анимация (hero), «қатені тап», жол нөмірлі код көрінісі.
   Стильдер: py-lesson4.css (p4-, p4s-) және py-lesson9.css (p9-). Қозғалыс тек студент әрекетіне жауап (Алға/Артқа). */
(function(){
'use strict';
const { el, esc } = window.L;
const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* hero: scenes = [{ t:'Тақырып', h:() => '<html>' }]; A(i, cls, html) — кезекпен шығатын элемент */
const A = (i, c, h) => '<div class="p4a ' + c + '" style="--i:' + i + '">' + h + '</div>';
function hero(host, scenes){
  let k = 0;
  const stage = el('div', { class:'p4s-stage' }), ttl = el('b', { class:'p4s-ttl' }), cnt = el('span', { class:'p4s-cnt' }), dots = el('div', { class:'p4s-dots', 'aria-hidden':'true' });
  const bP = el('button', { type:'button', class:'p4s-btn', text:'←', 'aria-label':'Артқа' }), bN = el('button', { type:'button', class:'p4s-btn', text:'Алға →' });
  scenes.forEach(() => dots.append(el('i')));
  function paint(){
    const S = scenes[k]; stage.innerHTML = '<div class="p4s' + (still ? ' still' : '') + '">' + S.h() + '</div>';
    ttl.textContent = S.t; cnt.textContent = (k + 1) + ' / ' + scenes.length;
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === k));
    bP.disabled = k === 0; bN.textContent = k === scenes.length - 1 ? '↺ Басынан' : 'Алға →';
  }
  bP.addEventListener('click', () => { if (k > 0) { k--; paint(); } });
  bN.addEventListener('click', () => { k = k === scenes.length - 1 ? 0 : k + 1; paint(); });
  host.append(el('div', { class:'p4s-top' }, [ttl, cnt]), stage, el('div', { class:'p4s-bar' }, [bP, dots, bN]));
  paint();
}

/* қатені тап: bugs = [{ name, code:[...], bug:[жол индекстері], fix:[...], bad, good, inp?, hint, why }] */
function bugFinder(host, BUGS, doneText){
  let cur = 0; const done = new Set(), wrong = BUGS.map(() => 0);
  const tabs = el('div', { class:'pl-tabs2', role:'tablist' }), body = el('div'), score = el('span', { class:'p4-score' });
  function draw(){
    const B = BUGS[cur], solved = done.has(cur);
    tabs.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === cur); b.classList.toggle('ok', done.has(i)); b.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
    score.textContent = 'Табылды: ' + done.size + ' / ' + BUGS.length;
    const code = el('div', { class:'p4-bcode', role:'group', 'aria-label':'Код. Қате жолды бас.' });
    (solved ? B.fix : B.code).forEach((l, i) => {
      const fx = solved && B.fix[i] !== B.code[i];
      const row = el(solved ? 'div' : 'button', { class:'p4-bl' + (fx ? ' fixed' : ''), 'aria-label':'Жол ' + (i + 1) + ': ' + l }, [el('i', { text:String(i + 1) }), el('code', { text:l })]);
      if (!solved) { row.type = 'button'; row.addEventListener('click', () => pick(i, row)); }
      code.append(row);
    });
    const res = solved ? B.good : B.bad, isErr = !solved && /Error/.test(B.bad);
    const term = el('div', { class:'p4-bterm' + (solved ? ' good' : ' bad') }, [el('small', { text:'ТЕРМИНАЛ' + (B.inp ? ' · енгізу: ' + B.inp : '') }), el('pre', { text:'> ' + res }), solved ? null : el('small', { class:'p4-want', text:'Күтілген нәтиже: ' + B.want }), el('span', { class:'p4-tag', text:solved ? '✓ Дұрыс нәтиже' : isErr ? '✗ Қате: бағдарлама іске қосылмады' : '✗ Нәтиже қате' })]);
    const msg = el('p', { class:'p4-msg', role:'status' });
    if (solved) { msg.className += ' ok'; msg.innerHTML = '<b>Дұрыс!</b> ' + esc(B.why); }
    else if (wrong[cur] >= 2) { msg.className += ' hint'; msg.textContent = 'Кеңес: ' + B.hint; }
    else msg.textContent = 'Міндетті оқып, шыққан нәтижені күтілгенмен салыстыр. Қате жолды бас.';
    body.innerHTML = ''; body.append(el('p', { class:'p4-goal', html:'<b>Міндет:</b> ' + esc(B.goal) }), el('div', { class:'p4-bgrid' }, [code, term]), msg);
    if (solved && done.size < BUGS.length) body.append(el('button', { type:'button', class:'btn primary', text:'Келесі қате →', onclick:() => { cur = BUGS.findIndex((_, i) => i > cur && !done.has(i)); if (cur < 0) cur = BUGS.findIndex((_, i) => !done.has(i)); draw(); } }));
    if (done.size === BUGS.length && solved) body.append(el('p', { class:'p4-all', text:doneText || '🎉 Барлық қатені таптың.' }));
  }
  function pick(i, row){
    const B = BUGS[cur];
    if (B.bug.includes(i)) { done.add(cur); draw(); return; }
    wrong[cur]++; row.classList.add('miss'); setTimeout(() => row.classList.remove('miss'), 700);
    const m = body.querySelector('.p4-msg'); m.textContent = wrong[cur] >= 2 ? 'Кеңес: ' + B.hint : 'Бұл жол дұрыс. Терминалдағы нәтижеге қайта қара.'; m.className = 'p4-msg' + (wrong[cur] >= 2 ? ' hint' : ' no');
  }
  BUGS.forEach((b, i) => tabs.append(el('button', { type:'button', role:'tab', text:(i + 1) + '. ' + b.name, onclick:() => { cur = i; draw(); } })));
  host.append(el('div', { class:'p4-bhead' }, [tabs, score]), body); draw();
}

/* жол нөмірлі код: lines = [{ t:'жол', ind:0 }] немесе жол массиві; state: белсенді/өткізілген жолдар сыныбы */
function codeView(lines, cls){
  const box = el('div', { class:'p9-code ' + (cls || '') });
  lines.forEach((l, i) => box.append(el('div', { class:'p9-ln', 'data-i':String(i) }, [el('i', { text:String(i + 1) }), el('code', { text:(typeof l === 'string' ? l : l.t) })])));
  return box;
}

/* «Компилятор» бөлімі: сайттың ішіндегі еркін редактор + консоль және сыртқы онлайн компиляторға сілтемелер */
function compiler(host, starter){
  const links = el('div', { class:'p9-links' }, [el('span', { text:'Қосымша онлайн компиляторлар:' }),
    el('a', { class:'btn sm', href:'https://www.onlinegdb.com/online_python_compiler', target:'_blank', rel:'noopener', text:'OnlineGDB ↗' }),
    el('a', { class:'btn sm', href:'https://www.programiz.com/python-programming/online-compiler/', target:'_blank', rel:'noopener', text:'Programiz ↗' }),
    el('a', { class:'btn sm', href:'https://replit.com/languages/python3', target:'_blank', rel:'noopener', text:'Replit ↗' })]);
  const box = el('div', { class:'p9-play' });
  host.append(el('p', { class:'p4-note', text:'Кодты еркін жазып, браузерде орындап көр. Енгізу қажет болса, әр мәнді консольге жеке жолмен жаз.' }), box, links);
  if (window.PyPractice) window.PyPractice.playground(box, starter);
  else if (window.PyWork && window.PyWork.playground) window.PyWork.playground(box, starter);
  else box.append(el('p', { class:'p4-msg no', text:'Компилятор жүктелмеді. Онлайн компиляторды қолдан.' }));
}

window.PyCommon = { hero, bugFinder, codeView, compiler, A };
})();
