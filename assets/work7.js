/* 7-тақырып: практикалық жұмыс. Үш код тапсырмасы, бір ортақ таймер (35 минут). Код сайттың өз редакторында жазылады.
   Мерзімнен кейін де жіберуге болады, бірақ балл азаяды. Қойып жіберілген код 0 балл алады.
   CourseWork7.mount(host, { key, sectionId }) */
(function(){
'use strict';
const { el, fmt, Course } = window.L;
const MIN = 35, mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const ERR = { not_started:'Оқытушы жұмысты әлі бастаған жоқ.', closed:'Сабақ жабылған.', already:'Бұл тапсырма жіберіліп қойған.', auth:'Сабаққа қайта кір.', task_not_started:'Алдымен жұмысты бастау керек.' };
const LANGS = [['python', 'Python'], ['cpp', 'C++'], ['javascript', 'JavaScript'], ['java', 'Java'], ['c', 'C']];
const n2 = v => String(v).replace('-', '−');
const factor = late => late <= 1 ? 1 : Math.max(0.4, 1 - 0.03 * (late - 1));

/* ---- Деректері қойылған бастапқы код ---- */
const FIELDS = { 1: [['x0', 'x₀'], ['y0', 'y₀'], ['x1', 'x₁'], ['y1', 'y₁'], ['x', 'x']], 2: [['x0', 'x₀'], ['h', 'h'], ['y', 'y']], 3: [['x0', 'x₀'], ['h', 'h'], ['y', 'y'], ['x', 'x']] };
function template(lang, task, d){
  const f = FIELDS[task], arr = v => Array.isArray(v), list = (v, o, c) => o + v.join(', ') + c, num = f.filter(([k]) => !arr(d[k])), ar = f.filter(([k]) => arr(d[k]));
  const mark = { python:'# Осы жерден бастап өзің жаз', javascript:'// Осы жерден бастап өзің жаз' };
  if (lang === 'python') return ['# Берілген деректер'].concat(f.map(([k]) => k + ' = ' + (arr(d[k]) ? list(d[k], '[', ']') : d[k])), ['', mark.python, '', '']).join('\n');
  if (lang === 'javascript') return ['// Берілген деректер'].concat(f.map(([k]) => 'const ' + k + ' = ' + (arr(d[k]) ? list(d[k], '[', ']') : d[k]) + ';'), ['', mark.javascript, '', '']).join('\n');
  const decl = ind => f.map(([k]) => arr(d[k]) ? ind + 'double ' + k + '[' + d[k].length + '] = ' + list(d[k], '{', '}') + ';' : ind + 'double ' + k + ' = ' + d[k] + ';');
  if (lang === 'java') return ['public class Main {', '    public static void main(String[] args) {', '        // Берілген деректер'].concat(f.map(([k]) => arr(d[k]) ? '        double[] ' + k + ' = ' + list(d[k], '{', '}') + ';' : '        double ' + k + ' = ' + d[k] + ';'), ['', '        // Осы жерден бастап өзің жаз', '        ', '    }', '}']).join('\n');
  if (lang === 'c') return ['#include <stdio.h>', '', 'int main() {', '    // Берілген деректер'].concat(decl('    '), ['', '    // Осы жерден бастап өзің жаз', '    ', '    return 0;', '}']).join('\n');
  return ['#include <iostream>', 'using namespace std;', '', 'int main() {', '    // Берілген деректер'].concat(decl('    '), ['', '    // Осы жерден бастап өзің жаз', '    ', '    return 0;', '}']).join('\n');
}
const INFO = {
  1: { title:'Сызықтық интерполяция', level:'Оңай', pts:15,
    text:'Екі түйін арқылы өтетін түзудің көмегімен x нүктесіндегі мәнді тап. Алдымен түзудің еңісін (бір қадамдағы өсімді) есепте, содан кейін P(x) мәнін тап. Нәтижені екі санмен шығар: k және P(x), әрқайсысы жеке жолға.',
    formula:'k = (y₁ − y₀) / (x₁ − x₀),   P(x) = y₀ + k · (x − x₀)' },
  2: { title:'Шеткі айырымдар кестесі', level:'Орташа', pts:22,
    text:'Бірдей қадамдағы 5 түйіннің y мәндері берілген. Шеткі айырымдарды есепте: 1-ретті Δy (4 сан), 2-ретті Δ²y (3 сан), 3-ретті (2 сан) және 4-ретті (1 сан). Әр ретті жеке жолға, сандарды бос орынмен бөліп шығар. Әр келесі қатарды алдыңғы қатардан цикл арқылы тап: қолмен есептеп, сандарды кодқа жаза салма.',
    formula:'Δyᵢ = yᵢ₊₁ − yᵢ,   Δᵏyᵢ = Δᵏ⁻¹yᵢ₊₁ − Δᵏ⁻¹yᵢ' },
  3: { title:'Квадраттық интерполяция', level:'Орташа', pts:23,
    text:'Үш түйін бойынша x нүктесіндегі мәнді екі тәсілмен тап: түзумен P₁(x) және параболамен P₂(x). Алдымен q, Δy₀ және Δ²y₀ шамаларын есепте. Нәтижені ретімен шығар: q, Δy₀, Δ²y₀, P₁(x), P₂(x), әрқайсысы жеке жолға.',
    formula:'q = (x − x₀)/h,   Δy₀ = y₁ − y₀,   Δ²y₀ = y₂ − 2y₁ + y₀\nP₁(x) = y₀ + q·Δy₀,   P₂(x) = y₀ + q·Δy₀ + q(q − 1)/2 · Δ²y₀' }
};
const givenText = (task, d) => FIELDS[task].map(([k, s]) => s + ' = ' + (Array.isArray(d[k]) ? '[' + d[k].map(n2).join(', ') + ']' : n2(d[k])));

window.CourseWork7 = { mount(host, cfg){
  let D = null, built = '', ui = null;
  const dkey = me => cfg.key + ':' + me.session.id + ':' + me.student.name;
  const fresh = () => ({ lang:{ 1:'python', 2:'python', 3:'python' }, code:{}, stats:{ 1:{ typed:0, assist:0, pasted:0, paste:0, tpl:0 }, 2:{ typed:0, assist:0, pasted:0, paste:0, tpl:0 }, 3:{ typed:0, assist:0, pasted:0, paste:0, tpl:0 } }, away:0 });
  const load = me => { try { const o = JSON.parse(localStorage.getItem(dkey(me))) || {}; const f = fresh(); return { lang:Object.assign(f.lang, o.lang), code:o.code || {}, stats:Object.assign(f.stats, o.stats), away:o.away || 0 }; } catch (e) { return fresh(); } };
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { if (D && D.k) localStorage.setItem(D.k, JSON.stringify({ lang:D.lang, code:D.code, stats:D.stats, away:D.away })); } catch (e) {} }, 250); };
  document.addEventListener('visibilitychange', () => { const me = window.Join.get(); if (document.hidden && D && me && me.session && me.session.work_until && !me.complete){ D.away++; save(); } });

  function build(me){
    host.innerHTML = ''; ui = null; built = '';
    const head = el('div', { class:'task' }); host.append(head);
    if (!me){
      head.append(el('h4', { text:'Жұмысты орындау үшін сабаққа кір' }), el('p', { text:'Оқытушы сабақты бастағанда топты, атыңды таңдап, көрсетілген кодты енгізесің. Қатысымың (40 балл) автоматты түседі.' }));
      head.append(el('div', { class:'stepbar' }, el('button', { type:'button', class:'btn primary', text:'🔑 Сабаққа кіру', onclick:() => window.Join.open() }))); return;
    }
    if (!me.guest && (me.session.topic !== '7' || !me.data)){ head.append(el('h4', { text:'Бұл сабақ 7-тақырыпқа ашылмаған' }), el('p', { text:'Қазір басқа тақырыптың сабағы өтіп жатыр. Оқытушыдан 7-тақырыпты бастауды сұра.' })); built = 'x:' + me.session.id; return; }
    if (me.guest){ head.append(el('h4', { text:me.student.name + ' · қонақ мұғалім' }), el('p', { text:'Сіз мұғалім ретінде кірдіңіз: сабақ материалын көре аласыз. Практикалық тапсырманы студенттер орындайды.' })); built = 'g:' + me.student.name; return; }
    D = load(me); D.k = dkey(me);
    const status = el('p', { role:'status' }), sum = el('div', { role:'status' }), pre = el('div'), main = el('div'); main.hidden = true;
    head.append(el('h4', { text:me.student.name + ' · ' + me.student.group }), el('p', { class:'muted', text:'Нұсқа №' + me.variant + ' · қатысым: ' + me.attendance + ' балл.' }), status, sum);
    /* ережелер және бастау */
    const start = el('button', { type:'button', class:'btn primary big', text:'▶ Жұмысты бастау · ' + MIN + ' минут' }), smsg = el('div', { role:'status' });
    start.addEventListener('click', async () => { start.disabled = true; const j = await window.Join.api('task/start', { task:1 }); if (j.ok) await window.Join.refresh(); else { start.disabled = false; smsg.innerHTML = ''; smsg.append(el('p', { class:'errbox', text:ERR[j.error] || 'Бастау мүмкін болмады. Қайта көр.' })); } });
    pre.append(el('div', { class:'w7-rules' }, [
      el('h4', { text:'Жұмыс ережесі' }),
      el('ul', { class:'goals' }, [
        el('li', { html:'<b>3 тапсырма, 60 балл:</b> оңай (15), орташа (22), орташа (23). Барлығына бірге <b>' + MIN + ' минут</b> беріледі.' }),
        el('li', { text:'Кодты осы беттегі редакторға өзің жазасың. Редактор VS Code сияқты кеңес береді: сөздің басын жаз, ұсыныстан таңда (Tab немесе Enter).' }),
        el('li', { html:'<b>Қою (Ctrl+V) өшірілген.</b> Басқа жерден көшіріп қойған код тапсырмаға автоматты <b>0 балл</b> алады.' }),
        el('li', { text:'Уақыт бітсе де жіберуге болады, бірақ балл азаяды: әр кешіккен минутқа шамамен 3%, ең көбі 60%.' }),
        el('li', { text:'Бағдарлама серверде нақты орындалады: нәтижесі дұрыс болса, балл беріледі. Кодтың логикасын жасанды интеллект тексереді.' })
      ])]), el('div', { class:'stepbar' }, start), smsg);
    const cards = {};
    function card(n){
      const info = INFO[n], d = me.data['t' + n], st = D.stats[n], tm = el('span', { class:'work-timer', style:'margin:0 0 0 auto', hidden:true });
      const c = el('div', { class:'task w7-task' });
      c.append(el('div', { style:'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [el('span', { class:'w7-lvl w7-l' + n, text:info.level }), el('h4', { text:n + '-тапсырма · ' + info.title, style:'margin:0' }), el('span', { class:'muted', text:info.pts + ' балл' })]));
      c.append(el('p', { text:info.text, style:'margin-top:10px' }));
      c.append(el('div', { class:'w7-given' }, [el('div', { class:'w7-gh', text:'Берілгені (№' + me.variant + ' нұсқа)' }), el('div', { class:'chips' }, givenText(n, d).map(t => el('span', { class:'chip', text:t })))]));
      c.append(el('div', { class:'f box w7-f', html:info.formula.split('\n').map(x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>') }));
      const sel = el('select', { class:'cf-input', 'aria-label':'Бағдарламалау тілі', style:'width:auto' }, LANGS.map(([v, t]) => el('option', { value:v, text:t, selected:D.lang[n] === v })));
      const toast = el('div', { class:'w7-toast', role:'alert', hidden:true });
      const edHost = el('div');
      const ed = window.CodeEditor.create(edHost, { lang:D.lang[n], stats:st, onChange:v => { D.code[n] = v; save(); }, onBlocked:(k) => { toast.hidden = false; toast.textContent = '⚠ Қою өшірілген. Кодты өзің жаз. Қою әрекеті сақталды (' + st.pasted + ' таңба): 40 таңбадан асса, тапсырмаға 0 балл қойылады.'; save(); } });
      const saved = D.code[n];
      ed.setLang(D.lang[n]); if (saved !== undefined && saved !== null) ed.setValue(saved); else ed.setValue(template(D.lang[n], n, d), true);
      if (saved !== undefined && saved !== null && !st.tpl) st.tpl = template(D.lang[n], n, d).length;
      sel.addEventListener('change', () => {
        const changedByStudent = ed.getValue().trim() !== template(D.lang[n], n, d).trim();
        if (changedByStudent && !confirm('Тілді ауыстырсаң, жазған кодың өшеді. Жалғастырасың ба?')){ sel.value = D.lang[n]; return; }
        D.lang[n] = sel.value; st.typed = 0; st.assist = 0; ed.setLang(sel.value, template(sel.value, n, d)); save();
      });
      const out = el('div', { role:'status' }), run = el('button', { type:'button', class:'btn', text:'▶ Іске қосу' });
      run.addEventListener('click', async () => {
        const code = ed.getValue();
        if (!code.trim()){ out.innerHTML = ''; out.append(el('p', { class:'notice', text:'Алдымен код жаз.' })); return; }
        run.disabled = true; out.innerHTML = '<p><span class="spinner"></span>Бағдарлама орындалып жатыр…</p>';
        const j = await window.Join.api('run', { language:D.lang[n], code }); run.disabled = false; out.innerHTML = '';
        if (!j.ok){ out.append(el('p', { class:'errbox', text:j.error === 'wait' ? 'Тым жиі іске қостың. Бір минут күт.' : 'Іске қосу мүмкін болмады. Қайта көр.' })); return; }
        const r = j.run; out.append(el('p', { class:r.ok ? 'success' : 'errbox', style:'margin:8px 0 4px', text:r.ok ? '✓ Орындалды' : '✕ ' + (r.status || 'Қате') }), el('pre', { class:'pyout', text:(r.stdout || '(нәтиже шықпады)') + (r.stderr ? '\n' + r.stderr : '') }));
      });
      const msg = el('div', { role:'status' }), late = el('p', { class:'notice', hidden:true }), send = el('button', { type:'button', class:'btn primary', text:'📤 Жіберу' }), res = el('div', { role:'status' });
      let armed = false;
      send.addEventListener('click', async () => {
        if (!ed.getValue().trim() && !armed){ armed = true; send.textContent = '📤 Иә, бос жіберу'; msg.innerHTML = '<p class="notice">Код бос. Сонда да жібересің бе? Тағы бір рет бас.</p>'; return; }
        send.disabled = true; msg.innerHTML = '<p><span class="spinner"></span>Код орындалып, ЖИ тексеріп жатыр. Бұл 10–40 секундқа созылуы мүмкін, бетті жаппа.</p>';
        const j = await window.Join.api('submit', { task:n, payload:{ code:ed.getValue(), lang:D.lang[n] }, signals:{ typed:st.typed, assist:st.assist, pasted:st.pasted, paste:st.paste, tpl:st.tpl, away:D.away } });
        if (j.ok){ msg.innerHTML = ''; await window.Join.refresh(); return; }
        send.disabled = false; armed = false; send.textContent = '📤 Жіберу'; msg.innerHTML = ''; msg.append(el('p', { class:'errbox', text:ERR[j.error] || 'Жіберу мүмкін болмады. Интернетті тексеріп, қайта бас.' }));
        if (j.error === 'already') window.Join.refresh();
      });
      c.append(el('div', { class:'row2', style:'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0 6px' }, [el('label', { text:'Тіл:' }), sel, run]), toast, edHost, out, late, el('div', { class:'stepbar' }, send), msg, res);
      cards[n] = { c, ed, sel, run, send, late, res, toast };
      return c;
    }
    [1, 2, 3].forEach(n => main.append(card(n)));
    head.after(pre, main);
    const clock = el('div', { class:'w7-clock', role:'timer', hidden:true });
    main.prepend(clock);
    ui = { status, sum, pre, main, cards, clock, start }; built = D.k;
  }

  function update(me){
    if (!ui || !me || me.guest) return;
    const s = me.session, nowS = window.Join.serverNow() / 1000, t1 = me.tasks[1], begun = !!t1.started_at, open = s.status === 'open' && !!s.work_until;
    ui.status.innerHTML = '';
    if (s.status !== 'open') ui.status.append(el('p', { class:'notice', text:'Сабақ жабылған.' }));
    else if (!s.work_until) ui.status.append(el('p', { class:'notice', text:'Оқытушы жұмысты бастағанда тапсырмалар ашылады. Бетті жаппа.' }));
    ui.start.disabled = !open; ui.pre.hidden = begun; ui.main.hidden = !begun;
    const left = begun ? Math.floor(t1.started_at + MIN * 60 - nowS) : 0, lateMin = left < 0 ? -left / 60 : 0, allSent = [1, 2, 3].every(n => me.tasks[n].sent);
    ui.clock.hidden = !begun || allSent;
    if (begun && !allSent){
      ui.clock.className = 'w7-clock' + (left <= 0 ? ' over' : left <= 300 ? ' warn' : '');
      ui.clock.textContent = left > 0 ? '⏱ Қалған уақыт: ' + mmss(left) : '⏱ Уақыт бітті. Жіберуге болады, бірақ балл ' + Math.round((1 - factor(lateMin)) * 100) + '% азайды' + (factor(lateMin) > 0.4 ? ' және әр минутта азая түседі.' : ' (ең көбі).');
    }
    [1, 2, 3].forEach(n => {
      const t = me.tasks[n], c = ui.cards[n];
      c.ed.setDisabled(t.sent || !open); c.sel.disabled = t.sent; c.run.disabled = t.sent || !open; c.send.disabled = t.sent || !open;
      c.late.hidden = t.sent || lateMin <= 1;
      if (!c.late.hidden) c.late.textContent = '⏱ Кешіккенің: ' + Math.floor(lateMin) + ' минут. Осы тапсырманың баллы ×' + fmt(factor(lateMin), 2) + ' болады.';
      c.res.innerHTML = '';
      if (t.sent){
        const kids = [el('div', { text:'Жіберілді' }), el('div', { class:'big', text:(t.pts === null ? '✓' : t.pts) + ' / ' + t.max })];
        if (t.zero) kids.push(el('p', { class:'errbox', text:'Код сырттан көшіріліп қойылған деп танылды: бұл тапсырмаға 0 балл.' }));
        else if (t.late > 1) kids.push(el('p', { class:'muted', text:'Мерзімнен ' + t.late + ' минут кеш жіберілді: балл ×' + fmt(t.lf, 2) + '.' }));
        if (t.pending) kids.push(el('p', { class:'muted', text:'ЖИ бағалауы әлі аяқталған жоқ, балл кейін нақтыланады.' }));
        c.res.append(el('div', { class:'score-box' }, kids));
      }
    });
    ui.sum.innerHTML = '';
    if ([1, 2, 3].some(n => me.tasks[n].sent)) ui.sum.append(el('div', { class:'score-box' }, [el('div', { text:me.complete ? 'Жұмыс аяқталды. Жалпы балл (қатысым 40 + тапсырмалар):' : 'Алдын ала жалпы балл (барлық тапсырма жіберілгенде нақтыланады):' }), el('div', { class:'big', text:me.total + ' / 100' })]));
  }

  window.Join.on(me => { const k = me ? (me.guest ? 'g:' + me.student.name : dkey(me)) : ''; if (k !== built) build(me); update(me); });
  setInterval(() => update(window.Join.get()), 1000);
  build(window.Join.get());
  Course.register(cfg.sectionId || 'work', { reset(){ build(window.Join.get()); update(window.Join.get()); } });
} };
})();
