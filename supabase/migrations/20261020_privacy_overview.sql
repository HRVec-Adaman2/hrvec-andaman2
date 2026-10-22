-- v1.4: aggregate-only overview, authenticated access, and admin view audit.
begin;
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
