begin;
do $$ declare run uuid; a jsonb; rows jsonb; n int; started timestamptz; facts jsonb; aid uuid; begin
 if not(select relrowsecurity from pg_class where oid='public.ad_metrics_daily'::regclass) then raise exception 'Meta RLS missing'; end if;
 if has_table_privilege('anon','public.ad_metrics_daily','select') or has_table_privilege('authenticated','public.ad_metrics_daily','insert') or has_table_privilege('service_role','public.ad_metrics_daily','delete') then raise exception 'Meta grants unsafe'; end if;
 if has_function_privilege('authenticated','public.commit_meta_page(uuid,jsonb,jsonb,text,text,boolean)','execute') or has_function_privilege('anon','public.performance_facts(date,date,date)','execute') then raise exception 'Meta RPC exposed'; end if;
 run:=public.start_job('JOB-META-INGEST','manual',gen_random_uuid());
 a:='{"account_id":"9999999910","name":"SQL fixture","currency":"IDR","timezone_name":"Asia/Jakarta"}';
 rows:='[{"metric_date":"2025-01-01","campaign_id":"1","campaign_name":"Gift - Fase1 - Jan","impressions":100,"clicks":10,"spend":"123.45","currency":"IDR","source_timezone":"Asia/Jakarta"}]';
 set local role service_role;
 n:=public.commit_meta_page(run,a,rows,'{"date":"2025-01-02"}','ingest',false);
 perform public.cancel_meta_range(run);
 if(select cursor from public.sync_state where integration='meta' and resource='ingest') is not null then raise exception 'Range cancellation failed'; end if;
 if(select count(*) from public.ad_metrics_daily where campaign_id='1' and ad_account_id=(select id from public.ad_accounts where external_account_id='9999999910'))<>1 then raise exception 'Cancellation lost good facts'; end if;
 n:=public.commit_meta_page(run,a,rows,null,'ingest',true);
 if(select count(*) from public.ad_metrics_daily where campaign_id='1' and ad_account_id=(select id from public.ad_accounts where external_account_id='9999999910'))<>1 then raise exception 'Double ingest duplicated rows'; end if;
 if(select cursor from public.sync_state where integration='meta' and resource='ingest') is not null then raise exception 'Progress not committed'; end if;
 perform public.finish_integration_run(run,'success',1,1,0,null,null);
 begin
 perform public.record_meta_failure(run,'META_TIMEOUT');
 raise exception 'Expired failure writer accepted';
 exception when serialization_failure then null;
 end;
 begin
 perform public.commit_meta_page(run,a,rows,null,'ingest',true);
 raise exception 'Expired worker accepted';
 exception when serialization_failure then null;
 end;
 reset role;
 select id into aid from public.ad_accounts where external_account_id='9999999910';
 -- Synthetic local-only 200k fact fixture; rollback removes all evidence/data.
 insert into public.ad_metrics_daily(ad_account_id,platform,metric_date,campaign_id,campaign_name,impressions,clicks,spend,currency,source_timezone)
 select aid,'meta','2025-01-01'::date+(i%90), (1000+i/90)::text,'Performance fixture',100,10,10,'IDR','Asia/Jakarta' from generate_series(1,200000) i;
 analyze public.ad_metrics_daily;
 started:=clock_timestamp();facts:=public.performance_facts('2025-01-01','2025-03-31','2024-10-03');
 raise notice 'Phase 10 200k / 90-day aggregate: % ms',extract(epoch from clock_timestamp()-started)*1000;
 if clock_timestamp()-started>interval '1 second' then raise exception 'NFR-10.1 exceeded'; end if;
 if jsonb_array_length(facts->'ads')<2000 then raise exception 'Facts truncated by API row limit'; end if;
end $$;
rollback;
