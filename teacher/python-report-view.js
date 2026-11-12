import { buildReport } from './python-report-model.js';

const num = v => v === null || v === undefined ? '—' : v.toLocaleString('kk-KZ');
const isoShort = d => d.slice(8,10)+'.'+d.slice(5,7);
const signed = n => n === null ? '—' : (n > 0 ? '+' : '') + num(n);

export function drawPythonReport(host, h, students, history, {date, source, privateNames=false, onAnalyze, threshold}={}) {
  const r=buildReport(students,history,date,threshold);
  const {baseline:b,profiles:p}=r;
  const name = (s,i) => privateNames ? s.name : 'Студент '+String(i+1).padStart(2,'0');
  const metric=(label,value,note)=>h('div',{class:'pr-metric'},[h('span',{text:label}),h('strong',{text:value}),h('small',{text:note})]);
  const section=(title,children)=>h('section',{class:'pr-card'},[h('h2',{text:title}),...children]);
  const note=text=>h('p',{class:'pr-note',text});
  const bar=(label,value,max,annotation,tone='')=>h('div',{class:'pr-bar-row'},[
    h('span',{text:label}),h('div',{class:'pr-track','aria-hidden':'true'},h('i',{class:tone,style:`width:${Math.min(100,100*(value||0)/Math.max(1,max))}%`})),h('b',{text:annotation})]);
  const noData = note('Бұл дереккөзден бағаланған жұмыс табылмады. Бос мәндер есепке алынған жоқ.');
  const risk=p.filter(s=>s.status.includes('қолдау')||s.weak||s.status.includes('Төмендеу'));
  const twoLow=b.profiles.filter(x=>x.reason==='low').length;
  const rankedTasks = r.tasks.filter(t => t.pct !== null).sort((a,b) => a.pct - b.pct);
  const weakest = rankedTasks[0];
  const chart = h('div',{class:'pr-forecast-bars'},r.forecastGroups.map(group =>
    bar(group.label,group.count,b.total,String(group.count),group.tone)));
  const rosterLinks = profiles => h('div',{class:'pr-forecast-people'},profiles.map(s=>h('button',{
    class:'pr-person-link',type:'button',on:{click:()=>{
      const detail=host.querySelector('[data-profile="'+s.number+'"]');
      if(detail){detail.open=true;detail.querySelector('summary').focus();detail.scrollIntoView({block:'center'});}
    }}},[name(s,s.number-1),h('b',{text:s.outlook.needed?'+'+s.outlook.needed+' күн':num(s.past.forecast)})])));
  const forecastPanel = h('section',{class:'pr-forecast', 'aria-label':'Келесі жұмыс болжамы'},[
    h('div',{class:'pr-forecast-main'},[
      h('h2',{text:'Келесі жұмыс болжамы'}),
      h('div',{class:'pr-forecast-number'},[h('strong',{text:num(b.forecast)}),b.forecast===null?null:h('span',{text:'/ 100'})]),
      note(b.forecastCount?b.forecastCount+' / '+b.total+' студенттің жеке болжамының орташа балы':'Жеке болжам үшін кемінде үш бағаланған күн керек.'),
      h('div',{class:'pr-forecast-evidence'},[
        metric('Соңғы екі күндегі өзгеріс',signed(r.recentChange),r.comparable?r.comparable+' студенттің алдыңғы екі күнімен салыстырылды':'Төрт бағаланған күн керек'),
        metric('Соңғы екі бағасы межеден төмен',String(twoLow),'студент')])]),
    h('div',{class:'pr-forecast-side'},[
      h('h2',{text:'Болжам бойынша топтың бөлінуі'}),chart,
      r.priority.length?h('div',{class:'pr-forecast-follow'},[h('h3',{text:r.threshold+' балдық межеден төмен'}),rosterLinks(r.priority)]):null,
      r.missingHistory.length?h('div',{class:'pr-forecast-follow'},[h('h3',{text:'Қосымша бағалау қажет'}),rosterLinks(r.missingHistory)]):null])]);
  const nodes=[h('div',{class:'pr-hero'},[h('span',{text:'PYTHON / 12-САБАҚ'}),h('h1',{text:'Топтың үлгерімі және келесі қадам'}),note(source||'Таңдалған сабақ және журнал тарихы'),note('Салыстыру күні '+isoShort(date)+'. Қолдау межесі '+r.threshold+' балл.')]),
    h('div',{class:'pr-metrics'},[
      metric('Журналдағы орташа',num(b.average),b.assessed+' / '+p.length+' студент'),
      metric('Сайттағы сабақ',num(r.siteAverage),r.finals+' қорытынды · '+r.interims+' аралық'),
      metric('Болжамы межеден төмен',String(r.priority.length),b.forecastCount+' студенттің болжамынан'),
      metric('Жеке назар',String(risk.length),'қосымша қолдау не бақылау')])];
  nodes.push(forecastPanel);
  if(weakest) nodes.push(section('Келесі сабақта неден бастау керек',[note('Ең төмен орташа нәтиже «'+weakest.title+'» тапсырмасында: '+num(weakest.pct)+'% ('+weakest.answered+'/'+p.length+' студенттің тексерілген жауабы).'),h('p',{class:'pr-action',text:weakest.n==='3'?'Алдымен цикл ішіндегі шартты қолмен қадамдап тексеріңіз. Содан кейін студенттерге жаңа аралық беріп, шартқа сай мәндерді санатыңыз.':'Алдымен «'+weakest.title+'» бойынша бір мысалды бірге талдаңыз. Содан кейін басқа мәндермен ұқсас қысқа жұмыс беріңіз.'})]));
  if(!r.finals&&!r.interims) nodes.push(note('Сайттағы осы сабақтың бағалары есепке қосылмаған. Журналдағы бағалар сайт нәтижесінің орнына қойылмайды.'));
  nodes.push(h('div',{class:'pr-grid'},[
    section('Журнал бағаларының гистограммасы',[note('Әр студенттің сабаққа дейінгі жеке орташа балы. Баған ұзындығы — студент саны.'),...(b.assessed?r.histogram.map(x=>bar(x.label,x.count,p.length,String(x.count),'blue')):[noData])]),
    section('Сабақ бойынша төрт тапсырма',[note('Орташа пайыз тек жіберілген және тексерілген жұмыстардан. Қамту саны әр жолда көрсетілген.'),...r.tasks.map(t=>bar(t.n+'. '+t.title,t.pct,100,t.answered?num(t.pct)+'% · '+t.answered+'/'+p.length:'Жауап жоқ',t.pct!==null&&t.pct<r.threshold?'amber':''))]),
    section('Журналдағы динамика',[note('Бір күнде бірнеше баға болса, сол күнге орташа алынады. Жауап бергендер саны өзгеретіндіктен, күндерді бірдей топ деп салыстырмаңыз.'),...b.daily.slice(-10).map(d=>bar(isoShort(d.date),d.score,100,num(d.score)+' · '+d.count+' адам','blue'))]),
    section('Сайт бағаларының гистограммасы',[note('Тек қорытынды бағалар. Аралық баллдар жеке карточкаларда көрсетіледі.'),...(r.finals?r.siteHistogram.map(x=>bar(x.label,x.count,r.finals,String(x.count))):[note('Қорытынды баға жоқ.')])]) ]));
  const rows = p.map((s,i)=>{
    const markers=s.history.history.filter(e=>e.score===null);
    const today=s.history.history.filter(e=>e.date===date&&e.score!==null).map(e=>num(e.score));
    const evidence=[s.past.count+' баға, '+s.past.daily.length+' күн',today.length?'сол күнгі журнал: '+today.join(', '):null,markers.length?'журналдағы «ж»: '+markers.filter(e=>String(e.mark).toLowerCase()==='ж').length+'; «с»: '+markers.filter(e=>String(e.mark).toLowerCase()==='с').length:null,s.current===null&&s.present===false?'сайтта қатысу белгісі жоқ':s.current===null&&s.present===true?'қатысқан, бағаланған жауап жоқ':null,s.missing.length&&s.current!==null?'жіберілмеген № '+s.missing.join(', '):null,s.weak?'ең төмен тапсырма № '+s.weak:null].filter(Boolean).join(' · ');
    const summary=h('summary',{},[h('b',{text:name(s,i)}),h('span',{text:s.status}),h('small',{text:'Журнал '+num(s.past.average)+' · Сайт '+num(s.current)+(s.current!==null&&!s.final?' (аралық)':'')+' · Болжам '+num(s.past.forecast)})]);
    const {outlook}=s;
    const trend=h('div',{class:'pr-person-forecast'},[
      h('h3',{text:'Жеке болжам'}),
      outlook.inputs.length?h('div',{class:'pr-score-cards'},outlook.inputs.map(d=>metric(isoShort(d.date),num(d.score),'күндік орташа'))):null,
      note(outlook.needed?'Болжам есептеу үшін тағы '+outlook.needed+' бағаланған күн қажет.':'Келесі жұмысқа болжам '+num(s.past.forecast)+' балл. Соңғы үш күндегі мәндер '+num(outlook.spread[0])+'–'+num(outlook.spread[1])+' аралығында.'),
      outlook.change!==null?note('Соңғы екі күннің орташа балы алдыңғы екі күнмен салыстырғанда '+signed(outlook.change)+' балл.') : null]);
    const details=h('details',{class:'pr-person','data-profile':s.number},[summary,h('div',{class:'pr-person-body'},[
      note(evidence),s.delta===null?null:note('Сайт бағасы мен журнал ортасының айырмасы '+signed(s.delta)+' балл. Бағалау шарттары әртүрлі болуы мүмкін.'),trend,
      h('p',{class:'pr-action',text:'Жеке тапсырма: '+s.action}),...Object.entries(s.tasks||{}).map(([n,t])=>bar(n+'. '+r.tasks.find(x=>x.n===n)?.title,t.pts,t.max,t.pending?'Тексерілуде':t.sent?num(t.pts)+' / '+t.max:'Жіберілмеген')),
      onAnalyze?h('button',{type:'button',class:'btn sm pr-student-ai',text:'Осы студентті ЖИ-мен талдау',on:{click:()=>onAnalyze(s.id)}}):null])]);
    return details;
  });
  nodes.push(section('Әр студентке жеке талдау',[note('Студент жолын ашыңыз. «Жіберілмеген» және «тексерілуде» күйлері төмен баға ретінде саналмайды.'),...rows]));
  nodes.push(section('Болжам қалай есептеледі',[note('Жеке болжам үшін сабаққа дейінгі соңғы үш бағаланған күннің орташа балы алынады. Болжам келесі ұқсас жұмысты жоспарлауға арналған.') ]));
  host.replaceChildren(...nodes);
  return r;
}
