-- HRVec-Andaman2 1.2: run this file ONCE for an existing 1.0/1.1 project.
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
commit;
