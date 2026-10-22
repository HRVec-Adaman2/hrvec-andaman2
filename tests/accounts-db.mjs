// Isolated PostgreSQL integration: node tests/accounts-db.mjs after installing PGlite.
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.HR_PGLITE_MODULE||'@electric-sql/pglite');const root=new URL('../',import.meta.url),schema=await readFile(new URL('supabase/schema.sql',root),'utf8'),migration=await readFile(new URL('supabase/migrations/20261020_managed_accounts.sql',root),'utf8');
const admin='00000000-0000-0000-0000-000000000001',staff='00000000-0000-0000-0000-000000000002',other='00000000-0000-0000-0000-000000000003';
const sessionA='10000000-0000-0000-0000-000000000001',sessionB='10000000-0000-0000-0000-000000000002',sessionC='10000000-0000-0000-0000-000000000003';
const fixture=`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz not null default clock_timestamp());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user)$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema auth to authenticated,anon,service_role;grant execute on all functions in schema auth to authenticated,anon,service_role;`;
const db=new PGlite();await db.exec(fixture);await db.exec(schema);await db.exec(`insert into auth.users values('${admin}'),('${staff}'),('${other}');update public.profiles set role='admin',username='admin' where id='${admin}';insert into auth.sessions(id,user_id) values('${sessionA}','${admin}'),('${sessionB}','${staff}');`);
async function as(id,session){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({session_id:session})]);await db.exec('set role authenticated');}
const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const reviewed=async(data,version=null)=>(await db.query('select public.save_personnel_reviewed($1::jsonb,null,$2,$3) as x',[JSON.stringify(data),version,'ตรวจแก้ข้อมูลบุคลากร'])).rows[0].x;
await as(admin,sessionA);assert.equal(await value('select public.account_session_valid()'),true);assert.equal(await value('select public.account_ready()'),false);assert.equal(await value('select public.is_admin()'),false);assert.equal(await value('select count(*)::int from public.schools'),0);
await assert.rejects(reviewed({employee_code:'DENY',full_name:'ยังไม่เปลี่ยนรหัส',school_id:1}),/เปลี่ยนรหัส/);await assert.rejects(db.query("update public.profiles set must_change_password=false"),/permission denied/);
// Simulate completion by the service-only, two-phase account workflow.
await db.exec('reset role;set role service_role');const rev=await value('select public.begin_account_change($1,0)',[admin]);assert.equal(rev,1);await db.query("select public.finish_account_change($1,1,false,$1,'PASSWORD_CHANGED')",[admin]);
await as(admin,sessionA);assert.equal(await value('select public.account_ready()'),false,'old session remains revoked even if the JWT was refreshed');
await db.exec('reset role');await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sessionC,admin]);await as(admin,sessionC);assert.equal(await value('select public.is_admin()'),true);assert.equal(await value('select count(*)::int from public.schools'),7);
const saved=await reviewed({employee_code:'001',full_name:'ทดสอบบัญชี',school_id:7,user_id:staff});
// New staff cannot bypass first change through a definer RPC.
await as(staff,sessionB);assert.equal(await value('select count(*)::int from public.personnel'),0);await assert.rejects(reviewed({id:saved.id,phone:'0811111111'},1),/เปลี่ยนรหัส/);
await db.exec('reset role');await db.query('update public.profiles set must_change_password=false where id=$1',[staff]);await as(staff,sessionB);assert.equal(await value('select count(*)::int from public.personnel'),1);
await assert.rejects(db.query('select public.begin_account_change($1,0)',[staff]),/permission denied/);
await assert.rejects(db.query('select public.set_account_enabled($1,0,true,$1)',[staff]),/permission denied/);
// Staff requests are owner-only and do not delete before administrative approval.
const request=await value('select public.request_personnel_removal($1,1,$2)',[saved.id,'ขอแก้ข้อมูลที่บันทึกผิด']);assert.equal(await value('select count(*)::int from public.personnel'),1);await assert.rejects(db.query('select public.request_personnel_removal($1,1,$2)',[saved.id,'ขอซ้ำอีกครั้ง']),/unique/);
await assert.rejects(db.query("select public.review_personnel_removal($1,'approve','ทดสอบอนุมัติเอง')",[request]),/ผู้ดูแล/);
await as(other,sessionB);await assert.rejects(db.query('select public.request_personnel_removal($1,1,$2)',[saved.id,'บุคคลอื่นขอลบ']),/เปลี่ยนรหัส/);assert.equal(await value('select count(*)::int from public.personnel_requests'),0);
await as(admin,sessionC);await db.query("select public.review_personnel_removal($1,'approve','ตรวจสอบแล้วอนุมัติลบ')",[request]);assert.equal(await value('select status from public.personnel_requests where id=$1',[request]),'approved');assert.equal(await value('select count(*)::int from public.personnel where deleted_at is null'),0);
await db.query("select public.change_personnel_lifecycle($1,2,'restore','คืนข้อมูลเพื่อทดสอบ')",[saved.id]);
await as(staff,sessionB);assert.ok((await db.query('select personnel_id from public.personnel_changes')).rows.every(h=>h.personnel_id===saved.id));
const staleRequest=await value('select public.request_personnel_removal($1,3,$2)',[saved.id,'ส่งคำขอก่อนเปลี่ยนเบอร์']);
await as(admin,sessionC);await reviewed({id:saved.id,phone:'0800000000'},3);
await assert.rejects(db.query("select public.review_personnel_removal($1,'approve','ทดสอบอนุมัติข้อมูลเก่า')",[staleRequest]),/ผู้อื่น/);
assert.equal(await value('select status from public.personnel_requests where id=$1',[staleRequest]),'pending');
await db.query("select public.review_personnel_removal($1,'reject','ข้อมูลเปลี่ยนแล้ว กรุณาส่งคำขอใหม่')",[staleRequest]);
// Reset cutoff blocks the same old session_id permanently; pending failures stay closed.
await db.exec('reset role;set role service_role');await db.query('select public.begin_account_change($1,0)',[staff]);await as(staff,sessionB);assert.equal(await value('select public.account_session_valid()'),false);assert.equal(await value('select count(*)::int from public.personnel'),0);
await db.exec('reset role;set role service_role');await db.query("select public.finish_account_change($1,1,true,$2,'PASSWORD_RESET')",[staff,admin]);await as(staff,sessionB);assert.equal(await value('select public.account_session_valid()'),false);
// Newly managed accounts bind exactly once at the expected personnel revision.
await as(admin,sessionC);const second=await reviewed({employee_code:'002',full_name:'บุคลากรบัญชีใหม่',school_id:2});
await db.exec('reset role');await db.query("update public.profiles set username='second.staff' where id=$1",[other]);
await db.exec("select set_config('request.jwt.claim.role','service_role',false),set_config('request.jwt.claim.sub','',false);set role service_role");
await db.query('select public.bind_managed_account($1,$2,1,$3)',[second.id,other,admin]);assert.equal(await value('select user_id from public.personnel where id=$1',[second.id]),other);
await assert.rejects(db.query('select public.bind_managed_account($1,$2,1,$3)',[second.id,other,admin]),/เปลี่ยนแปลง/);
// Repeating the migration never re-forces existing cleared accounts.
await db.exec('reset role');await db.exec(migration);await db.exec(migration);await as(admin,sessionC);assert.equal(await value('select public.account_ready()'),true);
await db.close();
const legacy=new PGlite();await legacy.exec(fixture);await legacy.exec(schema.slice(0,schema.indexOf('-- HRVec-Andaman2 1.7.')));
await legacy.exec(`insert into auth.users values('${admin}'),('${staff}');update public.profiles set role='admin' where id='${admin}';insert into public.personnel(employee_code,full_name,school_id,user_id) values('LEGACY','บุคลากรเดิม',1,'${staff}');insert into auth.sessions(id,user_id) values('${sessionB}','${staff}');`);
await legacy.exec(migration);await legacy.exec(migration);assert.equal((await legacy.query('select must_change_password from public.profiles where id=$1',[staff])).rows[0].must_change_password,false);
await legacy.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false),set_config('request.jwt.claims',$2,false)",[staff,JSON.stringify({session_id:sessionB})]);await legacy.exec('set role authenticated');assert.equal((await legacy.query('select public.account_ready() as ready')).rows[0].ready,true);assert.equal((await legacy.query('select employee_code from public.personnel')).rows[0].employee_code,'LEGACY');await legacy.close();
console.log('PASS: forced first change, RLS and definer gates, private account mutations, old refreshed sessions revoked, owner-only removal requests, admin approval, own history, legacy upgrade and repeat migration.');
