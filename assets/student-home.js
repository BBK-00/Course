(function(){
'use strict';
const button = document.getElementById('homeJoin');
const title = document.getElementById('liveName');
const hint = document.getElementById('liveHint');
const link = document.getElementById('liveLink');
let lesson = null;
let failed = false;
let loading = null;
const isCurrent = me => !!lesson?.href && me?.session?.id === lesson.session_id;

function paint(){
  const active = lesson?.href;
  const joined = isCurrent(Join.get());
  button.firstChild.textContent = joined ? 'Сабақты жалғастыру ' : 'Сабаққа кодпен кіру ';
  const name = active ? lesson.title : failed ? 'Байланыс үзілді' : 'Сабақ әзірге ашық емес';
  if (title.textContent !== name) title.textContent = name;
  hint.textContent = failed ? 'Сабақ күйі қайта тексеріледі.' : active ? 'Оқытушы көрсеткен кодпен кір.' : 'Осы аралықта пәндердегі материалды қарай аласың.';
  link.hidden = !active;
  if (active) link.href = lesson.href;
  title.closest('.student-live').classList.toggle('live', !!active);
}
function refresh(){
  if (loading) return loading;
  loading = Join.api('public/lesson').then(data => {
    failed = !data.ok;
    if (data.ok) {
      lesson = data.lesson;
      Join.setLesson(lesson);
    }
    paint();
  }).finally(() => { loading = null; });
  return loading;
}
Join.on(() => { if (lesson || failed) paint(); });
button.addEventListener('click', async () => {
  await refresh();
  if (!isCurrent(Join.get())) await Join.refresh();
  if (isCurrent(Join.get())) location.assign(lesson.href);
  else Join.open(async me => {
    await refresh();
    if (isCurrent(me)) location.assign(lesson.href);
  });
});
Join.mount({checkStatus:false});
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 6000);
})();
