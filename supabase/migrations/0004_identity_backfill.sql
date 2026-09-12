-- Auth accounts can predate application schema deployment.
-- Match handle_new_user without changing existing profiles or trusting role metadata.
insert into public.profiles (id, full_name)
select id, left(coalesce(raw_user_meta_data ->> 'full_name', ''), 120)
from auth.users
on conflict (id) do nothing;
