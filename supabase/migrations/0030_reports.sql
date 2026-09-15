-- Phase 12: immutable weekly report snapshots and bounded draft mutations.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('weekly','monthly')),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','final')),
  facts jsonb not null check (jsonb_typeof(facts) = 'object'),
  narrative_md text not null default '' check (char_length(narrative_md) <= 50000),
  version integer not null check (version > 0),
  created_by uuid not null references public.profiles(id),
  finalized_at timestamptz,
  finalized_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(type, period_start, version),
  check (period_start <= period_end),
  check (type <> 'weekly' or period_end = period_start + 6),
  check ((status = 'final') = (finalized_at is not null and finalized_by is not null))
);
create index reports_period_idx on public.reports(type, period_start desc, version desc);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated, service_role;
grant select on public.reports to authenticated;
grant select, insert, update on public.reports to service_role;
create policy reports_workspace_read on public.reports for select to authenticated
  using ((select auth.uid()) is not null);

create function public.protect_final_report() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'final' then
    raise exception 'FINAL_REPORT_IMMUTABLE' using errcode = '55000';
  end if;
  return old;
end;
$$;
revoke all on function public.protect_final_report() from public, anon, authenticated;
create trigger reports_final_immutable before update or delete on public.reports
  for each row execute function public.protect_final_report();
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

create function public.create_weekly_report_draft(
  p_start date, p_end date, p_facts jsonb, p_narrative text, p_actor uuid
) returns uuid language plpgsql set search_path = '' as $$
declare result uuid; next_version integer;
begin
  if p_end <> p_start + 6 or extract(isodow from p_start) <> 1
     or jsonb_typeof(p_facts) <> 'object' or char_length(p_narrative) > 50000 then
    raise exception 'INVALID_REPORT' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('weekly:' || p_start::text, 12));
  select id into result from public.reports
    where type = 'weekly' and period_start = p_start and status = 'draft'
    order by version desc limit 1;
  if result is not null then return result; end if;
  select coalesce(max(version), 0) + 1 into next_version from public.reports
    where type = 'weekly' and period_start = p_start;
  insert into public.reports(type, period_start, period_end, facts, narrative_md, version, created_by)
    values ('weekly', p_start, p_end, p_facts, p_narrative, next_version, p_actor)
    returning id into result;
  return result;
end;
$$;

create function public.save_report_narrative(
  p_id uuid, p_expected timestamptz, p_narrative text
) returns timestamptz language plpgsql set search_path = '' as $$
declare revision timestamptz;
begin
  if char_length(p_narrative) > 50000 then
    raise exception 'INVALID_NARRATIVE' using errcode = '22023';
  end if;
  update public.reports set narrative_md = p_narrative
    where id = p_id and status = 'draft' and updated_at = p_expected
    returning updated_at into revision;
  if revision is null then raise exception 'REPORT_CONFLICT' using errcode = '40001'; end if;
  return revision;
end;
$$;

create function public.finalize_report(
  p_id uuid, p_expected timestamptz, p_narrative text, p_actor uuid
) returns public.reports language plpgsql set search_path = '' as $$
declare result public.reports;
begin
  if char_length(p_narrative) > 50000 then
    raise exception 'INVALID_NARRATIVE' using errcode = '22023';
  end if;
  update public.reports set narrative_md = p_narrative, status = 'final',
    finalized_at = now(), finalized_by = p_actor
    where id = p_id and status = 'draft' and updated_at = p_expected
    returning * into result;
  if result.id is null then raise exception 'REPORT_CONFLICT' using errcode = '40001'; end if;
  return result;
end;
$$;

revoke all on function public.create_weekly_report_draft(date,date,jsonb,text,uuid) from public,anon,authenticated;
revoke all on function public.save_report_narrative(uuid,timestamptz,text) from public,anon,authenticated;
revoke all on function public.finalize_report(uuid,timestamptz,text,uuid) from public,anon,authenticated;
grant execute on function public.create_weekly_report_draft(date,date,jsonb,text,uuid) to service_role;
grant execute on function public.save_report_narrative(uuid,timestamptz,text) to service_role;
grant execute on function public.finalize_report(uuid,timestamptz,text,uuid) to service_role;
