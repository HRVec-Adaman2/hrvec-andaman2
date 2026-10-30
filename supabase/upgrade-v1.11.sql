-- HRVec-Andaman2 1.11. Public aggregate counts only; personnel RLS is unchanged.
begin;
do $$begin
 if public.hr_schema_version() not in ('1.10.0','1.11.0') then raise exception 'กรุณาอัปเกรดฐานข้อมูลเป็นรุ่น 1.10 ก่อน';end if;
end $$;
-- This schema is NOT added to the Data API exposed schemas.
create schema if not exists hr_public_stats;
revoke all on schema hr_public_stats from public;
grant usage on schema hr_public_stats to anon,authenticated,service_role;
create or replace function hr_public_stats.snapshot() returns jsonb
language sql stable security definer set search_path='' as $$
 with active_people as (select id,school_id,position,highest_education from public.personnel where deleted_at is null),
 active_certs as (select c.personnel_id,c.kind,c.expires_on from public.certificates c join active_people p on p.id=c.personnel_id),
 active_docs as (select d.personnel_id,d.type_id,d.status from public.documents d join active_people p on p.id=d.personnel_id),
 config as (select coalesce((select expiry_days from public.settings where id=1),90) as days,(now() at time zone 'Asia/Bangkok')::date as asof),
 scores as (select p.id,count(t.id) as total,count(t.id) filter(where exists(select 1 from active_docs d where d.personnel_id=p.id and d.type_id=t.id and d.status='approved')) as done
  from active_people p left join public.document_types t on t.required and (cardinality(t.positions)=0 or p.position=any(t.positions)) group by p.id),
 school_counts as (select s.id,s.name,s.province,s.unit_type,count(p.id) as count from public.schools s left join active_people p on p.school_id=s.id
  where s.is_active or exists(select 1 from active_people ap where ap.school_id=s.id) group by s.id,s.name,s.province,s.unit_type)
 select jsonb_build_object('public',true,'expiryDays',config.days,'total',(select count(*) from active_people),'certificates',(select count(*) from active_certs),'holders',(select count(distinct personnel_id) from active_certs),'competency',(select count(*) from active_certs where kind='competency'),
 'schools',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from school_counts s),'[]'::jsonb),
 'degrees','[]'::jsonb,'issuers','[]'::jsonb,
 'expiring',(select count(*) from active_certs where expires_on between config.asof and config.asof+config.days),'expired',(select count(*) from active_certs where expires_on<config.asof),
 'pending',(select count(*) from active_docs where status='pending'),'missingEducation',(select count(*) from active_people where nullif(trim(highest_education),'') is null),
 'incomplete',(select count(*) from scores where done<total),'required',coalesce((select sum(total) from scores),0),'done',coalesce((select sum(done) from scores),0)) from config;
$$;
revoke all on function hr_public_stats.snapshot() from public;
grant execute on function hr_public_stats.snapshot() to anon,authenticated,service_role;
create or replace function public.hr_public_overview() returns jsonb
language sql stable security invoker set search_path='' as $$select hr_public_stats.snapshot()$$;
revoke all on function public.hr_public_overview() from public;
grant execute on function public.hr_public_overview() to anon,authenticated,service_role;
comment on function public.hr_public_overview() is 'Public totals and institution counts. No names, identifiers, photos, contact information, certificate details, or document links.';
create or replace function public.hr_schema_version() returns text language sql immutable security invoker set search_path='' as $$select '1.11.0'::text$$;
revoke all on function public.hr_schema_version() from public,anon;
grant execute on function public.hr_schema_version() to authenticated,service_role;
notify pgrst,'reload schema';
commit;
