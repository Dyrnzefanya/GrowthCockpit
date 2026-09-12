begin;
insert into auth.users(id,email) values ('33333333-3333-4333-8333-333333333333','workflow-rls@example.test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$
declare template_id uuid; first_run uuid; repeated uuid; item_id uuid; revision timestamptz;
begin
  insert into public.workflow_templates(key,name,cadence,steps)
    values('rls-test','RLS test','daily','[{"key":"one","label":"Original","help":"","required":true}]') returning id into template_id;
  first_run := public.materialize_workflow(template_id,1,'2026-09-14','[{"key":"one","label":"Original","help":"","required":true,"position":0}]');
  repeated := public.materialize_workflow(template_id,1,'2026-09-14','[{"key":"one","label":"Changed","help":"","required":false,"position":0}]');
  if first_run <> repeated then raise exception 'TEST-3.1 duplicate run'; end if;
  if (select count(*) from public.workflow_items where run_id=first_run) <> 1 then raise exception 'Duplicate items'; end if;
  update public.workflow_templates set steps='[{"key":"one","label":"Changed","help":"","required":false}]',version=2,is_active=false where id=template_id;
  if (select label_snapshot from public.workflow_items where run_id=first_run) <> 'Original' then raise exception 'TEST-3.5 history rewritten'; end if;
  select id into item_id from public.workflow_items where run_id=first_run;
  select updated_at into revision from public.workflow_runs where id=first_run;
  perform public.commit_workflow_item(first_run,revision,item_id,true,now(),'Step note','completed',now(),now());
  if (select status from public.workflow_runs where id=first_run) <> 'completed' then raise exception 'Commit failed'; end if;
  begin
    perform public.commit_workflow_item(first_run,revision - interval '1 second',item_id,false,null,'','pending',null,null);
    raise exception 'Stale version accepted';
  exception when serialization_failure then null; end;
  if not (select is_done from public.workflow_items where id=item_id) then raise exception 'Conflict partially wrote item'; end if;
  insert into public.notes(note_date,body) values('2026-09-14','Workflow verification');
  begin
    insert into public.notes(note_date,body,created_by) values('2026-09-14','Forged','11111111-1111-4111-8111-111111111111');
    raise exception 'Note author forgery accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare table_name text; begin
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) then raise exception 'RLS missing'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and ('anon'=any(roles) or 'public'=any(roles))) then raise exception 'Anonymous policy'; end if;
  foreach table_name in array array['workflow_templates','workflow_runs','workflow_items','notes'] loop
    if has_table_privilege('anon','public.' || table_name,'select,insert,update,delete') then raise exception 'Anonymous grant'; end if;
    if has_table_privilege('authenticated','public.' || table_name,'delete') then raise exception 'Unexpected delete grant'; end if;
  end loop;
  if has_function_privilege('anon','public.materialize_workflow(uuid,integer,date,jsonb)','execute') then raise exception 'Anonymous RPC'; end if;
  if has_function_privilege('anon','public.commit_workflow_item(uuid,timestamptz,uuid,bool,timestamptz,text,text,timestamptz,timestamptz)','execute') then raise exception 'Anonymous write RPC'; end if;
end $$;
rollback;
