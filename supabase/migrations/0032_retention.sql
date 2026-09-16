-- Phase 13: bounded, repeatable retention through the existing job runner.
create function public.run_retention(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payloads_cleared integer;
  runs_pruned integer;
begin
  update public.webhook_events
  set payload = null
  where payload is not null
    and received_at < p_now - interval '90 days';
  get diagnostics payloads_cleared = row_count;

  delete from public.integration_runs
  where started_at < p_now - interval '12 months';
  get diagnostics runs_pruned = row_count;

  return jsonb_build_object(
    'payloads_cleared', payloads_cleared,
    'runs_pruned', runs_pruned
  );
end;
$$;

revoke all on function public.run_retention(timestamptz)
from public, anon, authenticated;
grant execute on function public.run_retention(timestamptz) to service_role;
