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
