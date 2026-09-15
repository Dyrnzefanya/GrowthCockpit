-- Phase 11: append-only evidence and operator state on the existing alert record.
create table public.rule_evaluations (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 rule_key text not null check(rule_key ~ '^R-(0[0-9]|10)$'), rule_version text not null,
 evaluated_at timestamptz not null, window_start date not null, window_end date not null,
 scope_type text not null check(scope_type in ('account','campaign','adset','ad','lead','experiment','integration')),
 scope_id text not null, verdict text not null check(verdict in ('MONITOR','INVESTIGATE','HOLD','SCALE_CANDIDATE','PAUSE_CANDIDATE','SUPPRESSED')),
 evidence jsonb not null, alert_id uuid references public.alerts(id),
 unique(rule_key,rule_version,evaluated_at,scope_type,scope_id), check(window_start<=window_end)
);
alter table public.rule_evaluations enable row level security;
revoke all on public.rule_evaluations from anon,authenticated,service_role;
grant select on public.rule_evaluations to authenticated;
grant select,insert on public.rule_evaluations to service_role;
create policy rule_evaluations_read on public.rule_evaluations for select to authenticated using ((select auth.uid()) is not null);
create index rule_evaluations_scope_time on public.rule_evaluations(scope_type,scope_id,evaluated_at desc,id);
create index rule_evaluations_time on public.rule_evaluations(evaluated_at desc,id);
alter table public.alerts add column snooze_until timestamptz,
 add column dismissed_until timestamptz, add column dismissed_reason text,
 add column dismissal_count integer not null default 0 check(dismissal_count>=0),
 add column action_dismissals jsonb not null default '[]' check(jsonb_typeof(action_dismissals)='array');

insert into public.app_settings(key,value,description) values
 ('rules.target_cpql','null','Business-approved target CPQL; null means unconfigured'),
 ('rules.currency','null','Currency of approved target CPQL'),
 ('rules.frequency','null','Approved daily frequency threshold; no guessed default'),
 ('rules.lead_gen_campaigns','[]','Explicit Meta lead-generation campaign IDs'),
 ('rules.cpl_rise','0.2','R-03 CPL relative increase'),
 ('rules.cpql_fall','0.1','R-03 CPQL relative decrease'),
 ('rules.quality_fall','0.25','R-04 MQL-rate relative decrease'),
 ('rules.ctr_fall','0.25','R-10 CTR relative decrease');

-- Aggregate facts only; attribution resolution and every ratio remain in TypeScript.
create function public.decision_facts(p_from date,p_to date) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare facts jsonb; family jsonb;
begin
 select jsonb_build_object(
  'ads',coalesce((select jsonb_agg(to_jsonb(a)) from (
   select ad_account_id,campaign_id,campaign_name,metric_date,spend::text,impressions,clicks,frequency,currency,source_timezone,ingested_at
   from public.ad_metrics_daily where metric_date between p_from and p_to and adset_id='' and ad_id='' order by ad_account_id,campaign_id,metric_date limit 10001
  ) a),'[]'::jsonb),
  'identities',coalesce((select jsonb_agg(to_jsonb(a)) from (
   select ad_account_id,campaign_id,array_agg(distinct campaign_name) names from public.ad_metrics_daily
   where adset_id='' and ad_id='' group by ad_account_id,campaign_id order by ad_account_id,campaign_id limit 10001
  ) a),'[]'::jsonb),
  'leads',coalesce((select jsonb_agg(to_jsonb(l)) from (
   select platform,campaign_id,lt_campaign,inquiry_date,count(*)::integer leads,
    count(*) filter(where qualification_status in ('mql','sql'))::integer mql,
    count(*) filter(where qualification_status='sql')::integer sql,max(inquiry_at) last_inquiry
   from public.leads where inquiry_date between p_from and p_to group by platform,campaign_id,lt_campaign,inquiry_date
   order by inquiry_date,platform,campaign_id,lt_campaign limit 10001
  ) l),'[]'::jsonb),
  'followups',coalesce((select jsonb_agg(to_jsonb(l)) from (
   select l.id,l.qualification_status,coalesce((select max(changed_at) from public.lead_stage_events e where e.lead_id=l.id),l.inquiry_at) last_activity
   from public.leads l where qualification_status in ('mql','sql') order by l.id limit 10001
  ) l),'[]'::jsonb),
  'experiments',coalesce((select jsonb_agg(to_jsonb(e)) from (
   select id,code,status,review_date,external_refs from public.experiments where status in ('running','completed') order by id limit 10001
  ) e),'[]'::jsonb),
  'outcomes',(select jsonb_build_object('due',count(*),'closed',count(*) filter(where stage_category in ('won','lost'))) from public.deals where expected_close_date < p_to),
  'states',coalesce((select jsonb_agg(to_jsonb(s)) from (select integration,resource,last_success_at,cursor,last_error from public.sync_state order by integration,resource limit 10001) s),'[]'::jsonb)
 ) into facts;
 for family in select value from jsonb_each(facts) where jsonb_typeof(value)='array' loop
  if jsonb_array_length(family)>10000 then raise exception 'DECISION_FACT_LIMIT_EXCEEDED' using errcode='54000'; end if;
 end loop;
 return facts;
end $$;
revoke all on function public.decision_facts(date,date) from public,anon,authenticated;
grant execute on function public.decision_facts(date,date) to service_role;

-- Storage transaction only: the service supplies all rule results and alert choices.
create function public.commit_decisions(p_run uuid,p_rows jsonb,p_cursor text) returns integer
language plpgsql set search_path='' as $$
declare item jsonb; a public.alerts; inserted integer; total integer:=0; prior public.alerts;
begin
 perform 1 from public.integration_runs where id=p_run and job_key='JOB-EVALUATE-RULES' and status='running' and lease_until>clock_timestamp() for update;
 if not found then raise exception 'LEASE_LOST' using errcode='40001'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'INVALID_BATCH' using errcode='22023'; end if;
 for item in select value from jsonb_array_elements(p_rows) loop
  if exists(select 1 from public.rule_evaluations where rule_key=item->>'rule_key' and rule_version=item->>'rule_version' and evaluated_at=(item->>'evaluated_at')::timestamptz and scope_type=item->>'scope_type' and scope_id=item->>'scope_id') then continue; end if;
  a:=null;
  if item->'alert' is not null and item->'alert'<>'null'::jsonb then
   perform pg_advisory_xact_lock(hashtextextended(item->'alert'->>'alert_key',9));
   select * into prior from public.alerts where alert_key=item->'alert'->>'alert_key' and status<>'resolved' for update;
   if (item->>'override_snooze')::boolean and prior.id is not null and prior.updated_at=(item->>'alert_revision')::timestamptz then
    update public.alerts set snooze_until=null,status='open',suppressed_until=null,
      history=history||jsonb_build_array(jsonb_build_object('event','snooze_overridden','at',item->>'evaluated_at','reason','severity_escalated')) where id=prior.id;
   end if;
   a:=public.raise_alert(item->'alert');
  else
   update public.alerts set status='resolved',resolved_at=now(),resolved_reason='condition_cleared',notification_status='suppressed'
   where alert_key=item->>'alert_key' and status<>'resolved' and last_seen_at<=(item->>'evaluated_at')::timestamptz;
  end if;
  insert into public.rule_evaluations(rule_key,rule_version,evaluated_at,window_start,window_end,scope_type,scope_id,verdict,evidence,alert_id)
  values(item->>'rule_key',item->>'rule_version',(item->>'evaluated_at')::timestamptz,(item->>'window_start')::date,(item->>'window_end')::date,item->>'scope_type',item->>'scope_id',item->>'verdict',item->'evidence',a.id)
  on conflict do nothing;
  get diagnostics inserted=row_count; total:=total+inserted;
 end loop;
 insert into public.sync_state(integration,resource,cursor) values('decisions','evaluation',p_cursor)
 on conflict(integration,resource) do update set cursor=excluded.cursor;
 return total;
end $$;
revoke all on function public.commit_decisions(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.commit_decisions(uuid,jsonb,text) to service_role;

create function public.decision_action(p_id uuid,p_revision timestamptz,p_operation text,p_reason text,p_until timestamptz,p_actor uuid) returns void
language plpgsql set search_path='' as $$
declare a public.alerts;
begin
 select * into a from public.alerts where id=p_id and source='decisions' and status<>'resolved' for update;
 if not found or a.updated_at<>p_revision then raise exception 'CONFLICT' using errcode='40001'; end if;
 if p_until<=now() or p_until>now()+interval '30 days' or p_until is null then raise exception 'INVALID_DURATION' using errcode='22023'; end if;
 if p_operation='dismiss' then
  if p_reason is null or length(btrim(p_reason)) not between 1 and 200 then raise exception 'INVALID_REASON' using errcode='22023'; end if;
  update public.alerts set dismissed_until=p_until,dismissed_reason=p_reason,dismissal_count=dismissal_count+1,
   action_dismissals=action_dismissals||jsonb_build_array(jsonb_build_object('at',now(),'reason',p_reason,'actor',p_actor)),
   history=history||jsonb_build_array(jsonb_build_object('event','dismissed','at',now(),'reason',p_reason,'until',p_until,'actor',p_actor)) where id=p_id;
 elsif p_operation='snooze' then
  update public.alerts set snooze_until=p_until,status='suppressed',suppressed_until=p_until,
   history=history||jsonb_build_array(jsonb_build_object('event','snoozed','at',now(),'until',p_until,'actor',p_actor)) where id=p_id;
 else raise exception 'INVALID_ACTION' using errcode='22023'; end if;
end $$;
revoke all on function public.decision_action(uuid,timestamptz,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.decision_action(uuid,timestamptz,text,text,timestamptz,uuid) to service_role;

-- Audited setting changes retain old/new values, not just the latest timestamp.
create function public.audit_decision_setting() returns trigger language plpgsql set search_path='' as $$
begin
 if old.value is distinct from new.value and (new.key like 'rules.%' or new.key in ('health.min_coverage','health.min_outcome_completeness','metrics.min_results_for_verdict','metrics.cohort_maturity_days')) then
  new.audit_history:=old.audit_history||jsonb_build_array(jsonb_build_object('at',now(),'actor',auth.uid(),'old',old.value,'new',new.value));
 else new.audit_history:=old.audit_history; end if;
 return new;
end $$;
alter table public.app_settings add column audit_history jsonb not null default '[]';
revoke update on public.app_settings from authenticated;
grant update(value) on public.app_settings to authenticated;
create trigger settings_decision_audit before update on public.app_settings for each row execute function public.audit_decision_setting();
revoke all on function public.audit_decision_setting() from public,anon,authenticated;
