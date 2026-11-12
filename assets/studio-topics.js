/* Пән бас беттері: студияда жарияланған сабақтарды және өзгертілген тақырыптарды карточкаларға қосады.
   Студиясыз да бет бұрынғыдай жұмыс істейді (сұраныс сәтсіз болса, ештеңе өзгермейді). */
(function(){
'use strict';
const sub = (location.pathname.match(/^\/([\w-]+)\//) || [])[1]; if (!sub) return;
const txt = (el, t) => { if (el && t) el.textContent = t; };
const heading = document.querySelector('h2.sec-title');
const controls = document.createElement('div');
const search = document.createElement('input');
const count = document.createElement('p');
const empty = document.createElement('p');
const filters = document.createElement('div');
let onlyOpen = true;
const buttons = ['Ашық сабақтар', 'Барлық тақырып'].map((text, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.onclick = () => { onlyOpen = index === 0; filter(); };
  return button;
});
function filter() {
  const needle = search.value.trim().toLocaleLowerCase('kk');
  let visible = 0, total = 0, open = 0;
  document.querySelectorAll('ol.topics').forEach(list => {
    let shown = 0;
    for (const row of list.children) {
      const available = !!row.querySelector('a.topic');
      const numbered = !!row.querySelector('.num');
      if (numbered) { total++; if (available) open++; }
      const title = row.querySelector('.t')?.textContent || '';
      const num = row.querySelector('.num')?.textContent || '';
      row.hidden = (onlyOpen && !available) || !((num + ' ' + title).toLocaleLowerCase('kk').includes(needle));
      if (!row.hidden) shown++;
    }
    list.hidden = !shown;
    const label = list.previousElementSibling;
    if (label?.matches('h3.sec-title')) label.hidden = !shown;
    visible += shown;
  });
  buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(onlyOpen === (index === 0))));
  count.textContent = visible + ' тақырып';
  empty.hidden = visible > 0;
  empty.textContent = needle ? 'Іздеу бойынша тақырып табылмады. Басқа сөзді қолданып көр.' : 'Бұл пәнде ашық сабақ әзірге жоқ. Оқу бағдарламасын «Барлық тақырып» бөлімінен қарай аласың.';
  const stats = document.querySelectorAll('.stats .stat b');
  [total, open, total - open].forEach((value, i) => { if (stats[i]) stats[i].textContent = String(value); });
}
if (heading) {
  controls.className = 'catalog-controls';
  filters.className = 'catalog-filters';
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Сабақ сүзгісі');
  filters.append(...buttons);
  search.type = 'search';
  search.className = 'catalog-search';
  search.placeholder = 'Тақырыпты іздеу';
  search.setAttribute('aria-label', search.placeholder);
  search.addEventListener('input', filter);
  count.className = 'catalog-count';
  count.setAttribute('role', 'status');
  empty.className = 'catalog-empty';
  controls.append(filters, search, count);
  heading.after(controls, empty);
  filter();
}
fetch('/api/pub/lessons').then(r => r.json()).then(d => {
  if (!d || !d.ok) return;
  const lessons = d.lessons.filter(l => l.subject === sub), meta = (d.meta || []).filter(m => m.subject === sub);
  const lis = [...document.querySelectorAll('ol.topics > li')], used = new Set();
  lis.forEach(li => {
    const n = +((li.querySelector('.num') || {}).textContent || 0), m = meta.find(x => x.num === n), l = lessons.find(x => x.topic_num === n);
    const link = li.querySelector('a.topic');
    if (l && !link) {
      used.add(l.id);
      const a = document.createElement('a'); a.className = 'topic'; a.href = l.href;
      const top = document.createElement('div'); top.className = 'topic-top';
      const num = document.createElement('span'); num.className = 'num'; num.textContent = String(n);
      const bd = document.createElement('span'); bd.className = 'badge open'; bd.textContent = 'Ашық';
      top.append(num, bd);
      const t = document.createElement('span'); t.className = 't'; t.textContent = (m && m.title) || l.title;
      const s = document.createElement('span'); s.className = 's'; s.textContent = (m && m.descr) || 'Теория, мысалдар және тапсырмалар.';
      const go = document.createElement('span'); go.className = 'go'; go.textContent = 'Сабақты бастау →';
      a.append(top, t, s, go); li.replaceChildren(a);
    } else if (m) { txt(li.querySelector('.t'), m.title); if (m.descr !== null && m.descr !== undefined) { const s = li.querySelector('.s'); if (s && m.descr) s.textContent = m.descr; } }
  });
  const extra = lessons.filter(l => !used.has(l.id));
  const last = document.querySelector('ol.topics:last-of-type'), host = last && last.parentNode;
  if (extra.length && host) {
    const h = document.createElement('h3'); h.className = 'sec-title'; h.style.cssText = 'font-size:1.25rem;margin-top:28px'; h.textContent = 'Қосымша сабақтар';
    const ol = document.createElement('ol'); ol.className = 'topics';
    extra.forEach(l => { const li = document.createElement('li'), a = document.createElement('a'); a.className = 'topic'; a.href = l.href; const top = document.createElement('div'); top.className = 'topic-top'; const bd = document.createElement('span'); bd.className = 'badge open'; bd.textContent = 'Ашық'; top.append(bd); const t = document.createElement('span'); t.className = 't'; t.textContent = l.title; const go = document.createElement('span'); go.className = 'go'; go.textContent = 'Сабақты бастау →'; a.append(top, t, go); li.append(a); ol.append(li); });
    last.after(h, ol);
  }
  if (heading) filter();
}).catch(() => {});
})();
