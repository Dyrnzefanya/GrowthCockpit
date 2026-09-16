begin;

do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and (
      not c.relrowsecurity
      or not exists (select 1 from pg_policy p where p.polrelid = c.oid)
    );
  if missing is not null then
    raise exception 'TEST-13.1 public tables missing RLS/policy: %', missing;
  end if;

  if has_function_privilege('anon', 'public.run_retention(timestamptz)', 'execute')
    or has_function_privilege('authenticated', 'public.run_retention(timestamptz)', 'execute')
    or not has_function_privilege('service_role', 'public.run_retention(timestamptz)', 'execute') then
    raise exception 'TEST-13.1 retention grants invalid';
  end if;
end $$;

set local role service_role;
do $$
declare
  old_event uuid := gen_random_uuid();
  boundary_event uuid := gen_random_uuid();
  recent_event uuid := gen_random_uuid();
  old_run uuid := gen_random_uuid();
  boundary_run uuid := gen_random_uuid();
  result jsonb;
begin
  insert into public.webhook_events(
    id, source, idempotency_key, signature_valid, payload, received_at,
    status, correlation_id
  ) values
    (old_event, 'hardening-test', gen_random_uuid(), true, '{"safe":"old"}',
      '2025-01-01T00:00:00Z', 'processed', gen_random_uuid()),
    (boundary_event, 'hardening-test', gen_random_uuid(), true, '{"safe":"boundary"}',
      '2026-06-18T00:00:00Z', 'processed', gen_random_uuid()),
    (recent_event, 'hardening-test', gen_random_uuid(), true, '{"safe":"recent"}',
      '2026-08-01T00:00:00Z', 'processed', gen_random_uuid());

  insert into public.integration_runs(
    id, integration, resource, job_key, trigger, started_at, ended_at,
    status, correlation_id
  ) values
    (old_run, 'jobs', 'HARDENING-OLD', 'HARDENING-OLD', 'schedule',
      '2025-01-01T00:00:00Z', '2025-01-01T00:01:00Z', 'success', gen_random_uuid()),
    (boundary_run, 'jobs', 'HARDENING-BOUNDARY', 'HARDENING-BOUNDARY', 'schedule',
      '2025-09-16T00:00:00Z', '2025-09-16T00:01:00Z', 'success', gen_random_uuid());

  result := public.run_retention('2026-09-16T00:00:00Z');
  if result <> '{"runs_pruned": 1, "payloads_cleared": 1}'::jsonb then
    raise exception 'TEST-13.7 retention counts incorrect: %', result;
  end if;
  if (select payload is not null from public.webhook_events where id = old_event)
    or not (select payload is not null from public.webhook_events where id = boundary_event)
    or not (select payload is not null from public.webhook_events where id = recent_event)
    or exists (select 1 from public.integration_runs where id = old_run)
    or not exists (select 1 from public.integration_runs where id = boundary_run) then
    raise exception 'TEST-13.7 retention boundary incorrect';
  end if;
  if public.run_retention('2026-09-16T00:00:00Z')
    <> '{"runs_pruned": 0, "payloads_cleared": 0}'::jsonb then
    raise exception 'TEST-13.7 retention is not repeatable';
  end if;
end $$;

rollback;
