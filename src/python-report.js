import { geminiJson } from './gemini.js';
import { courseDate } from './progress.js';
import { parseJournal, readJournalPaste } from './progress-journal.js';
import { pyStats } from './pyapi.js';

const schema={type:'OBJECT',properties:{summary:{type:'STRING'},action:{type:'STRING'}},required:['summary','action']};
const bounded=(v,max=100)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max?v:null;
const all=async statement=>(await statement.all()).results||[];

export async function pythonReport(path, method, body, env, url, json, err) {
  const {DB}=env;
  const id=Number(method==='GET'?url.searchParams.get('session'):body.session);
  if(!Number.isSafeInteger(id)||id<1) return err('bad_request');
  const session=await DB.prepare(`SELECT s.* FROM sessions s WHERE s.id=? AND s.topic='P12' AND NOT EXISTS (SELECT 1 FROM session_trash t WHERE t.session_id=s.id)`).bind(id).first();
  if(!session)return err('not_found',404);
  const date=courseDate(session.created_at*1000), year=Number(date.slice(0,4))-(date.slice(5,7)<'09'?1:0);
  if(path==='python-report'&&method==='GET'){
    if(!session.group_id)return json({ok:true,date,entries:[],source:'Сабаққа нақты топ тіркелмеген.'});
    const imports=await all(DB.prepare(`SELECT p.id, i.entries FROM progress_courses p JOIN progress_imports i ON i.id=(SELECT MAX(j.id) FROM progress_imports j WHERE j.course_id=p.id) WHERE p.group_id=? AND p.course='py' AND p.year=? AND (? IS NULL OR p.id=?) LIMIT 2`).bind(session.group_id,year,session.course_group_id??null,session.course_group_id??null));
    if(imports.length!==1)return json({ok:true,date,entries:[],source:imports.length?'Осы топтың бірнеше журналы бар. Қажетті кестені файлдан таңдаңыз.':'Бұл топтың импортталған Python журналы табылмады.'});
    return json({ok:true,date,entries:JSON.parse(imports[0].entries).filter(e=>e.date<=date),source:'Үлгерім бөліміне енгізілген Python журналы'});
  }
  if(path==='python-report/journal'&&method==='POST'){
    if(!session.group_id)return err('no_group',409);
    if(typeof body.text!=='string'||!body.text.trim()||body.text.length>150000)return err('journal_format');
    const students=await all(DB.prepare('SELECT id, full_name AS name FROM students WHERE group_id=? AND active=1').bind(session.group_id));
    try{
      const rows=readJournalPaste(body.text.replace(/^\uFEFF/,''));
      if(rows.length>350||rows.some(r=>r.length>156))return err('journal_format');
      const j=parseJournal(rows,students,year);
      return json({ok:true,date,entries:j.entries.filter(e=>e.date<=date),matched:j.matched,issues:j.issues});
    }catch(e){return err(['journal_format','journal_header','journal_dates'].includes(e.message)?e.message:'journal_format');}
  }
  if(path==='python-report/ai'&&method==='POST'){
    const stats=await (await pyStats(DB,id)).json();
    const journal=body.journal||{}, selected=Number(body.student), individual=!!selected;
    if(individual&&(!session.group_id||!await DB.prepare('SELECT id FROM students WHERE id=? AND group_id=? AND active=1').bind(selected,session.group_id).first()))return err('not_found',404);
    const found=individual?stats.students.find(s=>s.id===selected):null;
    const facts={journalAverage:bounded(journal.average),forecast:bounded(journal.forecast),gradedDays:bounded(journal.days,400),riskCount:individual?null:bounded(journal.risk,1000),forecastCount:individual?null:bounded(journal.coverage,1000),
      ...(individual?{attempts:found?.tries||0,fixed:found?.fixed||0,items:stats.allItems.filter(i=>i.struggling.some(s=>s.id===selected)).map(i=>({task:i.task,concept:i.op}))}:{present:stats.present,responded:stats.students.length,tasks:stats.tasks?.map(t=>({number:t.n,answered:t.sent,averagePercent:t.pct})),items:stats.allItems.filter(i=>i.unresolved>0).sort((a,b)=>b.unresolved-a.unresolved).slice(0,5).map(i=>({task:i.task,concept:i.op,unresolved:i.unresolved,answered:i.sent}))})};
    if(facts.journalAverage===null&&!(individual?facts.attempts:facts.responded))return err('no_scores',409);
    try{
      const result=env.GEMINI_STUB?{summary:'Берілген баға мен тапсырма деректеріне сүйенген ЖИ демосы.',action:'Бір қысқа жаттығудан кейін нәтижені жаңа мәндермен қайта тексеріңіз.'}:await geminiJson(env,[{text:'Python бойынша оқытушыға қазақ тілінде '+(individual?'бір студентке':'бүкіл топқа')+' қысқа қорытынды мен бір нақты жаңа жаттығу жаз. Тек деректерге сүйен. Болжамды кепіл деп айтпа. Жіберілмегенді төмен бағамен шатастырма. Бірнеше жауап болмаса себепті жорамалдама. Жеке қасиетке баға берме. Тапсырма 1: for/range; 2: қосынды/көбейтінді; 3: for/if; 4: тест. Егер дерек аз болса, қысқа диагностика ұсын. Деректер: '+JSON.stringify(facts)}],schema,{budgetMs:13000,maxOutputTokens:500,validate:o=>typeof o.summary==='string'&&typeof o.action==='string'});
      return json({ok:true,summary:result.summary.slice(0,1200),action:result.action.slice(0,900)});
    }catch(e){return err(e.kind==='config'?'ai_config':'ai_unavailable',503);}
  }
  return err('not_found',404);
}
