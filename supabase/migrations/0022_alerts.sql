-- Phase 9: alert persistence and atomic lifecycle/delivery evidence.
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  alert_key text not null check (length(alert_key) between 1 and 300),
  type text not null check (length(type) between 1 and 80),
  severity text not null check (severity in ('info','warning','critical')),
  source text not null check (length(source) between 1 and 80),
  entity_type text not null check (length(entity_type) between 1 and 80),
  entity_id uuid,
  title text not null check (length(title) between 1 and 160),
  message text not null check (length(message) between 1 and 500),
  evidence jsonb not null default '{}',
  status text not null default 'open' check (status in ('open','acknowledged','resolved','suppressed')),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  last_notified_at timestamptz,
  notification_count integer not null default 0 check (notification_count >= 0),
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed','suppressed')),
  notification_attempts integer not null default 0 check (notification_attempts >= 0),
  next_notification_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolved_reason text,
  suppressed_at timestamptz,
  suppressed_until timestamptz,
  suppressed_reason text,
  suppressed_by uuid references public.profiles(id),
  history jsonb not null default '[]' check (jsonb_typeof(history) = 'array')
);
create unique index alerts_active_key_idx on public.alerts(alert_key) where status <> 'resolved';
create index alerts_status_severity_seen_idx on public.alerts(status,severity,last_seen_at desc);
create index alerts_notification_due_idx on public.alerts(next_notification_at,last_seen_at,id)
  where status='open' and notification_status in ('pending','failed');

alter table public.alerts enable row level security;
revoke all on public.alerts from anon,authenticated;
grant select on public.alerts to authenticated;
grant select,insert,update on public.alerts to service_role;
create policy alerts_workspace_read on public.alerts for select to authenticated using ((select auth.uid()) is not null);
create function public.bound_alert_history() returns trigger language plpgsql set search_path='' as $$
begin
  if jsonb_array_length(new.history)>100 then
    select jsonb_agg(value order by n) into new.history
    from jsonb_array_elements(new.history) with ordinality x(value,n)
    where n>jsonb_array_length(new.history)-100;
  end if;
  return new;
end $$;
revoke all on function public.bound_alert_history() from public,anon,authenticated;
create trigger alerts_history_bound before insert or update on public.alerts for each row execute function public.bound_alert_history();
create trigger alerts_timestamp before update on public.alerts for each row execute function public.set_updated_at();

create function public.raise_alert(p_alert jsonb) returns public.alerts
language plpgsql set search_path='' as $$
declare a public.alerts; detected timestamptz := (p_alert->>'detected_at')::timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_alert->>'alert_key',9));
  select * into a from public.alerts where alert_key=p_alert->>'alert_key' and status<>'resolved' for update;
  if found then
    update public.alerts set
      severity=p_alert->>'severity', source=p_alert->>'source', entity_type=p_alert->>'entity_type',
      entity_id=(p_alert->>'entity_id')::uuid, title=p_alert->>'title', message=p_alert->>'message',
      evidence=coalesce(p_alert->'evidence','{}'), last_seen_at=greatest(last_seen_at,detected),
      occurrence_count=occurrence_count+1,
      status=case when status='suppressed' and suppressed_until<=detected then 'open' else status end,
      notification_status=case
        when (p_alert->>'notify')::boolean=false then 'suppressed'
        when status='open' and notification_status='sent'
          and (last_notified_at at time zone 'Asia/Jakarta')::date < (detected at time zone 'Asia/Jakarta')::date then 'pending'
        else notification_status end,
      next_notification_at=case
        when (p_alert->>'notify')::boolean and status='open' and notification_status='sent'
          and (last_notified_at at time zone 'Asia/Jakarta')::date < (detected at time zone 'Asia/Jakarta')::date then detected
        else next_notification_at end,
      history=history || jsonb_build_array(jsonb_build_object('event','refreshed','at',detected))
    where id=a.id returning * into a;
    return a;
  end if;
  insert into public.alerts(alert_key,type,severity,source,entity_type,entity_id,title,message,evidence,
    first_seen_at,last_seen_at,notification_status,next_notification_at,history)
  values(p_alert->>'alert_key',p_alert->>'type',p_alert->>'severity',p_alert->>'source',p_alert->>'entity_type',
    (p_alert->>'entity_id')::uuid,p_alert->>'title',p_alert->>'message',coalesce(p_alert->'evidence','{}'),detected,detected,
    case when (p_alert->>'notify')::boolean then 'pending' else 'suppressed' end,
    case when (p_alert->>'notify')::boolean then detected end,
    jsonb_build_array(jsonb_build_object('event','raised','at',detected))) returning * into a;
  return a;
end $$;

create function public.raise_alert_batch(p_alerts jsonb) returns integer
language plpgsql set search_path='' as $$
declare item jsonb; changed integer := 0;
begin
  if jsonb_typeof(p_alerts)<>'array' or jsonb_array_length(p_alerts)>500 then raise exception 'INVALID_ALERT_BATCH' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_alerts) loop
    perform public.raise_alert(item); changed := changed + 1;
  end loop;
  return changed;
end $$;

create function public.transition_alert(p_id uuid,p_action text,p_reason text,p_actor uuid,p_until timestamptz default null) returns public.alerts
language plpgsql set search_path='' as $$
declare a public.alerts; stamp timestamptz := now();
begin
  select * into a from public.alerts where id=p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if length(btrim(p_reason))<1 or length(p_reason)>200 then raise exception 'INVALID_REASON' using errcode='22023'; end if;
  if p_action='acknowledge' then
    if a.status='acknowledged' then return a; end if;
    if a.status<>'open' then raise exception 'INVALID_TRANSITION' using errcode='22023'; end if;
    update public.alerts set status='acknowledged',acknowledged_at=stamp,acknowledged_by=p_actor,
      notification_status=case when notification_status='pending' then 'suppressed' else notification_status end,
      history=history||jsonb_build_array(jsonb_build_object('event','acknowledged','at',stamp,'reason',p_reason,'actor',p_actor)) where id=p_id returning * into a;
  elsif p_action='snooze' then
    if a.status<>'open' or p_until is null or p_until<=stamp or p_until>stamp+interval '30 days' then raise exception 'INVALID_TRANSITION' using errcode='22023'; end if;
    update public.alerts set status='suppressed',suppressed_at=stamp,suppressed_until=p_until,suppressed_reason=p_reason,suppressed_by=p_actor,
      history=history||jsonb_build_array(jsonb_build_object('event','snoozed','at',stamp,'until',p_until,'reason',p_reason,'actor',p_actor)) where id=p_id returning * into a;
  elsif p_action='resolve' then
    if a.status='resolved' then return a; end if;
    update public.alerts set status='resolved',resolved_at=stamp,resolved_reason=p_reason,
      notification_status=case when notification_status='pending' then 'suppressed' else notification_status end,
      history=history||jsonb_build_array(jsonb_build_object('event','resolved','at',stamp,'reason',p_reason,'actor',p_actor)) where id=p_id returning * into a;
  else raise exception 'INVALID_TRANSITION' using errcode='22023';
  end if;
  return a;
end $$;

create function public.reactivate_due_alerts(p_at timestamptz) returns integer
language plpgsql set search_path='' as $$
declare changed integer;
begin
  update public.alerts set status='open',suppressed_until=null,
    history=history||jsonb_build_array(jsonb_build_object('event','snooze_ended','at',p_at))
  where status='suppressed' and suppressed_until<=p_at;
  get diagnostics changed = row_count; return changed;
end $$;

create function public.resolve_missing_alerts(p_types text[],p_active_keys text[],p_before timestamptz) returns integer
language plpgsql set search_path='' as $$
declare changed integer;
begin
  update public.alerts set status='resolved',resolved_at=now(),resolved_reason='condition_cleared',
    notification_status=case when notification_status='pending' then 'suppressed' else notification_status end,
    history=history||jsonb_build_array(jsonb_build_object('event','resolved','at',now(),'reason','condition_cleared'))
  where status<>'resolved' and type=any(p_types) and last_seen_at<p_before
    and not (alert_key=any(coalesce(p_active_keys,array[]::text[])));
  get diagnostics changed = row_count; return changed;
end $$;

create function public.record_alert_delivery(p_ids uuid[],p_outcome text,p_error text,p_next timestamptz,p_max integer) returns integer
language plpgsql set search_path='' as $$
declare changed integer; stamp timestamptz := now();
begin
  if p_outcome='sent' then
    update public.alerts set notification_status='sent',notification_attempts=notification_attempts+1,
      notification_count=notification_count+1,last_notified_at=stamp,next_notification_at=null,
      history=history||jsonb_build_array(jsonb_build_object('event','notified','at',stamp,'channel','slack'))
    where id=any(p_ids) and status='open';
  elsif p_outcome='deferred' then
    update public.alerts set notification_status='pending',next_notification_at=p_next,
      history=history||jsonb_build_array(jsonb_build_object('event','delivery_deferred','at',stamp,'until',p_next,'reason',p_error))
    where id=any(p_ids) and status='open';
  elsif p_outcome='failed' then
    update public.alerts set notification_attempts=notification_attempts+1,
      notification_status=case when notification_attempts+1>=p_max then 'failed' else 'pending' end,
      next_notification_at=case when notification_attempts+1>=p_max then null else p_next end,
      history=history||jsonb_build_array(jsonb_build_object('event','delivery_failed','at',stamp,'code',p_error))
    where id=any(p_ids) and status='open';
  else raise exception 'INVALID_DELIVERY_OUTCOME' using errcode='22023'; end if;
  get diagnostics changed = row_count; return changed;
end $$;

create function public.alert_notification_volume(p_days integer default 30)
returns table(business_date date,type text,notifications bigint)
language sql stable security invoker set search_path='' as $$
  select ((x.value->>'at')::timestamptz at time zone 'Asia/Jakarta')::date, a.type, count(*)
  from public.alerts a cross join lateral jsonb_array_elements(a.history) x(value)
  where x.value->>'event'='notified' and (x.value->>'at')::timestamptz>=now()-make_interval(days=>least(greatest(p_days,1),90))
  group by 1,2 order by 1 desc,2;
$$;

do $$ declare f record; begin
  for f in select oid::regprocedure as sig from pg_proc where pronamespace='public'::regnamespace
    and proname in ('raise_alert','raise_alert_batch','transition_alert','reactivate_due_alerts','resolve_missing_alerts','record_alert_delivery') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.sig);
    execute format('grant execute on function %s to service_role',f.sig);
  end loop;
end $$;
revoke all on function public.alert_notification_volume(integer) from public,anon;
grant execute on function public.alert_notification_volume(integer) to authenticated,service_role;
