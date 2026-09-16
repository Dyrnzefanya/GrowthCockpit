-- Phase 6: person identity and inquiry events are deliberately separate.
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  external_id text, source_system text not null default 'manual', source_updated_at timestamptz, synced_at timestamptz, hubspot_company_id text unique, name text not null, domain extensions.citext unique,
  name_key text not null, segment text, industry text
);
create index companies_name_idx on public.companies(name_key);
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  external_id text, source_system text not null default 'manual', source_updated_at timestamptz, synced_at timestamptz, hubspot_contact_id text unique, email extensions.citext, phone_e164 text,
  full_name text, company_id uuid references public.companies(id),
  lifecycle_stage text, lifecycle_stage_at timestamptz, hubspot_owner_id text,
  ft_source text, ft_medium text, ft_campaign text, ft_content text, ft_term text, ft_landing_page text, ft_referrer text, ft_at timestamptz,
  check (email is not null or phone_e164 is not null)
);
create unique index contacts_email_idx on public.contacts(email) where email is not null;
create unique index contacts_phone_idx on public.contacts(phone_e164) where phone_e164 is not null;
create index contacts_company_idx on public.contacts(company_id);
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  external_id text, source_system text not null default 'manual', source_updated_at timestamptz, synced_at timestamptz, contact_id uuid references public.contacts(id), company_id uuid references public.companies(id),
  inquiry_at timestamptz not null, inquiry_date date not null,
  channel text not null check(channel in ('web_form','whatsapp','manual','import','referral','other')),
  platform text not null check(platform in ('meta','google','linkedin','tiktok','organic','direct','referral','unknown')),
  lt_source text, lt_medium text, lt_campaign text, lt_content text, lt_term text, landing_page text, referrer text,
  click_id_type text not null default 'none' check(click_id_type in ('fbclid','gclid','ctwa_clid','li_fat_id','none')),
  click_id text, campaign_id text, adset_id text, ad_id text,
  product_interest text, product_key text not null default '', estimated_quantity int check(estimated_quantity >= 0),
  required_by_date date, message text, out_of_scope boolean not null default false,
  qualification_status text not null check(qualification_status in ('new','mql','sql','disqualified')),
  qualification_reason text not null, qualification_rule_version text not null,
  qualification_settings jsonb not null, qualified_at timestamptz, sql_at timestamptz, disqualified_at timestamptz,
  manual_override boolean not null default false,
  attribution_missing boolean not null, duplicate_suspect boolean not null default false,
  owner_id uuid references public.profiles(id), deal_id uuid,
  dedupe_key text not null unique,
  submission_keys text[] not null, inquiry_observations timestamptz[] not null,
  check (inquiry_date = (inquiry_at at time zone 'Asia/Jakarta')::date),
  check (cardinality(submission_keys)>0 and cardinality(inquiry_observations)>0)
);
create index leads_contact_idx on public.leads(contact_id);
create index leads_company_idx on public.leads(company_id);
create index leads_owner_idx on public.leads(owner_id);
create index leads_date_idx on public.leads(inquiry_date desc, id);
create index leads_status_date_idx on public.leads(qualification_status,inquiry_date desc);
create index leads_campaign_date_idx on public.leads(lt_campaign,inquiry_date);
create index leads_channel_date_idx on public.leads(channel,inquiry_date);
create index leads_platform_date_idx on public.leads(platform,inquiry_date);
create index leads_submission_idx on public.leads using gin(submission_keys);
create index leads_click_idx on public.leads(click_id) where click_id is not null;
create index leads_deal_idx on public.leads(deal_id);
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  external_id text, source_system text not null default 'manual', source_updated_at timestamptz, synced_at timestamptz, hubspot_deal_id text unique, lead_id uuid references public.leads(id),
  contact_id uuid references public.contacts(id), company_id uuid references public.companies(id),
  name text not null, pipeline text not null, stage_key text not null, stage_label text not null,
  stage_category text not null check(stage_category in ('open','won','lost')),
  amount numeric(18,2) check(amount >= 0), currency char(3) not null default 'IDR' check(currency ~ '^[A-Z]{3}$'),
  expected_close_date date, close_date date, owner_hubspot_id text,
  attributed_campaign text, attribution_rule_version text, attribution_allocations jsonb not null default '[]',
  updated_by uuid references public.profiles(id),
  check (stage_category='open' or close_date is not null)
);
alter table public.leads add constraint leads_deal_fk foreign key(deal_id) references public.deals(id);
create index deals_lead_idx on public.deals(lead_id);
create index deals_contact_idx on public.deals(contact_id);
create index deals_company_idx on public.deals(company_id);
create index deals_actor_idx on public.deals(updated_by);
create index deals_stage_close_idx on public.deals(stage_category,close_date);
create table public.lead_stage_events (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id),
  from_status text check(from_status in ('new','mql','sql','disqualified')),
  to_status text not null check(to_status in ('new','mql','sql','disqualified')),
  changed_at timestamptz not null, source text not null check(source in ('pmos','hubspot','manual','import')),
  actor uuid not null references public.profiles(id), note text not null check(length(btrim(note))>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index lead_events_date_idx on public.lead_stage_events(changed_at);
create index lead_events_lead_idx on public.lead_stage_events(lead_id,changed_at desc);
create index lead_events_actor_idx on public.lead_stage_events(actor);

alter table public.companies enable row level security;
revoke all on public.companies from anon,authenticated;
grant select on public.companies to authenticated;
grant all on public.companies to service_role;
create policy companies_read on public.companies for select to authenticated using ((select auth.uid()) is not null);
create trigger companies_timestamp before update on public.companies for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;
revoke all on public.contacts from anon,authenticated;
grant select on public.contacts to authenticated;
grant all on public.contacts to service_role;
create policy contacts_read on public.contacts for select to authenticated using ((select auth.uid()) is not null);
create trigger contacts_timestamp before update on public.contacts for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
revoke all on public.leads from anon,authenticated;
grant select on public.leads to authenticated;
grant all on public.leads to service_role;
create policy leads_read on public.leads for select to authenticated using ((select auth.uid()) is not null);
create trigger leads_timestamp before update on public.leads for each row execute function public.set_updated_at();

alter table public.deals enable row level security;
revoke all on public.deals from anon,authenticated;
grant select on public.deals to authenticated;
grant all on public.deals to service_role;
create policy deals_read on public.deals for select to authenticated using ((select auth.uid()) is not null);
create trigger deals_timestamp before update on public.deals for each row execute function public.set_updated_at();

alter table public.lead_stage_events enable row level security;
revoke all on public.lead_stage_events from anon,authenticated;
grant select on public.lead_stage_events to authenticated;
grant all on public.lead_stage_events to service_role;
create policy lead_stage_events_read on public.lead_stage_events for select to authenticated using ((select auth.uid()) is not null);


create function public.protect_crm_history() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_table_name='lead_stage_events' then raise exception 'Append-only history' using errcode='42501'; end if;
  if tg_table_name='contacts' then
    if (old.ft_at is not null and new.ft_at is distinct from old.ft_at)
      or (old.ft_source is not null and new.ft_source is distinct from old.ft_source)
      or (old.ft_medium is not null and new.ft_medium is distinct from old.ft_medium)
      or (old.ft_campaign is not null and new.ft_campaign is distinct from old.ft_campaign)
      or (old.ft_content is not null and new.ft_content is distinct from old.ft_content)
      or (old.ft_term is not null and new.ft_term is distinct from old.ft_term)
      or (old.ft_landing_page is not null and new.ft_landing_page is distinct from old.ft_landing_page)
      or (old.ft_referrer is not null and new.ft_referrer is distinct from old.ft_referrer)
      then raise exception 'Immutable first touch' using errcode='42501'; end if;
  end if;
  if tg_table_name='leads' and (
    (to_jsonb(new) - array['updated_at','qualification_status','qualification_reason','qualified_at','sql_at','disqualified_at','manual_override','deal_id','submission_keys','inquiry_observations'])
      is distinct from
    (to_jsonb(old) - array['updated_at','qualification_status','qualification_reason','qualified_at','sql_at','disqualified_at','manual_override','deal_id','submission_keys','inquiry_observations'])
  ) then raise exception 'Immutable inquiry' using errcode='42501'; end if;
  return new;
end; $$;
create trigger lead_events_immutable before update or delete on public.lead_stage_events for each row execute function public.protect_crm_history();
create trigger contacts_touch_immutable before update on public.contacts for each row execute function public.protect_crm_history();
create trigger leads_inquiry_immutable before update on public.leads for each row execute function public.protect_crm_history();

-- Scoped snapshot: person and company candidates plus replay keys. No domain verdict in SQL.
create function public.crm_snapshot(p_scope jsonb) returns jsonb language sql stable set search_path='' as $$
with c as (
 select * from public.contacts where email::text in(select jsonb_array_elements_text(p_scope->'emails'))
 or phone_e164 in(select jsonb_array_elements_text(p_scope->'phones'))
), co as (
 select * from public.companies where domain::text in(select jsonb_array_elements_text(p_scope->'domains'))
 or name_key in(select jsonb_array_elements_text(p_scope->'names'))
 or id in(select company_id from c)
), l as (
 select * from public.leads where contact_id in(select id from c)
 or submission_keys && array(select jsonb_array_elements_text(p_scope->'keys'))
), s as (
 select jsonb_build_object(
 'contacts',coalesce((select jsonb_agg(c order by id) from c),'[]'),
 'companies',coalesce((select jsonb_agg(co order by id) from co),'[]'),
 'leads',coalesce((select jsonb_agg(l order by id) from l),'[]')) as data
) select data || jsonb_build_object('revision',md5(data::text)) from s;
$$;

create function public.commit_lead_batch(p_scope jsonb,p_revision text,p_plan jsonb) returns void
language plpgsql set search_path='' as $$
declare row_data jsonb;
begin
  -- ponytail: one workspace writer lock; split by identity only if contention is measured.
  perform pg_advisory_xact_lock(606060);
  if public.crm_snapshot(p_scope)->>'revision' is distinct from p_revision then
    raise exception 'CONFLICT' using errcode='40001'; end if;
  for row_data in select value from jsonb_array_elements(p_plan->'companies') loop
    insert into public.companies select * from jsonb_populate_record(null::public.companies,row_data)
    on conflict(id) do nothing;
  end loop;
  for row_data in select value from jsonb_array_elements(p_plan->'contacts') loop
    insert into public.contacts select * from jsonb_populate_record(null::public.contacts,row_data)
    on conflict(id) do update set email=excluded.email,phone_e164=excluded.phone_e164,
    full_name=excluded.full_name,company_id=excluded.company_id,
    ft_source=excluded.ft_source,ft_medium=excluded.ft_medium,ft_campaign=excluded.ft_campaign,
    ft_content=excluded.ft_content,ft_term=excluded.ft_term,ft_landing_page=excluded.ft_landing_page,
    ft_referrer=excluded.ft_referrer,ft_at=excluded.ft_at;
  end loop;
  insert into public.leads select * from jsonb_populate_recordset(null::public.leads,p_plan->'leads');
  for row_data in select value from jsonb_array_elements(p_plan->'duplicates') loop
    update public.leads set submission_keys=array(select jsonb_array_elements_text(row_data->'submission_keys')),
      inquiry_observations=array(select jsonb_array_elements_text(row_data->'inquiry_observations'))::timestamptz[]
    where id=(row_data->>'id')::uuid;
  end loop;
  insert into public.lead_stage_events select * from jsonb_populate_recordset(null::public.lead_stage_events,p_plan->'events');
end; $$;

create function public.commit_lead_override(p_id uuid,p_revision timestamptz,p_patch jsonb,p_event jsonb) returns void
language plpgsql set search_path='' as $$
begin
  perform 1 from public.leads where id=p_id and updated_at=p_revision for update;
  if not found then raise exception 'CONFLICT' using errcode='40001'; end if;
  update public.leads set qualification_status=p_patch->>'qualification_status',qualification_reason=p_patch->>'qualification_reason',
    qualified_at=(p_patch->>'qualified_at')::timestamptz,sql_at=(p_patch->>'sql_at')::timestamptz,
    disqualified_at=(p_patch->>'disqualified_at')::timestamptz,manual_override=true where id=p_id;
  insert into public.lead_stage_events select * from jsonb_populate_record(null::public.lead_stage_events,p_event);
end; $$;

create function public.commit_deal(p_deal jsonb,p_revision timestamptz,p_lead_revision timestamptz) returns void
language plpgsql set search_path='' as $$
declare d public.deals := jsonb_populate_record(null::public.deals,p_deal);
begin
  perform 1 from public.leads where id=d.lead_id and updated_at=p_lead_revision for update;
  if not found then raise exception 'CONFLICT' using errcode='40001'; end if;
  if p_revision is not null then
    perform 1 from public.deals where id=d.id and updated_at=p_revision for update;
    if not found then raise exception 'CONFLICT' using errcode='40001'; end if;
  elsif exists(select 1 from public.leads where id=d.lead_id and deal_id is not null) then
    raise exception 'CONFLICT' using errcode='40001';
  end if;
  insert into public.deals select d.* on conflict(id) do update set
    name=excluded.name,pipeline=excluded.pipeline,stage_key=excluded.stage_key,stage_label=excluded.stage_label,
    stage_category=excluded.stage_category,amount=excluded.amount,currency=excluded.currency,
    expected_close_date=excluded.expected_close_date,close_date=excluded.close_date,
    attributed_campaign=excluded.attributed_campaign,attribution_rule_version=excluded.attribution_rule_version,
    attribution_allocations=excluded.attribution_allocations,updated_by=excluded.updated_by;
  update public.leads set deal_id=d.id where id=d.lead_id;
end; $$;

revoke all on function public.protect_crm_history() from public,anon,authenticated;
grant execute on function public.protect_crm_history() to service_role;

revoke all on function public.crm_snapshot(jsonb) from public,anon,authenticated;
grant execute on function public.crm_snapshot(jsonb) to service_role;

revoke all on function public.commit_lead_batch(jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_lead_batch(jsonb,text,jsonb) to service_role;

revoke all on function public.commit_lead_override(uuid,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_lead_override(uuid,timestamptz,jsonb,jsonb) to service_role;

revoke all on function public.commit_deal(jsonb,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.commit_deal(jsonb,timestamptz,timestamptz) to service_role;
