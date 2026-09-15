begin;
do $$ begin
 if not exists(select 1 from pg_class where oid='public.rule_evaluations'::regclass and relrowsecurity) then raise exception 'Phase 11 RLS missing'; end if;
 if has_table_privilege('anon','public.rule_evaluations','select') or has_table_privilege('authenticated','public.rule_evaluations','insert') or has_table_privilege('service_role','public.rule_evaluations','update') or has_table_privilege('service_role','public.rule_evaluations','delete') then raise exception 'Immutable evidence grants failed'; end if;
 if has_function_privilege('authenticated','public.commit_decisions(uuid,jsonb,text)','execute') or has_function_privilege('anon','public.decision_facts(date,date)','execute') or has_function_privilege('authenticated','public.decision_action(uuid,timestamptz,text,text,timestamptz,uuid)','execute') then raise exception 'Machine boundary exposed'; end if;
 if (select value from public.app_settings where key='rules.target_cpql')<>'null'::jsonb then raise exception 'Invented target CPQL'; end if;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values('11111111-aaaa-4111-8111-111111111111','phase11@example.test','{}');
select set_config('request.jwt.claim.sub','11111111-aaaa-4111-8111-111111111111',true);
set local role authenticated;
update public.app_settings set value='0.3' where key='rules.cpl_rise';
do $$ begin
 if not exists(select 1 from public.app_settings where key='rules.cpl_rise' and audit_history->-1->>'actor'='11111111-aaaa-4111-8111-111111111111' and audit_history->-1->'old'='0.2'::jsonb and audit_history->-1->'new'='0.3'::jsonb) then raise exception 'Threshold change not audited'; end if;
 begin update public.app_settings set audit_history='[]' where key='rules.cpl_rise'; raise exception 'Audit writable'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ declare run uuid; a public.alerts; rows jsonb; stamp timestamptz:=now(); n integer;
begin
 run:=public.start_job('JOB-EVALUATE-RULES','manual',gen_random_uuid());
 rows:=jsonb_build_array(jsonb_build_object('rule_key','R-00','rule_version','r1','evaluated_at',stamp,'window_start',current_date-7,'window_end',current_date-1,'scope_type','campaign','scope_id','fixture','verdict','SUPPRESSED','evidence',jsonb_build_object('condition','stale source'),'override_snooze',false,'alert_key','decision:R-00:campaign:fixture','alert',jsonb_build_object('alert_key','decision:R-00:campaign:fixture','type','decision_recommendation','severity','warning','source','decisions','entity_type','campaign','title','R-00 SUPPRESSED','message','Fix measurement','evidence','{}'::jsonb,'notify',false,'detected_at',stamp)));
 n:=public.commit_decisions(run,rows,'fixture-cursor');
 if n<>1 then raise exception 'Suppression missing'; end if;
 if public.commit_decisions(run,rows,'fixture-cursor')<>0 then raise exception 'Replay duplicated evidence'; end if;
 if (select cursor from public.sync_state where integration='decisions' and resource='evaluation')<>'fixture-cursor' then raise exception 'Cursor not atomic'; end if;
 select * into a from public.alerts where alert_key='decision:R-00:campaign:fixture';
 perform public.decision_action(a.id,a.updated_at,'snooze','',now()+interval '1 day','11111111-aaaa-4111-8111-111111111111');
 if not exists(select 1 from public.alerts where id=a.id and snooze_until>now()) then raise exception 'Snooze lost'; end if;
 for n in 1..3 loop
  select * into a from public.alerts where alert_key='decision:R-00:campaign:fixture';
  perform public.decision_action(a.id,a.updated_at,'dismiss','Business review',now()+interval '1 day','11111111-aaaa-4111-8111-111111111111');
 end loop;
 if not exists(select 1 from public.alerts where id=a.id and dismissal_count=3 and jsonb_array_length(action_dismissals)=3) then raise exception 'Dismissal audit missing'; end if;
 begin perform public.decision_action(a.id,stamp-interval '1 day','dismiss','stale revision',now()+interval '1 day','11111111-aaaa-4111-8111-111111111111'); raise exception 'Concurrent action overwrote'; exception when serialization_failure then null; end;
 rows:=jsonb_set(jsonb_set(jsonb_set(rows,'{0,evaluated_at}',to_jsonb(stamp+interval '1 minute')),'{0,override_snooze}','true'),'{0,alert_revision}',to_jsonb(stamp-interval '1 day'));
 begin perform public.commit_decisions(run,rows,null); raise exception 'Concurrent snooze override accepted'; exception when serialization_failure then null; end;
 select * into a from public.alerts where alert_key='decision:R-00:campaign:fixture';
 rows:=jsonb_set(rows,'{0,alert_revision}',to_jsonb(a.updated_at));
 perform public.commit_decisions(run,rows,null);
 if not exists(select 1 from public.alerts where id=a.id and snooze_until is null and status='open') then raise exception 'Material snooze override not persisted'; end if;
 update public.integration_runs set lease_until=now()-interval '1 second' where id=run;
 begin perform public.commit_decisions(run,rows,null); raise exception 'Expired writer accepted'; exception when serialization_failure then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.rule_evaluations where scope_id='fixture' and verdict='SUPPRESSED') then raise exception 'Authorized history invisible'; end if;
 begin update public.rule_evaluations set rule_version='r2' where scope_id='fixture'; raise exception 'History changed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
