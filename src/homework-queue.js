import {gradeHomeworkPhoto, subStatement} from './pyapi.js';
import {normalizeHomeworkReview} from './homework-review.js';
const now=()=>Math.floor(Date.now()/1000);
// A database lease serializes all Worker instances, not just one browser/tab.
export async function drainHomeworkQueue(env, options={}){
  const DB=env.DB,owner=crypto.randomUUID(),began=Date.now();
  const lease=await DB.prepare('INSERT INTO homework_queue_lock(id,owner,until_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,until_at=excluded.until_at WHERE homework_queue_lock.until_at<? RETURNING owner').bind(owner,now()+90,now()).first();
  if(!lease)return;
  try{
    await DB.prepare("UPDATE homework_queue SET status='queued' WHERE status='checking'").run();
    // Recover jobs left behind by a disconnected/terminated older worker.
    await DB.prepare("INSERT OR IGNORE INTO homework_queue(job_id,session_id,student_id,status,created_at,next_at) SELECT job_id,session_id,student_id,'queued',started_at,? FROM py_hw_uploads WHERE status='queued' OR (status='checking' AND updated_at<?) OR (status='error' AND COALESCE(error_kind,'')!='image')").bind(now(),now()-90).run();
    await DB.prepare("UPDATE py_hw_uploads SET status='queued' WHERE job_id IN (SELECT job_id FROM homework_queue WHERE status='queued')").run();
    while(Date.now()-began<(options.budgetMs??12000)){
      const q=await DB.prepare("SELECT q.*,u.photo,u.mime,se.topic FROM homework_queue q JOIN students st ON st.id=q.student_id JOIN sessions se ON se.id=q.session_id JOIN py_hw_uploads u ON u.job_id=q.job_id AND u.session_id=q.session_id AND u.student_id=q.student_id WHERE q.status='queued' AND q.next_at<=? ORDER BY q.created_at,q.job_id LIMIT 1").bind(now()).first();
      if(!q)break;
      await DB.batch([
        DB.prepare('UPDATE homework_queue_lock SET until_at=? WHERE id=1 AND owner=?').bind(now()+90,owner),
        DB.prepare("UPDATE homework_queue SET status='checking' WHERE job_id=?").bind(q.job_id),
        DB.prepare("UPDATE py_hw_uploads SET status='checking',updated_at=? WHERE job_id=?").bind(now(),q.job_id)
      ]);
      let grade;
      try{grade=await(options.grade||gradeHomeworkPhoto)(env,q.photo,q.mime,{budgetMs:12000,timeoutMs:4000,topic:q.topic});}
      catch(e){
        const terminal=e.kind==='image',delay=e.kind==='quota'?60:Math.min(300,15*2**Math.min(q.tries,5));
        await DB.batch([
          DB.prepare('UPDATE homework_queue SET status=?,tries=tries+1,next_at=? WHERE job_id=?').bind(terminal?'error':'queued',now()+delay,q.job_id),
          DB.prepare('UPDATE py_hw_uploads SET status=?,error_kind=?,updated_at=? WHERE job_id=?').bind(terminal?'error':'queued',e.kind||'unavailable',now(),q.job_id)
        ]);
        continue;
      }
      // A fresh upload can supersede a job. Never let an old result overwrite it.
      if(!await DB.prepare('SELECT 1 FROM py_hw_uploads WHERE job_id=?').bind(q.job_id).first())continue;
      const prev=await DB.prepare('SELECT attempts FROM py_hw WHERE session_id=? AND student_id=?').bind(q.session_id,q.student_id).first();
      const attempts=(prev?.attempts||0)+1,score=Math.max(0,Math.min(25,Math.round(grade.score*10)/10)),comment=String(grade.comment).slice(0,700);
      await DB.batch([
        DB.prepare('INSERT INTO py_hw(session_id,student_id,photo,mime,score,comment,attempts,at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(session_id,student_id) DO UPDATE SET photo=excluded.photo,mime=excluded.mime,score=excluded.score,comment=excluded.comment,attempts=excluded.attempts,at=excluded.at').bind(q.session_id,q.student_id,q.photo,q.mime,score,comment,attempts,now()),
        subStatement(DB,q.session_id,q.student_id,5,{items:[{id:61,label:'Үй жұмысы — ЖИ бағасы, '+attempts+' әрекет',got:score,max:25,done:true}],done:true,review:normalizeHomeworkReview(grade.review)},score,'ЖИ бағалады: '+score+'/25'),
        DB.prepare("UPDATE py_hw_uploads SET status='graded',error_kind=NULL,updated_at=? WHERE job_id=?").bind(now(),q.job_id),
        DB.prepare("UPDATE homework_queue SET status='graded' WHERE job_id=?").bind(q.job_id)
      ]);
    }
  }finally{await DB.prepare('DELETE FROM homework_queue_lock WHERE id=1 AND owner=?').bind(owner).run();}
}
