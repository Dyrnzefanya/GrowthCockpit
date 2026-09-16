-- Correct Vault reference decoding: jsonb_each_text yields the UUID without JSON quotes.
create or replace function public.resolve_integration_provider(p_provider text)
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
    select key, value::uuid from jsonb_each_text(row_value.secret_refs)
  loop
    select decrypted_secret into secret_value
    from vault.decrypted_secrets where id = secret_id;
    if secret_value is null then raise exception 'CREDENTIAL_UNAVAILABLE'; end if;
    secrets := secrets || jsonb_build_object(secret_key, secret_value);
  end loop;
  return jsonb_build_object('config', row_value.config, 'secrets', secrets);
end;
$$;

create or replace function public.remove_integration_provider(
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
  for secret_id in select value::uuid from jsonb_each_text(refs)
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

revoke all on function public.resolve_integration_provider(text) from public, anon, authenticated;
revoke all on function public.remove_integration_provider(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.resolve_integration_provider(text) to service_role;
grant execute on function public.remove_integration_provider(text, uuid, uuid) to service_role;
