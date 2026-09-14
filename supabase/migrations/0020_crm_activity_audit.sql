-- Deal-stage audit notes do not constitute a qualification transition.
create or replace view public.vw_funnel_activity_daily with (security_invoker=true) as
select (changed_at at time zone 'Asia/Jakarta')::date as event_date,to_status,source,count(*)::int as transitions
from public.lead_stage_events
where from_status is distinct from to_status
group by 1,2,3;
