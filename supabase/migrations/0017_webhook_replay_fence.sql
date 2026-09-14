-- Idempotency-Key is not part of the PRD signature input. Bind its unsigned value
-- to the authenticated request digest so replacing the header cannot replay an anonymous inquiry.
alter table public.webhook_events add column request_hash text unique;
create or replace function public.accept_webhook(p_event jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare e public.webhook_events; inserted boolean;
begin
 insert into public.webhook_events(id,source,idempotency_key,signature_valid,payload,status,last_error,correlation_id,result,next_retry_at,request_hash)
 values ((p_event->>'id')::uuid,p_event->>'source',p_event->>'idempotency_key',(p_event->>'signature_valid')::boolean,
 p_event->'payload',p_event->>'status',p_event->>'last_error',(p_event->>'correlation_id')::uuid,p_event->'result',
 case when p_event->>'status'='received' then now() else null end,p_event->>'request_hash')
 on conflict do nothing returning * into e;
 inserted := found;
 if not inserted then
 select * into e from public.webhook_events where idempotency_key=p_event->>'idempotency_key';
 if not found then
 select * into strict e from public.webhook_events where request_hash=p_event->>'request_hash';
 end if;
 end if;
 return jsonb_build_object('event',to_jsonb(e),'inserted',inserted);
end $$;
