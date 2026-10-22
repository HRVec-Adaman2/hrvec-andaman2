// Optional database integration test: npm install --no-save @electric-sql/pglite@0.3.14
// Then: node tests/personnel-db.mjs (runs only in an isolated in-memory database).
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.HR_PGLITE_MODULE||'@electric-sql/pglite');
const root=new URL('../',import.meta.url),schema=await fs.readFile(new URL('supabase/schema.sql',root),'utf8'),migration=await fs.readFile(new URL('supabase/migrations/20261020_personnel_change_review.sql',root),'utf8');
const admin='00000000-0000-0000-0000-000000000001',staff='00000000-0000-0000-0000-000000000002',other='00000000-0000-0000-0000-000000000003';
const fixture=`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz not null default now());create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user)$$;grant usage on schema auth to authenticated,anon,service_role;grant execute on all functions in schema auth to authenticated,anon,service_role;`;
const cert={kind:'vocational',name:'ใบรับรองหนึ่ง',issuer:'หน่วยงานหนึ่ง',number:'',issued_on:'2024-01-01'};
async function setup(sql){const db=new PGlite();await db.exec(fixture);await db.exec(sql);await db.exec(`insert into auth.users values('${admin}'),('${staff}'),('${other}');update public.profiles set role='admin' where id='${admin}';do $$begin if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='must_change_password') then update public.profiles set must_change_password=false;end if;end $$;`);return db;}
async function as(db,id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[id]);await db.exec('set role authenticated');}
const count=async(db,table)=>+(await db.query(`select count(*) as n from public.${table}`)).rows[0].n;
const reviewed=async(db,data,version=null,reason='เพิ่มบุคลากร',certificate=null)=>(await db.query('select public.save_personnel_reviewed($1::jsonb,$2::jsonb,$3,$4) as result',[JSON.stringify(data),certificate?JSON.stringify(certificate):null,version,reason])).rows[0].result;
const lifecycle=async(db,id,version,action,reason)=>(await db.query('select public.change_personnel_lifecycle($1,$2,$3,$4) as result',[id,version,action,reason])).rows[0].result;
const db=await setup(schema);await as(db,admin);
const saved=await reviewed(db,{employee_code:'001',full_name:'ทดสอบ หนึ่ง',school_id:1,user_id:staff,position:'ผู้อำนวยการ',department:'',highest_education:'ปริญญาโท',education_majors:['สาขา A','สาขา B'],avatar_data:'data:image/png;base64,AAAA'},null,'เพิ่มบุคลากร',cert);assert.equal(saved.revision,1);
let history=(await db.query('select * from public.personnel_changes where personnel_id=$1',[saved.id])).rows;assert.equal(history.length,1);assert.equal(history[0].actor_id,admin);assert.doesNotMatch(JSON.stringify(history),/base64,AAAA/);
// Table mutation and internal entry points cannot bypass the review/concurrency RPC.
await assert.rejects(db.query("update public.personnel set phone='000' where id=$1",[saved.id]),/permission denied/);
await assert.rejects(db.query('select public.write_personnel_internal($1::jsonb,null)',[JSON.stringify({id:saved.id,phone:'000'})]),/permission denied/);
await assert.rejects(db.query('select public.save_personnel_with_certificate($1::jsonb,null)',[JSON.stringify({id:saved.id,phone:'000'})]),/1.6/);
const changed=await reviewed(db,{id:saved.id,phone:'0812345678',school_id:2},1,'แก้ไขตามทะเบียน');assert.equal(changed.revision,2);
const before=await count(db,'personnel_changes');await assert.rejects(reviewed(db,{id:saved.id,phone:'000'},1,'แก้ไขจากรุ่นเก่า'),/ผู้อื่น/);assert.equal(await count(db,'personnel_changes'),before);
await assert.rejects(reviewed(db,{id:saved.id,phone:'000'},null,'เหตุผลการเปลี่ยน'),/ผู้อื่น/);
await assert.rejects(reviewed(db,{id:saved.id,deleted_at:'2026-01-01'},2,'ลองแก้ไขข้อมูลลบ'),/ไม่รองรับ/);
// Staff may edit only their active contact data, without choosing another owner.
await as(db,staff);assert.equal(await count(db,'personnel'),1);await reviewed(db,{id:saved.id,phone:'0890000000'},2,'แก้ไขเบอร์ตนเอง');
await assert.rejects(reviewed(db,{id:saved.id,full_name:'ปลอม'},3,'เปลี่ยนชื่อเอง'),/เฉพาะข้อมูลติดต่อ/);
await assert.rejects(lifecycle(db,saved.id,3,'delete','ลองลบตนเอง'),/ผู้ดูแลระบบ/);assert.ok((await db.query('select personnel_id from public.personnel_changes')).rows.every(h=>h.personnel_id===saved.id));
await as(db,other);await assert.rejects(reviewed(db,{id:saved.id,email:'x@example.com'},3,'แก้ไขข้อมูลผู้อื่น'),/ไม่มีสิทธิ์/);assert.equal(await count(db,'personnel'),0);
await as(db,admin);
// Isolated trusted fixture stands in for a bridge-uploaded document.
await db.exec('reset role');await db.query("insert into public.documents(personnel_id,type_id,file_name,drive_file_id,mime_type,size_bytes) values($1,1,'เอกสาร.pdf','drive-test','application/pdf',100)",[saved.id]);await as(db,admin);
const snapshot=async()=>({overview:(await db.query('select public.hr_overview() as x')).rows[0].x,person:await count(db,'personnel'),cert:await count(db,'certificates'),docs:await count(db,'documents')});
const active=await snapshot();assert.equal(active.overview.total,1);assert.equal(active.cert,1);assert.equal(active.docs,1);
await assert.rejects(lifecycle(db,saved.id,3,'delete','สั้น'),/เหตุผล/);
await lifecycle(db,saved.id,3,'delete','กรอกข้อมูลผิดคน');const deleted=await snapshot();assert.equal(deleted.overview.total,0);assert.equal(deleted.overview.certificates,0);assert.equal(deleted.cert,0);assert.equal(deleted.docs,0);assert.equal(deleted.person,1);
await assert.rejects(reviewed(db,{id:saved.id,phone:'000'},4,'ลองแก้ไขหลังลบ'),/ถูกลบ/);
await assert.rejects(db.query("insert into public.certificates(personnel_id,kind,name,number,issuer) values($1,'vocational','ใหม่','','หน่วยงาน')",[saved.id]),/ถูกลบ/);
await assert.rejects(reviewed(db,{employee_code:'001',full_name:'ใช้เลขที่ซ้ำ',school_id:1}),/unique/);
await as(db,staff);assert.equal(await count(db,'personnel'),0);assert.equal(await count(db,'documents'),0);assert.equal(await count(db,'certificates'),0);await assert.rejects(reviewed(db,{id:saved.id,phone:'000'},4,'ลองแก้ไขหลังลบ'),/ถูกลบ/);
await as(db,admin);await assert.rejects(lifecycle(db,saved.id,3,'restore','ขอกู้คืนข้อมูล'),/ผู้อื่น/);
await lifecycle(db,saved.id,4,'restore','ตรวจทะเบียนแล้วกู้คืน');const restored=await snapshot();assert.equal(restored.overview.total,1);assert.equal(restored.cert,1);assert.equal(restored.docs,1);
history=(await db.query('select action,revision,reason from public.personnel_changes where personnel_id=$1 order by revision',[saved.id])).rows;assert.deepEqual(history.map(x=>x.action),['CREATE','UPDATE','UPDATE','DELETE','RESTORE']);assert.equal(history.at(-1).revision,5);
await db.query("insert into public.certificates(personnel_id,kind,name,number,issuer) values($1,'vocational','เพิ่มหลังคืน','','หน่วยงาน')",[saved.id]);assert.equal(await count(db,'certificates'),2);
// Multi-certificate import and a late failure stay atomic with the new history triggers.
const p=code=>({employee_code:code,full_name:'นำเข้า '+code,school_id:3,highest_education:'ปริญญาโท',education_majors:['A','B'],certificates:[cert,{...cert,name:'ใบสอง'}]});
await db.query('select public.import_personnel_bundle($1::jsonb)',[JSON.stringify([p('I-001'),p('I-002')])]);
const totals=[await count(db,'personnel'),await count(db,'certificates'),await count(db,'personnel_changes'),await count(db,'audit_log')];
await assert.rejects(db.query('select public.import_personnel_bundle($1::jsonb)',[JSON.stringify([p('FAIL-1'),{...p('FAIL-2'),certificates:[{...cert,issuer:''}]}])]));assert.deepEqual([await count(db,'personnel'),await count(db,'certificates'),await count(db,'personnel_changes'),await count(db,'audit_log')],totals);
await db.exec('reset role;set role anon');await assert.rejects(reviewed(db,{id:saved.id,phone:'000'},5,'ลองแก้ไขไม่ล็อกอิน'),/permission denied/);await db.close();
// Upgrade keeps old rows and seeds a single baseline; a repeated migration is harmless.
const old=await setup(schema.slice(0,schema.indexOf('-- HRVec-Andaman2 1.6:')));await as(old,admin);
const legacy=(await old.query('select public.save_personnel_with_certificate($1::jsonb,null) as x',[JSON.stringify({employee_code:'LEGACY',full_name:'ข้อมูลเดิม',school_id:1,status:'ย้าย',highest_education:'ปริญญาโท',education_majors:['สาขาเดิม']})])).rows[0].x;
await old.exec('reset role');await old.exec(migration);await old.exec(migration);await as(old,admin);assert.equal(await count(old,'personnel_changes'),1);
const legacyRow=(await old.query('select * from public.personnel where id=$1',[legacy.id])).rows[0];assert.equal(legacyRow.status,'ย้าย');assert.deepEqual(legacyRow.education_majors,['สาขาเดิม']);
await reviewed(old,{id:legacy.id,phone:'0811111111'},1,'แก้ไขหลังอัปเกรด');assert.equal((await old.query('select status from public.personnel where id=$1',[legacy.id])).rows[0].status,'ย้าย');await old.close();
console.log('PASS: fresh schema, repeated upgrade, reviewed edits, revision conflict rollback, admin/staff/anon permissions, archived documents/certificates, restore, image-safe history, and atomic Excel import.');
