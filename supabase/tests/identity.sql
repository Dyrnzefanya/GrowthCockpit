begin;
insert into auth.users(id, email, raw_user_meta_data) values
('11111111-1111-4111-8111-111111111111', 'rls-a@example.test', '{"role":"viewer","full_name":"RLS A"}'),
('22222222-2222-4222-8222-222222222222', 'rls-b@example.test', '{}');
do $$ begin
  if (select count(*) from public.profiles where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')) <> 2 then raise exception 'Provisioning failed'; end if;
  if (select role from public.profiles where id='11111111-1111-4111-8111-111111111111') <> 'owner' then raise exception 'Untrusted role metadata was used'; end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) then raise exception 'RLS missing'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and ('anon'=any(roles) or 'public'=any(roles))) then raise exception 'Anonymous policy'; end if;
  if has_table_privilege('anon','public.profiles','select') or has_table_privilege('anon','public.app_settings','select') then raise exception 'Anon grant'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$ declare affected integer; begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'TEST-2.3 profile isolation failed'; end if;
  update public.profiles set full_name='Forbidden' where id='22222222-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user update'; end if;
  begin
    update public.profiles set role='owner';
    raise exception 'Role escalation allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.app_settings set updated_by='22222222-2222-4222-8222-222222222222';
    raise exception 'Audit forgery allowed';
  exception when insufficient_privilege then null; end;
  update public.app_settings set value='"Asia/Jakarta"' where key='workspace.timezone';
  if (select updated_by from public.app_settings where key='workspace.timezone') <> '11111111-1111-4111-8111-111111111111'::uuid then raise exception 'Missing audit actor'; end if;
end $$;
rollback;
