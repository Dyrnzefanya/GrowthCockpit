create table public.ad_accounts (
 id uuid primary key default gen_random_uuid(), platform text not null check(platform in ('meta','google','linkedin','tiktok')),
 external_account_id text not null, name text not null, currency char(3) not null check(currency ~ '^[A-Z]{3}$'),
 timezone text not null, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(platform,external_account_id)
);
create table public.ad_metrics_daily (
 id uuid primary key default gen_random_uuid(), ad_account_id uuid not null references public.ad_accounts(id),
 platform text not null check(platform in ('meta','google','linkedin','tiktok')), metric_date date not null,
 campaign_id text not null, campaign_name text not null, adset_id text not null default '', adset_name text,
 ad_id text not null default '', ad_name text, impressions bigint not null check(impressions>=0), clicks bigint not null check(clicks>=0),
 spend numeric(18,2) not null check(spend>=0), currency char(3) not null check(currency ~ '^[A-Z]{3}$'),
 reach bigint check(reach>=0), frequency numeric check(frequency>=0), platform_results integer check(platform_results>=0),
 platform_result_type text, platform_cost_per_result numeric check(platform_cost_per_result>=0),
 source_timezone text not null, ingested_at timestamptz not null default now(),
 unique(ad_account_id,metric_date,campaign_id,adset_id,ad_id)
);
create index ad_metrics_date_idx on public.ad_metrics_daily(metric_date desc);
create index ad_metrics_campaign_idx on public.ad_metrics_daily(campaign_id,metric_date);
alter table public.ad_accounts enable row level security;
alter table public.ad_metrics_daily enable row level security;
revoke all on public.ad_accounts,public.ad_metrics_daily from anon,authenticated,service_role;
grant select on public.ad_accounts,public.ad_metrics_daily to authenticated;
grant select,insert,update on public.ad_accounts,public.ad_metrics_daily to service_role;
create policy ad_accounts_read on public.ad_accounts for select to authenticated using((select auth.uid()) is not null);
create policy ad_metrics_read on public.ad_metrics_daily for select to authenticated using((select auth.uid()) is not null);
create trigger ad_accounts_timestamp before update on public.ad_accounts for each row execute function public.set_updated_at();

-- Page data and resume cursor commit together, fenced by the existing job lease.
create function public.commit_meta_page(p_run uuid,p_account jsonb,p_rows jsonb,p_cursor text,p_resource text,p_complete boolean)
returns integer language plpgsql set search_path='' as $$
declare account_uuid uuid; written integer;
begin
 perform 1 from public.integration_runs where id=p_run and job_key='JOB-META-INGEST' and status='running' and lease_until>clock_timestamp() for update;
 if not found then raise exception 'CONFLICT' using errcode='40001'; end if;
 if jsonb_array_length(p_rows)>500 then raise exception 'BATCH_LIMIT'; end if;
 insert into public.ad_accounts(platform,external_account_id,name,currency,timezone)
 values('meta',p_account->>'account_id',p_account->>'name',p_account->>'currency',p_account->>'timezone_name')
 on conflict(platform,external_account_id) do update set name=excluded.name,currency=excluded.currency,timezone=excluded.timezone
 returning id into account_uuid;
 insert into public.ad_metrics_daily(ad_account_id,platform,metric_date,campaign_id,campaign_name,adset_id,ad_id,impressions,clicks,spend,currency,reach,frequency,platform_results,platform_result_type,platform_cost_per_result,source_timezone)
 select account_uuid,'meta',x.metric_date,x.campaign_id,x.campaign_name,'','',x.impressions,x.clicks,x.spend,x.currency,x.reach,x.frequency,x.platform_results,x.platform_result_type,x.platform_cost_per_result,x.source_timezone
 from jsonb_to_recordset(p_rows) as x(metric_date date,campaign_id text,campaign_name text,impressions bigint,clicks bigint,spend numeric,currency text,reach bigint,frequency numeric,platform_results int,platform_result_type text,platform_cost_per_result numeric,source_timezone text)
 on conflict(ad_account_id,metric_date,campaign_id,adset_id,ad_id) do update set
 campaign_name=excluded.campaign_name,impressions=excluded.impressions,clicks=excluded.clicks,spend=excluded.spend,
 currency=excluded.currency,reach=excluded.reach,frequency=excluded.frequency,platform_results=excluded.platform_results,
 platform_result_type=excluded.platform_result_type,platform_cost_per_result=excluded.platform_cost_per_result,source_timezone=excluded.source_timezone,ingested_at=now();
 get diagnostics written=row_count;
 insert into public.sync_state(integration,resource,cursor,last_run_at,last_success_at,consecutive_failures,last_error)
 values('meta',p_resource,p_cursor,now(),case when p_complete then now() else null end,0,null)
 on conflict(integration,resource) do update set cursor=excluded.cursor,last_run_at=now(),last_error=null,consecutive_failures=0,
 last_success_at=coalesce(excluded.last_success_at,public.sync_state.last_success_at);
 return written;
end $$;
revoke all on function public.commit_meta_page(uuid,jsonb,jsonb,text,text,boolean) from public,anon,authenticated;
grant execute on function public.commit_meta_page(uuid,jsonb,jsonb,text,text,boolean) to service_role;

-- Aggregate raw components only. No ratios, attribution inference, or qualification here.
create function public.performance_facts(p_from date,p_to date,p_previous date) returns jsonb
language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
 'ads',coalesce((select jsonb_agg(to_jsonb(a)) from (
  select ad_account_id,campaign_id,array_agg(distinct campaign_name) as names,currency,source_timezone,
   metric_date>=p_from as current_period,sum(spend)::text as spend,sum(impressions)::float8 as impressions,sum(clicks)::float8 as clicks,
   case when count(platform_results)=count(*) and count(distinct platform_result_type)=1 then sum(platform_results)::float8 end as platform_results,
   min(ingested_at) as synced_at
  from public.ad_metrics_daily where metric_date between p_previous and p_to and adset_id='' and ad_id=''
  group by ad_account_id,campaign_id,currency,source_timezone,metric_date>=p_from
 ) a),'[]'::jsonb),
 'days',coalesce((select jsonb_agg(to_jsonb(a)) from (
  select metric_date,currency,source_timezone,sum(spend)::text as spend from public.ad_metrics_daily
  where metric_date between p_from and p_to and adset_id='' and ad_id='' group by metric_date,currency,source_timezone order by metric_date
 ) a),'[]'::jsonb),
 'leads',coalesce((select jsonb_agg(to_jsonb(l)) from (
  select platform,campaign_id,lt_campaign,inquiry_date>=p_from as current_period,count(*)::int as leads,
   count(*) filter(where qualification_status in ('mql','sql'))::int as mql,count(*) filter(where qualification_status='sql')::int as sql,
   min(coalesce(synced_at,updated_at)) as synced_at
  from public.leads where inquiry_date between p_previous and p_to group by platform,campaign_id,lt_campaign,inquiry_date>=p_from
 ) l),'[]'::jsonb),
 'deals',coalesce((select jsonb_agg(to_jsonb(d)) from (
  select d.id,d.stage_category,d.amount::text,d.currency,d.attribution_allocations,l.platform,l.campaign_id,l.lt_campaign,
   l.inquiry_date>=p_from as current_period,coalesce(d.synced_at,d.updated_at) as synced_at
  from public.deals d join public.leads l on l.id=d.lead_id where l.inquiry_date between p_previous and p_to
 ) d),'[]'::jsonb)
);
$$;
revoke all on function public.performance_facts(date,date,date) from public,anon;
grant execute on function public.performance_facts(date,date,date) to authenticated,service_role;

-- Keep the existing lead view contract; add separate raw spend facts without a fan-out join.
create or replace view public.vw_lead_quality_by_campaign with(security_invoker=true) as
select f.inquiry_date,f.platform,f.lt_campaign,f.currency,f.leads,f.mql,f.sql,f.disqualified,f.attributed,f.deals,f.open_deals,f.won,f.lost,f.revenue,f.missing_revenue,f.past_expected_close,f.past_expected_closed,
 null::numeric as spend
from public.vw_funnel_daily f;

insert into public.app_settings(key,value,description) values
 ('meta.primary_result_type','null','Exact Meta action_type; missing is unavailable, never inferred.'),
 ('meta.token_metadata','null','Provider verified expiry/inspection timestamp only; never token content.'),
 ('meta.freshness_hours','24','Expected daily Meta freshness interval in hours.') on conflict(key) do nothing;
