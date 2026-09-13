create function public.immutable_text_array(value text[]) returns text
language sql immutable parallel safe set search_path = ''
return coalesce(array_to_string(value, ' '), '');
revoke all on function public.immutable_text_array(text[]) from public, anon, authenticated;
grant execute on function public.immutable_text_array(text[]) to authenticated, service_role;

create table public.playbook_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 160),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  article_type text not null check (article_type in ('sop','checklist','decision_tree','troubleshooting','reference')),
  summary text not null check (char_length(btrim(summary)) between 1 and 500),
  body_md text not null check (char_length(btrim(body_md)) between 1 and 100000),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  version int not null default 0 check (version >= 0),
  published_at timestamptz null,
  updated_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', public.immutable_text_array(tags)), 'B') ||
    setweight(to_tsvector('simple', coalesce(body_md, '')), 'C')
  ) stored,
  check (status <> 'published' or published_at is not null)
);

create index playbook_articles_search_idx on public.playbook_articles using gin(search_vector);
create index playbook_articles_filters_idx on public.playbook_articles(status, article_type, category);

alter table public.playbook_articles enable row level security;
revoke all on public.playbook_articles from anon, authenticated;
grant select, insert, update, delete on public.playbook_articles to authenticated;
grant all on public.playbook_articles to service_role;
create policy playbook_workspace on public.playbook_articles for all to authenticated using (true) with check (true);
create trigger playbook_updated_at before update on public.playbook_articles for each row execute function public.set_updated_at();

create function public.audit_playbook_write() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;
revoke all on function public.audit_playbook_write() from public, anon, authenticated;
create trigger playbook_audit before insert or update on public.playbook_articles for each row execute function public.audit_playbook_write();

create function public.search_playbook(
  p_query text default '',
  p_type text default null,
  p_category text default null,
  p_tag text default null,
  p_status text default null,
  p_limit int default 20,
  p_offset int default 0
) returns table (
  id uuid,
  slug text,
  title text,
  category text,
  article_type text,
  summary text,
  tags text[],
  status text,
  version int,
  published_at timestamptz,
  updated_at timestamptz,
  rank real,
  total_count bigint
) language sql stable security invoker set search_path = '' as $$
  with input as (
    select case when btrim(p_query) = '' then null else websearch_to_tsquery('simple', p_query) end as query
  )
  select
    article.id, article.slug, article.title, article.category, article.article_type,
    article.summary, article.tags, article.status, article.version,
    article.published_at, article.updated_at,
    case when input.query is null then 0::real else ts_rank_cd(article.search_vector, input.query) end as rank,
    count(*) over() as total_count
  from public.playbook_articles article cross join input
  where (input.query is null or article.search_vector @@ input.query)
    and (p_type is null or article.article_type = p_type)
    and (p_category is null or article.category = p_category)
    and (p_tag is null or p_tag = any(article.tags))
    and (case when p_status is null then article.status <> 'archived' else article.status = p_status end)
  order by rank desc, article.updated_at desc, article.id
  limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
$$;
revoke all on function public.search_playbook(text,text,text,text,text,int,int) from public, anon;
grant execute on function public.search_playbook(text,text,text,text,text,int,int) to authenticated;
