begin;
do $$ declare c uuid:=gen_random_uuid(); l uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); claimed jsonb; transitions_before bigint; before_row jsonb; after_row jsonb; stamp text;
begin
 perform public.accept_webhook(jsonb_build_object('id',e,'source','hubspot','signature_valid',true,'payload','{}'::jsonb,'status','received','correlation_id',gen_random_uuid(),'result','{}'::jsonb));
 claimed:=public.claim_webhook(e,'manual',5);
 if (select integration from public.integration_runs where id=(claimed->>'claim_id')::uuid)<>'hubspot' then raise exception 'Wrong CRM provider namespace'; end if;
 if has_function_privilege('anon','public.commit_hubspot_mirror(jsonb,jsonb,uuid,uuid,jsonb)','execute') or has_function_privilege('authenticated','public.commit_hubspot_mirror(jsonb,jsonb,uuid,uuid,jsonb)','execute') then raise exception 'Mirror RPC exposed';end if;
 insert into public.contacts(id,hubspot_contact_id,full_name) values(c,'888000111','Synthetic provider identity');
 insert into public.leads(id,contact_id,inquiry_at,inquiry_date,channel,platform,qualification_status,qualification_reason,qualification_rule_version,qualification_settings,manual_override,attribution_missing,dedupe_key,submission_keys,inquiry_observations)
 values(l,c,'2026-09-14T00:00:00Z','2026-09-14','manual','unknown','disqualified','Operator override','q1','{}',true,true,l::text,array[l::text],array['2026-09-14T00:00:00Z'::timestamptz]);
 select to_jsonb(t) into before_row from public.leads t where id=l;
 select coalesce(sum(transitions),0) into transitions_before from public.vw_funnel_activity_daily;
 insert into public.lead_stage_events(id,lead_id,from_status,to_status,changed_at,source,note) values(gen_random_uuid(),l,'disqualified','disqualified','2026-09-14T01:00:00Z','hubspot','Synthetic CRM deal stage audit');
 if (select coalesce(sum(transitions),0) from public.vw_funnel_activity_daily)<>transitions_before then raise exception 'CRM audit inflated activity funnel'; end if;
 select updated_at::text into stamp from public.contacts where id=c;
 -- JSON uses the same timestamp rendering as REST's revision representation.
 select to_jsonb(t)->>'updated_at' into stamp from public.contacts t where id=c;
 perform public.commit_hubspot_mirror(jsonb_build_array(jsonb_build_object('table','contacts','id',c,'revision',stamp,'value',jsonb_build_object('lifecycle_stage','salesqualifiedlead','lifecycle_stage_at','2026-09-14T01:00:00Z'))),'[]');
 select to_jsonb(t) into after_row from public.leads t where id=l;
 if before_row is distinct from after_row then raise exception 'Manual inquiry changed';end if;
 if (select lifecycle_stage from public.contacts where id=c)<>'salesqualifiedlead' then raise exception 'CRM not mirrored';end if;
 begin
 perform public.commit_hubspot_mirror(jsonb_build_array(jsonb_build_object('table','leads','id',l,'revision',before_row->>'updated_at','value',jsonb_build_object('qualification_status','sql'))),'[]');
 raise exception 'Override overwritten'; exception when insufficient_privilege then null;end;
 begin
 perform public.commit_hubspot_mirror(jsonb_build_array(jsonb_build_object('table','contacts','id',c,'revision','2000-01-01','value',jsonb_build_object('full_name','Invalid overwrite'))),'[]');
 raise exception 'Stale revision accepted'; exception when serialization_failure then null;end;
end $$;
rollback;
