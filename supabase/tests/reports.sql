begin;
do $$ begin
  if not exists(select 1 from pg_class where oid='public.reports'::regclass and relrowsecurity) then raise exception 'Phase 12 RLS missing'; end if;
  if has_table_privilege('anon','public.reports','select') or has_table_privilege('authenticated','public.reports','insert') or has_table_privilege('authenticated','public.reports','update') then raise exception 'Report grants exposed writes'; end if;
  if has_function_privilege('authenticated','public.create_weekly_report_draft(date,date,jsonb,text,uuid)','execute') or has_function_privilege('authenticated','public.finalize_report(uuid,timestamptz,text,uuid)','execute') then raise exception 'Report mutation RPC exposed'; end if;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values('12121212-1212-4212-8212-121212121212','phase12@example.test','{}');
set local role service_role;
do $$ declare first uuid; replay uuid; second uuid; revision timestamptz; frozen jsonb;
begin
  first:=public.create_weekly_report_draft('2026-09-07','2026-09-13','{"schemaVersion":"weekly-v1","value":1}','draft','12121212-1212-4212-8212-121212121212');
  replay:=public.create_weekly_report_draft('2026-09-07','2026-09-13','{"schemaVersion":"weekly-v1","value":2}','replacement','12121212-1212-4212-8212-121212121212');
  if replay<>first or (select facts->>'value' from public.reports where id=first)<>'1' then raise exception 'Draft generation is not idempotent'; end if;
  select updated_at into revision from public.reports where id=first;
  perform public.save_report_narrative(first,revision,'edited narrative');
  select updated_at into revision from public.reports where id=first;
  perform public.finalize_report(first,revision,'final narrative','12121212-1212-4212-8212-121212121212');
  select facts into frozen from public.reports where id=first;
  begin update public.reports set facts='{}' where id=first; raise exception 'Final facts changed'; exception when object_not_in_prerequisite_state then null; end;
  begin update public.reports set narrative_md='changed' where id=first; raise exception 'Final narrative changed'; exception when object_not_in_prerequisite_state then null; end;
  if (select facts from public.reports where id=first)<>frozen then raise exception 'Frozen facts changed'; end if;
  second:=public.create_weekly_report_draft('2026-09-07','2026-09-13','{"schemaVersion":"weekly-v1","value":2}','new version','12121212-1212-4212-8212-121212121212');
  if second=first or (select version from public.reports where id=second)<>2 or (select count(*) from public.reports where period_start='2026-09-07')<>2 then raise exception 'Regeneration did not version'; end if;
  begin perform public.save_report_narrative(first,revision,'late edit'); raise exception 'Final report edit accepted'; exception when serialization_failure then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','12121212-1212-4212-8212-121212121212',true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.reports where period_start='2026-09-07')<>2 then raise exception 'Authenticated report read failed'; end if;
  begin update public.reports set narrative_md='client edit'; raise exception 'Client report edit accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
