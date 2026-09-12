create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  role text not null default 'owner' check (role in ('owner', 'lead', 'sales', 'viewer')),
  timezone text not null default 'Asia/Jakarta' check (timezone = 'Asia/Jakarta'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index app_settings_updated_by_idx on public.app_settings(updated_by);
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
revoke all on public.profiles, public.app_settings from anon, authenticated;
grant select on public.profiles, public.app_settings to authenticated;
grant update (full_name, timezone) on public.profiles to authenticated;
grant update (value) on public.app_settings to authenticated;
grant all on public.profiles, public.app_settings to service_role;
create policy profiles_read_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy settings_read on public.app_settings for select to authenticated using (true);
create policy settings_update on public.app_settings for update to authenticated using (true) with check (true);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.audit_setting_update() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;
revoke all on function public.audit_setting_update() from public, anon, authenticated;
create trigger settings_audit before update on public.app_settings for each row execute function public.audit_setting_update();

insert into public.app_settings (key, value, description) values
('workspace.timezone', '"Asia/Jakarta"', 'Business timezone is fixed to Asia/Jakarta. Phase 2.'),
('qualification.min_quantity', '50', 'PRD §26 minimum quantity. Activated in Phase 6.'),
('hubspot.write_lifecycle_stage', 'false', 'Disabled until sales workflow is confirmed. Phase 8.'),
('attribution.revenue_rule', '"lead_last_touch"', 'PRD §23.4 default revenue attribution. Future feature activation.'),
('health.min_coverage', '0.7', 'PRD §29.2 attribution coverage threshold. Phase 11.'),
('health.min_outcome_completeness', '0.6', 'PRD §29.2 outcome completeness threshold. Phase 11.');
