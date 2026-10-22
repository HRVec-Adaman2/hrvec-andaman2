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
