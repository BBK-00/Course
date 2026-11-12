import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { memoryD1 } from './d1-memory.mjs';

test('guest access, registration, course persistence and revocable sessions', async () => {
  const DB = memoryD1();
  const env = { DB, TEACHER_PASSWORD: 'local-teacher-fixture' };
  const origin = 'https://account.test';
  async function request(path, payload, cookie, requestOrigin) {
    const headers = { ...(payload ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(requestOrigin ? { Origin: requestOrigin } : {}) };
    const res = await worker.fetch(new Request(origin + '/api/' + path, { method: payload ? 'POST' : 'GET', headers, body: payload && JSON.stringify(payload) }), env, {});
    return { status:res.status, json:await res.json(), cookie:res.headers.get('Set-Cookie') };
  }
  const call = (path, body, cookie, requestOrigin) => request('account' + path, body, cookie, requestOrigin);
  const credentials = { name:'Сынақ Студент', email:'Student@EXAMPLE.test', password:'local-student-pass-42' };
  assert.deepEqual((await call('')).json, {ok:true,account:null,courses:[]});
  assert.equal((await call('/course',{course:'python',saved:true})).status,401);
  assert.equal((await call('/register',credentials,null,'https://unrelated.test')).status,403);
  const created=await call('/register',credentials);
  assert.equal(created.status,201);
  assert.deepEqual(created.json.account,{name:credentials.name,email:'student@example.test'});
  assert.match(created.cookie,/HttpOnly; SameSite=Lax; Secure/);
  const session=created.cookie.split(';')[0];
  assert.notEqual(DB.sqlite.prepare('SELECT password_hash FROM learner_accounts').get().password_hash,credentials.password);
  assert.equal((await call('/register',credentials)).status,409);
  assert.equal((await request('teacher/live',null,session)).status,401);
  assert.equal((await call('/course',{course:'unknown',saved:true},session)).status,400);
  assert.deepEqual((await call('/course',{course:'python',saved:true},session)).json.courses,['python']);
  assert.deepEqual((await call('/course',{course:'python',saved:true},session)).json.courses,['python']);
  assert.equal((await call('/logout',{},session)).status,200);
  assert.equal((await call('',null,session)).json.account,null);
  assert.equal((await call('/login',{...credentials,password:'incorrect-password'})).status,401);
  const login=await call('/login',credentials);
  assert.deepEqual(login.json.courses,['python']);
  const active=login.cookie.split(';')[0];
  assert.deepEqual((await call('/course',{course:'python',saved:false},active)).json.courses,[]);
  assert.deepEqual((await call('',null,active)).json.courses,[]);
});
