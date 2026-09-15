-- Failure reporting must not replace a newer worker's resume cursor.
create function public.record_meta_failure(p_run uuid,p_code text) returns void
language plpgsql set search_path='' as $$
begin
 perform 1 from public.integration_runs where id=p_run and job_key='JOB-META-INGEST' and status='running' and lease_until>clock_timestamp() for update;
 if not found then raise exception 'CONFLICT' using errcode='40001'; end if;
 if p_code !~ '^META_[A-Z_]+$' then raise exception 'INVALID_ERROR_CODE'; end if;
 insert into public.sync_state(integration,resource,last_run_at,last_error,consecutive_failures)
 values('meta','ingest',now(),p_code,1)
 on conflict(integration,resource) do update set last_run_at=now(),last_error=excluded.last_error,consecutive_failures=public.sync_state.consecutive_failures+1;
end $$;
revoke all on function public.record_meta_failure(uuid,text) from public,anon,authenticated;
grant execute on function public.record_meta_failure(uuid,text) to service_role;
