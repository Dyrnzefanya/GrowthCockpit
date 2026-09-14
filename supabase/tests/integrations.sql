begin;
do $$ declare t text; begin
 foreach t in array array['webhook_events','integration_runs','sync_state'] loop
 if not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) then raise exception 'RLS missing'; end if;
 if has_table_privilege('anon','public.'||t,'select') or has_table_privilege('authenticated','public.'||t,'insert') or has_table_privilege('authenticated','public.'||t,'update') or has_table_privilege('service_role','public.'||t,'delete') then raise exception 'Plumbing grant failure'; end if;
 end loop;
 if has_function_privilege('authenticated','public.start_job(text,text,uuid)','execute') or has_function_privilege('anon','public.claim_webhook(uuid,text,integer)','execute') then raise exception 'Privileged RPC exposed'; end if;
end $$;
set local role service_role;
do $$ declare first jsonb; replay jsonb; claimed jsonb; r uuid; e uuid:=gen_random_uuid(); k text:=gen_random_uuid()::text; rid uuid; begin
 first:=public.accept_webhook(jsonb_build_object('id',e,'source','sql-test','signature_valid',true,'idempotency_key',k,'request_hash',k,'payload',jsonb_build_object('source_channel','web_form','occurred_at','2026-09-14T00:00:00Z'),'status','received','correlation_id',gen_random_uuid(),'result',jsonb_build_object('event_id',e)));
 replay:=public.accept_webhook(jsonb_build_object('id',gen_random_uuid(),'source','sql-test','signature_valid',true,'idempotency_key',k,'request_hash',k,'payload','{}'::jsonb,'status','received','correlation_id',gen_random_uuid(),'result','{}'::jsonb));
 if not (first->>'inserted')::boolean or (replay->>'inserted')::boolean or first->'event'->>'id'<>replay->'event'->>'id' then raise exception 'Idempotency failed'; end if;
 replay:=public.accept_webhook(jsonb_build_object('id',gen_random_uuid(),'source','sql-test','signature_valid',true,'idempotency_key',gen_random_uuid(),'request_hash',k,'payload','{}'::jsonb,'status','received','correlation_id',gen_random_uuid(),'result','{}'::jsonb));
 if (replay->>'inserted')::boolean then raise exception 'Unsigned key replacement bypassed replay fence'; end if;
 claimed:=public.claim_webhook(e,'webhook',5);rid:=(claimed->>'claim_id')::uuid;
 if claimed->>'attempts'<>'1' or public.claim_webhook(e,'schedule',5) is not null then raise exception 'Claim not exclusive'; end if;
 begin
 perform public.finish_webhook(e,gen_random_uuid(),'processed',null,null,'{}');raise exception 'Stale fence accepted';
 exception when serialization_failure then null;end;
 perform public.finish_webhook(e,rid,'failed','INTERNAL',now()-interval '1 second','{}');
 claimed:=public.claim_webhook(e,'schedule',5);
 if claimed->>'attempts'<>'2' then raise exception 'Retry attempts lost'; end if;
 update public.webhook_events set locked_at=now()-interval '100 seconds',next_retry_at=now()-interval '1 second' where id=e;
 claimed:=public.claim_webhook(e,'schedule',5);
 if not exists(select 1 from public.integration_runs where event_id=e and error_summary='WORKER_EXPIRED' and status='failed') then raise exception 'Expired worker not logged'; end if;
 perform public.finish_webhook(e,(claimed->>'claim_id')::uuid,'dead_letter','INTERNAL',null,'{}');
 if public.claim_webhook(e,'schedule',5) is not null then raise exception 'Dead letter automatically retried'; end if;
 if not public.retry_webhook(e) then raise exception 'Manual recovery unavailable'; end if;
 if (select attempts from public.webhook_events where id=e)<>0 then raise exception 'Manual retry budget not reset'; end if;
 r:=public.start_job('SQL-JOB','manual',gen_random_uuid());
 if r is null or public.start_job('SQL-JOB','schedule',gen_random_uuid()) is not null then raise exception 'Job lease not exclusive'; end if;
 perform public.finish_integration_run(r,'failed',1,0,1,'INTERNAL','cursor-1');
 r:=public.start_job('SQL-JOB','manual',gen_random_uuid());perform public.finish_integration_run(r,'failed',1,0,1,'INTERNAL','cursor-2');
 r:=public.start_job('SQL-JOB','manual',gen_random_uuid());perform public.finish_integration_run(r,'failed',1,0,1,'INTERNAL','cursor-3');
 if (select consecutive_failures from public.sync_state where integration='jobs' and resource='SQL-JOB')<>3 then raise exception 'Consecutive failure evidence lost'; end if;
 r:=public.start_job('SQL-JOB','manual',gen_random_uuid());perform public.finish_integration_run(r,'success',0,0,0,null,null);
 if not exists(select 1 from public.sync_state where resource='SQL-JOB' and last_success_at is not null and consecutive_failures=0 and cursor is null) then raise exception 'Success state not reset'; end if;
end $$;
rollback;
