import { buildReport } from './python-report-model.js';

const num = v => v === null || v === undefined ? '—' : v.toLocaleString('kk-KZ');
const isoShort = d => d.slice(8,10)+'.'+d.slice(5,7);

export function drawPythonReport(host, h, students, history, {date, source, privateNames=false}={}) {
  const r=buildReport(students,history,date);
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
  const drop=b.profiles.filter(x=>x.reason==='drop').length;
  const nodes=[h('div',{class:'pr-hero'},[h('span',{text:'PYTHON / 12-САБАҚ'}),h('h1',{text:'Топтың үлгерімі және келесі қадам'}),note(source||'Таңдалған сабақ және журнал тарихы'),note('Салыстыру күні: '+isoShort(date)+'. Қолдау межесі: 70 балл.')]),
    h('div',{class:'pr-metrics'},[
      metric('Журналдағы орташа',num(b.average),b.assessed+' / '+p.length+' студент'),
      metric('Сайттағы сабақ',num(r.siteAverage),r.finals+' қорытынды · '+r.interims+' аралық'),
      metric('Келесі жұмыс болжамы',num(b.forecast),b.forecastCount+' / '+p.length+' студент'),
      metric('Жеке назар',String(risk.length),'қосымша қолдау не бақылау')])];
  if(!r.finals&&!r.interims) nodes.push(note('Сайттағы осы сабақтың бағалары есепке қосылмаған. Журналдағы бағалар сайт нәтижесінің орнына қойылмайды.'));
  nodes.push(h('div',{class:'pr-grid'},[
    section('Журнал бағаларының гистограммасы',[note('Әр студенттің сабаққа дейінгі жеке орташа балы. Баған ұзындығы — студент саны.'),...(b.assessed?r.histogram.map(x=>bar(x.label,x.count,p.length,String(x.count),'blue')):[noData])]),
    section('Сабақ бойынша төрт тапсырма',[note('Орташа пайыз тек жіберілген және тексерілген жұмыстардан. Қамту саны әр жолда көрсетілген.'),...r.tasks.map(t=>bar(t.n+'. '+t.title,t.pct,100,t.answered?num(t.pct)+'% · '+t.answered+'/'+p.length:'Жауап жоқ',t.pct!==null&&t.pct<70?'amber':''))]),
    section('Журналдағы динамика',[note('Бір күнде бірнеше баға болса, сол күнге орташа алынады. Жауап бергендер саны өзгеретіндіктен, күндерді бірдей топ деп салыстырмаңыз.'),...b.daily.slice(-10).map(d=>bar(isoShort(d.date),d.score,100,num(d.score)+' · '+d.count+' адам','blue'))]),
    section('Сайт бағаларының гистограммасы',[note('Тек қорытынды бағалар. Аралық баллдар жеке карточкаларда көрсетіледі.'),...(r.finals?r.siteHistogram.map(x=>bar(x.label,x.count,r.finals,String(x.count)):[note('Қорытынды баға жоқ.')])]) ]));
  const rows = p.map((s,i)=>{
    const markers=s.history.history.filter(e=>e.score===null);
    const today=s.history.history.filter(e=>e.date===date&&e.score!==null).map(e=>num(e.score));
    const evidence=[s.past.count+' баға, '+s.past.daily.length+' күн',today.length?'сол күнгі журнал: '+today.join(', '):null,markers.length?'журналдағы «ж»: '+markers.filter(e=>String(e.mark).toLowerCase()==='ж').length+'; «с»: '+markers.filter(e=>String(e.mark).toLowerCase()==='с').length:null,s.current===null&&s.present===false?'сайтта қатысу белгісі жоқ':s.current===null&&s.present===true?'қатысқан, бағаланған жауап жоқ':null,s.missing.length&&s.current!==null?'жіберілмеген № '+s.missing.join(', '):null,s.weak?'ең төмен тапсырма № '+s.weak:null].filter(Boolean).join(' · ');
    const summary=h('summary',{},[h('b',{text:name(s,i)}),h('span',{text:s.status}),h('small',{text:'Журнал '+num(s.past.average)+' · Сайт '+num(s.current)+(s.current!==null&&!s.final?' (аралық)':'')+' · Болжам '+num(s.past.forecast)})]);
    const details=h('details',{class:'pr-person'},[summary,h('div',{class:'pr-person-body'},[note(evidence),s.delta===null?null:note('Сайт пен журналдың тарихи ортасы: '+(s.delta>0?'+':'')+num(s.delta)+' балл. Бағалау шарттары әртүрлі болуы мүмкін.'),note(s.past.backtest.count?'Жеке болжамның орташа абсолют қатесі: '+num(s.past.backtest.mae)+' балл, '+s.past.backtest.count+' тексеру.':'Жеке болжам қатесін тексеруге дерек жеткіліксіз.'),h('p',{class:'pr-action',text:'Жеке тапсырма: '+s.action}),...Object.entries(s.tasks||{}).map(([n,t])=>bar(n+'. '+r.tasks.find(x=>x.n===n)?.title,t.pts,t.max,t.pending?'Тексерілуде':t.sent?num(t.pts)+' / '+t.max:'Жіберілмеген'))])]);
    return details;
  });
  nodes.push(section('Әр студентке жеке талдау',[note('Студент жолын ашыңыз. «Жіберілмеген» және «тексерілуде» күйлері төмен баға ретінде саналмайды.'),...rows]));
  nodes.push(section('Болжамды қалай оқу керек',[note('Кемінде үш бағаланған күні бар студент үшін соңғы үш күннің орташа балы алынды. Бұл келесі ұқсас жұмысқа бағдар, кепіл баға емес. Бүгінгі жұмыс болжамға кірмейді.'),note('Соңғы екі бағаланған күні де 70-тен төмен: '+twoLow+'; алдыңғы екі күнмен салыстырғанда кемінде 10 балл төмендегендер: '+drop+'. Болжамы 70-тен төмен: '+b.belowThreshold+'.'),note(b.backtest.count?'Өткен дерекпен тексеру: '+b.backtest.count+' болжам. Орташа абсолют қате '+num(b.backtest.mae)+' балл; тек соңғы бағаны алатын тәсілде '+num(b.backtest.lastMae)+' балл.':'Болжам қатесін өткен бағалармен тексеруге әзірге дерек аз.'),note('Әрекет: сабақ басында 5 минуттық диагностика, кейін қажетті дағдыға жеке есеп. Келесі сабақта сол дағдыны жаңа мәндермен қайта тексеріңіз.') ]));
  host.replaceChildren(...nodes);
  return r;
}
