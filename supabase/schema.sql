-- HRVec-Andaman2 v1. Run once in a NEW Supabase project, using SQL Editor.
begin;
create table public.schools(id integer primary key check(id between 1 and 7),name text not null,province text not null);
insert into public.schools values (1,'วิทยาลัยเทคนิคระนอง','ระนอง'),(2,'วิทยาลัยเทคนิคพังงา','พังงา'),(3,'วิทยาลัยเทคนิคภูเก็ต','ภูเก็ต'),(4,'วิทยาลัยอาชีวศึกษาภูเก็ต','ภูเก็ต'),(5,'วิทยาลัยเทคนิคกระบี่','กระบี่'),(6,'วิทยาลัยเทคนิคตรัง','ตรัง'),(7,'วิทยาลัยการอาชีพตรัง','ตรัง');
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,role text not null default 'personnel' check(role in ('admin','personnel')));
create function public.create_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,role) values(new.id,'personnel');return new;end $$;
create trigger new_auth_user after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create table public.personnel(id uuid primary key default gen_random_uuid(),user_id uuid unique references auth.users(id) on delete set null,employee_code text unique not null check(length(trim(employee_code)) between 1 and 50),full_name text not null check(length(trim(full_name)) between 1 and 200),school_id integer not null references public.schools(id),position text not null default 'ครู',status text not null default 'ปฏิบัติงาน',department text not null default '',academic_rank text not null default '',birth_date date,start_date date,retirement_override date,email text not null default '',phone text not null default '',address text not null default '',avatar_data text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(start_date is null or birth_date is null or start_date>=birth_date),check(avatar_data is null or (length(avatar_data)<400000 and avatar_data ~ '^data:image/(jpeg|png|webp);base64,')));
create table public.document_types(id integer primary key,name text not null,required boolean not null default false,positions text[] not null default '{}');
insert into public.document_types(id,name,required) values (1,'ก.ค.ศ.16 (ทะเบียนประวัติ)',true),(2,'วุฒิการศึกษา / ใบรับรอง / ปริญญา',true),(3,'คำสั่งแต่งตั้ง / บรรจุ / ย้าย / โอน',false),(4,'เปลี่ยนตำแหน่ง / วิทยฐานะ',false),(5,'ใบประกอบวิชาชีพ',false),(6,'วุฒิบัตรอบรม / เกียรติบัตร',false),(7,'คำสั่งเลื่อนเงินเดือน / เอกสารเงินเดือน',false),(8,'เอกสารส่วนตัว',false),(9,'เครื่องราชอิสริยาภรณ์',false);
create table public.documents(id uuid primary key default gen_random_uuid(),personnel_id uuid not null references public.personnel(id),type_id integer not null references public.document_types(id),file_name text not null,drive_file_id text unique not null,mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),size_bytes integer not null check(size_bytes>0 and size_bytes<=10485760),status text not null default 'pending' check(status in ('pending','approved','returned')),review_note text not null default '',reviewer_id uuid references auth.users(id),reviewed_at timestamptz,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create table public.certificates(id uuid primary key default gen_random_uuid(),personnel_id uuid not null references public.personnel(id),kind text not null check(kind in ('administrator','vocational','teacher_license')),name text not null,number text not null,issuer text not null,issued_on date,expires_on date,document_id uuid references public.documents(id),created_at timestamptz not null default now(),check(expires_on is null or issued_on is null or expires_on>=issued_on));
create table public.lookups(category text not null check(category in ('position','status','department','academic_rank')),name text not null check(length(trim(name))>0),primary key(category,name));
insert into public.lookups select 'position',unnest(array['ผู้อำนวยการ','รองผู้อำนวยการ','ครู','ครูผู้ช่วย','พนักงานราชการ','เจ้าหน้าที่']);
insert into public.lookups select 'status',unnest(array['ปฏิบัติงาน','ย้าย','ลาออก','เกษียณอายุ']);
insert into public.lookups select 'department',unnest(array['วิชาการ','บริหารทรัพยากร','พัฒนากิจการนักเรียน','แผนงานและความร่วมมือ']);
insert into public.lookups select 'academic_rank',unnest(array['ไม่มีวิทยฐานะ','ชำนาญการ','ชำนาญการพิเศษ','เชี่ยวชาญ','เชี่ยวชาญพิเศษ']);
create table public.settings(id integer primary key check(id=1),organization text not null,logo_url text not null default '',notify_email text not null default '',notifications boolean not null default false,expiry_days integer not null default 90 check(expiry_days between 1 and 365));
insert into public.settings values(1,'สถาบันการอาชีวศึกษาภาคใต้ 2','https://img2.pic.in.th/S__15728643.th.jpg','',false,90);
create table public.audit_log(id uuid primary key default gen_random_uuid(),actor_id uuid,action text not null,table_name text not null,record_id text,created_at timestamptz not null default now());
create table public.status_history(id uuid primary key default gen_random_uuid(),personnel_id uuid not null references public.personnel(id),old_data jsonb not null,new_data jsonb not null,actor_id uuid,changed_at timestamptz not null default now());
create index personnel_school_idx on public.personnel(school_id);
create index documents_person_idx on public.documents(personnel_id);
create index documents_status_idx on public.documents(status);
create index certificates_person_idx on public.certificates(personnel_id);
create index history_person_idx on public.status_history(personnel_id);
create index audit_created_idx on public.audit_log(created_at desc);
create function public.guard_personnel() returns trigger language plpgsql set search_path=public as $$ begin
 if tg_op='UPDATE' and auth.role()='authenticated' and not public.is_admin() then
  if (to_jsonb(new)-array['email','phone','address','avatar_data','updated_at']) is distinct from (to_jsonb(old)-array['email','phone','address','avatar_data','updated_at']) then raise exception 'บุคลากรแก้ไขได้เฉพาะข้อมูลติดต่อและรูปโปรไฟล์';end if;
 end if;
 if new.birth_date>current_date or new.start_date>current_date then raise exception 'วันเกิดหรือวันเริ่มงานเป็นอนาคต';end if;
 new.updated_at=now();return new;end $$;
create trigger personnel_guard before insert or update on public.personnel for each row execute function public.guard_personnel();
create function public.guard_document() returns trigger language plpgsql set search_path=public as $$ begin
 if auth.role()='authenticated' then
  if (to_jsonb(new)-array['status','review_note','reviewer_id','reviewed_at']) is distinct from (to_jsonb(old)-array['status','review_note','reviewer_id','reviewed_at']) then raise exception 'แก้ไขได้เฉพาะผลตรวจเอกสาร';end if;
  new.reviewer_id=auth.uid();new.reviewed_at=now();
 end if;
 if new.status='returned' and length(trim(new.review_note))=0 then raise exception 'ต้องระบุเหตุผลส่งกลับ';end if;return new;end $$;
create trigger document_guard before update on public.documents for each row execute function public.guard_document();
create function public.guard_certificate() returns trigger language plpgsql set search_path=public as $$ begin
 if new.document_id is not null and not exists(select 1 from public.documents where id=new.document_id and personnel_id=new.personnel_id) then raise exception 'หลักฐานไม่ตรงกับบุคลากร';end if;return new;end $$;
create trigger certificate_guard before insert or update on public.certificates for each row execute function public.guard_certificate();
create or replace function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$ declare j jsonb; o jsonb;begin
 j=to_jsonb(new);insert into public.audit_log(actor_id,action,table_name,record_id) values(auth.uid(),tg_op,tg_table_name,coalesce(j->>'id',j->>'name'));
 if tg_table_name='personnel' and tg_op='UPDATE' then
 o=to_jsonb(old);if (o->'status',o->'position',o->'academic_rank',o->'department') is distinct from (j->'status',j->'position',j->'academic_rank',j->'department') then
 insert into public.status_history(personnel_id,old_data,new_data,actor_id) values(new.id,jsonb_build_object('status',o->'status','position',o->'position','academic_rank',o->'academic_rank','department',o->'department'),jsonb_build_object('status',j->'status','position',j->'position','academic_rank',j->'academic_rank','department',j->'department'),auth.uid());end if;end if;return new;end $$;
do $$ declare t text;begin foreach t in array array['schools','profiles','personnel','document_types','documents','certificates','lookups','settings','audit_log','status_history'] loop execute format('alter table public.%I enable row level security',t);end loop;
foreach t in array array['schools','personnel','document_types','documents','certificates','lookups','settings'] loop execute format('create trigger audit_%I after insert or update on public.%I for each row execute function public.audit_change()',t,t);end loop;end $$;
create policy profile_self on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy person_read on public.personnel for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy person_insert on public.personnel for insert to authenticated with check(public.is_admin());
create policy person_update on public.personnel for update to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
create policy document_read on public.documents for select to authenticated using(public.is_admin() or exists(select 1 from public.personnel p where p.id=personnel_id and p.user_id=auth.uid()));
create policy document_review on public.documents for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy cert_read on public.certificates for select to authenticated using(public.is_admin() or exists(select 1 from public.personnel p where p.id=personnel_id and p.user_id=auth.uid()));
create policy cert_insert on public.certificates for insert to authenticated with check(public.is_admin());
create policy cert_update on public.certificates for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy history_read on public.status_history for select to authenticated using(public.is_admin() or exists(select 1 from public.personnel p where p.id=personnel_id and p.user_id=auth.uid()));
create policy audit_read on public.audit_log for select to authenticated using(public.is_admin());
do $$ declare t text;begin foreach t in array array['schools','document_types','lookups','settings'] loop
 execute format('create policy read_authenticated on public.%I for select to authenticated using (true)',t);
 execute format('create policy update_admin on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',t);
end loop;end $$;
create policy lookup_insert on public.lookups for insert to authenticated with check(public.is_admin());
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on public.schools,public.profiles,public.personnel,public.document_types,public.documents,public.certificates,public.lookups,public.settings,public.audit_log,public.status_history to authenticated;
grant insert,update on public.personnel,public.certificates,public.lookups to authenticated;
grant update on public.schools,public.document_types,public.settings to authenticated;
grant update(status,review_note) on public.documents to authenticated;
revoke all on function public.create_profile(),public.guard_personnel(),public.guard_document(),public.guard_certificate(),public.audit_change() from public,anon,authenticated;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;
-- Ensure backend service role can perform bridge inserts and exports.
grant all on all tables in schema public to service_role;
commit;

-- HRVec-Andaman2 1.2: education and combined personnel/certificate save.
-- It is safe to run again. No existing records are removed.
begin;
alter table public.personnel add column if not exists highest_education text not null default '';
create or replace function public.save_personnel_with_certificate(personnel_data jsonb,certificate_data jsonb default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare current_person public.personnel; candidate public.personnel; certificate_id uuid; k text;
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if jsonb_typeof(personnel_data)<>'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
 for k in select jsonb_object_keys(personnel_data) loop
  if not (k=any(array['id','employee_code','full_name','school_id','user_id','position','status','department','academic_rank','highest_education','birth_date','start_date','retirement_override','email','phone','address','avatar_data'])) then raise exception 'ไม่รองรับฟิลด์ %',k;end if;
 end loop;
 if personnel_data ? 'id' then
  select * into current_person from public.personnel where id=(personnel_data->>'id')::uuid for update;
  if not found then raise exception 'ไม่พบข้อมูลบุคลากร';end if;
 else
  insert into public.personnel(employee_code,full_name,school_id)
   values(personnel_data->>'employee_code',personnel_data->>'full_name',(personnel_data->>'school_id')::integer)
   returning * into current_person;
 end if;
 candidate=jsonb_populate_record(current_person,personnel_data-'id');
 if length(candidate.highest_education)>200 then raise exception 'วุฒิการศึกษายาวเกินกำหนด';end if;
 update public.personnel set employee_code=candidate.employee_code,full_name=candidate.full_name,school_id=candidate.school_id,user_id=candidate.user_id,
  position=candidate.position,status=candidate.status,department=candidate.department,academic_rank=candidate.academic_rank,
  highest_education=candidate.highest_education,birth_date=candidate.birth_date,start_date=candidate.start_date,retirement_override=candidate.retirement_override,
  email=candidate.email,phone=candidate.phone,address=candidate.address,avatar_data=candidate.avatar_data where id=current_person.id;
 if certificate_data is not null and certificate_data<>'null'::jsonb then
  if jsonb_typeof(certificate_data)<>'object' then raise exception 'ข้อมูลใบรับรองไม่ถูกต้อง';end if;
  if nullif(trim(certificate_data->>'name'),'') is null or nullif(trim(certificate_data->>'issuer'),'') is null then raise exception 'ต้องระบุชื่อใบรับรองและหน่วยงานผู้ออก';end if;
  if length(certificate_data->>'name')>300 or length(certificate_data->>'issuer')>300 or length(certificate_data->>'number')>300 then raise exception 'ข้อมูลใบรับรองยาวเกินกำหนด';end if;
  insert into public.certificates(personnel_id,kind,name,number,issuer,issued_on,expires_on)
  values(current_person.id,certificate_data->>'kind',trim(certificate_data->>'name'),coalesce(certificate_data->>'number',''),trim(certificate_data->>'issuer'),nullif(certificate_data->>'issued_on','')::date,nullif(certificate_data->>'expires_on','')::date)
  returning id into certificate_id;
 end if;
 return jsonb_build_object('id',current_person.id,'certificate_id',certificate_id);
end $$;
revoke all on function public.save_personnel_with_certificate(jsonb,jsonb) from public,anon;
grant execute on function public.save_personnel_with_certificate(jsonb,jsonb) to authenticated;
create or replace function public.hr_overview() returns jsonb
language sql stable security invoker set search_path='' as $$
 with config as (
  select coalesce((select expiry_days from public.settings where id=1),90) as days,
   (now() at time zone 'Asia/Bangkok')::date as asof
 ), scores as (
  select p.id,count(t.id) as total,count(t.id) filter(where exists(
   select 1 from public.documents d where d.personnel_id=p.id and d.type_id=t.id and d.status='approved'
  )) as done
  from public.personnel p left join public.document_types t on t.required
   and (cardinality(t.positions)=0 or p.position=any(t.positions)) group by p.id
 ), school_counts as (
  select s.id,s.name,s.province,count(p.id) as count from public.schools s
  left join public.personnel p on p.school_id=s.id group by s.id,s.name,s.province
 ), degrees as (
  select coalesce(nullif(trim(highest_education),''),'ยังไม่ระบุวุฒิ') as name,
   coalesce(nullif(trim(highest_education),''),'missing') as value,count(*) as count
  from public.personnel group by 1,2
 ), issuers as (
  select issuer,count(*) as count from public.certificates group by issuer
 )
 select jsonb_build_object(
  'expiryDays',config.days,
  'total',(select count(*) from public.personnel),
  'certificates',(select count(*) from public.certificates),
  'holders',(select count(distinct personnel_id) from public.certificates),
  'schools',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from school_counts s),'[]'::jsonb),
  'degrees',coalesce((select jsonb_agg(to_jsonb(d) order by d.count desc,d.name) from degrees d),'[]'::jsonb),
  'issuers',coalesce((select jsonb_agg(to_jsonb(i) order by i.count desc,i.issuer) from issuers i),'[]'::jsonb),
  'expiring',(select count(*) from public.certificates where expires_on between config.asof and config.asof+config.days),
  'expired',(select count(*) from public.certificates where expires_on<config.asof),
  'pending',(select count(*) from public.documents where status='pending'),
  'missingEducation',(select count(*) from public.personnel where nullif(trim(highest_education),'') is null),
  'incomplete',(select count(*) from scores where done<total),
  'required',coalesce((select sum(total) from scores),0),
  'done',coalesce((select sum(done) from scores),0)
 ) from config;
$$;
revoke all on function public.hr_overview() from public,anon;
grant execute on function public.hr_overview() to authenticated;

create or replace function public.record_admin_access(view_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if view_name is null or view_name not in ('personnel','documents','review','certificates','reports','settings','logs') then
  raise exception 'หน้าข้อมูลไม่ถูกต้อง';
 end if;
 insert into public.audit_log(actor_id,action,table_name,record_id)
 values(auth.uid(),'ADMIN_VIEW',view_name,null);
end;
$$;
revoke all on function public.record_admin_access(text) from public,anon;
grant execute on function public.record_admin_access(text) to authenticated;
commit;

-- HRVec-Andaman2 1.5: multiple majors and atomic personnel/certificate imports.
-- Run after the education_certificate and privacy_overview migrations.
begin;
alter table public.personnel add column if not exists education_majors text[] not null default '{}';

create or replace function public.guard_personnel() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and auth.role()='authenticated' and not public.is_admin() then
  if (to_jsonb(new)-array['email','phone','address','avatar_data','updated_at']) is distinct from (to_jsonb(old)-array['email','phone','address','avatar_data','updated_at']) then raise exception 'บุคลากรแก้ไขได้เฉพาะข้อมูลติดต่อและรูปโปรไฟล์';end if;
 end if;
 if new.birth_date>current_date or new.start_date>current_date then raise exception 'วันเกิดหรือวันเริ่มงานเป็นอนาคต';end if;
 if length(new.highest_education)>200 then raise exception 'วุฒิการศึกษายาวเกินกำหนด';end if;
 if cardinality(new.education_majors)>20 or exists(select 1 from unnest(new.education_majors) m where m is null or length(trim(m))=0 or length(m)>200) then raise exception 'สาขาวิชาต้องไม่ว่างและไม่เกิน 20 สาขา สาขาละ 200 ตัวอักษร';end if;
 if (select count(*) from unnest(new.education_majors) m)<>(select count(distinct trim(m)) from unnest(new.education_majors) m) then raise exception 'มีสาขาวิชาซ้ำ';end if;
 if cardinality(new.education_majors)>0 and nullif(trim(new.highest_education),'') is null then raise exception 'กรุณาระบุวุฒิการศึกษาสูงสุดของสาขาวิชา';end if;
 new.updated_at=now();return new;
end $$;

create or replace function public.guard_certificate() returns trigger language plpgsql set search_path=public as $$
begin
 if nullif(trim(new.name),'') is null or nullif(trim(new.issuer),'') is null then raise exception 'ต้องระบุชื่อใบรับรองและหน่วยงานผู้ออก';end if;
 if length(new.name)>300 or length(new.issuer)>300 or length(new.number)>300 then raise exception 'ข้อมูลใบรับรองยาวเกินกำหนด';end if;
 if new.document_id is not null and not exists(select 1 from public.documents where id=new.document_id and personnel_id=new.personnel_id) then raise exception 'หลักฐานไม่ตรงกับบุคลากร';end if;
 return new;
end $$;

create or replace function public.save_personnel_with_certificate(personnel_data jsonb,certificate_data jsonb default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare current_person public.personnel; candidate public.personnel; certificate_id uuid; k text;
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if jsonb_typeof(personnel_data) is distinct from 'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
 for k in select jsonb_object_keys(personnel_data) loop
  if not (k=any(array['id','employee_code','full_name','school_id','user_id','position','status','department','academic_rank','highest_education','education_majors','birth_date','start_date','retirement_override','email','phone','address','avatar_data'])) then raise exception 'ไม่รองรับฟิลด์ %',k;end if;
 end loop;
 if personnel_data ? 'id' then
  select * into current_person from public.personnel where id=(personnel_data->>'id')::uuid for update;
  if not found then raise exception 'ไม่พบข้อมูลบุคลากร';end if;
 else
  insert into public.personnel(employee_code,full_name,school_id)
   values(personnel_data->>'employee_code',personnel_data->>'full_name',(personnel_data->>'school_id')::integer) returning * into current_person;
 end if;
 candidate=jsonb_populate_record(current_person,personnel_data-'id');
 update public.personnel set employee_code=candidate.employee_code,full_name=candidate.full_name,school_id=candidate.school_id,user_id=candidate.user_id,
  position=candidate.position,status=candidate.status,department=candidate.department,academic_rank=candidate.academic_rank,
  highest_education=candidate.highest_education,education_majors=candidate.education_majors,birth_date=candidate.birth_date,start_date=candidate.start_date,retirement_override=candidate.retirement_override,
  email=candidate.email,phone=candidate.phone,address=candidate.address,avatar_data=candidate.avatar_data where id=current_person.id;
 if certificate_data is not null and certificate_data<>'null'::jsonb then
  if jsonb_typeof(certificate_data)<>'object' then raise exception 'ข้อมูลใบรับรองไม่ถูกต้อง';end if;
  insert into public.certificates(personnel_id,kind,name,number,issuer,issued_on,expires_on)
  values(current_person.id,certificate_data->>'kind',trim(certificate_data->>'name'),coalesce(certificate_data->>'number',''),trim(certificate_data->>'issuer'),nullif(certificate_data->>'issued_on','')::date,nullif(certificate_data->>'expires_on','')::date) returning id into certificate_id;
 end if;
 return jsonb_build_object('id',current_person.id,'certificate_id',certificate_id);
end $$;

create or replace function public.import_personnel_bundle(records jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare item jsonb; cert jsonb; certs jsonb; saved jsonb; normalized jsonb; seen jsonb; k text;
 person_count integer:=0; certificate_count integer:=0; cert_index integer;
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if jsonb_typeof(records) is distinct from 'array' then raise exception 'ข้อมูลนำเข้าต้องเป็นรายการ';end if;
 if jsonb_array_length(records) not between 1 and 500 then raise exception 'นำเข้าได้ครั้งละ 1–500 คน';end if;
 for item in select value from jsonb_array_elements(records) loop
  person_count=person_count+1;
  begin
   if jsonb_typeof(item) is distinct from 'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
   for k in select jsonb_object_keys(item) loop
    if not (k=any(array['employee_code','full_name','school_id','position','status','department','academic_rank','highest_education','education_majors','birth_date','start_date','email','phone','address','certificates'])) then raise exception 'ไม่รองรับฟิลด์ %',k;end if;
   end loop;
   certs=coalesce(item->'certificates','[]'::jsonb);
   if jsonb_typeof(certs) is distinct from 'array' then raise exception 'ใบรับรองต้องเป็นรายการ';end if;
   if jsonb_array_length(certs)>100 then raise exception 'ใบรับรองต้องไม่เกิน 100 ใบต่อคน';end if;
   saved=public.save_personnel_with_certificate(item-'certificates',null);
   seen='[]'::jsonb;cert_index=0;
   for cert in select value from jsonb_array_elements(certs) loop
    cert_index=cert_index+1;
    if jsonb_typeof(cert) is distinct from 'object' then raise exception 'ใบรับรองลำดับ % ไม่ถูกต้อง',cert_index;end if;
    for k in select jsonb_object_keys(cert) loop
     if not (k=any(array['kind','name','issuer','number','issued_on','expires_on'])) then raise exception 'ไม่รองรับฟิลด์ใบรับรอง %',k;end if;
    end loop;
    normalized=jsonb_build_object('kind',cert->>'kind','name',trim(cert->>'name'),'issuer',trim(cert->>'issuer'),'number',coalesce(trim(cert->>'number'),''),'issued_on',nullif(cert->>'issued_on',''),'expires_on',nullif(cert->>'expires_on',''));
    if seen @> jsonb_build_array(normalized) then raise exception 'ใบรับรองลำดับ % ซ้ำ',cert_index;end if;
    seen=seen||jsonb_build_array(normalized);
    insert into public.certificates(personnel_id,kind,name,number,issuer,issued_on,expires_on)
     values((saved->>'id')::uuid,normalized->>'kind',normalized->>'name',normalized->>'number',normalized->>'issuer',(normalized->>'issued_on')::date,(normalized->>'expires_on')::date);
    certificate_count=certificate_count+1;
    if certificate_count>5000 then raise exception 'ใบรับรองต้องไม่เกิน 5,000 ใบต่อครั้ง';end if;
   end loop;
  exception when others then raise exception 'บุคลากรลำดับ % (แถว %): %',person_count,person_count+1,sqlerrm using errcode=sqlstate;
  end;
 end loop;
 return jsonb_build_object('personnel_count',person_count,'certificate_count',certificate_count);
end $$;
revoke all on function public.guard_personnel(),public.guard_certificate() from public,anon,authenticated;
revoke all on function public.save_personnel_with_certificate(jsonb,jsonb),public.import_personnel_bundle(jsonb) from public,anon;
grant execute on function public.save_personnel_with_certificate(jsonb,jsonb),public.import_personnel_bundle(jsonb) to authenticated;
commit;

-- HRVec-Andaman2 1.6: reviewed changes, optimistic locking, recoverable deletion.
-- Requires all previous migrations. Safe to repeat; it never removes personnel.
begin;
alter table public.personnel add column if not exists revision integer not null default 1 check(revision>0);
alter table public.personnel add column if not exists deleted_at timestamptz;
alter table public.personnel add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.personnel add column if not exists delete_reason text not null default '';
create index if not exists personnel_active_school_idx on public.personnel(school_id) where deleted_at is null;
create table if not exists public.personnel_changes(
 id uuid primary key default gen_random_uuid(),personnel_id uuid not null references public.personnel(id),
 revision integer not null,action text not null check(action in ('CREATE','UPDATE','DELETE','RESTORE','BASELINE')),
 old_data jsonb not null,new_data jsonb not null,reason text not null,actor_id uuid,
 actor_role text not null,changed_at timestamptz not null default now(),unique(personnel_id,revision)
);
alter table public.personnel_changes enable row level security;
drop policy if exists changes_admin_read on public.personnel_changes;
create policy changes_admin_read on public.personnel_changes for select to authenticated using(public.is_admin());
revoke all on public.personnel_changes from public,anon,authenticated;
grant select on public.personnel_changes to authenticated;
grant all on public.personnel_changes to service_role;

-- Keep small snapshots; never copy image binaries into the history table.
create or replace function public.personnel_snapshot(p public.personnel) returns jsonb
language sql immutable set search_path='' as $$
 select (to_jsonb(p)-array['created_at','updated_at','revision','avatar_data'])
  ||jsonb_build_object('avatar_data',case when p.avatar_data is null or p.avatar_data='' then '' else 'รูปโปรไฟล์ #'||substr(md5(p.avatar_data),1,12) end);
$$;
create or replace function public.track_personnel_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare action_name text; previous jsonb:='{}'::jsonb; reason_text text;
begin
 if tg_op='INSERT' then action_name='CREATE';
 else
  previous=public.personnel_snapshot(old);
  action_name=case when old.deleted_at is null and new.deleted_at is not null then 'DELETE'
   when old.deleted_at is not null and new.deleted_at is null then 'RESTORE' else 'UPDATE' end;
 end if;
 reason_text=coalesce(nullif(current_setting('hr.change_reason',true),''),case when tg_op='INSERT' then 'เพิ่มบุคลากร' else 'ปรับปรุงโดยระบบหลังบ้าน' end);
 insert into public.personnel_changes(personnel_id,revision,action,old_data,new_data,reason,actor_id,actor_role)
 values(new.id,new.revision,action_name,previous,public.personnel_snapshot(new),reason_text,auth.uid(),
  case when auth.uid() is null then 'system' when public.is_admin() then 'admin' else 'personnel' end);
 return new;
end $$;
insert into public.personnel_changes(personnel_id,revision,action,old_data,new_data,reason,actor_id,actor_role)
 select p.id,p.revision,'BASELINE','{}'::jsonb,public.personnel_snapshot(p),'ข้อมูลก่อนอัปเกรดรุ่น 1.6',null,'system'
 from public.personnel p on conflict(personnel_id,revision) do nothing;
drop trigger if exists personnel_change_history on public.personnel;
create trigger personnel_change_history after insert or update on public.personnel for each row execute function public.track_personnel_change();

create or replace function public.guard_personnel() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and auth.role()='authenticated' and not public.is_admin() then
  if old.deleted_at is not null then raise exception 'รายการนี้ถูกลบแล้ว';end if;
  if (to_jsonb(new)-array['email','phone','address','avatar_data','updated_at']) is distinct from (to_jsonb(old)-array['email','phone','address','avatar_data','updated_at']) then raise exception 'บุคลากรแก้ไขได้เฉพาะข้อมูลติดต่อและรูปโปรไฟล์';end if;
 end if;
 if new.birth_date>current_date or new.start_date>current_date then raise exception 'วันเกิดหรือวันเริ่มงานเป็นอนาคต';end if;
 if length(new.highest_education)>200 then raise exception 'วุฒิการศึกษายาวเกินกำหนด';end if;
 if cardinality(new.education_majors)>20 or exists(select 1 from unnest(new.education_majors) m where m is null or length(trim(m))=0 or length(m)>200) then raise exception 'สาขาวิชาต้องไม่ว่างและไม่เกิน 20 สาขา สาขาละ 200 ตัวอักษร';end if;
 if (select count(*) from unnest(new.education_majors) m)<>(select count(distinct trim(m)) from unnest(new.education_majors) m) then raise exception 'มีสาขาวิชาซ้ำ';end if;
 if cardinality(new.education_majors)>0 and nullif(trim(new.highest_education),'') is null then raise exception 'กรุณาระบุวุฒิการศึกษาสูงสุดของสาขาวิชา';end if;
 if new.deleted_at is not null and length(trim(new.delete_reason)) not between 5 and 1000 then raise exception 'กรุณาระบุเหตุผลการลบ 5–1,000 ตัวอักษร';end if;
 new.revision=case when tg_op='INSERT' then 1 else old.revision+1 end;
 new.updated_at=clock_timestamp();return new;
end $$;

-- Internal atomic writer: callable only by the checked RPCs below.
create or replace function public.write_personnel_internal(personnel_data jsonb,certificate_data jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_person public.personnel; candidate public.personnel; certificate_id uuid; k text;
begin
 if jsonb_typeof(personnel_data) is distinct from 'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
 for k in select jsonb_object_keys(personnel_data) loop
  if not (k=any(array['id','employee_code','full_name','school_id','user_id','position','status','department','academic_rank','highest_education','education_majors','birth_date','start_date','retirement_override','email','phone','address','avatar_data'])) then raise exception 'ไม่รองรับฟิลด์ %',k;end if;
 end loop;
 if personnel_data ? 'id' then
  select * into current_person from public.personnel where id=(personnel_data->>'id')::uuid for update;
  if not found or current_person.deleted_at is not null then raise exception 'ไม่พบข้อมูลบุคลากรที่ใช้งานอยู่';end if;
  candidate=jsonb_populate_record(current_person,personnel_data-'id');
  update public.personnel set employee_code=candidate.employee_code,full_name=candidate.full_name,school_id=candidate.school_id,user_id=candidate.user_id,
   position=candidate.position,status=candidate.status,department=candidate.department,academic_rank=candidate.academic_rank,
   highest_education=candidate.highest_education,education_majors=candidate.education_majors,birth_date=candidate.birth_date,start_date=candidate.start_date,retirement_override=candidate.retirement_override,
   email=candidate.email,phone=candidate.phone,address=candidate.address,avatar_data=candidate.avatar_data where id=current_person.id returning * into current_person;
 else
  candidate=jsonb_populate_record(null::public.personnel,personnel_data);
  insert into public.personnel(employee_code,full_name,school_id,user_id,position,status,department,academic_rank,highest_education,education_majors,birth_date,start_date,retirement_override,email,phone,address,avatar_data)
   values(candidate.employee_code,candidate.full_name,candidate.school_id,candidate.user_id,coalesce(candidate.position,'ครู'),coalesce(candidate.status,'ปฏิบัติงาน'),coalesce(candidate.department,''),coalesce(candidate.academic_rank,''),coalesce(candidate.highest_education,''),coalesce(candidate.education_majors,'{}'),candidate.birth_date,candidate.start_date,candidate.retirement_override,coalesce(candidate.email,''),coalesce(candidate.phone,''),coalesce(candidate.address,''),candidate.avatar_data) returning * into current_person;
 end if;
 if certificate_data is not null and certificate_data<>'null'::jsonb then
  if jsonb_typeof(certificate_data) is distinct from 'object' then raise exception 'ข้อมูลใบรับรองไม่ถูกต้อง';end if;
  insert into public.certificates(personnel_id,kind,name,number,issuer,issued_on,expires_on)
   values(current_person.id,certificate_data->>'kind',trim(certificate_data->>'name'),coalesce(certificate_data->>'number',''),trim(certificate_data->>'issuer'),nullif(certificate_data->>'issued_on','')::date,nullif(certificate_data->>'expires_on','')::date) returning id into certificate_id;
 end if;
 return jsonb_build_object('id',current_person.id,'revision',current_person.revision,'certificate_id',certificate_id);
end $$;

-- Legacy entry point is now create-only; Excel import remains compatible.
create or replace function public.save_personnel_with_certificate(personnel_data jsonb,certificate_data jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if personnel_data ? 'id' then raise exception 'แก้ไขผ่านหน้าตรวจสอบข้อมูลรุ่น 1.6 เท่านั้น';end if;
 perform set_config('hr.change_reason','เพิ่มบุคลากร / นำเข้าข้อมูลครั้งแรก',true);
 return public.write_personnel_internal(personnel_data,certificate_data);
end $$;

create or replace function public.save_personnel_reviewed(personnel_data jsonb,certificate_data jsonb default null,expected_revision integer default null,change_reason text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_person public.personnel; k text; admin_user boolean:=public.is_admin();
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบ' using errcode='42501';end if;
 if jsonb_typeof(personnel_data) is distinct from 'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
 if personnel_data ? 'id' then
  select * into current_person from public.personnel where id=(personnel_data->>'id')::uuid for update;
  if not found or (not admin_user and current_person.user_id is distinct from auth.uid()) then raise exception 'ไม่มีสิทธิ์เข้าถึงบุคลากร' using errcode='42501';end if;
  if current_person.deleted_at is not null then raise exception 'รายการนี้ถูกลบแล้ว กรุณาโหลดรายชื่อใหม่';end if;
  if expected_revision is null or current_person.revision<>expected_revision then raise exception 'ข้อมูลถูกเปลี่ยนแปลงโดยผู้อื่น กรุณาโหลดรายชื่อใหม่แล้วตรวจสอบอีกครั้ง' using errcode='40001';end if;
  if length(trim(change_reason)) not between 5 and 1000 or change_reason is null then raise exception 'กรุณาระบุเหตุผล 5–1,000 ตัวอักษร';end if;
 else
  if not admin_user then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
  change_reason='เพิ่มบุคลากร';
 end if;
 if not admin_user then
  if certificate_data is not null and certificate_data<>'null'::jsonb then raise exception 'เฉพาะผู้ดูแลระบบจัดการใบรับรอง' using errcode='42501';end if;
  for k in select jsonb_object_keys(personnel_data) loop
   if not(k=any(array['id','email','phone','address','avatar_data'])) then raise exception 'บุคลากรแก้ไขได้เฉพาะข้อมูลติดต่อและรูปโปรไฟล์' using errcode='42501';end if;
  end loop;
 end if;
 perform set_config('hr.change_reason',trim(change_reason),true);
 return public.write_personnel_internal(personnel_data,certificate_data);
end $$;

create or replace function public.change_personnel_lifecycle(personnel_id uuid,expected_revision integer,operation text,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.personnel;
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if operation is null or operation not in ('delete','restore') then raise exception 'คำสั่งไม่ถูกต้อง';end if;
 if reason is null or length(trim(reason)) not between 5 and 1000 then raise exception 'กรุณาระบุเหตุผล 5–1,000 ตัวอักษร';end if;
 select * into p from public.personnel where id=personnel_id for update;
 if not found then raise exception 'ไม่พบข้อมูลบุคลากร';end if;
 if expected_revision is null or p.revision<>expected_revision then raise exception 'ข้อมูลถูกเปลี่ยนแปลงโดยผู้อื่น กรุณาโหลดรายชื่อใหม่แล้วตรวจสอบอีกครั้ง' using errcode='40001';end if;
 if operation='delete' and p.deleted_at is not null then raise exception 'รายการนี้ถูกลบแล้ว';end if;
 if operation='restore' and p.deleted_at is null then raise exception 'รายการนี้ใช้งานอยู่แล้ว';end if;
 perform set_config('hr.change_reason',trim(reason),true);
 update public.personnel set deleted_at=case when operation='delete' then clock_timestamp() else null end,
  deleted_by=case when operation='delete' then auth.uid() else null end,
  delete_reason=case when operation='delete' then trim(reason) else '' end where id=p.id returning * into p;
 return jsonb_build_object('id',p.id,'revision',p.revision,'deleted',p.deleted_at is not null);
end $$;

-- Only checked RPCs can update personnel. Even an admin's direct REST PATCH is denied.
revoke insert,update on public.personnel from authenticated;
revoke all on function public.personnel_snapshot(public.personnel),public.track_personnel_change(),public.write_personnel_internal(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.save_personnel_with_certificate(jsonb,jsonb),public.save_personnel_reviewed(jsonb,jsonb,integer,text),public.change_personnel_lifecycle(uuid,integer,text,text) from public,anon;
grant execute on function public.save_personnel_with_certificate(jsonb,jsonb),public.save_personnel_reviewed(jsonb,jsonb,integer,text),public.change_personnel_lifecycle(uuid,integer,text,text) to authenticated;

drop policy if exists person_read on public.personnel;
create policy person_read on public.personnel for select to authenticated using(public.is_admin() or (deleted_at is null and user_id=auth.uid()));
drop policy if exists document_read on public.documents;
create policy document_read on public.documents for select to authenticated using(exists(select 1 from public.personnel p where p.id=personnel_id and p.deleted_at is null and (public.is_admin() or p.user_id=auth.uid())));
drop policy if exists cert_read on public.certificates;
create policy cert_read on public.certificates for select to authenticated using(exists(select 1 from public.personnel p where p.id=personnel_id and p.deleted_at is null and (public.is_admin() or p.user_id=auth.uid())));

create or replace function public.guard_active_personnel_document() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.personnel where id=new.personnel_id and deleted_at is null for share;
 if not found then raise exception 'บุคลากรถูกลบแล้ว ไม่สามารถแก้ไขหรือเพิ่มเอกสารได้';end if;
 return new;
end $$;
drop trigger if exists document_active_parent on public.documents;
create trigger document_active_parent before insert or update on public.documents for each row execute function public.guard_active_personnel_document();
drop trigger if exists certificate_active_parent on public.certificates;
create trigger certificate_active_parent before insert or update on public.certificates for each row execute function public.guard_active_personnel_document();
revoke all on function public.guard_active_personnel_document() from public,anon,authenticated;

create or replace function public.hr_overview() returns jsonb
language sql stable security invoker set search_path='' as $$
 with active_people as (select * from public.personnel where deleted_at is null),
 active_certs as (select c.* from public.certificates c join active_people p on p.id=c.personnel_id),
 active_docs as (select d.* from public.documents d join active_people p on p.id=d.personnel_id),
 config as (select coalesce((select expiry_days from public.settings where id=1),90) as days,(now() at time zone 'Asia/Bangkok')::date as asof),
 scores as (select p.id,count(t.id) as total,count(t.id) filter(where exists(select 1 from active_docs d where d.personnel_id=p.id and d.type_id=t.id and d.status='approved')) as done
  from active_people p left join public.document_types t on t.required and (cardinality(t.positions)=0 or p.position=any(t.positions)) group by p.id),
 school_counts as (select s.id,s.name,s.province,count(p.id) as count from public.schools s left join active_people p on p.school_id=s.id group by s.id,s.name,s.province),
 degrees as (select coalesce(nullif(trim(highest_education),''),'ยังไม่ระบุวุฒิ') as name,coalesce(nullif(trim(highest_education),''),'missing') as value,count(*) as count from active_people group by 1,2),
 issuers as (select issuer,count(*) as count from active_certs group by issuer)
 select jsonb_build_object('expiryDays',config.days,'total',(select count(*) from active_people),'certificates',(select count(*) from active_certs),'holders',(select count(distinct personnel_id) from active_certs),
  'schools',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from school_counts s),'[]'::jsonb),
  'degrees',coalesce((select jsonb_agg(to_jsonb(d) order by d.count desc,d.name) from degrees d),'[]'::jsonb),
  'issuers',coalesce((select jsonb_agg(to_jsonb(i) order by i.count desc,i.issuer) from issuers i),'[]'::jsonb),
  'expiring',(select count(*) from active_certs where expires_on between config.asof and config.asof+config.days),
  'expired',(select count(*) from active_certs where expires_on<config.asof),'pending',(select count(*) from active_docs where status='pending'),
  'missingEducation',(select count(*) from active_people where nullif(trim(highest_education),'') is null),
  'incomplete',(select count(*) from scores where done<total),'required',coalesce((select sum(total) from scores),0),'done',coalesce((select sum(done) from scores),0)) from config;
$$;
create or replace function public.record_admin_access(view_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if view_name is null or view_name not in ('personnel','documents','review','certificates','reports','settings','logs','archive') then raise exception 'หน้าข้อมูลไม่ถูกต้อง';end if;
 insert into public.audit_log(actor_id,action,table_name,record_id) values(auth.uid(),'ADMIN_VIEW',view_name,null);
end $$;
commit;

-- HRVec-Andaman2 1.7. Existing accounts retain access; new accounts change password first.
begin;
alter table public.profiles add column if not exists username text unique check(username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,49}$');
alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.profiles alter column must_change_password set default true;
alter table public.profiles add column if not exists account_enabled boolean not null default true;
alter table public.profiles add column if not exists account_pending boolean not null default false;
alter table public.profiles add column if not exists account_revision integer not null default 0;
alter table public.profiles add column if not exists sessions_revoked_before timestamptz;

-- A refresh keeps the same session_id, so resetting a password also blocks old refreshed sessions.
create or replace function public.account_session_valid() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_enabled and not p.account_pending
  and (p.sessions_revoked_before is null or exists(select 1 from auth.sessions s
   where s.id::text=auth.jwt()->>'session_id' and s.user_id=p.id and s.created_at>p.sessions_revoked_before)));
$$;
create or replace function public.account_ready() returns boolean language sql stable security definer set search_path='' as $$
 select public.account_session_valid() and exists(select 1 from public.profiles where id=auth.uid() and not must_change_password);
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.account_ready() and exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function public.account_session_valid(),public.account_ready() from public,anon;
grant execute on function public.account_session_valid(),public.account_ready() to authenticated,service_role;
do $$ declare t text;begin
 foreach t in array array['schools','personnel','document_types','documents','certificates','lookups','settings','audit_log','status_history','personnel_changes'] loop
  execute format('drop policy if exists account_gate on public.%I',t);
  execute format('create policy account_gate on public.%I as restrictive for all to authenticated using ((select public.account_ready())) with check ((select public.account_ready()))',t);
 end loop;
end $$;

create or replace function public.bind_managed_account(personnel_id uuid,user_id uuid,expected_revision integer,actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p where p.id=user_id and p.role='personnel' and p.must_change_password and p.username is not null) then raise exception 'บัญชีไม่ถูกต้อง';end if;
 perform set_config('hr.change_reason','ผูกบัญชีผู้ใช้งานโดยแอดมิน',true);
 update public.personnel p set user_id=bind_managed_account.user_id where p.id=personnel_id and p.user_id is null and p.deleted_at is null and p.revision=expected_revision;
 if not found then raise exception 'ข้อมูลบุคลากรถูกเปลี่ยนแปลง กรุณาโหลดใหม่';end if;
 insert into public.audit_log(actor_id,action,table_name,record_id) values(actor,'ACCOUNT_CREATED','profiles',user_id::text);
end $$;
revoke all on function public.bind_managed_account(uuid,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.bind_managed_account(uuid,uuid,integer,uuid) to service_role;

-- Service-only start/finish make cross-service failures fail closed. No passwords are stored here.
create or replace function public.begin_account_change(target_id uuid,expected_revision integer) returns integer
language plpgsql security definer set search_path='' as $$
declare next_revision integer;
begin
 update public.profiles set account_pending=true,must_change_password=true,account_revision=account_revision+1,sessions_revoked_before=clock_timestamp()
  where id=target_id and account_revision=expected_revision returning account_revision into next_revision;
 if not found then raise exception 'บัญชีถูกเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่';end if;
 return next_revision;
end $$;
create or replace function public.finish_account_change(target_id uuid,expected_revision integer,force_change boolean,actor uuid,action_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if action_name not in ('PASSWORD_RESET','PASSWORD_CHANGED') then raise exception 'คำสั่งไม่ถูกต้อง';end if;
 update public.profiles set account_pending=false,must_change_password=force_change where id=target_id and account_revision=expected_revision and account_pending;
 if not found then raise exception 'บัญชีถูกเปลี่ยนแปลง กรุณาตรวจสอบใหม่';end if;
 insert into public.audit_log(actor_id,action,table_name,record_id) values(actor,action_name,'profiles',target_id::text);
end $$;
create or replace function public.set_account_enabled(target_id uuid,expected_revision integer,enabled boolean,actor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if enabled is null then raise exception 'คำสั่งไม่ถูกต้อง';end if;
 update public.profiles set account_enabled=enabled,account_revision=account_revision+1,sessions_revoked_before=clock_timestamp()
  where id=target_id and role='personnel' and account_revision=expected_revision;
 if not found then raise exception 'บัญชีถูกเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่';end if;
 insert into public.audit_log(actor_id,action,table_name,record_id) values(actor,case when enabled then 'ACCOUNT_ENABLED' else 'ACCOUNT_DISABLED' end,'profiles',target_id::text);
end $$;
revoke all on function public.begin_account_change(uuid,integer),public.finish_account_change(uuid,integer,boolean,uuid,text),public.set_account_enabled(uuid,integer,boolean,uuid) from public,anon,authenticated;
grant execute on function public.begin_account_change(uuid,integer),public.finish_account_change(uuid,integer,boolean,uuid,text),public.set_account_enabled(uuid,integer,boolean,uuid) to service_role;

create table if not exists public.personnel_requests(
 id uuid primary key default gen_random_uuid(),personnel_id uuid not null references public.personnel(id),requested_by uuid not null,
 personnel_revision integer not null,reason text not null check(length(trim(reason)) between 5 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 review_reason text not null default '',reviewed_by uuid,reviewed_at timestamptz,created_at timestamptz not null default now()
);
create unique index if not exists one_pending_removal on public.personnel_requests(personnel_id) where status='pending';
alter table public.personnel_requests enable row level security;
drop policy if exists request_read on public.personnel_requests;
create policy request_read on public.personnel_requests for select to authenticated using(public.account_ready() and (public.is_admin() or (requested_by=auth.uid() and exists(select 1 from public.personnel p where p.id=personnel_id and p.user_id=auth.uid() and p.deleted_at is null))));
revoke all on public.personnel_requests from public,anon,authenticated;
grant select on public.personnel_requests to authenticated;
grant all on public.personnel_requests to service_role;
drop policy if exists changes_admin_read on public.personnel_changes;
drop policy if exists changes_read on public.personnel_changes;
create policy changes_read on public.personnel_changes for select to authenticated using(public.is_admin() or exists(select 1 from public.personnel p where p.id=personnel_id and p.user_id=auth.uid() and p.deleted_at is null));

create or replace function public.request_personnel_removal(personnel_id uuid,expected_revision integer,reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.personnel; request_id uuid;
begin
 if not public.account_ready() then raise exception 'กรุณาเปลี่ยนรหัสผ่านหรือเข้าสู่ระบบใหม่' using errcode='42501';end if;
 select * into p from public.personnel where id=personnel_id and user_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'ไม่มีสิทธิ์ส่งคำขอสำหรับบุคลากรนี้' using errcode='42501';end if;
 if expected_revision is null or p.revision<>expected_revision then raise exception 'ข้อมูลถูกเปลี่ยนแปลง กรุณาโหลดรายชื่อใหม่';end if;
 insert into public.personnel_requests(personnel_id,requested_by,personnel_revision,reason) values(p.id,auth.uid(),p.revision,trim(reason)) returning id into request_id;
 insert into public.audit_log(actor_id,action,table_name,record_id) values(auth.uid(),'REMOVAL_REQUEST','personnel_requests',request_id::text);
 return request_id;
end $$;
create or replace function public.review_personnel_removal(request_id uuid,decision text,reason text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.personnel_requests;
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if decision is null or decision not in ('approve','reject') or reason is null or length(trim(reason)) not between 5 and 1000 then raise exception 'กรุณาตรวจผลพิจารณาและระบุเหตุผล 5–1,000 ตัวอักษร';end if;
 select * into r from public.personnel_requests where id=request_id for update;
 if not found or r.status<>'pending' then raise exception 'คำขอนี้ได้รับการพิจารณาแล้วหรือไม่พบข้อมูล';end if;
 if decision='approve' then perform public.change_personnel_lifecycle(r.personnel_id,r.personnel_revision,'delete',trim(reason));end if;
 update public.personnel_requests set status=case when decision='approve' then 'approved' else 'rejected' end,review_reason=trim(review_personnel_removal.reason),reviewed_by=auth.uid(),reviewed_at=clock_timestamp() where id=r.id;
 insert into public.audit_log(actor_id,action,table_name,record_id) values(auth.uid(),case when decision='approve' then 'REMOVAL_APPROVED' else 'REMOVAL_REJECTED' end,'personnel_requests',r.id::text);
end $$;
revoke all on function public.request_personnel_removal(uuid,integer,text),public.review_personnel_removal(uuid,text,text) from public,anon;
grant execute on function public.request_personnel_removal(uuid,integer,text),public.review_personnel_removal(uuid,text,text) to authenticated;
create or replace function public.save_personnel_reviewed(personnel_data jsonb,certificate_data jsonb default null,expected_revision integer default null,change_reason text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_person public.personnel; k text; admin_user boolean:=public.is_admin();
begin
 if not public.account_ready() then raise exception 'กรุณาเปลี่ยนรหัสผ่านหรือเข้าสู่ระบบใหม่' using errcode='42501';end if;
 if jsonb_typeof(personnel_data) is distinct from 'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
 if personnel_data ? 'id' then
  select * into current_person from public.personnel where id=(personnel_data->>'id')::uuid for update;
  if not found or (not admin_user and current_person.user_id is distinct from auth.uid()) then raise exception 'ไม่มีสิทธิ์เข้าถึงบุคลากร' using errcode='42501';end if;
  if current_person.deleted_at is not null then raise exception 'รายการนี้ถูกลบแล้ว กรุณาโหลดรายชื่อใหม่';end if;
  if expected_revision is null or current_person.revision<>expected_revision then raise exception 'ข้อมูลถูกเปลี่ยนแปลงโดยผู้อื่น กรุณาโหลดรายชื่อใหม่แล้วตรวจสอบอีกครั้ง' using errcode='40001';end if;
  if length(trim(change_reason)) not between 5 and 1000 or change_reason is null then raise exception 'กรุณาระบุเหตุผล 5–1,000 ตัวอักษร';end if;
 else
  if not admin_user then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
  change_reason='เพิ่มบุคลากร';
 end if;
 if not admin_user then
  if certificate_data is not null and certificate_data<>'null'::jsonb then raise exception 'เฉพาะผู้ดูแลระบบจัดการใบรับรอง' using errcode='42501';end if;
  for k in select jsonb_object_keys(personnel_data) loop
   if not(k=any(array['id','email','phone','address','avatar_data'])) then raise exception 'บุคลากรแก้ไขได้เฉพาะข้อมูลติดต่อและรูปโปรไฟล์' using errcode='42501';end if;
  end loop;
 end if;
 perform set_config('hr.change_reason',trim(change_reason),true);
 return public.write_personnel_internal(personnel_data,certificate_data);
end $$;


create or replace function public.record_admin_access(view_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if view_name is null or view_name not in ('personnel','documents','review','certificates','reports','settings','logs','archive','accounts','requests') then raise exception 'หน้าข้อมูลไม่ถูกต้อง';end if;
 insert into public.audit_log(actor_id,action,table_name,record_id) values(auth.uid(),'ADMIN_VIEW',view_name,null);
end $$;

commit;
