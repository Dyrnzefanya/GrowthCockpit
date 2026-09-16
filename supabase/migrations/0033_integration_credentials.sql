-- Phase 13.1: server-only provider configuration with Vault-backed secrets.
create extension if not exists supabase_vault with schema vault;

create table public.integration_provider_configs (
  provider text primary key check (provider in ('meta', 'hubspot')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  secret_refs jsonb not null default '{}'::jsonb check (jsonb_typeof(secret_refs) = 'object'),
  provider_identity jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_identity) = 'object'),
  configured_at timestamptz,
  credentials_updated_at timestamptz,
  last_verified_at timestamptz,
  last_error_code text check (last_error_code is null or last_error_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  disconnected_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.integration_credential_audit (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('meta', 'hubspot')),
  action text not null check (action in (
    'configured', 'replaced', 'removed', 'verification_succeeded', 'verification_failed'
  )),
  actor_id uuid references public.profiles(id) on delete set null,
  success boolean not null,
  error_code text check (error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  correlation_id uuid not null,
  occurred_at timestamptz not null default now()
);

create index integration_credential_audit_provider_time_idx
  on public.integration_credential_audit(provider, occurred_at desc);

alter table public.integration_provider_configs enable row level security;
alter table public.integration_credential_audit enable row level security;

create policy integration_provider_configs_service
  on public.integration_provider_configs for all to service_role
  using (true) with check (true);
create policy integration_credential_audit_service_select
  on public.integration_credential_audit for select to service_role using (true);
create policy integration_credential_audit_service_insert
  on public.integration_credential_audit for insert to service_role with check (true);

revoke all on table public.integration_provider_configs from public, anon, authenticated;
revoke all on table public.integration_credential_audit from public, anon, authenticated;
grant select, insert, update, delete on table public.integration_provider_configs to service_role;
grant select, insert on table public.integration_credential_audit to service_role;

create function public.save_integration_provider(
  p_provider text,
  p_config jsonb,
  p_secrets jsonb,
  p_actor uuid,
  p_correlation uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  refs jsonb;
  secret_key text;
  secret_value text;
  secret_id uuid;
  previous_exists boolean;
begin
  if p_provider not in ('meta', 'hubspot')
    or jsonb_typeof(p_config) <> 'object'
    or jsonb_typeof(p_secrets) <> 'object' then
    raise exception 'VALIDATION_FAILED';
  end if;
  if p_provider = 'meta' and (
    p_config - array['ad_account_id', 'api_version'] <> '{}'::jsonb
    or coalesce(p_config->>'ad_account_id', '') !~ '^\d{1,30}$'
    or coalesce(p_config->>'api_version', '') <> 'v26.0'
    or exists (select 1 from jsonb_object_keys(p_secrets) k where k <> 'access_token')
  ) then raise exception 'VALIDATION_FAILED'; end if;
  if p_provider = 'hubspot' and (
    p_config - array['portal_id'] <> '{}'::jsonb
    or coalesce(p_config->>'portal_id', '') !~ '^\d{1,30}$'
    or exists (select 1 from jsonb_object_keys(p_secrets) k where k not in ('access_token', 'webhook_secret'))
  ) then raise exception 'VALIDATION_FAILED'; end if;

  perform pg_advisory_xact_lock(hashtext('integration-provider:' || p_provider));
  select secret_refs, secret_refs <> '{}'::jsonb into refs, previous_exists
  from public.integration_provider_configs where provider = p_provider;
  refs := coalesce(refs, '{}'::jsonb);

  for secret_key, secret_value in select key, value from jsonb_each_text(p_secrets)
  loop
    if length(secret_value) < 16 or length(secret_value) > 8192 then
      raise exception 'VALIDATION_FAILED';
    end if;
    secret_id := (refs->>secret_key)::uuid;
    if secret_id is null then
      secret_id := vault.create_secret(
        secret_value,
        'growthcockpit.' || p_provider || '.' || secret_key,
        'GrowthCockpit Integration Center credential'
      );
      refs := refs || jsonb_build_object(secret_key, secret_id);
    else
      perform vault.update_secret(secret_id, secret_value);
    end if;
  end loop;

  if (p_provider = 'meta' and not (refs ? 'access_token'))
    or (p_provider = 'hubspot' and not (refs ?& array['access_token', 'webhook_secret'])) then
    raise exception 'NOT_CONFIGURED';
  end if;

  insert into public.integration_provider_configs(
    provider, config, secret_refs, configured_at, credentials_updated_at,
    last_verified_at, last_error_code, provider_identity, disconnected_at,
    updated_at, updated_by
  ) values (
    p_provider, p_config, refs, now(), now(), null, null, '{}'::jsonb, null,
    now(), p_actor
  ) on conflict (provider) do update set
    config = excluded.config,
    secret_refs = excluded.secret_refs,
    configured_at = coalesce(public.integration_provider_configs.configured_at, now()),
    credentials_updated_at = now(),
    last_verified_at = null,
    last_error_code = null,
    provider_identity = '{}'::jsonb,
    disconnected_at = null,
    updated_at = now(),
    updated_by = p_actor;

  insert into public.integration_credential_audit(
    provider, action, actor_id, success, correlation_id
  ) values (
    p_provider, case when previous_exists then 'replaced' else 'configured' end,
    p_actor, true, p_correlation
  );
end;
$$;

create function public.resolve_integration_provider(p_provider text)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  row_value public.integration_provider_configs%rowtype;
  secrets jsonb := '{}'::jsonb;
  secret_key text;
  secret_id uuid;
  secret_value text;
begin
  select * into row_value from public.integration_provider_configs where provider = p_provider;
  if not found or row_value.disconnected_at is not null then return null; end if;
  for secret_key, secret_id in
    select key, value::text::uuid from jsonb_each(row_value.secret_refs)
  loop
    select decrypted_secret into secret_value
    from vault.decrypted_secrets where id = secret_id;
    if secret_value is null then raise exception 'CREDENTIAL_UNAVAILABLE'; end if;
    secrets := secrets || jsonb_build_object(secret_key, secret_value);
  end loop;
  return jsonb_build_object('config', row_value.config, 'secrets', secrets);
end;
$$;

create function public.record_integration_verification(
  p_provider text,
  p_success boolean,
  p_identity jsonb,
  p_error text,
  p_actor uuid,
  p_correlation uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_provider not in ('meta', 'hubspot')
    or jsonb_typeof(p_identity) <> 'object'
    or (p_error is not null and p_error !~ '^[A-Z][A-Z0-9_]{1,63}$') then
    raise exception 'VALIDATION_FAILED';
  end if;
  insert into public.integration_provider_configs(
    provider, provider_identity, last_verified_at, last_error_code, updated_at, updated_by
  ) values (
    p_provider,
    case when p_success then p_identity else '{}'::jsonb end,
    case when p_success then now() else null end,
    case when p_success then null else coalesce(p_error, 'INTERNAL') end,
    now(), p_actor
  ) on conflict (provider) do update set
    last_verified_at = case when p_success then now() else public.integration_provider_configs.last_verified_at end,
    last_error_code = case when p_success then null else coalesce(p_error, 'INTERNAL') end,
    provider_identity = case when p_success then p_identity else public.integration_provider_configs.provider_identity end,
    disconnected_at = case when public.integration_provider_configs.secret_refs <> '{}'::jsonb then null else public.integration_provider_configs.disconnected_at end,
    updated_at = now(),
    updated_by = p_actor;
  insert into public.integration_credential_audit(
    provider, action, actor_id, success, error_code, correlation_id
  ) values (
    p_provider,
    case when p_success then 'verification_succeeded' else 'verification_failed' end,
    p_actor, p_success, case when p_success then null else coalesce(p_error, 'INTERNAL') end,
    p_correlation
  );
end;
$$;

create function public.remove_integration_provider(
  p_provider text,
  p_actor uuid,
  p_correlation uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  refs jsonb;
  secret_id uuid;
begin
  if p_provider not in ('meta', 'hubspot') then raise exception 'VALIDATION_FAILED'; end if;
  perform pg_advisory_xact_lock(hashtext('integration-provider:' || p_provider));
  select secret_refs into refs from public.integration_provider_configs
  where provider = p_provider and disconnected_at is null and secret_refs <> '{}'::jsonb;
  if not found then raise exception 'NOT_CONFIGURED'; end if;
  for secret_id in select value::text::uuid from jsonb_each(refs)
  loop
    delete from vault.secrets where id = secret_id;
  end loop;
  update public.integration_provider_configs set
    config = '{}'::jsonb,
    secret_refs = '{}'::jsonb,
    provider_identity = '{}'::jsonb,
    configured_at = null,
    credentials_updated_at = null,
    last_verified_at = null,
    last_error_code = null,
    disconnected_at = now(),
    updated_at = now(),
    updated_by = p_actor
  where provider = p_provider;
  insert into public.integration_credential_audit(
    provider, action, actor_id, success, correlation_id
  ) values (p_provider, 'removed', p_actor, true, p_correlation);
end;
$$;

revoke all on function public.save_integration_provider(text, jsonb, jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function public.resolve_integration_provider(text) from public, anon, authenticated;
revoke all on function public.record_integration_verification(text, boolean, jsonb, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.remove_integration_provider(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.save_integration_provider(text, jsonb, jsonb, uuid, uuid) to service_role;
grant execute on function public.resolve_integration_provider(text) to service_role;
grant execute on function public.record_integration_verification(text, boolean, jsonb, text, uuid, uuid) to service_role;
grant execute on function public.remove_integration_provider(text, uuid, uuid) to service_role;
