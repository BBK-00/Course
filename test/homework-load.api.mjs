import assert from 'node:assert/strict';
const base=process.env.BASE||'http://127.0.0.1:8791';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))throw Error('Local QA only');
const call=async(p,b,t)=>{const r=await fetch(base+'/api/'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},...(b?{body:JSON.stringify(b)}:{})});return {http:r.status,...await r.json()};};
const login=await call('teacher/login',{password:process.env.PASS||'test123'}),T=(p,b)=>call('teacher/'+p,b,login.token);
const name='Queue load '+Date.now(),g=(await T('groups',{name})).groups.find(g=>g.name===name);
const students=(await T('students',{group_id:g.id,names:Array.from({length:20},(_,i)=>'Queue Student '+i).join('\n')})).groups.find(x=>x.id===g.id).students;
await T('session/start',{topic:'P4',group_id:g.id});const live=await T('live'),session=live.session.id;
const tokens=await Promise.all(students.map(async s=>(await call('join',{student_id:s.id,code:live.session.code,device:'load'+s.id})).token));
const replies=await Promise.all(tokens.map(t=>call('py/hw',{photo:'A'.repeat(3000),mime:'image/jpeg'},t)));
assert(replies.every(r=>r.ok&&r.http===202&&r.saved),'All 20 simultaneous uploads must be accepted');
let done=false;
for(let n=0;n<160;n++){
  const rows=(await T('homework')).rows.filter(r=>r.session_id===session);
  if(rows.length===20&&rows.every(r=>r.status==='graded'&&r.attempts===1)){done=true;break;}
  await new Promise(r=>setTimeout(r,250));
}
assert(done,'Background processing must finish all twenty saved photos');
const totals=await T('live');assert(totals.groups[0].students.every(s=>s.tasks[5].sent));
console.log('Local Wrangler: 20 simultaneous photo uploads accepted with HTTP 202; all 20 automatically graded once and included in student totals.');
