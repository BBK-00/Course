import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';
import {memoryD1} from './d1-memory.mjs';
import {courseDate} from '../src/progress.js';
import {buildReport} from '../teacher/python-report-model.js';

test('report keeps missing, interim and final results separate and excludes today from the baseline',()=>{
  const students=[{id:1,active:true,total:80,complete:true,tasks:{1:{sent:true,pts:20,max:20}}},
    {id:2,active:true,total:0,tasks:{1:{sent:true,pts:0,max:20}}},
    {id:3,active:true,total:0,tasks:{1:{sent:false,pts:null,max:20}}}];
  const history=[50,60,70,100].map((score,i)=>({student:1,date:'2026-11-0'+(i+1),score,column:i}));
  const r=buildReport(students,history,'2026-11-04');
  assert.equal(r.baseline.average,60); assert.equal(r.baseline.forecast,60);
  assert.equal(r.sameDay,1); assert.equal(r.siteAverage,80); assert.equal(r.finals,1); assert.equal(r.interims,1);
  assert.equal(r.profiles[1].current,0); assert.equal(r.profiles[2].current,null);
  assert.deepEqual(r.tasks[0],{n:'1',title:'Қарапайым есептер',answered:2,pct:50});
  assert.deepEqual(r.forecastGroups.map(g=>g.count),[1,0,0,2]);
  assert.deepEqual(r.profiles[0].outlook.spread,[50,70]);
  assert.equal(r.profiles[1].outlook.needed,3);
});

test('teacher-only report joins exact journal names and gives AI suggestions without changing grades',async()=>{
  const DB=memoryD1(),env={DB,TEACHER_PASSWORD:'test-report-only',GEMINI_STUB:'1'};
  async function call(path,body,token){
    const res=await worker.fetch(new Request('https://report.invalid/api/teacher/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body&&JSON.stringify(body)}),env,{});
    return {...await res.json(),status:res.status};
  }
  const {token}=await call('login',{password:env.TEACHER_PASSWORD});
  const teacher=(path,body)=>call(path,body,token);
  const group=(await teacher('groups',{name:'Test report group'})).groups[0];
  const student=(await teacher('students',{group_id:group.id,names:'Test Learner'})).groups[0].students[0];
  await teacher('session/start',{topic:'P12',group_id:group.id});
  const {session}=await teacher('live');
  const id=session.id, date=courseDate(session.created_at*1000);
  const md=date.slice(8,10)+'.'+date.slice(5,7);
  assert.equal((await call('python-report?session='+id)).status,401);
  assert.deepEqual((await teacher('python-report?session='+id)).entries,[]);
  const payload='аты-жөні\t'+md+'\nTest Learner\t0\nOther Learner\t100';
  const result=await teacher('python-report/journal',{session:id,text:payload});
  assert.equal(result.matched,1);assert.equal(result.issues[0].kind,'unmatched');assert.equal(result.entries[0].score,0);
  const ai=await teacher('python-report/ai',{session:id,student:student.id,journal:{average:0,days:1}});
  assert.equal(ai.ok,true);assert.match(ai.summary,/ЖИ/);
  for(const key of ['forecast','strengths','risks','action','practice','check'])assert.ok(ai[key]?.length,key);
  assert.equal((await teacher('python-report/ai',{session:id,student:9999,journal:{average:80}})).status,404);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS n FROM submissions').get().n,0);
});
