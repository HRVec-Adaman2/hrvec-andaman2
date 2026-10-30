-- HRVec-Andaman2 1.10 additive upgrade from 1.9. Run this file in SQL Editor.
-- Does not reset accounts, delete personnel, import the attached workbook, or modify RLS.
begin;
do $$begin
 if public.hr_schema_version() not in ('1.9.0','1.10.0') then
  raise exception 'กรุณาอัปเกรดฐานข้อมูลเป็นรุ่น 1.9 ก่อน';
 end if;
end $$;
alter table public.personnel add column if not exists university_rank text not null default '';
alter table public.personnel add column if not exists administration_field text not null default '';
alter table public.personnel drop constraint if exists personnel_university_rank_check;
alter table public.personnel add constraint personnel_university_rank_check check(university_rank in ('','อาจารย์','ผู้ช่วยศาสตราจารย์','รองศาสตราจารย์','ศาสตราจารย์'));
alter table public.personnel drop constraint if exists personnel_administration_field_check;
alter table public.personnel add constraint personnel_administration_field_check check(length(administration_field)<=200);
alter table public.lookups drop constraint if exists lookups_category_check;
alter table public.lookups add constraint lookups_category_check check(category in ('position','status','department','institute_department','academic_rank','administration_field'));
insert into public.lookups(category,name) select 'position',unnest(array['อาจารย์','พนักงานบริหารงานทั่วไป']) on conflict do nothing;
insert into public.lookups(category,name) select 'administration_field',unnest(array['บริหารงานบุคคล','การเงินและบัญชี','พัสดุ','แผนงานและงบประมาณ','เทคโนโลยีสารสนเทศ','สารบรรณและธุรการ','ประสานงานและความร่วมมือ']) on conflict do nothing;

create or replace function public.write_personnel_internal(personnel_data jsonb,certificate_data jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_person public.personnel; candidate public.personnel; certificate_id uuid; k text;
begin
 if jsonb_typeof(personnel_data) is distinct from 'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
 for k in select jsonb_object_keys(personnel_data) loop
  if not (k=any(array['id','employee_code','full_name','school_id','user_id','position','status','department','work_unit','university_rank','administration_field','academic_rank','highest_education','education_majors','birth_date','start_date','retirement_override','email','phone','avatar_data'])) then raise exception 'ไม่รองรับฟิลด์ %',k;end if;
 end loop;
 if personnel_data ? 'id' then
  select * into current_person from public.personnel where id=(personnel_data->>'id')::uuid for update;
  if not found or current_person.deleted_at is not null then raise exception 'ไม่พบข้อมูลบุคลากรที่ใช้งานอยู่';end if;
  candidate=jsonb_populate_record(current_person,personnel_data-'id');
  update public.personnel set employee_code=candidate.employee_code,full_name=candidate.full_name,school_id=candidate.school_id,user_id=candidate.user_id,
   position=candidate.position,status=candidate.status,department=candidate.department,work_unit=candidate.work_unit,university_rank=candidate.university_rank,administration_field=candidate.administration_field,academic_rank=candidate.academic_rank,
   highest_education=candidate.highest_education,education_majors=candidate.education_majors,birth_date=candidate.birth_date,start_date=candidate.start_date,retirement_override=candidate.retirement_override,
   email=candidate.email,phone=candidate.phone,avatar_data=candidate.avatar_data where id=current_person.id returning * into current_person;
 else
  candidate=jsonb_populate_record(null::public.personnel,personnel_data);
  insert into public.personnel(employee_code,full_name,school_id,user_id,position,status,department,work_unit,university_rank,administration_field,academic_rank,highest_education,education_majors,birth_date,start_date,retirement_override,email,phone,avatar_data)
   values(candidate.employee_code,candidate.full_name,candidate.school_id,candidate.user_id,coalesce(candidate.position,'ครู'),coalesce(candidate.status,'ปฏิบัติงาน'),coalesce(candidate.department,''),coalesce(candidate.work_unit,''),coalesce(candidate.university_rank,''),coalesce(candidate.administration_field,''),coalesce(candidate.academic_rank,''),coalesce(candidate.highest_education,''),coalesce(candidate.education_majors,'{}'),candidate.birth_date,candidate.start_date,candidate.retirement_override,coalesce(candidate.email,''),coalesce(candidate.phone,''),candidate.avatar_data) returning * into current_person;
 end if;
 if certificate_data is not null and certificate_data<>'null'::jsonb then
  if jsonb_typeof(certificate_data) is distinct from 'object' then raise exception 'ข้อมูลใบรับรองไม่ถูกต้อง';end if;
  if exists(select 1 from jsonb_object_keys(certificate_data) as ck(key) where ck.key not in ('kind','name','issuer','number','issued_on','expires_on','occupation','competency_level','standard')) then raise exception 'ไม่รองรับฟิลด์ใบรับรอง';end if;
  insert into public.certificates(personnel_id,kind,name,number,issuer,issued_on,expires_on,occupation,competency_level,standard)
   values(current_person.id,certificate_data->>'kind',trim(certificate_data->>'name'),coalesce(certificate_data->>'number',''),trim(certificate_data->>'issuer'),nullif(certificate_data->>'issued_on','')::date,nullif(certificate_data->>'expires_on','')::date,coalesce(trim(certificate_data->>'occupation'),''),coalesce(trim(certificate_data->>'competency_level'),''),coalesce(trim(certificate_data->>'standard'),'')) returning id into certificate_id;
 end if;
 return jsonb_build_object('id',current_person.id,'revision',current_person.revision,'certificate_id',certificate_id);
end $$;

-- The existing internal writer remains inaccessible to API users.
revoke all on function public.write_personnel_internal(jsonb,jsonb) from public,anon,authenticated;
create or replace function public.hr_schema_version() returns text language sql immutable security invoker set search_path='' as $$select '1.10.0'::text$$;
revoke all on function public.hr_schema_version() from public,anon;
grant execute on function public.hr_schema_version() to authenticated,service_role;
notify pgrst, 'reload schema';
commit;
