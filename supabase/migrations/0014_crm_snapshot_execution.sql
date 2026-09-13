-- Snapshot reads share the bounded import's large JSON parameters.
alter function public.crm_snapshot(jsonb) set jit = off;
