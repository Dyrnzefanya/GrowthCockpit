-- Supabase default table grants include DELETE for service_role. Explicitly remove
-- that inherited default on append-retained plumbing history (PRD 15.1).
revoke all on public.webhook_events,public.integration_runs,public.sync_state from service_role;
grant select,insert,update on public.webhook_events,public.integration_runs,public.sync_state to service_role;
