-- Preserve the shared queue mechanics while recording the actual provider namespace.
create or replace function public.claim_webhook(p_id uuid,p_trigger text,p_max integer) returns jsonb
language plpgsql set search_path='' as $$
declare e public.webhook_events; r uuid := gen_random_uuid();
begin
 select * into e from public.webhook_events where (p_id is null or id=p_id)
 and signature_valid and payload is not null and status in ('received','failed','processing')
 and next_retry_at<=now() and (locked_at is null or locked_at<now()-interval '90 seconds')
 order by next_retry_at,id for update skip locked limit 1;
 if not found then return null; end if;
 if e.claim_id is not null then
 update public.integration_runs set status='failed',ended_at=now(),error_summary='WORKER_EXPIRED',records_failed=1 where id=e.claim_id and status='running';
 end if;
 if e.attempts>=p_max then
 update public.webhook_events set status='dead_letter',locked_at=null,next_retry_at=null,last_error='ATTEMPTS_EXHAUSTED' where id=e.id;
 return jsonb_build_object('exhausted',true,'id',e.id);
 end if;
 insert into public.integration_runs(id,integration,resource,event_id,trigger,status,correlation_id,records_read,lease_until)
 values(r,case when e.source in ('hubspot','hubspot_writeback','hubspot_range') then 'hubspot' else 'lead_ingest' end,e.source,e.id,p_trigger,'running',e.correlation_id,1,now()+interval '90 seconds');
 update public.webhook_events set status='processing',attempts=attempts+1,locked_at=now(),claim_id=r,next_retry_at=now()+interval '90 seconds'
 where id=e.id returning * into e;
 return to_jsonb(e);
end $$;
