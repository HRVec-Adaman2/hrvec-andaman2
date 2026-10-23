-- HRVec-Andaman2 1.9. Institute / current departments / competency certificates.
-- Existing non-empty addresses stop this upgrade. Export and handle them explicitly first.
begin;
alter table public.schools add column if not exists unit_type text not null default 'college';
alter table public.schools drop constraint if exists schools_unit_type_check;
alter table public.schools add constraint schools_unit_type_check check(unit_type in ('college','institute'));
alter table public.personnel add column if not exists work_unit text not null default '';
alter table public.certificates add column if not exists occupation text not null default '';
alter table public.certificates add column if not exists competency_level text not null default '';
alter table public.certificates add column if not exists standard text not null default '';
alter table public.certificates drop constraint if exists certificates_kind_check;
alter table public.certificates add constraint certificates_kind_check check(kind in ('administrator','vocational','teacher_license','competency'));
alter table public.lookups drop constraint if exists lookups_category_check;
alter table public.lookups add constraint lookups_category_check check(category in ('position','status','department','institute_department','academic_rank'));
insert into public.lookups(category,name) select 'department',unnest(array['ฝ่ายบริหารทรัพยากร','ฝ่ายยุทธศาสตร์และแผนงาน','ฝ่ายกิจการนักเรียน นักศึกษา','ฝ่ายวิชาการ']) on conflict do nothing;
insert into public.lookups(category,name) select 'institute_department',unnest(array['สำนักงานผู้อำนวยการสถาบัน','สำนักพัฒนายุทธศาสตร์และความร่วมมืออาชีวศึกษา','สำนักพัฒนากิจการนักศึกษาและกิจการพิเศษ','ศูนย์วิจัยและพัฒนาการอาชีวศึกษา','อาชีวศึกษาบัณฑิต']) on conflict do nothing;
insert into public.lookups(category,name) select 'position',unnest(array['ผู้อำนวยการสถาบัน','รองผู้อำนวยการสถาบัน','ผู้ช่วยผู้อำนวยการสถาบัน','ผู้อำนวยการสำนักงาน','ผู้อำนวยการสำนัก','ผู้อำนวยการศูนย์','หัวหน้างาน']) on conflict do nothing;
-- Identity chooses a free ID; never assume that the institute is ID 8.
lock table public.schools in share row exclusive mode;
insert into public.schools(name,province,unit_type) select 'สถาบันการอาชีวศึกษาภาคใต้ 2','ภูเก็ต','institute'
where not exists(select 1 from public.schools where lower(trim(name))=lower('สถาบันการอาชีวศึกษาภาคใต้ 2'));
update public.schools set unit_type='institute',revision=revision+1 where name='สถาบันการอาชีวศึกษาภาคใต้ 2' and unit_type<>'institute';


create or replace function public.guard_personnel() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='INSERT' or (tg_op='UPDATE' and new.school_id is distinct from old.school_id) then
  perform 1 from public.schools where id=new.school_id and is_active for share;
  if not found then raise exception 'สถานศึกษาไม่พร้อมใช้งาน';end if;
 end if;
 if auth.uid() is not null and not public.is_admin() then
  if not public.account_ready() then raise exception 'กรุณาเข้าสู่ระบบใหม่' using errcode='42501';end if;
  if tg_op='INSERT' then
   if new.user_id is not null or not hr_private.school_permission(auth.uid(),new.school_id,'create_personnel') or not hr_private.school_permission(auth.uid(),new.school_id,'personnel_write') then raise exception 'ไม่มีสิทธิ์เพิ่มบุคลากรในสถานศึกษานี้' using errcode='42501';end if;
   if (new.highest_education<>'' or cardinality(new.education_majors)>0) and not hr_private.school_permission(auth.uid(),new.school_id,'education_write') then raise exception 'ไม่มีสิทธิ์กรอกวุฒิการศึกษา' using errcode='42501';end if;
  else
   if old.deleted_at is not null then raise exception 'รายการนี้ถูกลบแล้ว';end if;
   if (new.school_id,new.user_id,new.deleted_at,new.deleted_by,new.delete_reason) is distinct from (old.school_id,old.user_id,old.deleted_at,old.deleted_by,old.delete_reason) then raise exception 'ไม่มีสิทธิ์ย้ายสถานศึกษา ผูกบัญชี หรือลบข้อมูล' using errcode='42501';end if;
   if (new.highest_education,new.education_majors) is distinct from (old.highest_education,old.education_majors) and not hr_private.personnel_access(old.id,'education_write') then raise exception 'ไม่มีสิทธิ์แก้ไขวุฒิการศึกษา' using errcode='42501';end if;
   if (to_jsonb(new)-array['email','phone','avatar_data','updated_at','highest_education','education_majors']) is distinct from (to_jsonb(old)-array['email','phone','avatar_data','updated_at','highest_education','education_majors']) and not hr_private.personnel_access(old.id,'personnel_write') then raise exception 'บุคลากรแก้ไขได้เฉพาะข้อมูลติดต่อและรูปโปรไฟล์' using errcode='42501';end if;
   if (new.email,new.phone,new.avatar_data) is distinct from (old.email,old.phone,old.avatar_data) and not (hr_private.personnel_access(old.id,'contact_write') or hr_private.personnel_access(old.id,'personnel_write')) then raise exception 'ไม่มีสิทธิ์แก้ไขข้อมูลติดต่อ' using errcode='42501';end if;
  end if;
 end if;
 -- Validate only changed assignments, so an unrelated contact edit preserves historic wording.
 if tg_op='INSERT' or (new.school_id,new.department) is distinct from (old.school_id,old.department) then
  if new.department<>'' and not exists(select 1 from public.lookups l join public.schools s on s.id=new.school_id
   where l.category=case when s.unit_type='institute' then 'institute_department' else 'department' end and l.name=new.department) then
   raise exception 'ฝ่าย/ส่วนราชการไม่ตรงกับประเภทหน่วยงานที่เลือก';
  end if;
 end if;
 if length(new.work_unit)>300 then raise exception 'งาน/แผนก/กลุ่มงานยาวเกิน 300 ตัวอักษร';end if;
 if new.birth_date>current_date or new.start_date>current_date then raise exception 'วันเกิดหรือวันเริ่มงานเป็นอนาคต';end if;
 if length(new.highest_education)>200 then raise exception 'วุฒิการศึกษายาวเกินกำหนด';end if;
 if cardinality(new.education_majors)>20 or exists(select 1 from unnest(new.education_majors) m where m is null or length(trim(m))=0 or length(m)>200) then raise exception 'สาขาวิชาต้องไม่ว่างและไม่เกิน 20 สาขา สาขาละ 200 ตัวอักษร';end if;
 if (select count(*) from unnest(new.education_majors) m)<>(select count(distinct trim(m)) from unnest(new.education_majors) m) then raise exception 'มีสาขาวิชาซ้ำ';end if;
 if cardinality(new.education_majors)>0 and nullif(trim(new.highest_education),'') is null then raise exception 'กรุณาระบุวุฒิการศึกษาสูงสุดของสาขาวิชา';end if;
 if new.deleted_at is not null and length(trim(new.delete_reason)) not between 5 and 1000 then raise exception 'กรุณาระบุเหตุผลการลบ 5–1,000 ตัวอักษร';end if;
 new.revision=case when tg_op='INSERT' then 1 else old.revision+1 end;
 new.updated_at=clock_timestamp();return new;
end $$;

create or replace function public.write_personnel_internal(personnel_data jsonb,certificate_data jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_person public.personnel; candidate public.personnel; certificate_id uuid; k text;
begin
 if jsonb_typeof(personnel_data) is distinct from 'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
 for k in select jsonb_object_keys(personnel_data) loop
  if not (k=any(array['id','employee_code','full_name','school_id','user_id','position','status','department','work_unit','academic_rank','highest_education','education_majors','birth_date','start_date','retirement_override','email','phone','avatar_data'])) then raise exception 'ไม่รองรับฟิลด์ %',k;end if;
 end loop;
 if personnel_data ? 'id' then
  select * into current_person from public.personnel where id=(personnel_data->>'id')::uuid for update;
  if not found or current_person.deleted_at is not null then raise exception 'ไม่พบข้อมูลบุคลากรที่ใช้งานอยู่';end if;
  candidate=jsonb_populate_record(current_person,personnel_data-'id');
  update public.personnel set employee_code=candidate.employee_code,full_name=candidate.full_name,school_id=candidate.school_id,user_id=candidate.user_id,
   position=candidate.position,status=candidate.status,department=candidate.department,work_unit=candidate.work_unit,academic_rank=candidate.academic_rank,
   highest_education=candidate.highest_education,education_majors=candidate.education_majors,birth_date=candidate.birth_date,start_date=candidate.start_date,retirement_override=candidate.retirement_override,
   email=candidate.email,phone=candidate.phone,avatar_data=candidate.avatar_data where id=current_person.id returning * into current_person;
 else
  candidate=jsonb_populate_record(null::public.personnel,personnel_data);
  insert into public.personnel(employee_code,full_name,school_id,user_id,position,status,department,work_unit,academic_rank,highest_education,education_majors,birth_date,start_date,retirement_override,email,phone,avatar_data)
   values(candidate.employee_code,candidate.full_name,candidate.school_id,candidate.user_id,coalesce(candidate.position,'ครู'),coalesce(candidate.status,'ปฏิบัติงาน'),coalesce(candidate.department,''),coalesce(candidate.work_unit,''),coalesce(candidate.academic_rank,''),coalesce(candidate.highest_education,''),coalesce(candidate.education_majors,'{}'),candidate.birth_date,candidate.start_date,candidate.retirement_override,coalesce(candidate.email,''),coalesce(candidate.phone,''),candidate.avatar_data) returning * into current_person;
 end if;
 if certificate_data is not null and certificate_data<>'null'::jsonb then
  if jsonb_typeof(certificate_data) is distinct from 'object' then raise exception 'ข้อมูลใบรับรองไม่ถูกต้อง';end if;
  if exists(select 1 from jsonb_object_keys(certificate_data) as ck(key) where ck.key not in ('kind','name','issuer','number','issued_on','expires_on','occupation','competency_level','standard')) then raise exception 'ไม่รองรับฟิลด์ใบรับรอง';end if;
  insert into public.certificates(personnel_id,kind,name,number,issuer,issued_on,expires_on,occupation,competency_level,standard)
   values(current_person.id,certificate_data->>'kind',trim(certificate_data->>'name'),coalesce(certificate_data->>'number',''),trim(certificate_data->>'issuer'),nullif(certificate_data->>'issued_on','')::date,nullif(certificate_data->>'expires_on','')::date,coalesce(trim(certificate_data->>'occupation'),''),coalesce(trim(certificate_data->>'competency_level'),''),coalesce(trim(certificate_data->>'standard'),'')) returning id into certificate_id;
 end if;
 return jsonb_build_object('id',current_person.id,'revision',current_person.revision,'certificate_id',certificate_id);
end $$;

create or replace function public.import_personnel_bundle(records jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare item jsonb; cert jsonb; certs jsonb; saved jsonb; normalized jsonb; seen jsonb; k text;
 person_count integer:=0; certificate_count integer:=0; cert_index integer;
begin
 if not public.account_ready() then raise exception 'กรุณาเข้าสู่ระบบใหม่' using errcode='42501';end if;
 if jsonb_typeof(records) is distinct from 'array' then raise exception 'ข้อมูลนำเข้าต้องเป็นรายการ';end if;
 if jsonb_array_length(records) not between 1 and 500 then raise exception 'นำเข้าได้ครั้งละ 1–500 คน';end if;
 for item in select value from jsonb_array_elements(records) loop
  person_count=person_count+1;
  begin
   if jsonb_typeof(item) is distinct from 'object' then raise exception 'ข้อมูลบุคลากรไม่ถูกต้อง';end if;
   for k in select jsonb_object_keys(item) loop
    if not (k=any(array['employee_code','full_name','school_id','position','status','department','work_unit','academic_rank','highest_education','education_majors','birth_date','start_date','email','phone','certificates'])) then raise exception 'ไม่รองรับฟิลด์ %',k;end if;
   end loop;
   if not public.is_admin() and not hr_private.school_access((item->>'school_id')::integer,'import') then raise exception 'ไม่มีสิทธิ์นำเข้า Excel ในสถานศึกษานี้' using errcode='42501';end if;
   certs=coalesce(item->'certificates','[]'::jsonb);
   if not public.is_admin() and certs<>'[]'::jsonb and not hr_private.school_access((item->>'school_id')::integer,'certificates_write') then raise exception 'ไม่มีสิทธิ์นำเข้าใบรับรอง' using errcode='42501';end if;
   if jsonb_typeof(certs) is distinct from 'array' then raise exception 'ใบรับรองต้องเป็นรายการ';end if;
   if jsonb_array_length(certs)>100 then raise exception 'ใบรับรองต้องไม่เกิน 100 ใบต่อคน';end if;
   saved=public.save_personnel_with_certificate(item-'certificates',null);
   seen='[]'::jsonb;cert_index=0;
   for cert in select value from jsonb_array_elements(certs) loop
    cert_index=cert_index+1;
    if jsonb_typeof(cert) is distinct from 'object' then raise exception 'ใบรับรองลำดับ % ไม่ถูกต้อง',cert_index;end if;
    for k in select jsonb_object_keys(cert) loop
     if not (k=any(array['kind','name','issuer','number','issued_on','expires_on','occupation','competency_level','standard'])) then raise exception 'ไม่รองรับฟิลด์ใบรับรอง %',k;end if;
    end loop;
    normalized=jsonb_build_object('kind',cert->>'kind','name',trim(cert->>'name'),'issuer',trim(cert->>'issuer'),'number',coalesce(trim(cert->>'number'),''),'issued_on',nullif(cert->>'issued_on',''),'expires_on',nullif(cert->>'expires_on',''),'occupation',coalesce(trim(cert->>'occupation'),''),'competency_level',coalesce(trim(cert->>'competency_level'),''),'standard',coalesce(trim(cert->>'standard'),''));
    if seen @> jsonb_build_array(normalized) then raise exception 'ใบรับรองลำดับ % ซ้ำ',cert_index;end if;
    seen=seen||jsonb_build_array(normalized);
    insert into public.certificates(personnel_id,kind,name,number,issuer,issued_on,expires_on,occupation,competency_level,standard)
     values((saved->>'id')::uuid,normalized->>'kind',normalized->>'name',normalized->>'number',normalized->>'issuer',(normalized->>'issued_on')::date,(normalized->>'expires_on')::date,normalized->>'occupation',normalized->>'competency_level',normalized->>'standard');
    certificate_count=certificate_count+1;
    if certificate_count>5000 then raise exception 'ใบรับรองต้องไม่เกิน 5,000 ใบต่อครั้ง';end if;
   end loop;
  exception when others then raise exception 'บุคลากรลำดับ % (แถว %): %',person_count,person_count+1,sqlerrm using errcode=sqlstate;
  end;
 end loop;
 return jsonb_build_object('personnel_count',person_count,'certificate_count',certificate_count);
end $$;

create or replace function public.guard_certificate() returns trigger language plpgsql set search_path=public as $$
begin
 if auth.uid() is not null and not public.is_admin() then
  if not hr_private.personnel_access(new.personnel_id,'certificates_write') or (tg_op='UPDATE' and new.personnel_id is distinct from old.personnel_id) then raise exception 'ไม่มีสิทธิ์จัดการใบรับรองของบุคลากรนี้' using errcode='42501';end if;
 end if;
 if nullif(trim(new.name),'') is null or nullif(trim(new.issuer),'') is null then raise exception 'ต้องระบุชื่อใบรับรองและหน่วยงานผู้ออก';end if;
 if length(new.occupation)>300 or length(new.competency_level)>300 or length(new.standard)>300 then raise exception 'ข้อมูลสมรรถนะยาวเกิน 300 ตัวอักษร';end if;
 if length(new.name)>300 or length(new.issuer)>300 or length(new.number)>300 then raise exception 'ข้อมูลใบรับรองยาวเกินกำหนด';end if;
 if new.document_id is not null and not exists(select 1 from public.documents where id=new.document_id and personnel_id=new.personnel_id) then raise exception 'หลักฐานไม่ตรงกับบุคลากร';end if;
 return new;
end $$;

create or replace function hr_private.school_manage(operation text,school_data jsonb,expected_revision integer,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.schools; next_row public.schools; result jsonb;
begin
 if not public.is_admin() then raise exception 'เฉพาะผู้ดูแลระบบ' using errcode='42501';end if;
 if reason is null or length(trim(reason)) not between 5 and 1000 then raise exception 'กรุณาระบุเหตุผล 5–1,000 ตัวอักษร';end if;
 if operation not in ('create','update','deactivate','activate','delete') or operation is null then raise exception 'คำสั่งไม่ถูกต้อง';end if;
 if jsonb_typeof(school_data) is distinct from 'object' or exists(select 1 from jsonb_object_keys(school_data) k where k not in ('id','name','province','unit_type')) then raise exception 'ข้อมูลสถานศึกษาไม่ถูกต้อง';end if;
 if operation='create' then
  if school_data ? 'id' then raise exception 'รหัสสถานศึกษาสร้างอัตโนมัติ';end if;
 else
  select * into current_row from public.schools where id=(school_data->>'id')::integer for update;
  if not found then raise exception 'ไม่พบสถานศึกษา';end if;
  if expected_revision is null or current_row.revision<>expected_revision then raise exception 'ข้อมูลสถานศึกษาถูกเปลี่ยนแปลง กรุณาโหลดใหม่' using errcode='40001';end if;
 end if;
 if operation in ('create','update') then
  if coalesce(school_data->>'unit_type',current_row.unit_type,'college') not in ('college','institute') then raise exception 'ประเภทหน่วยงานไม่ถูกต้อง';end if;
  if operation='update' and school_data ? 'unit_type' and school_data->>'unit_type'<>current_row.unit_type and exists(select 1 from public.personnel where school_id=current_row.id) then raise exception 'มีบุคลากรอ้างอิง ไม่สามารถเปลี่ยนประเภทหน่วยงาน';end if;
  if nullif(trim(school_data->>'name'),'') is null or length(school_data->>'name')>200 or nullif(trim(school_data->>'province'),'') is null or length(school_data->>'province')>100 then raise exception 'กรุณาระบุชื่อสถานศึกษาและจังหวัดให้ครบ';end if;
  if exists(select 1 from public.schools where lower(trim(name))=lower(trim(school_data->>'name')) and id is distinct from current_row.id) then raise exception 'ชื่อสถานศึกษาซ้ำ';end if;
 end if;
 -- Serialize creates with duplicate names, independently of IDs.
 if operation='create' then
  perform pg_advisory_xact_lock(hashtext('hr-schools'));
  if exists(select 1 from public.schools where lower(trim(name))=lower(trim(school_data->>'name'))) then raise exception 'ชื่อสถานศึกษาซ้ำ';end if;
  insert into public.schools(name,province,unit_type) values(trim(school_data->>'name'),trim(school_data->>'province'),coalesce(school_data->>'unit_type','college')) returning * into next_row;
 elsif operation='update' then
  update public.schools set name=trim(school_data->>'name'),province=trim(school_data->>'province'),unit_type=coalesce(school_data->>'unit_type',current_row.unit_type),revision=revision+1 where id=current_row.id returning * into next_row;
 elsif operation in ('deactivate','activate') then
  if current_row.is_active=(operation='activate') then raise exception 'สถานะสถานศึกษาไม่ได้เปลี่ยนแปลง';end if;
  update public.schools set is_active=(operation='activate'),revision=revision+1 where id=current_row.id returning * into next_row;
 else
  if exists(select 1 from public.personnel where school_id=current_row.id) or exists(select 1 from public.school_assignments where school_id=current_row.id) then raise exception 'มีบุคลากรหรือสิทธิ์อ้างอิง กรุณาปิดใช้งานแทนการลบ';end if;
  delete from public.schools where id=current_row.id;
 end if;
 result=case when operation='delete' then jsonb_build_object('id',current_row.id,'deleted',true) else to_jsonb(next_row) end;
 insert into public.administration_changes(entity,record_id,action,old_data,new_data,reason,actor_id)
 values('schools',coalesce(next_row.id,current_row.id)::text,upper(operation),coalesce(to_jsonb(current_row),'{}'::jsonb),result,trim(reason),auth.uid());
 return result;
end $$;

create or replace function public.hr_overview() returns jsonb
language sql stable security invoker set search_path='' as $$
 with active_people as (select * from public.personnel where deleted_at is null),
 active_certs as (select c.* from public.certificates c join active_people p on p.id=c.personnel_id),
 active_docs as (select d.* from public.documents d join active_people p on p.id=d.personnel_id),
 config as (select coalesce((select expiry_days from public.settings where id=1),90) as days,(now() at time zone 'Asia/Bangkok')::date as asof),
 scores as (select p.id,count(t.id) as total,count(t.id) filter(where exists(select 1 from active_docs d where d.personnel_id=p.id and d.type_id=t.id and d.status='approved')) as done
  from active_people p left join public.document_types t on t.required and (cardinality(t.positions)=0 or p.position=any(t.positions)) group by p.id),
 school_counts as (select s.id,s.name,s.province,s.unit_type,count(p.id) as count from public.schools s left join active_people p on p.school_id=s.id where public.is_admin() or hr_private.school_access(s.id,'view') or exists(select 1 from active_people own where own.school_id=s.id) group by s.id,s.name,s.province,s.unit_type),
 degrees as (select coalesce(nullif(trim(highest_education),''),'ยังไม่ระบุวุฒิ') as name,coalesce(nullif(trim(highest_education),''),'missing') as value,count(*) as count from active_people group by 1,2),
 issuers as (select issuer,count(*) as count from active_certs group by issuer)
 select jsonb_build_object('expiryDays',config.days,'total',(select count(*) from active_people),'certificates',(select count(*) from active_certs),'competency',(select count(*) from active_certs where kind='competency'),'holders',(select count(distinct personnel_id) from active_certs),
  'schools',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from school_counts s),'[]'::jsonb),
  'degrees',coalesce((select jsonb_agg(to_jsonb(d) order by d.count desc,d.name) from degrees d),'[]'::jsonb),
  'issuers',coalesce((select jsonb_agg(to_jsonb(i) order by i.count desc,i.issuer) from issuers i),'[]'::jsonb),
  'expiring',(select count(*) from active_certs where expires_on between config.asof and config.asof+config.days),
  'expired',(select count(*) from active_certs where expires_on<config.asof),'pending',(select count(*) from active_docs where status='pending'),
  'missingEducation',(select count(*) from active_people where nullif(trim(highest_education),'') is null),
  'incomplete',(select count(*) from scores where done<total),'required',coalesce((select sum(total) from scores),0),'done',coalesce((select sum(done) from scores),0)) from config;
$$;

-- Normalize the four legacy department labels. Change history keeps the previous value.
select set_config('hr.change_reason','ปรับชื่อฝ่ายตามโครงสร้างสถานศึกษา 2569',true);
update public.personnel p set department=m.new_name from public.schools s,(values
 ('วิชาการ','ฝ่ายวิชาการ'),('บริหารทรัพยากร','ฝ่ายบริหารทรัพยากร'),
 ('แผนงานและความร่วมมือ','ฝ่ายยุทธศาสตร์และแผนงาน'),('ฝ่ายแผนงานและความร่วมมือ','ฝ่ายยุทธศาสตร์และแผนงาน'),
 ('พัฒนากิจการนักเรียน','ฝ่ายกิจการนักเรียน นักศึกษา'),('พัฒนากิจการนักเรียนนักศึกษา','ฝ่ายกิจการนักเรียน นักศึกษา'),('ฝ่ายพัฒนากิจการนักเรียนนักศึกษา','ฝ่ายกิจการนักเรียน นักศึกษา')) as m(old_name,new_name)
where p.school_id=s.id and s.unit_type='college' and p.department=m.old_name;
delete from public.lookups where category='department' and name in ('วิชาการ','บริหารทรัพยากร','แผนงานและความร่วมมือ','ฝ่ายแผนงานและความร่วมมือ','พัฒนากิจการนักเรียน','พัฒนากิจการนักเรียนนักศึกษา','ฝ่ายพัฒนากิจการนักเรียนนักศึกษา');
-- Address removal has a non-empty-data guard; no CASCADE or hidden data deletion.
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='personnel' and column_name='address') then
  if exists(select 1 from public.personnel where nullif(trim(to_jsonb(personnel)->>'address'),'') is not null) then
   raise exception 'พบที่อยู่เดิม กรุณาสำรองและดำเนินการลบตามนโยบายของหน่วยงานก่อนอัปเกรด';
  end if;
  alter table public.personnel drop column address;
 end if;
end $$;
update public.personnel_changes set old_data=old_data-'address',new_data=new_data-'address' where old_data ? 'address' or new_data ? 'address';
update public.status_history set old_data=old_data-'address',new_data=new_data-'address' where old_data ? 'address' or new_data ? 'address';
create or replace function public.hr_schema_version() returns text language sql immutable security invoker set search_path='' as $$select '1.9.0'::text$$;
revoke all on function public.hr_schema_version() from public,anon;
grant execute on function public.hr_schema_version() to authenticated,service_role;
commit;
