import assert from 'node:assert/strict';
import worker from '../src/index.js';
import {memoryD1} from './d1-memory.mjs';
import {drainHomeworkQueue} from '../src/homework-queue.js';
const DB=memoryD1(),env={DB,TEACHER_PASSWORD:'test123'},background=[];
// Hold wakeups so twenty independent clients can join the durable queue first.
const ctx={waitUntil:p=>background.push(p)};
const call=async(p,b,t)=>{const r=await worker.fetch(new Request('https://qa.invalid/api/'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},...(b?{body:JSON.stringify(b)}:{})}),env,{waitUntil:()=>{}});return {http:r.status,...await r.json()};};
// Do not start real network calls in this isolated test.
env.GEMINI_STUB='1';
const login=await call('teacher/login',{password:'test123'}),T=(p,b)=>call('teacher/'+p,b,login.token);
const g=(await T('groups',{name:'Queue 20'})).groups[0];
const students=(await T('students',{group_id:g.id,names:Array.from({length:20},(_,i)=>'Student '+i).join('\n')})).groups[0].students;
await T('session/start',{topic:'P4',group_id:g.id});const live=await T('live'),sid=live.session.id;
const tokens=await Promise.all(students.map(async s=>(await call('join',{student_id:s.id,code:live.session.code,device:'q'+s.id})).token));
// Keep the queue lease occupied while the clients submit.
DB.sqlite.prepare('INSERT INTO homework_queue_lock VALUES(1,?,?)').run('test-hold',Math.floor(Date.now()/1000)+90);
const answers=await Promise.all(tokens.map(t=>call('py/hw',{photo:'A'.repeat(3000),mime:'image/jpeg'},t)));
assert(answers.every(r=>r.ok&&r.http===202&&r.saved));
assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM homework_queue').get().n,20);
assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM py_hw_uploads').get().n,20);
assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM py_hw').get().n,0);
const preview=await T('work?session='+sid+'&student='+students[0].id);
assert(preview.hw_upload.photo&&preview.hw===null,'Teacher can inspect the queued photo before a grade exists');
assert((await T('homework')).rows.every(r=>r.status==='queued'&&!('photo'in r)));
const duplicate=await call('py/hw',{retry:true},tokens[0]);assert(duplicate.ok);assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM homework_queue').get().n,20);
DB.sqlite.prepare('DELETE FROM homework_queue_lock').run();
let active=0,maxActive=0,graded=0;
const grade=async()=>{active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,2));active--;graded++;return {score:25,comment:'Дұрыс'};};
await Promise.all(Array.from({length:8},()=>drainHomeworkQueue(env,{grade,budgetMs:10000})));
assert.equal(maxActive,1,'Provider sees only one request at a time across competing drainers');
assert.equal(graded,20);assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM py_hw WHERE score=25 AND attempts=1').get().n,20);
assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM submissions WHERE task=5').get().n,20);
assert.equal((await call('py/data',null,tokens[0])).hw.status,'graded');
const submission=DB.sqlite.prepare('SELECT id FROM submissions WHERE student_id=? AND task=5').get(students[0].id);
await T('task_grade',{id:submission.id,task:5,score:23,comment:'Оқытушы пікірі'});
// Retry a temporary outage automatically, without consuming a student attempt.
DB.sqlite.prepare("UPDATE homework_queue SET status='queued',next_at=0 WHERE student_id=?").run(students[0].id);
DB.sqlite.prepare("UPDATE py_hw_uploads SET status='queued' WHERE student_id=?").run(students[0].id);
await drainHomeworkQueue(env,{grade:async()=>{throw {kind:'quota'};}});
let row=DB.sqlite.prepare('SELECT * FROM homework_queue WHERE student_id=?').get(students[0].id);
assert.equal(row.status,'queued');assert(row.next_at>Math.floor(Date.now()/1000));assert.equal(row.tries,1);
assert.equal(DB.sqlite.prepare('SELECT attempts FROM py_hw WHERE student_id=?').get(students[0].id).attempts,1);
DB.sqlite.prepare('UPDATE homework_queue SET next_at=0 WHERE student_id=?').run(students[0].id);
await drainHomeworkQueue(env,{grade});assert.equal(DB.sqlite.prepare('SELECT attempts FROM py_hw WHERE student_id=?').get(students[0].id).attempts,2);
const manual=DB.sqlite.prepare('SELECT teacher_score,teacher_comment FROM submissions WHERE id=?').get(submission.id);
assert.equal(manual.teacher_score,23);assert.equal(manual.teacher_comment,'Оқытушы пікірі');
// Recover a process that died halfway through a job.
DB.sqlite.prepare("UPDATE homework_queue SET status='checking',next_at=0 WHERE student_id=?").run(students[1].id);
DB.sqlite.prepare("UPDATE py_hw_uploads SET status='checking' WHERE student_id=?").run(students[1].id);
await drainHomeworkQueue(env,{grade});assert.equal(DB.sqlite.prepare('SELECT status FROM homework_queue WHERE student_id=?').get(students[1].id).status,'graded');
console.log('Queue: 20 concurrent uploads accepted; eight competing drainers run exactly one provider request at a time; no duplicates, automatic backoff/retry, restart recovery and original task grades passed.');
await Promise.allSettled(background);
