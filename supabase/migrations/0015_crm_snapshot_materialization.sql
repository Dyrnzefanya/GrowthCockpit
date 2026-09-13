-- Materialize the assembled snapshot once before hashing; avoid duplicated aggregation.
create or replace function public.crm_snapshot(p_scope jsonb) returns jsonb language sql stable set search_path='' set jit=off as $$
with c as (
 select * from public.contacts where email::text in(select jsonb_array_elements_text(p_scope->'emails'))
 or phone_e164 in(select jsonb_array_elements_text(p_scope->'phones'))
), co as (
 select * from public.companies where domain::text in(select jsonb_array_elements_text(p_scope->'domains'))
 or name_key in(select jsonb_array_elements_text(p_scope->'names'))
 or id in(select company_id from c)
), l as (
 select * from public.leads where contact_id in(select id from c)
 or submission_keys && array(select jsonb_array_elements_text(p_scope->'keys'))
), s as materialized (
 select jsonb_build_object(
 'contacts',coalesce((select jsonb_agg(c order by id) from c),'[]'),
 'companies',coalesce((select jsonb_agg(co order by id) from co),'[]'),
 'leads',coalesce((select jsonb_agg(l order by id) from l),'[]')) as data
) select data || jsonb_build_object('revision',md5(data::text)) from s;
$$;

