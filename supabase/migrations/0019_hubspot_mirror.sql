-- Phase 8: existing CRM tables and integration plumbing only.
alter table public.contacts drop constraint contacts_check;
alter table public.contacts add constraint contacts_identity_check check(email is not null or phone_e164 is not null or hubspot_contact_id is not null);
insert into public.app_settings(key,value,description) values ('hubspot.mapping','null'::jsonb,'Explicit HubSpot portal, stage, owner and property mapping. Null disables synchronization.') on conflict(key) do nothing;

create function public.commit_hubspot_mirror(p_changes jsonb,p_events jsonb,p_event uuid default null,p_claim uuid default null,p_result jsonb default null) returns void
language plpgsql set search_path='' as $$
declare item jsonb; patch jsonb; tab text; current_row jsonb; cols text; vals text; assignments text; e public.webhook_events;
begin
 perform pg_advisory_xact_lock(606060);
 if p_event is not null then
   select * into e from public.webhook_events where id=p_event for update;
   if not found or e.status<>'processing' or e.claim_id is distinct from p_claim or e.locked_at<now()-interval '90 seconds' then raise exception 'STALE_CLAIM' using errcode='40001'; end if;
 end if;
 for item in select value from jsonb_array_elements(p_changes) loop
   tab:=item->>'table'; patch:=item->'value';
   if tab not in ('companies','contacts','deals','leads') then raise exception 'Invalid mirror target' using errcode='42501'; end if;
   execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tab) into current_row using (item->>'id')::uuid;
   if current_row->>'updated_at' is distinct from item->>'revision' then raise exception 'CONFLICT' using errcode='40001'; end if;
   if tab='leads' and ((patch - array['qualification_status','qualification_reason','qualified_at','sql_at','disqualified_at','deal_id'])<>'{}'::jsonb or (current_row->>'manual_override')::boolean and (patch ? 'qualification_status' or patch ? 'qualification_reason')) then raise exception 'Protected inquiry' using errcode='42501'; end if;
   if patch ? 'created_at' or patch ? 'updated_at' or patch ? 'manual_override' then raise exception 'Protected audit' using errcode='42501'; end if;
   patch:=patch || jsonb_build_object('id',item->>'id');
   select string_agg(format('%I',key),','),string_agg(format('(jsonb_populate_record(null::public.%I,$1)).%I',tab,key),','),string_agg(format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',key,tab,key),',') into cols,vals,assignments from jsonb_object_keys(patch) key;
   if current_row is null then
     execute format('insert into public.%I (%s) select %s',tab,cols,vals) using patch;
   else
     execute format('update public.%I set %s where id=$2',tab,assignments) using patch,(item->>'id')::uuid;
   end if;
 end loop;
 for item in select value from jsonb_array_elements(p_events) loop
   insert into public.lead_stage_events(id,lead_id,from_status,to_status,changed_at,source,actor,note)
   values((item->>'id')::uuid,(item->>'lead_id')::uuid,item->>'from_status',item->>'to_status',(item->>'changed_at')::timestamptz,'hubspot',null,item->>'note');
 end loop;
 if p_event is not null then perform public.finish_webhook(p_event,p_claim,'processed',null,null,p_result); end if;
end $$;
revoke all on function public.commit_hubspot_mirror(jsonb,jsonb,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.commit_hubspot_mirror(jsonb,jsonb,uuid,uuid,jsonb) to service_role;
