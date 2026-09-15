create function public.cancel_meta_range(p_run uuid) returns void
language plpgsql set search_path='' as $$
begin
 perform 1 from public.integration_runs where id=p_run and job_key='JOB-META-INGEST' and status='running' and lease_until>clock_timestamp() for update;
 if not found then raise exception 'CONFLICT' using errcode='40001'; end if;
 update public.sync_state set cursor=null,last_error='META_RANGE_CANCELLED',last_run_at=now() where integration='meta' and resource='ingest';
end $$;
revoke all on function public.cancel_meta_range(uuid) from public,anon,authenticated;
grant execute on function public.cancel_meta_range(uuid) to service_role;
