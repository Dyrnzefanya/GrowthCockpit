begin;
insert into auth.users(id,email) values ('55555555-5555-4555-8555-555555555555','experiment-rls@example.test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',true);

do $$
declare
  draft_id uuid;
  running_id uuid;
  completed_id uuid;
  cancelled_id uuid;
  revision timestamptz;
  actor uuid;
begin
  draft_id := public.create_experiment(
    'First test','If the message changes, response rises','message','MQL rate',
    '2026-09-13','2026-09-15','Current message','New message',null,null,null,5,4,2,
    'meta','{"campaign_id":"123","landing_page_url":"https://example.test/lp"}'
  );
  if (select code from public.experiments where id=draft_id) <> 'EXP-2026-001' then
    raise exception 'TEST-5.2 first code incorrect';
  end if;
  select owner_id into actor from public.experiments where id=draft_id;
  if actor <> '55555555-5555-4555-8555-555555555555' then
    raise exception 'Experiment owner was not audited';
  end if;

  select updated_at into revision from public.experiments where id=draft_id;
  perform public.update_draft_experiment(
    draft_id,revision,'Updated test','If the message changes, response rises',
    'message','MQL rate','2026-09-13','2026-09-16','Current','New',null,null,null,5,4,2,
    'meta','{}'
  );
  select updated_at into revision from public.experiments where id=draft_id;
  perform public.transition_experiment(draft_id,revision,'running','2026-09-13');
  select updated_at into revision from public.experiments where id=draft_id;

  begin
    perform public.transition_experiment(draft_id,revision,'draft','2026-09-13');
    raise exception 'TEST-5.1 invalid running to draft accepted';
  exception when raise_exception then
    if sqlerrm not like 'BUSINESS_RULE_REJECTED: allowed completed, cancelled%' then raise; end if;
  end;

  begin
    perform public.transition_experiment(
      draft_id,revision,'completed','2026-09-16','win',12,'{}','Conclusion','','Next'
    );
    raise exception 'TEST-5.3 empty learning accepted';
  exception when check_violation then null; end;

  perform public.transition_experiment(
    draft_id,revision,'completed','2026-09-16','win',12,
    '{"observed_results":4,"minimum_results":10,"sample_warning":true,"verdict_label":"inconclusive_by_default"}',
    'The variant improved response','Keep one variable isolated','Repeat on another audience'
  );
  completed_id := draft_id;
  if (select status from public.experiments where id=completed_id) <> 'completed' then
    raise exception 'TEST-5.1 completion failed';
  end if;
  if (select learning from public.experiment_results where experiment_id=completed_id) <> 'Keep one variable isolated' then
    raise exception 'TEST-5.3 learning missing';
  end if;
  if not exists (
    select 1 from public.experiment_results
    where experiment_id=completed_id and search_vector @@ websearch_to_tsquery('simple','isolated')
  ) then raise exception 'TEST-5.6 learning search failed'; end if;

  running_id := public.create_experiment(
    'Running cancellation','Hypothesis','creative','CTR','2026-09-13','2026-09-16'
  );
  select updated_at into revision from public.experiments where id=running_id;
  perform public.transition_experiment(running_id,revision,'running','2026-09-13');
  select updated_at into revision from public.experiments where id=running_id;
  perform public.transition_experiment(running_id,revision,'cancelled','2026-09-14');

  cancelled_id := public.create_experiment(
    'Draft cancellation','Hypothesis','landing page','CVR','2026-09-13','2026-09-16'
  );
  select updated_at into revision from public.experiments where id=cancelled_id;
  perform public.transition_experiment(cancelled_id,revision,'cancelled','2026-09-13');
  select updated_at into revision from public.experiments where id=cancelled_id;
  begin
    perform public.transition_experiment(cancelled_id,revision,'running','2026-09-13');
    raise exception 'TEST-5.1 cancelled terminal state accepted';
  exception when raise_exception then
    if sqlerrm not like 'BUSINESS_RULE_REJECTED: allowed %' then raise; end if;
  end;

  select updated_at into revision from public.experiments where id=completed_id;
  perform public.transition_experiment(completed_id,revision,'cancelled','2026-09-17');
  if (select count(*) from public.experiment_results where experiment_id=completed_id) <> 1 then
    raise exception 'Cancelled completed experiment lost its historical result';
  end if;

  begin
    perform public.create_experiment(
      'Bad refs','Hypothesis','message','CTR','2026-09-13','2026-09-16',
      '','',null,null,null,3,3,3,null,'{"landing_page_url":"javascript:alert(1)"}'
    );
    raise exception 'TEST-5.1 malformed external reference accepted';
  exception when check_violation then null; end;
end $$;

do $$
begin
  begin
    update public.experiments set status='completed';
    raise exception 'Direct lifecycle update accepted';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and tablename='experiments'
      and indexdef ilike '%(status, review_date)%'
  ) then raise exception 'FR-5.10 review queue index missing'; end if;
  if not exists (
    select 1 from pg_indexes where schemaname='public' and tablename='experiment_results'
      and indexdef ilike '%using gin (search_vector)%'
  ) then raise exception 'FR-5.9 learning search index missing'; end if;
  if has_table_privilege('anon','public.experiments','select,insert,update,delete')
    or has_table_privilege('anon','public.experiment_results','select,insert,update,delete') then
    raise exception 'Anonymous experiment grant';
  end if;
  if has_table_privilege('authenticated','public.experiments','insert,update,delete')
    or has_table_privilege('authenticated','public.experiment_results','insert,update,delete') then
    raise exception 'Direct authenticated experiment write grant';
  end if;
  if has_function_privilege('anon','public.create_experiment(text,text,text,text,date,date,text,text,text,numeric,numeric,integer,integer,integer,text,jsonb)','execute') then
    raise exception 'Anonymous create RPC grant';
  end if;
end $$;
rollback;
