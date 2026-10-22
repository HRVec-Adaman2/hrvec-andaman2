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
