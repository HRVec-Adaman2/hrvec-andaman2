// Isolated test fixtures only. Never load this helper in application code.
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {setTimeout as pause} from 'node:timers/promises';

// A new sign-in must be later than the last revocation, including on a clock
// that returns the same timestamp for consecutive PGlite operations. Capture
// the clock once, wait if necessary, and keep the production strict > check.
export async function signInAs(db,userId){
 await db.exec('reset role');
 const sessionId=randomUUID(),started=performance.now();
 for(;;){
  const {rows}=await db.query(`
   with observed_clock as materialized (select clock_timestamp() as created_at)
   insert into auth.sessions(id,user_id,created_at)
   select $1::uuid,$2::uuid,c.created_at from observed_clock c
   where c.created_at>coalesce(
    (select p.sessions_revoked_before from public.profiles p where p.id=$2::uuid),
    '-infinity'::timestamptz)
   returning id`,[sessionId,userId]);
  if(rows.length)break;
  if(performance.now()-started>=2000)throw Error('Test clock did not advance beyond the session revocation timestamp');
  await pause(1);
 }
 await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false),set_config('request.jwt.claims',$2,false)",
  [userId,JSON.stringify({sub:userId,role:'authenticated',session_id:sessionId})]);
 await db.exec('set role authenticated');
 return sessionId;
}
