import { drawPythonReport } from './python-report-view.js';

let current;
const messages={journal_format:'Файлдың пішімі жарамсыз. Excel немесе Google Sheets-тен TSV ретінде жүктеңіз.',journal_header:'«Аты-жөні» бағаны табылмады.',journal_dates:'Журнал күндері таңдалған оқу жылына сәйкес келмеді.',no_group:'Алдымен осы топтың сабағын таңдаңыз.',no_scores:'Талдауға бағаланған дерек жеткіліксіз.',ai_config:'ЖИ қызметі бапталмаған. Диаграммалар мен есептелген ұсыныстар қолжетімді.',ai_unavailable:'ЖИ қазір жауап бермеді. Есептелген ұсыныстар төменде сақталды.'};

export function mountPythonReport(host,{session,students,api,h}) {
  if(current?.id!==session.id){
    const state={id:session.id,entries:[],names:false,source:'Журнал тексерілуде…',date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(session.created_at*1000))};
    current=state;
    state.root=h('div'); state.report=h('div',{class:'pr-report'});
    state.status=h('p',{class:'pr-note pr-status',role:'status'});
    const choice=h('select',{class:'field','aria-label':'ЖИ талдауы кімге'});
    const answer=h('p',{class:'pr-ai',role:'status'});
    const btn=(text,click)=>h('button',{type:'button',class:'btn sm',text,on:{click}});
    const names=btn('Аты-жөнін көрсету',()=>{state.names=!state.names;names.textContent=state.names?'Аты-жөнін жасыру':'Аты-жөнін көрсету';render(state);});
    const ai=btn('ЖИ ұсынысын алу',async()=>{
      ai.disabled=true;answer.textContent='Көрсеткіштер талдануда…';
      const p=state.reportData.profiles.find(s=>String(s.id)===choice.value)?.past;
      const b=state.reportData.baseline;
      const data=p?{average:p.average,forecast:p.forecast,days:p.daily.length}:{average:b.average,forecast:b.forecast,days:b.daily.length,risk:b.attention,coverage:b.forecastCount};
      const result=await api('python-report/ai',{session:state.id,student:p?.id,journal:data});
      ai.disabled=false;
      answer.textContent=result.ok?result.summary+'\n\nҰсыныс: '+result.action:messages[result.error]||'ЖИ ұсынысын алу мүмкін болмады.';
    });
    const file=h('input',{type:'file',accept:'.tsv,.txt,text/tab-separated-values','aria-label':'Python журналы, TSV файлы',on:{change:async e=>{
      const f=e.target.files?.[0]; if(!f)return;
      if(f.size>300000){state.status.textContent='Файл тым үлкен.';return;}
      state.uploading=true;
      state.status.textContent='Журналдағы аты-жөндер топпен салыстырылуда…';
      let j;try{j=await api('python-report/journal',{session:state.id,text:await f.text()});}catch{j={ok:false};}
      if(j.ok&&j.matched){state.entries=j.entries;state.source='Осы бетке жүктелген журнал · сәйкес '+j.matched+' студент';state.local=true;render(state);}
      state.status.textContent=j.ok?(j.matched?'Сәйкес студент: '+j.matched+'. ':'Сәйкес студент табылмады. ')+(j.issues?.length?'Тексеруді қажет ететін жолдар: '+j.issues.length+'. Мысалы: '+j.issues.slice(0,4).map(x=>x.row+'-жол').join(', ')+'.':''):messages[j.error]||'Журналды оқу мүмкін болмады.';
      state.uploading=false;e.target.value='';
    }}});
    const controls=h('section',{class:'pr-card'},[h('h2',{text:'Журнал және ЖИ ұсынысы'}),h('p',{class:'pr-note',text:'Импортталған Python журналы автоматты ашылады. Балама: Excel немесе Google Sheets кестесін TSV ретінде жүктеп, осы жерден таңдаңыз. Файл журналға сақталмайды. ЖИ-ге аты-жөндер мен код жіберілмейді.'}),h('div',{class:'pr-controls'},[file,names,choice,ai]),state.status,answer]);
    state.choice=choice;state.root.append(controls,state.report);
    api('python-report?session='+state.id).then(j=>{
      if(current!==state||state.local)return;
      if(j.ok){state.date=j.date;state.entries=j.entries;state.source=j.source;}
      else state.source='Журнал дерегін жүктеу мүмкін болмады. Сайт нәтижесі қолжетімді.';
      if(!state.uploading)render(state);
    });
  }
  const state=current;
  state.h=h; state.students=students;
  const sig=JSON.stringify(students.map(s=>[s.id,s.name,s.total,s.edited,s.complete,s.tasks]));
  if(state.signature!==sig){state.signature=sig;render(state);}
  if(state.root.parentNode!==host)host.replaceChildren(state.root);
}

function render(state){
  const {h,students,choice}=state;
  if(!h)return;
  const opened=[...state.report.querySelectorAll('details')].map((d,i)=>d.open?i:-1);
  const previous=choice.value;
  choice.replaceChildren(h('option',{value:'',text:'Топ бойынша ЖИ'}),...students.map((s,i)=>h('option',{value:s.id,text:state.names?s.name:'Студент '+String(i+1).padStart(2,'0')})));
  choice.value=previous;
  state.reportData=drawPythonReport(state.report,h,students,state.entries,{date:state.date,source:state.source,privateNames:state.names});
  state.report.querySelectorAll('details').forEach((d,i)=>{if(opened.includes(i))d.open=true;});
}
