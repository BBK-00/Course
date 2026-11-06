import { DatabaseSync } from 'node:sqlite';
// D1's asynchronous statement interface over real SQLite, with transactional batches.
export function memoryD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  function statement(sql, args = []) {
    return {
      bind: (...values) => statement(sql, values),
      first: async () => sqlite.prepare(sql).get(...args) || null,
      all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
      run: async () => { const r=sqlite.prepare(sql).run(...args); return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}; }
    };
  }
  let tail=Promise.resolve();
  return {
    prepare: statement,
    batch: statements => {const run=async()=>{sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}};const p=tail.then(run);tail=p.catch(()=>{});return p;},
    sqlite
  };
}
