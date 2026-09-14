-- Phase 7: persistence/concurrency only; validation, retry policy and lead rules stay in TypeScript.
create table public.webhook_events (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 source text not null, event_type text not null default 'lead', external_event_id text,
 idempotency_key text unique, signature_valid boolean not null, payload jsonb,
 received_at timestamptz not null default now(), processed_at timestamptz,
 status text not null check(status in ('received','processing','processed','rejected','failed','dead_letter')),
 attempts integer not null default 0 check(attempts>=0), next_retry_at timestamptz, locked_at timestamptz,
 last_error text, correlation_id uuid not null, result jsonb not null default '{}', claim_id uuid
);
create index webhook_source_received_idx on public.webhook_events(source,received_at desc);
create index webhook_due_idx on public.webhook_events(next_retry_at,id) where status in ('received','failed','processing');
create table public.integration_runs (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 integration text not null, resource text not null, job_key text, event_id uuid references public.webhook_events(id),
 trigger text not null check(trigger in ('schedule','webhook','manual')), started_at timestamptz not null default now(), ended_at timestamptz,
 status text not null check(status in ('running','success','partial','failed')),
 records_read integer not null default 0, records_written integer not null default 0, records_failed integer not null default 0,
 error_summary text, correlation_id uuid not null, lease_until timestamptz
);
create index integration_runs_history_idx on public.integration_runs(integration,started_at desc);
create index integration_runs_jobs_idx on public.integration_runs(job_key,started_at desc);
create table public.sync_state (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 integration text not null, resource text not null, cursor text, last_run_at timestamptz,last_success_at timestamptz,
 consecutive_failures integer not null default 0, last_error text, unique(integration,resource)
);
alter table public.leads add column source_event_id uuid references public.webhook_events(id);
create index leads_source_event_idx on public.leads(source_event_id);
-- A machine has no human profile. Human overrides still require their actor in the service.
alter table public.lead_stage_events alter column actor drop not null;
do $$ declare t text; begin
 foreach t in array array['webhook_events','integration_runs','sync_state'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant select,insert,update on public.%I to service_role',t);
 execute format('create policy workspace_read on public.%I for select to authenticated using (true)',t);
 execute format('create trigger updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
 end loop;
end $$;

create function public.accept_webhook(p_event jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare e public.webhook_events; inserted boolean;
begin
 insert into public.webhook_events(id,source,idempotency_key,signature_valid,payload,status,last_error,correlation_id,result,next_retry_at)
 values ((p_event->>'id')::uuid,p_event->>'source',p_event->>'idempotency_key',(p_event->>'signature_valid')::boolean,
 p_event->'payload',p_event->>'status',p_event->>'last_error',(p_event->>'correlation_id')::uuid,p_event->'result',
 case when p_event->>'status'='received' then now() else null end)
 on conflict(idempotency_key) do nothing returning * into e;
 inserted := found;
 if not inserted then select * into strict e from public.webhook_events where idempotency_key=p_event->>'idempotency_key'; end if;
 return jsonb_build_object('event',to_jsonb(e),'inserted',inserted);
end $$;

create function public.claim_webhook(p_id uuid,p_trigger text,p_max integer) returns jsonb
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
 values(r,'lead_ingest',e.source,e.id,p_trigger,'running',e.correlation_id,1,now()+interval '90 seconds');
 update public.webhook_events set status='processing',attempts=attempts+1,locked_at=now(),claim_id=r,next_retry_at=now()+interval '90 seconds'
 where id=e.id returning * into e;
 return to_jsonb(e);
end $$;

create function public.finish_integration_run(p_id uuid,p_status text,p_read integer,p_written integer,p_failed integer,p_error text,p_cursor text)
returns void language plpgsql set search_path='' as $$
declare r public.integration_runs;
begin
 update public.integration_runs set status=p_status,ended_at=now(),records_read=p_read,records_written=p_written,records_failed=p_failed,error_summary=p_error,lease_until=null
 where id=p_id and status='running' returning * into r;
 if not found then return; end if;
 insert into public.sync_state(integration,resource,last_run_at,last_success_at,consecutive_failures,last_error,cursor)
 values(r.integration,r.resource,r.started_at,case when p_status='success' then now() end,case when p_status='failed' then 1 else 0 end,p_error,p_cursor)
 on conflict(integration,resource) do update set last_run_at=excluded.last_run_at,
 last_success_at=coalesce(excluded.last_success_at,public.sync_state.last_success_at),
 consecutive_failures=case when p_status='failed' then public.sync_state.consecutive_failures+1 else 0 end,last_error=p_error,cursor=p_cursor;
end $$;

create function public.finish_webhook(p_id uuid,p_claim uuid,p_status text,p_error text,p_retry timestamptz,p_result jsonb,p_scope jsonb default null,p_revision text default null,p_plan jsonb default null)
returns void language plpgsql set search_path='' as $$
declare e public.webhook_events;
begin
 select * into e from public.webhook_events where id=p_id for update;
 if e.status<>'processing' or e.claim_id is distinct from p_claim or e.locked_at<now()-interval '90 seconds' then raise exception 'STALE_CLAIM' using errcode='40001'; end if;
 if p_plan is not null then perform public.commit_lead_batch(p_scope,p_revision,p_plan); end if;
 update public.webhook_events set status=p_status,last_error=p_error,next_retry_at=p_retry,locked_at=null,
 processed_at=case when p_status='processed' then now() end,result=p_result where id=p_id;
 perform public.finish_integration_run(p_claim,case when p_status='processed' then 'success' else 'failed' end,1,
 case when p_result->>'outcome'='created' then 1 else 0 end,case when p_status='processed' then 0 else 1 end,p_error,null);
end $$;

create function public.start_job(p_key text,p_trigger text,p_correlation uuid) returns uuid
language plpgsql set search_path='' as $$
declare r uuid := gen_random_uuid(); old_run record;
begin
 if not pg_try_advisory_xact_lock(hashtextextended(p_key,7)) then return null; end if;
 if exists(select 1 from public.integration_runs where job_key=p_key and status='running' and lease_until>now()) then return null; end if;
 for old_run in select id from public.integration_runs where job_key=p_key and status='running' loop
 perform public.finish_integration_run(old_run.id,'failed',0,0,1,'WORKER_EXPIRED',null);
 end loop;
 insert into public.integration_runs(id,integration,resource,job_key,trigger,status,correlation_id,lease_until)
 values(r,'jobs',p_key,p_key,p_trigger,'running',p_correlation,now()+interval '90 seconds');
 return r;
end $$;

create function public.retry_webhook(p_id uuid) returns boolean
language plpgsql set search_path='' as $$
begin
 update public.webhook_events set status='failed',attempts=0,next_retry_at=now(),locked_at=null,claim_id=null,last_error=null
 where id=p_id and status='dead_letter' and signature_valid and payload is not null;
 return found;
end $$;

do $$ declare f record; begin
 for f in select oid::regprocedure as sig from pg_proc where pronamespace='public'::regnamespace
 and proname in ('accept_webhook','claim_webhook','finish_integration_run','finish_webhook','start_job','retry_webhook') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;
