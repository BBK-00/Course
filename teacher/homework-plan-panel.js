/* «Үй тапсырмасы» қойындысы: әр студентке деңгейіне қарай жеке тапсырмалар тізімі */
const LEVEL_CLASS = { easy: 'hw-easy', mid: 'hw-mid', hard: 'hw-hard' };
const BAND_NOTE = {
  support: 'Тақырыпты әлі нығайту керек: тапсырма көбірек, көбісі жеңіл',
  base: 'Негізгі деңгей: жеңіл және орташа тапсырмалар',
  good: 'Тақырыпты жақсы біледі: орташа және бір қиын тапсырма',
  top: 'Тақырыпты жақсы меңгерген: аз, бірақ қиынырақ тапсырмалар'
};

export async function mountHomeworkPlan(host, { h, api, groupId, topic }) {
  host.replaceChildren(h('p', { class: 'sub', text: 'Жеке тапсырмалар құрастырылуда…' }));
  const j = await api('classes/homework?group=' + encodeURIComponent(groupId) + '&topic=' + encodeURIComponent(topic));
  if (!host.isConnected) return;
  if (!j || !j.ok) {
    host.replaceChildren(h('p', { class: 'analysis-empty', text: j?.error === 'no_course' ? 'Бұл топта Python пәні мен журнал жоқ. Алдымен «Журнал» бөлімінде пәнді қосып, журналды импорттаңыз.' : 'Үй тапсырмасын құрастыру мүмкін болмады.' }));
    return;
  }
  const counts = Object.fromEntries(j.bands.map(b => [b.key, j.students.filter(s => s.band.key === b.key).length]));
  const head = h('div', { class: 'hw-head' }, [
    h('h2', { text: 'Үй тапсырмасы · ' + j.topic + '. ' + j.title }),
    h('p', { class: 'sub', text: 'Тапсырмалар журналдағы баллға және қатысуға қарай әр студентке жеке құрылады: нашар меңгергенге көбірек әрі жеңіл, жақсы меңгергенге аз әрі қиын тапсырма беріледі.' }),
    h('div', { class: 'hw-bands' }, j.bands.map(b => h('span', { class: 'hw-band hw-b-' + b.key, title: BAND_NOTE[b.key] },
      [b.label + ' · ' + counts[b.key] + ' студент', h('small', { text: ' ' + (b.plan.easy + b.plan.mid + b.plan.hard) + ' тапсырма' })])))
  ]);
  const rows = j.students.map(s => h('tr', {}, [
    h('th', { scope: 'row', class: 'l' }, [h('b', { text: s.name }), h('small', { class: 'sub', text: s.level === null ? 'баға жоқ' : 'деңгейі ' + s.level + (s.avg !== null ? ' · орташа ' + s.avg : '') })]),
    h('td', {}, h('span', { class: 'hw-band hw-b-' + s.band.key, text: s.band.label })),
    h('td', { class: 'hw-count', text: String(s.tasks.length) }),
    h('td', { class: 'l' }, [
      ...s.tasks.map(t => h('details', { class: 'hw-task' }, [
        h('summary', {}, [h('span', { class: 'hw-lv ' + LEVEL_CLASS[t.level], text: t.levelLabel }), ' ' + t.title]),
        h('p', { text: t.prompt })])),
      s.review.length ? h('div', { class: 'hw-review' }, [h('span', { class: 'sub', text: 'Алдымен қайталау: ' }),
        ...s.review.flatMap((g, i) => [i ? ', ' : '', g.url ? h('a', { href: g.url, target: '_blank', rel: 'noopener', text: g.n + '. ' + g.title }) : g.n + '. ' + g.title])]) : null
    ])]));
  const toggle = h('button', { type: 'button', class: 'btn sm', text: 'Барлығын ашу', on: { click: () => {
    const all = [...host.querySelectorAll('details.hw-task')], open = all.some(d => !d.open);
    all.forEach(d => { d.open = open; }); toggle.textContent = open ? 'Барлығын жабу' : 'Барлығын ашу';
  } } });
  const print = h('button', { type: 'button', class: 'btn sm', text: 'Басып шығару', on: { click: () => { host.querySelectorAll('details.hw-task').forEach(d => { d.open = true; }); window.print(); } } });
  host.replaceChildren(h('div', { class: 'card hw-card' }, [head, h('div', { class: 'row' }, [toggle, print]),
    h('div', { class: 'tw analysis-scroll' }, h('table', { class: 't hw-table' }, [
      h('thead', {}, h('tr', {}, ['Студент', 'Деңгей', 'Саны', 'Тапсырмалар'].map((text, i) => h('th', { class: i === 0 || i === 3 ? 'l' : '', text })))),
      h('tbody', {}, rows)]))]));
}
