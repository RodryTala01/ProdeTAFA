import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { loginRetryAfter, recordLoginFailure, clearLoginFailures } from '../worker/auth-rate-limit';

let db: DatabaseSync;
const adapter=()=>({prepare(sql:string){let args:(string|number)[]=[];
 return {bind(...values:(string|number)[]){args=values;return this;},
   async first(){return db.prepare(sql).get(...args)??null;},
   async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}};}}) as unknown as D1Database;
beforeEach(()=>{db=new DatabaseSync(':memory:');db.exec(readFileSync('migrations/0019_login_rate_limits.sql','utf8'));});
afterEach(()=>db.close());

it('limits bad attempts per phone and permits login after the cooldown',async()=>{
 const d=adapter();const start=1800000000000;
 for(let i=0;i<8;i++) await recordLoginFailure(d,'1112345678','203.0.113.1',start);
 expect(await loginRetryAfter(d,'1112345678','203.0.113.2',start)).toBe(900);
 expect(await loginRetryAfter(d,'1112345678','203.0.113.2',start+901000)).toBe(0);
});
it('limits distributed failed attempts per IP without storing phone or IP',async()=>{
 const d=adapter();const start=1800000000000;
 for(let i=0;i<32;i++) await recordLoginFailure(d,String(i),'203.0.113.10',start);
 expect(await loginRetryAfter(d,'new-phone','203.0.113.10',start)).toBe(900);
 const stored=db.prepare('SELECT subject_key FROM login_attempts LIMIT 1').get() as {subject_key:string};
 expect(stored.subject_key).toMatch(/^[0-9a-f]{64}$/);
});
it('valid login clears phone failures but does not erase shared IP protection',async()=>{
 const d=adapter();const start=1800000000000;
 for(let i=0;i<8;i++)await recordLoginFailure(d,'1112345678',null,start);
 expect(await loginRetryAfter(d,'1112345678',null,start)).toBe(900);
 await clearLoginFailures(d,'1112345678');
 expect(await loginRetryAfter(d,'1112345678',null,start)).toBe(0);
});
