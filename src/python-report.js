import { geminiJson } from './gemini.js';
import { courseDate, courseYear, resolveProgressCourse } from './progress.js';
import { parseJournal, readJournalPaste } from './progress-journal.js';
import { pyStats } from './pyapi.js';
import { P12_MAX } from './py12.js';

const reportFields={summary:1400,forecast:1200,strengths:1000,risks:1400,action:1800,practice:1800,check:1000};
const reportKeys=Object.keys(reportFields);
const schema={type:'OBJECT',properties:Object.fromEntries(reportKeys.map(k=>[k,{type:'STRING'}])),required:reportKeys};
const bounded=(v,max=100)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max?v:null;
const signed=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=100?v:null;
const all=async statement=>(await statement.all()).results||[];

function journalFacts(raw, individual) {
  const journal=raw||{};
  const recent=Array.isArray(journal.recent)?journal.recent.slice(-3).map(v=>bounded(v)).filter(v=>v!==null):[];
  return {
    average:bounded(journal.average),
    forecast:bounded(journal.forecast),
    gradedDays:bounded(journal.days,400),
    recentDailyScores:individual?recent:[],
    recentChange:signed(journal.change),
    forecastCount:individual?null:bounded(journal.coverage,1000),
    belowThreshold:individual?null:bounded(journal.risk,1000),
    rosterSize:individual?null:bounded(journal.total,1000)
  };
}

function reportPrompt(facts, individual) {
  return [
    'Python 12-сабақ бойынша оқытушыға қазақ тілінде '+(individual?'бір студенттің':'топтың')+' толық талдауын дайында.',
    'summary: негізгі нәтиже мен дерек қамтуын 2–3 сөйлеммен түсіндір.',
    'forecast: берілген болжамды, соңғы бағалар динамикасын және дерек қамтуын түсіндір. Болжам жоқ болса, қажетті деректі көрсет. Жаңа балл, ықтималдық немесе қате аралығын ойлап таппа.',
    'strengths: жақсы меңгерілген 1–2 дағдыны көрсеткішпен негізде. Дерек аз болса, соны айт.',
    'risks: назар аударатын тапсырмалар мен ұғымдарды нақтыла. Жіберілмеген жұмыс, тексерілмеген жұмыс және төмен нәтиже арасын ажырат. Себепті жорамал ретінде көрсет.',
    'action: келесі сабаққа 3 қадам ұсын. '+(individual?'Қолдау, жеке орындау және қысқа кері байланыс бер.':'Топтық қайталау, қолдау қажет шағын топ және алда келе жатқандарға күрделі жұмыс ұсын.'),
    'practice: тақырыпқа сай жаңа есептің шартын, күтілетін нәтиже түрін және екі тексеру мәнін бер. Дайын шешім кодын берме.',
    'check: келесі сабақтан кейін бақыланатын 2 өлшем мен тексеру жолын ұсын. Ұсынылатын мақсатты тарихи нәтижеден ажырат.',
    'Қорытындылар тек деректерге негізделсін. Тапсырма 1: for/range, 2: қосынды мен көбейтінді, 3: for/if, 4: тест.',
    'Деректер: '+JSON.stringify(facts)
  ].join('\n');
}

const demo={
  summary:'ЖИ демосы. Журнал мен тапсырма нәтижелерінің қамтуын бірге қараңыз.',
  forecast:'Соңғы үш бағаланған күннің ортасы келесі жұмысқа бағдар береді.',
  strengths:'Толық орындалған тапсырманың қандай дағдыны көрсететінін тексеріңіз.',
  risks:'Қате қалған есептерді және жіберілмеген жұмыстарды жеке қарап шығыңыз.',
  action:'Бір мысалды бірге талдаңыз. Содан кейін ұқсас есепті студентке өз бетінше беріңіз.',
  practice:'1–n аралығында 3-ке еселі сандардың санын шығарыңыз. n=2 және n=9 мәндерімен тексеріңіз.',
  check:'Шекаралық екі тесттен өткенін және студенттің шартты түсіндіре алғанын тексеріңіз.'
};

export async function pythonReport(path, method, body, env, url, json, err) {
  const {DB}=env;
  const id=Number(method==='GET'?url.searchParams.get('session'):body.session);
  if(!Number.isSafeInteger(id)||id<1) return err('bad_request');
  const session=await DB.prepare(`SELECT s.* FROM sessions s WHERE s.id=? AND s.topic='P12' AND NOT EXISTS (SELECT 1 FROM session_trash t WHERE t.session_id=s.id)`).bind(id).first();
  if(!session)return err('not_found',404);
  const date=courseDate(session.created_at*1000), year=courseYear(date);
  if(path==='python-report'&&method==='GET'){
    if(!session.group_id)return json({ok:true,date,entries:[],source:'Сабаққа нақты топ тіркелмеген.'});
    const {course,courses}=await resolveProgressCourse(DB,session);
    const context={date,threshold:course?.threshold??70,courseId:course?.id??null,needsCourse:courses.length>1&&!course};
    if(!course)return json({ok:true,...context,entries:[],source:context.needsCourse?'Журналды таңдау үшін сабақты курспен байланыстырыңыз.':'Бұл топқа Python курсы байланыстырылмаған.'});
    const journal=await DB.prepare('SELECT entries FROM progress_imports WHERE course_id=? ORDER BY id DESC LIMIT 1').bind(course.id).first();
    return json({ok:true,...context,entries:JSON.parse(journal?.entries||'[]').filter(e=>e.date<=date),
      source:journal?'Үлгерім бөліміне енгізілген Python журналы · '+course.subject:'Курс байланыстырылды. Үлгерім бөлімінде журналды енгізуге болады.'});
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
    const selected=Number(body.student), individual=!!selected;
    if(individual&&(!session.group_id||!await DB.prepare('SELECT id FROM students WHERE id=? AND group_id=? AND active=1').bind(selected,session.group_id).first()))return err('not_found',404);
    const stats=await (await pyStats(DB,id)).json();
    const found=individual?stats.students.find(s=>s.id===selected):null;
    const journal=journalFacts(body.journal,individual);
    const {course}=await resolveProgressCourse(DB,session);
    const facts={journal,threshold:course?.threshold??70};
    if(individual){
      const submissions=await all(DB.prepare(`SELECT task,auto_score,teacher_score,json_extract(payload,'$.done') AS done FROM submissions WHERE session_id=? AND student_id=?`).bind(id,selected));
      const byTask=new Map(submissions.map(s=>[s.task,s]));
      facts.attempts=found?.tries||0;
      facts.fixed=found?.fixed||0;
      facts.tasks=Object.entries(P12_MAX).map(([number,max])=>{
        const s=byTask.get(Number(number));
        return {number:Number(number),max,submitted:!!s,complete:!!s?.done,score:s?.teacher_score??s?.auto_score??null};
      });
      facts.items=stats.allItems.filter(i=>i.struggling.some(s=>s.id===selected)).map(i=>({task:i.task,concept:i.op}));
    }else{
      facts.present=stats.present;
      facts.responded=stats.students.length;
      facts.tasks=stats.tasks?.map(t=>({number:t.n,answered:t.sent,averagePercent:t.pct}));
      facts.items=stats.allItems.filter(i=>i.unresolved>0).sort((a,b)=>b.unresolved-a.unresolved).slice(0,5).map(i=>({task:i.task,concept:i.op,unresolved:i.unresolved,answered:i.sent}));
    }
    const hasLessonData=individual?facts.attempts||facts.tasks.some(t=>t.score!==null):facts.responded;
    if(journal.average===null&&!hasLessonData)return err('no_scores',409);
    try{
      const result=env.GEMINI_STUB?demo:await geminiJson(env,[{text:reportPrompt(facts,individual)}],schema,{
        budgetMs:18000,timeoutMs:14000,maxOutputTokens:2000,
        validate:o=>reportKeys.every(k=>typeof o[k]==='string'&&o[k].trim())
      });
      return json({ok:true,...Object.fromEntries(reportKeys.map(k=>[k,result[k].trim().slice(0,reportFields[k])]))});
    }catch(e){return err(e.kind==='config'?'ai_config':'ai_unavailable',503);}
  }
  return err('not_found',404);
}
