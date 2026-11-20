import { accountMessages as messages, createLearnerAuth, learnerAccount as api } from './learner-auth.js?v=1';

const courses = {
  python: { name: 'Python', mark: '‹/›' },
  scratch: { name: 'Scratch', mark: '▤' },
  'sandyq-adister': { name: 'Сандық әдістер', mark: '∑' },
  akt: { name: 'АКТ', mark: '▦' }
};

const courseId = document.body.dataset.learnerCourse;
const currentCourse = courses[courseId];
const byId = id => document.getElementById(id);
const make = (tag, attrs = {}, ...children) => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  element.append(...children);
  return element;
};

const nav = document.querySelector('[data-learner-nav]');
const top = document.querySelector('[data-learner-top]');
const overlay = make('button', { type:'button', class:'learner-shade', hidden:'', tabindex:'-1', 'aria-label':'Мәзірді жабу' });
const isHome = document.body.dataset.learnerPage === 'home';
const isTools = document.body.dataset.learnerPage === 'tools';
const isQuiz = document.body.dataset.learnerPage === 'quiz';
const isJournal = document.body.dataset.learnerPage === 'journal';
const catalog = '/#subjects';
const saved = '/#my-courses';
const navLink = (name, href, mark, active = false, kind) => {
  const attrs = { class:'learner-nav-link', href };
  if (active) attrs['aria-current'] = 'page';
  if (kind && isHome) attrs['data-course-view'] = kind;
  return make('a', attrs, make('span', {class:'lr-nav-icon','aria-hidden':'true'}, mark), name);
};

nav.id = 'learner-nav';
const homeLink = navLink('Шолу', '/', '⌂', isHome);
const allLink = navLink('Курстар', catalog, '▦', false, 'all');
const savedLink = navLink('Менің курстарым', saved, '◇', false, 'saved');
nav.append(
  make('a', { class:'learner-brand', href:'/' }, make('b', {class:'learner-brand-icon'}, 'ББ'), make('span', {}, 'Оқу кеңістігі')),
  make('nav', {class:'learner-nav-group','aria-label':'Оқу кеңістігі'}, homeLink, allLink, savedLink, navLink('AI көмекші', '/tools/ustazai/', '✦'), navLink('Quiz', '/quiz/', '?', isQuiz)),
  make('nav', {class:'learner-nav-group learner-subject-nav','aria-label':'Пәндер'}, make('span', {class:'learner-nav-caption'}, 'Пәндер'),
    ...Object.entries(courses).map(([id,c]) => navLink(c.name, `/${id}/`, c.mark, id===courseId))),
  make('div', {class:'learner-nav-foot'}, navLink('Оқытушы панелі', '/teacher/', '↗'))
);
nav.after(overlay);
const menu = make('button', { type:'button', class:'lr-icon-button learner-menu', 'aria-controls':'learner-nav', 'aria-expanded':'false', 'aria-label':'Мәзірді ашу' }, '☰');
const breadcrumb = make('div',{class:'learner-breadcrumb'},
  ...(currentCourse ? [make('a', {href:catalog}, 'Курстар'), make('span', {'aria-hidden':'true'}, '/'), make('strong', {}, currentCourse.name)]
    : [make('span', {}, isTools ? 'Көмекші құралдар' : isQuiz ? 'Quiz' : isJournal ? 'Менің журналым' : 'Оқу дашборды')]));
const actions = make('div', {class:'learner-top-actions'});
top.append(menu, breadcrumb, actions);

function showNav(open) {
  document.body.classList.toggle('learner-menu-open',open);
  overlay.hidden = !open;
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?'Мәзірді жабу':'Мәзірді ашу');
}
menu.onclick = () => {
  const open=menu.getAttribute('aria-expanded')==='false';
  showNav(open);
  if(open)nav.querySelector('a').focus();
};
overlay.onclick = () => { showNav(false); menu.focus(); };
nav.addEventListener('click', e => { if (e.target.closest('a')) showNav(false); });
document.addEventListener('keydown', e => {
  if (menu.getAttribute('aria-expanded') !== 'true') return;
  if (e.key === 'Escape') { showNav(false); menu.focus(); return; }
  if (e.key !== 'Tab') return;
  const links=nav.querySelectorAll('a');
  const first=links[0],last=links[links.length-1];
  if (e.shiftKey && document.activeElement===first) { e.preventDefault(); last.focus(); }
  if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
});
matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) showNav(false); });

let account = null;
let enrolled = new Set();
let accountReady = false;
let accountRevision = 0;
let view = location.hash === '#my-courses' ? 'saved' : 'all';
let snackbarTimer;
const pendingSaves = new Set();
const cards = [...document.querySelectorAll('.course-tile[data-course]')];
const snackbar = make('div',{class:'learner-snackbar',role:'status',hidden:''});
document.body.append(snackbar);
function announce(text) {
  snackbar.textContent = text;
  snackbar.hidden = false;
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => { snackbar.hidden = true; }, 4500);
}

function authButton(label, operation, primary = false) {
  const button = make('button',{type:'button',class:primary?'lr-btn lr-primary':'lr-btn lr-secondary'},label);
  button.onclick = () => openAuth(operation);
  return button;
}

function updateAccount(result) {
  if (!result.ok) return;
  accountRevision++;
  account = result.account;
  enrolled = new Set(result.courses);
  accountReady = true;
  paintAccount();
  document.dispatchEvent(new CustomEvent('learner-account', { detail: { account } }));
}

const auth = createLearnerAuth({
  async onSuccess(result, mode, course) {
    updateAccount(result);
    actions.querySelector('summary')?.focus();
    announce(mode === 'register' ? 'Жеке кабинет ашылды.' : 'Жеке кабинет ашық.');
    if (course && !enrolled.has(course)) await toggleSaved(course, true);
  }
});

function openAuth(mode, course = '') {
  auth.open(mode, {
    context: course,
    intro: course ? `${courses[course].name} курсын жеке тізіміңізге сақтаңыз.` : 'Курстарыңызға кез келген құрылғыдан оралыңыз.'
  });
}

async function toggleSaved(id, force) {
  if (!courses[id] || pendingSaves.size) return;
  if (!accountReady) {
    const status = await api();
    if (!status.ok) { announce(messages.network); return; }
    updateAccount(status);
  }
  if (!account) { openAuth('register',id); return; }
  const shouldSave = force ?? !enrolled.has(id);
  pendingSaves.add(id);
  paintSaveButtons();
  const result = await api('/course',{course:id,saved:shouldSave});
  pendingSaves.delete(id);
  if (result.error === 'auth') { updateAccount({ok:true,account:null,courses:[]}); openAuth('login',id); return; }
  if (!result.ok) { paintSaveButtons(); announce(messages[result.error] || 'Курс тізімі жаңартылмады.'); return; }
  updateAccount(result);
  announce(shouldSave ? `${courses[id].name} сақталды.` : `${courses[id].name} тізімнен алынды.`);
}

function paintSaveButtons() {
  for (const button of document.querySelectorAll('[data-save-course]')) {
    const id = button.dataset.saveCourse;
    const exists = enrolled.has(id);
    button.disabled = pendingSaves.size > 0;
    button.setAttribute('aria-pressed',String(exists));
    button.setAttribute('aria-label',`${courses[id].name} · ${exists ? 'Тізімнен алу' : 'Курсты сақтау'}`);
    button.title = exists ? 'Тізімнен алу' : 'Курсты сақтау';
    if (button.matches('.lr-save')) button.textContent = exists ? '✓' : '+';
    else button.textContent = exists ? '✓ Сақталды' : '+ Менің курстарыма қосу';
  }
}

function paintAccount() {
  const journalLink = nav.querySelector('[data-journal-link]');
  if (account?.student && !journalLink) {
    const link = navLink('Менің журналым', '/journal/', '▤', isJournal);
    link.dataset.journalLink = '';
    nav.querySelector('.learner-nav-group').append(link);
  } else if (!account?.student) journalLink?.remove();
  if (account) {
    const initials = account.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('kk');
    const panel = make('details',{class:'learner-profile'});
    const logout = make('button',{type:'button',class:'lr-btn lr-secondary'},'Шығу');
    logout.onclick = async () => {
      logout.disabled = true;
      const result = await api('/logout',{});
      logout.disabled = false;
      if (result.ok) { updateAccount(result); announce('Жеке кабинеттен шықтыңыз.'); }
      else announce(messages[result.error] || 'Шығу мүмкін болмады.');
    };
    panel.append(make('summary',{},make('span',{class:'lr-avatar','aria-hidden':'true'},initials),make('span',{class:'lr-profile-name'},account.name)),
      make('div',{class:'learner-profile-panel'},make('b',{},account.name),make('small',{},account.email),...(account.student ? [make('a',{href:'/journal/',class:'lr-text-link'},'Менің журналым')] : []),make('a',{href:saved,class:'lr-text-link'},'Менің курстарым'),logout));
    actions.replaceChildren(panel);
  } else actions.replaceChildren(authButton('Кіру','login'),authButton('Тіркелу','register',true));
  const study = byId('learnerStudy');
  if (study) {
    if (account) study.replaceChildren(make('p',{class:'learner-study-count'},make('b',{},String(enrolled.size)), ' сақталған курс'),make('a',{href:saved,class:'lr-text-link','data-course-view':'saved'},'Менің курстарымды ашу →'));
    else study.replaceChildren(make('p',{},'Жеке кабинет ашып, ұнаған курстарды бір жерге жинаңыз.'),authButton('Тіркелу','register',true));
  }
  paintSaveButtons();
  paintCourses();
}

function paintCourses() {
  if (!cards.length) return;
  const search = byId('courseSearch').value.trim().toLocaleLowerCase('kk');
  let shown = 0;
  for (const card of cards) {
    const haystack = `${card.dataset.search} ${card.querySelector('h3').textContent} ${card.querySelector('p').textContent}`.toLocaleLowerCase('kk');
    card.hidden = (view==='saved' && !enrolled.has(card.dataset.course)) || !haystack.includes(search);
    if (!card.hidden) shown++;
  }
  byId('courseCount').textContent = `${shown} курс`;
  byId('subjects-title').textContent = view==='saved' ? 'Менің курстарым' : 'Курстар';
  for (const button of document.querySelectorAll('button[data-course-view]')) button.setAttribute('aria-pressed',String(button.dataset.courseView===view));
  for (const link of [homeLink,allLink,savedLink]) link.removeAttribute('aria-current');
  (view==='saved' ? savedLink : location.hash==='#subjects' ? allLink : homeLink).setAttribute('aria-current','page');
  const empty = byId('courseEmpty');
  empty.hidden = shown > 0;
  if (shown) return;
  if (!accountReady && view==='saved') { empty.textContent='Жеке курс тізімі жүктелуде…'; return; }
  if (view==='saved' && !account) {
    empty.replaceChildren(make('h3',{},'Менің курстарым'),make('p',{},'Сақталған курстарды көру үшін жеке кабинетке кіріңіз.'),authButton('Кіру','login'),authButton('Тіркелу','register',true));
  } else {
    empty.replaceChildren(make('h3',{},search ? 'Курс табылмады' : 'Әзірге сақталған курс жоқ'),
      make('p',{},search ? 'Басқа атау жазып көріңіз.' : 'Каталогтан ұнаған курсты жеке тізіміңізге қосыңыз.'),
      make('a',{href:catalog,class:'lr-btn lr-secondary','data-course-view':'all'},'Барлық курстар'));
  }
}

document.addEventListener('click', event => {
  const save = event.target.closest('[data-save-course]');
  if (save) { toggleSaved(save.dataset.saveCourse); return; }
  const control = event.target.closest('[data-course-view]');
  if (!control || !isHome || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  view = control.dataset.courseView;
  byId('courseSearch').value = '';
  const hash = view==='saved' ? '#my-courses' : '#subjects';
  if (location.hash !== hash) history.pushState(null,'',hash);
  paintCourses();
  if (control.tagName==='A') byId('subjects').scrollIntoView({block:'start'});
});
addEventListener('hashchange', () => { view=location.hash==='#my-courses'?'saved':'all'; paintCourses(); });
byId('courseSearch')?.addEventListener('input',paintCourses);
document.querySelector('[data-live-shortcut]')?.addEventListener('click',()=>byId('homeJoin')?.click());

const recentKey='bbk-last-topic';
function renderRecent() {
  const recentHost=byId('learnerRecent');
  if(!recentHost) return;
  try {
    const recent=JSON.parse(localStorage.getItem(recentKey));
    const link=new URL(recent.href,location.origin);
    if (link.origin!==location.origin || !courses[recent.course] || !link.pathname.startsWith(`/${recent.course}/`) && !link.pathname.startsWith(`/c/${recent.course}/`)) return;
    recentHost.replaceChildren(make('small',{},'Осы құрылғыда соңғы ашылған сабақ'),make('a',{href:link.pathname+link.search+link.hash,class:'lr-text-link'},recent.title,' →'));
    recentHost.hidden=false;
  } catch { /* No saved lesson yet. */ }
}
if (currentCourse) document.addEventListener('click', event => {
  const link=event.target.closest('a.topic');
  if (!link) return;
  const title=link.querySelector('.t')?.textContent.trim();
  if (!title) return;
  try { localStorage.setItem(recentKey,JSON.stringify({course:courseId,title,href:link.href})); } catch { /* Storage may be disabled. */ }
});

async function refreshAccount() {
  const revision=accountRevision;
  const result=await api();
  if (accountRevision!==revision) return;
  if(result.ok) updateAccount(result);
  else {
    accountReady=true;
    if (view==='saved') announce(messages.network);
    paintCourses();
  }
}
paintAccount();
renderRecent();
refreshAccount();
addEventListener('pageshow',e=>{if(e.persisted){refreshAccount();renderRecent();}});
