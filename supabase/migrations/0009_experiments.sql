create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^EXP-[0-9]{4}-[0-9]{3}$'),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  hypothesis text not null check (char_length(btrim(hypothesis)) between 1 and 2000),
  variable text not null check (char_length(btrim(variable)) between 1 and 200),
  control_description text not null default '' check (char_length(control_description) <= 2000),
  variant_description text not null default '' check (char_length(variant_description) <= 2000),
  primary_kpi text not null check (char_length(btrim(primary_kpi)) between 1 and 120),
  secondary_kpi text null check (secondary_kpi is null or char_length(btrim(secondary_kpi)) between 1 and 120),
  baseline_value numeric null,
  target_value numeric null,
  status text not null default 'draft' check (status in ('draft','running','completed','cancelled')),
  priority int not null default 3 check (priority between 1 and 5),
  confidence int not null default 3 check (confidence between 1 and 5),
  effort int not null default 3 check (effort between 1 and 5),
  start_date date not null,
  review_date date not null,
  end_date date null,
  platform text null check (platform is null or char_length(btrim(platform)) between 1 and 80),
  external_refs jsonb not null default '{}' check (
    jsonb_typeof(external_refs) = 'object'
    and external_refs - array['campaign_id','adset_id','ad_id','landing_page_url'] = '{}'::jsonb
    and (not external_refs ? 'campaign_id' or jsonb_typeof(external_refs -> 'campaign_id') = 'string')
    and (not external_refs ? 'adset_id' or jsonb_typeof(external_refs -> 'adset_id') = 'string')
    and (not external_refs ? 'ad_id' or jsonb_typeof(external_refs -> 'ad_id') = 'string')
    and (not external_refs ? 'landing_page_url' or (
      jsonb_typeof(external_refs -> 'landing_page_url') = 'string'
      and external_refs ->> 'landing_page_url' ~ '^https?://'
    ))
  ),
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('completed','cancelled')) = (end_date is not null))
);

create table public.experiment_results (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null unique references public.experiments(id),
  outcome text not null check (outcome in ('win','lose','inconclusive')),
  primary_kpi_result numeric not null,
  evidence jsonb not null default '{}' check (jsonb_typeof(evidence) = 'object'),
  conclusion text not null check (char_length(btrim(conclusion)) between 1 and 4000),
  learning text not null check (char_length(btrim(learning)) between 1 and 4000),
  next_action text not null check (char_length(btrim(next_action)) between 1 and 2000),
  decided_at timestamptz not null default now(),
  decided_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(conclusion, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(learning, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(next_action, '')), 'B')
  ) stored
);

create index experiments_status_review_idx on public.experiments(status, review_date);
create index experiments_owner_idx on public.experiments(owner_id);
create index experiment_results_search_idx on public.experiment_results using gin(search_vector);
create index experiment_results_decided_by_idx on public.experiment_results(decided_by);

alter table public.experiments enable row level security;
alter table public.experiment_results enable row level security;
revoke all on public.experiments, public.experiment_results from anon, authenticated;
grant select on public.experiments, public.experiment_results to authenticated;
grant all on public.experiments, public.experiment_results to service_role;
create policy experiments_workspace_read on public.experiments for select to authenticated using (true);
create policy experiment_results_workspace_read on public.experiment_results for select to authenticated using (true);
create trigger experiments_updated_at before update on public.experiments for each row execute function public.set_updated_at();
create trigger experiment_results_updated_at before update on public.experiment_results for each row execute function public.set_updated_at();

create function public.create_experiment(
  p_title text,
  p_hypothesis text,
  p_variable text,
  p_primary_kpi text,
  p_start_date date,
  p_review_date date,
  p_control_description text default '',
  p_variant_description text default '',
  p_secondary_kpi text default null,
  p_baseline_value numeric default null,
  p_target_value numeric default null,
  p_priority int default 3,
  p_confidence int default 3,
  p_effort int default 3,
  p_platform text default null,
  p_external_refs jsonb default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  year_text text := extract(year from p_start_date)::int::text;
  sequence_number int;
  result uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('experiment-code-' || year_text, 0));
  select coalesce(max(right(code, 3)::int), 0) + 1 into sequence_number
    from public.experiments where substring(code from 5 for 4) = year_text;
  if sequence_number > 999 then raise exception 'Experiment code limit reached' using errcode='22003'; end if;
  insert into public.experiments(
    code,title,hypothesis,variable,control_description,variant_description,
    primary_kpi,secondary_kpi,baseline_value,target_value,priority,confidence,
    effort,start_date,review_date,platform,external_refs,owner_id
  ) values (
    'EXP-' || year_text || '-' || lpad(sequence_number::text, 3, '0'),
    p_title,p_hypothesis,p_variable,p_control_description,p_variant_description,
    p_primary_kpi,p_secondary_kpi,p_baseline_value,p_target_value,p_priority,
    p_confidence,p_effort,p_start_date,p_review_date,p_platform,p_external_refs,actor
  ) returning id into result;
  return result;
end;
$$;

create function public.update_draft_experiment(
  p_id uuid,
  p_expected timestamptz,
  p_title text,
  p_hypothesis text,
  p_variable text,
  p_primary_kpi text,
  p_start_date date,
  p_review_date date,
  p_control_description text default '',
  p_variant_description text default '',
  p_secondary_kpi text default null,
  p_baseline_value numeric default null,
  p_target_value numeric default null,
  p_priority int default 3,
  p_confidence int default 3,
  p_effort int default 3,
  p_platform text default null,
  p_external_refs jsonb default '{}'
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.experiments set
    title=p_title,hypothesis=p_hypothesis,variable=p_variable,
    primary_kpi=p_primary_kpi,start_date=p_start_date,review_date=p_review_date,
    control_description=p_control_description,variant_description=p_variant_description,
    secondary_kpi=p_secondary_kpi,baseline_value=p_baseline_value,target_value=p_target_value,
    priority=p_priority,confidence=p_confidence,effort=p_effort,platform=p_platform,
    external_refs=p_external_refs
  where id=p_id and status='draft' and updated_at=p_expected;
  if not found then raise exception 'Experiment changed or is no longer draft' using errcode='40001'; end if;
end;
$$;

create function public.transition_experiment(
  p_id uuid,
  p_expected timestamptz,
  p_to text,
  p_end_date date,
  p_outcome text default null,
  p_primary_kpi_result numeric default null,
  p_evidence jsonb default null,
  p_conclusion text default null,
  p_learning text default null,
  p_next_action text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  current_experiment public.experiments;
  allowed text[];
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into current_experiment from public.experiments where id=p_id for update;
  if current_experiment.id is null then raise exception 'Experiment missing' using errcode='P0002'; end if;
  if current_experiment.updated_at <> p_expected then raise exception 'Experiment changed' using errcode='40001'; end if;
  allowed := case current_experiment.status
    when 'draft' then array['running','cancelled']
    when 'running' then array['completed','cancelled']
    when 'completed' then array['cancelled']
    else array[]::text[] end;
  if not p_to = any(allowed) then
    raise exception 'BUSINESS_RULE_REJECTED: allowed %', array_to_string(allowed, ', ')
      using errcode='P0001';
  end if;
  if p_to = 'completed' then
    if p_outcome is null or p_primary_kpi_result is null or btrim(coalesce(p_conclusion,'')) = ''
      or btrim(coalesce(p_learning,'')) = '' or btrim(coalesce(p_next_action,'')) = '' then
      raise exception 'Completion evidence is incomplete' using errcode='23514';
    end if;
    insert into public.experiment_results(
      experiment_id,outcome,primary_kpi_result,evidence,conclusion,learning,next_action,decided_by
    ) values (
      p_id,p_outcome,p_primary_kpi_result,coalesce(p_evidence,'{}'),p_conclusion,p_learning,p_next_action,actor
    );
  end if;
  update public.experiments set status=p_to,end_date=case when p_to in ('completed','cancelled') then p_end_date else null end
    where id=p_id;
end;
$$;

revoke all on function public.create_experiment(text,text,text,text,date,date,text,text,text,numeric,numeric,int,int,int,text,jsonb) from public,anon;
revoke all on function public.update_draft_experiment(uuid,timestamptz,text,text,text,text,date,date,text,text,text,numeric,numeric,int,int,int,text,jsonb) from public,anon;
revoke all on function public.transition_experiment(uuid,timestamptz,text,date,text,numeric,jsonb,text,text,text) from public,anon;
grant execute on function public.create_experiment(text,text,text,text,date,date,text,text,text,numeric,numeric,int,int,int,text,jsonb) to authenticated;
grant execute on function public.update_draft_experiment(uuid,timestamptz,text,text,text,text,date,date,text,text,text,numeric,numeric,int,int,int,text,jsonb) to authenticated;
grant execute on function public.transition_experiment(uuid,timestamptz,text,date,text,numeric,jsonb,text,text,text) to authenticated;
