-- Phase 6 verification: persist a CSV batch with set operations, not per-row statements.
create or replace function public.commit_lead_batch(p_scope jsonb,p_revision text,p_plan jsonb) returns void
language plpgsql set search_path='' as $$
begin
  -- ponytail: one workspace writer lock; split by identity only if contention is measured.
  perform pg_advisory_xact_lock(606060);
  if public.crm_snapshot(p_scope)->>'revision' is distinct from p_revision then
    raise exception 'CONFLICT' using errcode='40001'; end if;
  insert into public.companies select * from jsonb_populate_recordset(null::public.companies,p_plan->'companies')
    on conflict(id) do nothing;
  insert into public.contacts select * from jsonb_populate_recordset(null::public.contacts,p_plan->'contacts')
    on conflict(id) do update set email=excluded.email,phone_e164=excluded.phone_e164,
    full_name=excluded.full_name,company_id=excluded.company_id,
    ft_source=excluded.ft_source,ft_medium=excluded.ft_medium,ft_campaign=excluded.ft_campaign,
    ft_content=excluded.ft_content,ft_term=excluded.ft_term,ft_landing_page=excluded.ft_landing_page,
    ft_referrer=excluded.ft_referrer,ft_at=excluded.ft_at;
  insert into public.leads select * from jsonb_populate_recordset(null::public.leads,p_plan->'leads');
  update public.leads l set submission_keys=d.submission_keys,inquiry_observations=d.inquiry_observations
    from jsonb_populate_recordset(null::public.leads,p_plan->'duplicates') d where l.id=d.id;
  insert into public.lead_stage_events select * from jsonb_populate_recordset(null::public.lead_stage_events,p_plan->'events');
end; $$;
