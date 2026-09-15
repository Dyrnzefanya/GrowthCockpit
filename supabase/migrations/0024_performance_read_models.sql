-- Bounded health projection: no historical inquiry/deal payloads on Integrations.
create function public.meta_health_facts() returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
 'names',coalesce((select jsonb_agg(n) from(select distinct campaign_name from public.ad_metrics_daily) n),'[]'::jsonb),
 'currencies',coalesce((select jsonb_agg(c) from(select distinct currency from public.ad_metrics_daily union select distinct currency from public.deals where stage_category='won') c),'[]'::jsonb)
);
$$;
revoke all on function public.meta_health_facts() from public,anon;
grant execute on function public.meta_health_facts() to authenticated,service_role;

-- Preserve lead-side columns and expose campaign fact rows separately. Full outer
-- joining totals before aggregation would multiply spend across inquiry currency rows.
-- Consumers use row_kind and resolve campaign identity in the application domain.
create or replace view public.vw_lead_quality_by_campaign with(security_invoker=true) as
select f.inquiry_date,f.platform,f.lt_campaign,f.currency,f.leads,f.mql,f.sql,f.disqualified,f.attributed,f.deals,f.open_deals,f.won,f.lost,f.revenue,f.missing_revenue,f.past_expected_close,f.past_expected_closed,
 f.spend,'inquiry'::text as row_kind,null::text as campaign_id,null::text as source_timezone
from public.vw_funnel_daily f
union all
select a.metric_date,a.platform,a.campaign_name,a.currency,0,0,0,0,0,0,0,0,0,'0'::text,0,0,0,
 sum(a.spend),'spend',a.campaign_id,a.source_timezone
from public.ad_metrics_daily a where a.adset_id='' and a.ad_id=''
group by a.metric_date,a.platform,a.campaign_name,a.currency,a.campaign_id,a.source_timezone;
