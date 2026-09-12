create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null check (char_length(name) between 1 and 120),
  cadence text not null check (cadence in ('daily', 'weekly', 'monthly')),
  weekdays int[] null check (weekdays <@ array[1,2,3,4,5,6,7]),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 50),
  version int not null default 1 check (version > 0),
  is_active bool not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates(id),
  template_name_snapshot text not null,
  template_version int not null,
  run_date date not null,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id, run_date)
);
create index workflow_runs_date_idx on public.workflow_runs(run_date desc);
create table public.workflow_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  step_key text not null,
  label_snapshot text not null,
  help_snapshot text not null default '',
  required_snapshot bool not null,
  position int not null,
  is_done bool not null default false,
  completed_at timestamptz null,
  notes text not null default '' check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id, step_key),
  check (is_done = (completed_at is not null))
);
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  note_date date not null,
  context_type text not null default 'general' check (context_type in ('general','lead','experiment','campaign','report')),
  context_id uuid null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_date_idx on public.notes(note_date desc, created_at desc);
create index notes_created_by_idx on public.notes(created_by);

alter table public.workflow_templates enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_items enable row level security;
alter table public.notes enable row level security;
revoke all on public.workflow_templates, public.workflow_runs, public.workflow_items, public.notes from anon, authenticated;
grant select, insert, update on public.workflow_templates, public.workflow_runs, public.workflow_items to authenticated;
grant select, insert on public.notes to authenticated;
grant all on public.workflow_templates, public.workflow_runs, public.workflow_items, public.notes to service_role;
create policy templates_workspace on public.workflow_templates for all to authenticated using (true) with check (true);
create policy runs_workspace on public.workflow_runs for all to authenticated using (true) with check (true);
create policy items_workspace on public.workflow_items for all to authenticated using (true) with check (true);
create policy notes_read on public.notes for select to authenticated using (true);
create policy notes_insert on public.notes for insert to authenticated with check (created_by = (select auth.uid()));
create trigger templates_updated_at before update on public.workflow_templates for each row execute function public.set_updated_at();
create trigger runs_updated_at before update on public.workflow_runs for each row execute function public.set_updated_at();
create trigger items_updated_at before update on public.workflow_items for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.notes for each row execute function public.set_updated_at();

-- Persistence only: the application selects the business date and snapshots.
create function public.materialize_workflow(p_template_id uuid, p_version int, p_date date, p_items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result uuid; current_template public.workflow_templates;
begin
  select id into result from public.workflow_runs where template_id=p_template_id and run_date=p_date;
  if result is not null then return result; end if;
  select * into current_template from public.workflow_templates where id=p_template_id for update;
  if current_template.id is null or current_template.version <> p_version then
    raise exception 'Template changed' using errcode='40001';
  end if;
  insert into public.workflow_runs(template_id,template_name_snapshot,template_version,run_date)
    values(p_template_id,current_template.name,p_version,p_date)
    on conflict(template_id,run_date) do nothing returning id into result;
  if result is null then
    select id into result from public.workflow_runs where template_id=p_template_id and run_date=p_date;
    return result;
  end if;
  insert into public.workflow_items(run_id,step_key,label_snapshot,help_snapshot,required_snapshot,position)
    select result, x.key, x.label, x.help, x.required, x.position
    from jsonb_to_recordset(p_items) as x(key text,label text,help text,required bool,position int);
  return result;
end;
$$;

-- Compare-and-swap keeps application-computed run status and its item atomic.
create function public.commit_workflow_item(
  p_run_id uuid, p_expected timestamptz, p_item_id uuid,
  p_done bool, p_item_completed timestamptz, p_note text,
  p_status text, p_started timestamptz, p_completed timestamptz
) returns void language plpgsql security invoker set search_path = '' as $$
declare current_updated timestamptz;
begin
  select updated_at into current_updated from public.workflow_runs where id=p_run_id for update;
  if current_updated is null or current_updated <> p_expected then
    raise exception 'Run changed' using errcode='40001';
  end if;
  update public.workflow_items set is_done=p_done,completed_at=p_item_completed,notes=p_note
    where id=p_item_id and run_id=p_run_id;
  if not found then raise exception 'Item missing' using errcode='P0002'; end if;
  update public.workflow_runs set status=p_status,started_at=p_started,completed_at=p_completed where id=p_run_id;
end;
$$;
revoke all on function public.materialize_workflow(uuid,int,date,jsonb) from public,anon;
revoke all on function public.commit_workflow_item(uuid,timestamptz,uuid,bool,timestamptz,text,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.materialize_workflow(uuid,int,date,jsonb) to authenticated;
grant execute on function public.commit_workflow_item(uuid,timestamptz,uuid,bool,timestamptz,text,text,timestamptz,timestamptz) to authenticated;
