-- These security-invoker views aggregate facts only. Ratios live in domain/metrics.
-- Cohort: today's known outcome is assigned to original Asia/Jakarta inquiry_date.
-- Currency remains part of the grain: the application must refuse mixed-currency totals.
create view public.vw_funnel_daily with (security_invoker=true) as
select l.inquiry_date, l.platform, l.lt_campaign, d.currency,
 count(*)::int as leads,
 count(*) filter(where l.qualification_status in ('mql','sql'))::int as mql,
 count(*) filter(where l.qualification_status='sql')::int as sql,
 count(*) filter(where l.qualification_status='disqualified')::int as disqualified,
 count(*) filter(where not l.attribution_missing)::int as attributed,
 count(d.id)::int as deals,
 count(d.id) filter(where d.stage_category='open')::int as open_deals,
 count(d.id) filter(where d.stage_category='won')::int as won,
 count(d.id) filter(where d.stage_category='lost')::int as lost,
 coalesce(sum(d.amount) filter(where d.stage_category='won'),0)::text as revenue,
 count(d.id) filter(where d.stage_category='won' and d.amount is null)::int as missing_revenue,
 count(d.id) filter(where d.expected_close_date < (now() at time zone 'Asia/Jakarta')::date)::int as past_expected_close,
 count(d.id) filter(where d.expected_close_date < (now() at time zone 'Asia/Jakarta')::date and d.stage_category in ('won','lost'))::int as past_expected_closed,
 null::numeric as spend
from public.leads l left join public.deals d on d.id=l.deal_id
group by l.inquiry_date,l.platform,l.lt_campaign,d.currency;

-- Activity is transition count, not a cohort conversion rate. Repeat transitions are events.
create view public.vw_funnel_activity_daily with (security_invoker=true) as
select (changed_at at time zone 'Asia/Jakarta')::date as event_date,to_status,source,count(*)::int as transitions
from public.lead_stage_events group by 1,2,3;

create view public.vw_lead_quality_by_campaign with (security_invoker=true) as
select * from public.vw_funnel_daily;

create view public.vw_attribution_coverage with (security_invoker=true) as
select inquiry_date,count(*)::int as leads,count(*) filter(where not attribution_missing)::int as attributed
from public.leads group by inquiry_date;

revoke all on public.vw_funnel_daily,public.vw_funnel_activity_daily,public.vw_lead_quality_by_campaign,public.vw_attribution_coverage from anon,authenticated;
grant select on public.vw_funnel_daily,public.vw_funnel_activity_daily,public.vw_lead_quality_by_campaign,public.vw_attribution_coverage to authenticated,service_role;

insert into public.app_settings(key,value,description) values
('qualification.free_email_domains','["gmail.com","yahoo.com","yahoo.co.id","hotmail.com","outlook.com","icloud.com","live.com","aol.com"]','Personal email domains; future qualifications only.'),
('qualification.competitor_domains','[]','Explicit competitor domain list; no competitors assumed.'),
('qualification.internal_domains','[]','Explicit internal test domains; no internal domains assumed.')
on conflict(key) do nothing;

