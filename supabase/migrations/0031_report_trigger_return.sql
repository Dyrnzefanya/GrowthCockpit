-- Forward correction: allow draft updates to retain NEW values while final rows remain frozen.
create or replace function public.protect_final_report() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'final' then
    raise exception 'FINAL_REPORT_IMMUTABLE' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
