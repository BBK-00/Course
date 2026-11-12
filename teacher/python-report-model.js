import { summarizeProgress } from '../assets/progress-metrics.js';

export const mean = values => values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10 : null;
const score = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
const key = v => String(v ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export const taskNames = {1:'Қарапайым есептер',2:'Қосынды және көбейтінді',3:'Цикл және шарт',4:'Тест'};
const taskPractice = {1:'Кері бағытта 18-ден 3-ке дейін 3 қадаммен сана; шекараны неге солай таңдағаныңды түсіндір.',2:'3-тен 27-ге дейінгі 3-ке еселі сандардың қосындысын және санын есепте.',3:'n енгізіп, 1–n аралығында 3-ке бөлініп, 2-ге бөлінбейтін сандарды сана және қос. n=1, 3, 12 мәндерімен тексер.',4:'range(8, 0, -2) және print(i) мен print("i") нәтижесін кодты қоспай тұрып жаз.'};

function studentOutlook(past, threshold) {
  const inputs = past.daily.slice(-3);
  const points = inputs.map(day => day.score);
  return {
    inputs,
    change: past.drop === null ? null : -past.drop,
    spread: points.length === 3 ? [Math.min(...points), Math.max(...points)] : null,
    below: past.forecast !== null && past.forecast < threshold,
    needed: Math.max(0, 3 - inputs.length)
  };
}

export function matchHistory(rows, students) {
  const lookup = new Map();
  for (const s of students) lookup.set(key(s.name), [...(lookup.get(key(s.name))||[]), s.id]);
  const seen = new Set(), rejected = [], entries = [];
  for (const row of rows) {
    const ids = lookup.get(key(row.name));
    if (ids?.length !== 1 || seen.has(ids[0])) { rejected.push(row.name); continue; }
    seen.add(ids[0]);
    for(const e of row.entries) entries.push({...e,student:ids[0]});
  }
  return {entries, rejected, matched:seen.size};
}

export function buildReport(students, history, date, threshold = 70) {
  const prior = history.filter(e=>e.date<date);
  const sameDay = history.filter(e=>e.date===date);
  const baseline = summarizeProgress(students, prior, threshold);
  const full = summarizeProgress(students, history.filter(e=>e.date<=date), threshold);
  const profiles = students.map((s,index)=>{
    const past=baseline.profiles[index], p=full.profiles[index];
    const outlook=studentOutlook(past,threshold);
    const submitted = Object.values(s.tasks||{}).filter(t=>t.sent&&!t.pending);
    const hasSite = score(s.total) && (submitted.length>0 || s.edited);
    const final = hasSite && !!(s.complete||s.edited);
    const current = hasSite ? s.total : null;
    const weak = Object.entries(s.tasks||{}).filter(([,t])=>t.sent&&!t.pending&&t.max>0&&t.pts/t.max<threshold/100).sort(([,a],[,b])=>a.pts/a.max-b.pts/b.max)[0];
    const missing=Object.entries(s.tasks||{}).filter(([,t])=>!t.sent).map(([n])=>n);
    const pending=Object.entries(s.tasks||{}).filter(([,t])=>t.pending).map(([n])=>n);
    const delta=final&&past.average!==null?Math.round((current-past.average)*10)/10:null;
    let status='Бақылау жеткілікті', action='Бір күрделі нұсқа: 30-дан 1-ге кері жүріп, 4-ке бөлінетіндердің саны мен қосындысын тап; екі шекаралық тест жаз.';
    if(!past.count&&!hasSite) {status='Дерек жеткіліксіз';action='Қысқа бастапқы диагностика: range(1, 5) және цикл ішіндегі if нәтижесін болжап, кодпен тексер.';}
    else if(weak){status='Нақты дағдыны бекіту';action=taskPractice[weak[0]]||action;}
    else if(outlook.below||(past.average!==null&&past.average<threshold)||(final&&current<threshold)){status='Жеке қолдау';action=past.count<=2?'Оқытушымен бірге 1–5 сандарын шығарып, кейін range(2, 9, 2) мәндерін өз бетіңше жаз. Бір қысқа жауап жібер.':'range(2, 9, 2) мәндерін қолмен жаз. Кейін for және if арқылы 1–12 арасынан 3-ке еселі сандарды шығар.';}
    else if((delta!==null&&delta<=-10)||past.reason==='drop'){status='Төмендеуді тексеру';action='Бір шешімді қадамдап түсіндіріп, шекара мен шегініске екі тест жаса; нәтижені оқытушымен салыстыр.';}
    if(missing.length&&hasSite) action='Алдымен жіберілмеген № '+missing.join(', ')+' тапсырмаларды тексеріңіз. '+action;
    else if(s.present===false&&!hasSite) action='Осы сабақтан сайтта жауап жоқ. Қатысуын нақтылап, қысқа қайта тапсыру ұсыныңыз. '+action;
    if(hasSite&&!final) status='Аралық нәтиже · '+status;
    if(pending.length) status='Тексерілуде: № '+pending.join(', ')+' · '+status;
    return {...s,past,history:p,outlook,number:index+1,current,final,delta,status,action,weak:weak?.[0]||null,missing};
  });
  const final=profiles.filter(p=>p.final), interim=profiles.filter(p=>p.current!==null&&!p.final);
  const last=sameDay.filter(e=>score(e.score));
  const bins = [[0,50],[50,70],[70,85],[85,101]];
  const distribution = values => bins.map(([a,b])=>({label:`${a}–${b-1}`,count:values.filter(x=>x>=a&&x<b).length}));
  const active = profiles.filter(p => p.active);
  const forecast = active.filter(p => p.past.forecast !== null);
  const priority = forecast.filter(p => p.outlook.below).sort((a,b) => a.past.forecast - b.past.forecast);
  const missingHistory = active.filter(p => p.outlook.needed);
  const comparable = active.filter(p => p.outlook.change !== null);
  const forecastGroups = [
    {label:threshold+'-тен төмен',count:priority.length,tone:'amber'},
    {label:threshold+'–84',count:forecast.filter(p=>p.past.forecast>=threshold&&p.past.forecast<85).length,tone:'blue'},
    {label:'85–100',count:forecast.filter(p=>p.past.forecast>=Math.max(threshold,85)).length,tone:''},
    {label:'Дерек аз',count:missingHistory.length,tone:'muted'}
  ];
  if (threshold >= 85) forecastGroups.splice(1,1);
  return {profiles, baseline, full, sameDay:last.length, finals:final.length, interims:interim.length, siteAverage:mean(final.map(p=>p.current)), threshold, date,
    forecastGroups, priority, missingHistory, comparable:comparable.length, recentChange:mean(comparable.map(p=>p.outlook.change)),
    histogram:distribution(baseline.profiles.filter(p=>p.average!==null).map(p=>p.average)), siteHistogram:distribution(final.map(p=>p.current)),
    tasks:Object.entries(taskNames).map(([n,title])=>{const ts=students.map(s=>s.tasks?.[n]).filter(t=>t?.sent&&!t.pending&&t.max>0);return {n,title,answered:ts.length,pct:mean(ts.map(t=>t.pts/t.max*100))};})};
}
