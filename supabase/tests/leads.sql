begin;
-- A failure in the final table must roll back earlier writes from the batch.
do $$ declare scope jsonb := '{"emails":[],"phones":[],"domains":["rollback.example.test"],"names":[],"keys":[]}'; begin
 begin
  perform public.commit_lead_batch(scope, public.crm_snapshot(scope)->>'revision', jsonb_build_object(
   'companies',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'name','Rollback fixture','name_key','rollback fixture','domain','rollback.example.test','created_at',now(),'updated_at',now(),'source_system','manual')),
   'contacts','[]'::jsonb,'leads','[]'::jsonb,'duplicates','[]'::jsonb,'events','[{}]'::jsonb));
  raise exception 'Invalid history committed';
 exception when not_null_violation then null; end;
 if exists(select 1 from public.companies where domain='rollback.example.test') then raise exception 'Partial CSV transaction persisted';end if;
end $$;
insert into auth.users(id,email) values('77777777-7777-4777-8777-777777777777','crm-rls@example.test');
do $$ declare t text; begin
 foreach t in array array['companies','contacts','leads','lead_stage_events','deals'] loop
  if not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) then raise exception 'RLS missing %',t; end if;
  if has_table_privilege('anon','public.'||t,'SELECT') or has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE') then raise exception 'Unsafe grant %',t; end if;
 end loop;
 if has_function_privilege('authenticated','public.commit_lead_batch(jsonb,text,jsonb)','execute')
 or has_function_privilege('anon','public.crm_snapshot(jsonb)','execute') then raise exception 'Unsafe RPC grant'; end if;
end $$;
insert into public.contacts(id,email,ft_source,ft_campaign,ft_at)
values ('77777777-0000-4000-8000-000000000001','crm-person@example.test','meta','First','2026-09-01T00:00:00Z');
insert into public.leads(id,contact_id,inquiry_at,inquiry_date,channel,platform,lt_campaign,product_key,qualification_status,qualification_reason,qualification_rule_version,qualification_settings,attribution_missing,owner_id,dedupe_key,submission_keys,inquiry_observations)
select ('77777777-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 case when n=4 then null else '77777777-0000-4000-8000-000000000001'::uuid end,
 '2026-09-01T00:00:00Z','2026-09-01','manual',case when n=4 then 'unknown' else 'meta' end,
 case when n=4 then null else 'Gift' end,'gift',
 case when n=1 then 'sql' when n=4 then 'disqualified' else 'mql' end,
 case when n=4 then 'DQ_NO_CONTACT' else 'Q_CONTACTABLE,Q_BUSINESS,Q_INTENT,Q_SIZE' end,'q1','{}',n=4,
 '77777777-7777-4777-8777-777777777777','fixture-'||n,array['fixture-'||n],array['2026-09-01T00:00:00Z'::timestamptz]
from generate_series(1,4) n;
insert into public.lead_stage_events(lead_id,from_status,to_status,changed_at,source,actor,note)
select id,null,case when qualification_status='sql' then 'mql' else qualification_status end,inquiry_at,'pmos','77777777-7777-4777-8777-777777777777','Initial q1'
from public.leads where dedupe_key like 'fixture-%';
insert into public.lead_stage_events(lead_id,from_status,to_status,changed_at,source,actor,note)
values('77777777-0000-4000-8000-000000000001','mql','sql','2026-09-10T18:00:00Z','manual','77777777-7777-4777-8777-777777777777','Sales accepted');
insert into public.deals(id,lead_id,name,pipeline,stage_key,stage_label,stage_category,amount,currency,close_date,expected_close_date)
select ('77777777-1111-4000-8000-'||lpad(n::text,12,'0'))::uuid,('77777777-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'Fixture deal','Manual',case when n=1 then 'won' else 'lost' end,case when n=1 then 'Won' else 'Lost' end,
 case when n=1 then 'won' else 'lost' end,1000000,'IDR','2026-09-12','2026-09-11' from generate_series(1,2)n;
update public.leads set deal_id=('77777777-1111-4000-8000-'||lpad(n::text,12,'0'))::uuid
from generate_series(1,2)n where id=('77777777-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',true);
do $$ begin
 if (select sum(leads) from public.vw_funnel_daily where inquiry_date='2026-09-01')<>4
 or (select sum(mql) from public.vw_funnel_daily where inquiry_date='2026-09-01')<>3
 or (select sum(sql) from public.vw_funnel_daily where inquiry_date='2026-09-01')<>1
 or (select sum(won) from public.vw_funnel_daily where inquiry_date='2026-09-01')<>1
 or (select sum(revenue::numeric) from public.vw_funnel_daily where inquiry_date='2026-09-01')<>1000000
 then raise exception 'TEST-6.7 cohort fixture incorrect';end if;
 if (select sum(transitions) from public.vw_funnel_activity_daily where event_date='2026-09-11' and to_status='sql')<>1
 or exists(select 1 from public.vw_funnel_activity_daily where event_date='2026-09-01' and to_status='sql')
 then raise exception 'TEST-6.8 activity dates incorrect';end if;
 if (select attributed from public.vw_attribution_coverage where inquiry_date='2026-09-01')<>3
 or exists(select 1 from public.vw_funnel_daily where spend is not null)
 then raise exception 'Attribution/spend availability incorrect';end if;
 begin
  update public.leads set qualification_status='new';
  raise exception 'Authenticated write accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 begin update public.lead_stage_events set note='replace';raise exception 'History update accepted';exception when insufficient_privilege then null;end;
 begin delete from public.lead_stage_events;raise exception 'History deletion accepted';exception when insufficient_privilege then null;end;
 begin update public.contacts set ft_campaign='overwrite';raise exception 'First touch changed';exception when insufficient_privilege then null;end;
 begin update public.leads set lt_campaign='overwrite';raise exception 'Last touch changed';exception when insufficient_privilege then null;end;
 begin perform public.commit_lead_batch('{"emails":[],"phones":[],"domains":[],"names":[],"keys":[]}','stale','{}');raise exception 'Stale snapshot committed';exception when serialization_failure then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform id from public.leads;raise exception 'Anon read accepted';exception when insufficient_privilege then null;end;
 begin perform leads from public.vw_funnel_daily;raise exception 'Anon view read accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- NFR-6.1: actual indexed first-page query with 50,000 synthetic rows, all rolled back.
insert into public.leads(inquiry_at,inquiry_date,channel,platform,product_key,qualification_status,qualification_reason,qualification_rule_version,qualification_settings,attribution_missing,owner_id,dedupe_key,submission_keys,inquiry_observations)
select '2026-08-01T00:00:00Z','2026-08-01','import','unknown','', 'disqualified','DQ_NO_CONTACT','q1','{}',true,
 '77777777-7777-4777-8777-777777777777','perf-'||n,array['perf-'||n],array['2026-08-01T00:00:00Z'::timestamptz]
from generate_series(1,50000)n;
analyze public.leads;
do $$ declare started timestamptz:=clock_timestamp(); count_rows int; duration numeric; begin
 select count(*) into count_rows from (select l.id,c.full_name from public.leads l left join public.contacts c on c.id=l.contact_id order by l.inquiry_date desc,l.id limit 20) page;
 duration:=extract(epoch from clock_timestamp()-started)*1000;
 if count_rows<>20 or duration>800 then raise exception 'NFR-6.1 failed: % ms',duration;end if;
 raise notice 'NFR-6.1 first-page query at 50,004 leads: % ms',duration;
end $$;
rollback;
