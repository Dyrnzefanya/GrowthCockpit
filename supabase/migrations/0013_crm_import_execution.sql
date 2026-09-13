-- Bounded import RPCs use large JSON inputs; avoid JIT compilation overhead.
-- Keep the API statement timeout unchanged and preserve invoker/RLS permissions.
alter function public.commit_lead_batch(jsonb,text,jsonb) set jit = off;
