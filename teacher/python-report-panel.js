import { drawPythonReport } from './python-report-view.js?v=3';

let current;
const messages={journal_format:'Файлдың пішімі жарамсыз. Excel немесе Google Sheets-тен TSV ретінде жүктеңіз.',journal_header:'«Аты-жөні» бағаны табылмады.',journal_dates:'Журнал күндері таңдалған оқу жылына сәйкес келмеді.',no_group:'Алдымен осы топтың сабағын таңдаңыз.',no_scores:'Талдауға бағаланған дерек жеткіліксіз.',ai_config:'ЖИ қызметі бапталмаған. Диаграммалар мен есептелген ұсыныстар қолжетімді.',ai_unavailable:'ЖИ қазір жауап бермеді. Есептелген ұсыныстар төменде сақталды.'};
const sections=[['summary','Негізгі қорытынды'],['forecast','Болжам және динамика'],['strengths','Жақсы меңгерілген тұстар'],['risks','Назар аударатын тұстар'],['action','Келесі сабақтың жоспары'],['practice','Жаңа жаттығу'],['check','Нәтижені қалай тексеру керек']];

function aiInput(report, studentId) {
  const p=report.profiles.find(s=>String(s.id)===studentId);
  const {baseline:b}=report;
  const journal=p?{
    average:p.past.average, forecast:p.past.forecast, days:p.past.daily.length,
    recent:p.outlook.inputs.map(day=>day.score),change:p.outlook.change
  }:{
    average:b.average, forecast:b.forecast, days:b.daily.length, risk:report.priority.length,
    coverage:b.forecastCount,total:b.total,change:report.recentChange
  };
  return {student:p?.id,journal};
}

function paintAI(state) {
  const {h,choice,answer,results,request}=state;
  const key=choice.value;
  state.ai.disabled=!!request;
  answer.setAttribute('aria-busy',String(request?.key===key));
  if(request?.key===key){answer.replaceChildren(h('p',{text:'Журнал мен тапсырма нәтижелері талдануда…'}));return;}
  const result=results.get(key);
  if(!result){answer.replaceChildren();return;}
  if(!result.ok){answer.replaceChildren(h('p',{text:messages[result.error]||'ЖИ талдауын алу мүмкін болмады.'}));return;}
  answer.replaceChildren(h('div',{class:'pr-ai-grid'},sections.filter(([key])=>result[key]).map(([key,title])=>h('article',{
    class:'pr-ai-section pr-ai-'+key
  },[h('h3',{text:title}),h('p',{text:result[key]})]))));
}

export function mountPythonReport(host,{session,students,api,h}) {
  if(current?.id!==session.id){
    const state={id:session.id,entries:[],results:new Map(),names:false,source:'Журнал тексерілуде…',date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(session.created_at*1000))};
    current=state;
    state.root=h('div'); state.report=h('div',{class:'pr-report'});
    state.status=h('p',{class:'pr-note pr-status',role:'status'});
    const choice=h('select',{class:'field','aria-label':'ЖИ талдауы кімге'});
    const answer=h('div',{class:'pr-ai',role:'status'});
    const btn=(text,click)=>h('button',{type:'button',class:'btn sm',text,on:{click}});
    const names=btn('Аты-жөнін көрсету',()=>{state.names=!state.names;names.textContent=state.names?'Аты-жөнін жасыру':'Аты-жөнін көрсету';render(state);});
    const runAI=async()=>{
      if(state.request||!state.reportData)return;
      const key=choice.value;
      const input=aiInput(state.reportData,key);
      const entries=state.entries, signature=state.signature;
      state.request={key};
      paintAI(state);
      try{
        const result=await api('python-report/ai',{session:state.id,...input});
        if(state.entries===entries&&state.signature===signature)state.results.set(key,result);
      }catch{state.results.set(key,{ok:false,error:'network'});}
      finally{state.request=null;paintAI(state);}
    };
    const ai=btn('Толық ЖИ талдауын алу',runAI);
    ai.classList.add('primary');
    choice.addEventListener('change',()=>paintAI(state));
    const file=h('input',{type:'file',accept:'.tsv,.txt,text/tab-separated-values','aria-label':'Python журналы, TSV файлы',on:{change:async e=>{
      const f=e.target.files?.[0]; if(!f)return;
      if(f.size>300000){state.status.textContent='Файл тым үлкен.';return;}
      state.uploading=true;
      state.status.textContent='Журналдағы аты-жөндер топпен салыстырылуда…';
      let j;try{j=await api('python-report/journal',{session:state.id,text:await f.text()});}catch{j={ok:false};}
      if(j.ok&&j.matched){state.entries=j.entries;state.results.clear();state.source='Осы бетке жүктелген журнал · сәйкес '+j.matched+' студент';state.local=true;render(state);}
      state.status.textContent=j.ok?(j.matched?'Сәйкес студент: '+j.matched+'. ':'Сәйкес студент табылмады. ')+(j.issues?.length?'Тексеруді қажет ететін жолдар: '+j.issues.length+'. Мысалы: '+j.issues.slice(0,4).map(x=>x.row+'-жол').join(', ')+'.':''):messages[j.error]||'Журналды оқу мүмкін болмады.';
      state.uploading=false;e.target.value='';
    }}});
    const upload=h('details',{class:'pr-upload'},[h('summary',{text:'Басқа журналды TSV файлынан ашу'}),file,state.status]);
    const controls=h('section',{class:'pr-card pr-ai-panel'},[
      h('h2',{text:'ЖИ талдауы және сабақ жоспары'}),
      h('p',{class:'pr-note',text:'Топты немесе студентті таңдаңыз. ЖИ бағалар мен тапсырма көрсеткіштеріне сүйеніп, жаттығу және тексеру жоспарын ұсынады.'}),
      h('div',{class:'pr-controls'},[choice,ai,names]),answer,upload]);
    Object.assign(state,{choice,answer,ai});
    state.analyze=id=>{
      choice.value=String(id);
      controls.scrollIntoView({block:'start'});
      choice.focus({preventScroll:true});
      if(state.results.get(choice.value)?.ok)paintAI(state);
      else if(!state.request)runAI();
      else paintAI(state);
    };
    state.root.classList.add('pr-shell');
    state.root.append(controls,state.report);
    api('python-report?session='+state.id).then(j=>{
      if(current!==state||state.local)return;
      if(j.ok){state.date=j.date;state.entries=j.entries;state.results.clear();state.source=j.source;}
      else state.source='Журнал дерегін жүктеу мүмкін болмады. Сайт нәтижесі қолжетімді.';
      if(!state.uploading)render(state);
    });
  }
  const state=current;
  state.h=h; state.students=students;
  const sig=JSON.stringify(students.map(s=>[s.id,s.name,s.total,s.edited,s.complete,s.present,s.tasks]));
  if(state.signature!==sig){state.signature=sig;state.results.clear();render(state);}
  if(state.root.parentNode!==host)host.replaceChildren(state.root);
}

function render(state){
  const {h,students,choice}=state;
  if(!h)return;
  const opened=[...state.report.querySelectorAll('details')].map((d,i)=>d.open?i:-1);
  const previous=choice.value;
  choice.replaceChildren(h('option',{value:'',text:'Топ бойынша ЖИ'}),...students.map((s,i)=>h('option',{value:s.id,text:state.names?s.name:'Студент '+String(i+1).padStart(2,'0')})));
  choice.value=previous;
  state.reportData=drawPythonReport(state.report,h,students,state.entries,{date:state.date,source:state.source,privateNames:state.names,onAnalyze:state.analyze});
  state.report.querySelectorAll('details').forEach((d,i)=>{if(opened.includes(i))d.open=true;});
  paintAI(state);
}
