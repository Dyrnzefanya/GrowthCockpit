begin;

do $$
begin
  if has_table_privilege('anon', 'public.integration_provider_configs', 'select')
    or has_table_privilege('authenticated', 'public.integration_provider_configs', 'select')
    or has_table_privilege('authenticated', 'public.integration_provider_configs', 'update')
    or has_table_privilege('authenticated', 'public.integration_credential_audit', 'select') then
    raise exception 'TEST-13.1 credential tables exposed to browser roles';
  end if;
  if has_function_privilege('anon', 'public.resolve_integration_provider(text)', 'execute')
    or has_function_privilege('authenticated', 'public.save_integration_provider(text,jsonb,jsonb,uuid,uuid)', 'execute')
    or not has_function_privilege('service_role', 'public.resolve_integration_provider(text)', 'execute') then
    raise exception 'TEST-13.1 credential RPC grants invalid';
  end if;
end $$;

insert into auth.users(id, email) values
  ('33333333-3333-4333-8333-333333333333', 'integration-owner@example.test');

set local role service_role;
do $$
declare
  actor uuid := '33333333-3333-4333-8333-333333333333';
  first_secret text := 'phase13-vault-secret-first';
  next_secret text := 'phase13-vault-secret-next';
  resolved jsonb;
begin
  perform public.save_integration_provider(
    'meta',
    '{"ad_account_id":"123456","api_version":"v26.0"}',
    jsonb_build_object('access_token', first_secret),
    actor,
    gen_random_uuid()
  );
  resolved := public.resolve_integration_provider('meta');
  if resolved->'secrets'->>'access_token' <> first_secret then
    raise exception 'TEST-13.1 Vault resolution failed';
  end if;
  if (select row_to_json(c)::text from public.integration_provider_configs c where provider='meta') like '%' || first_secret || '%'
    or exists(select 1 from public.integration_credential_audit where row_to_json(integration_credential_audit)::text like '%' || first_secret || '%')
    or exists(select 1 from public.integration_runs where row_to_json(integration_runs)::text like '%' || first_secret || '%') then
    raise exception 'TEST-13.1 secret leaked into application tables';
  end if;

  perform public.save_integration_provider(
    'meta',
    '{"ad_account_id":"123456","api_version":"v26.0"}',
    jsonb_build_object('access_token', next_secret),
    actor,
    gen_random_uuid()
  );
  resolved := public.resolve_integration_provider('meta');
  if resolved->'secrets'->>'access_token' <> next_secret
    or exists(select 1 from vault.decrypted_secrets where decrypted_secret = first_secret) then
    raise exception 'TEST-13.1 credential replacement retained old value';
  end if;

  perform public.record_integration_verification(
    'meta', false, '{}'::jsonb, 'META_TOKEN_INVALID', actor, gen_random_uuid()
  );
  if not exists (
    select 1 from public.integration_credential_audit
    where provider='meta' and action='verification_failed'
      and error_code='META_TOKEN_INVALID' and not success
  ) then raise exception 'TEST-13.1 safe verification audit missing'; end if;

  perform public.remove_integration_provider('meta', actor, gen_random_uuid());
  if public.resolve_integration_provider('meta') is not null
    or exists(select 1 from vault.decrypted_secrets where decrypted_secret = next_secret) then
    raise exception 'TEST-13.1 credential removal failed';
  end if;

  begin
    perform public.save_integration_provider(
      'ga4', '{}'::jsonb, jsonb_build_object('access_token', next_secret),
      actor, gen_random_uuid()
    );
    raise exception 'TEST-13.1 coming-soon provider accepted credentials';
  exception when others then
    if sqlerrm = 'TEST-13.1 coming-soon provider accepted credentials' then raise; end if;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$
begin
  begin
    perform public.resolve_integration_provider('meta');
    raise exception 'TEST-13.1 authenticated credential read allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.remove_integration_provider('meta',
      '33333333-3333-4333-8333-333333333333', gen_random_uuid());
    raise exception 'TEST-13.1 authenticated credential modification allowed';
  exception when insufficient_privilege then null; end;
end $$;

rollback;
