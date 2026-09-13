begin;
insert into auth.users(id,email) values ('44444444-4444-4444-8444-444444444444','playbook-rls@example.test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);

do $$
declare
  actor uuid;
  default_count int;
  archived_count int;
  title_rank real;
  body_rank real;
  seed_top text;
  started timestamptz;
begin
  if (select count(*) from public.playbook_articles where status='published') <> 5 then
    raise exception 'FR-4.8 requires five published seed articles';
  end if;
  if not exists(select 1 from public.search_playbook('otomatis',null,null,null,'published',20,0)) then
    raise exception 'TEST-4.2 body-only search failed';
  end if;
  select slug into seed_top from public.search_playbook('qa',null,null,null,'published',20,0) limit 1;
  if seed_top <> 'checklist-qa-pelacakan' then raise exception 'TEST-4.2 seeded ranking failed'; end if;

  insert into public.playbook_articles(slug,title,category,article_type,summary,body_md,tags,status,updated_by)
    values('ranking-title','needle','Test','reference','Ranking title','plain body',array['ranking'],'draft','11111111-1111-4111-8111-111111111111')
    returning updated_by into actor;
  if actor <> '44444444-4444-4444-8444-444444444444' then raise exception 'Audit actor forgery accepted'; end if;
  insert into public.playbook_articles(slug,title,category,article_type,summary,body_md,tags,status)
    values('ranking-body','Other title','Test','reference','Ranking body','needle',array['ranking'],'draft');
  select rank into title_rank from public.search_playbook('needle',null,null,null,null,20,0) where slug='ranking-title';
  select rank into body_rank from public.search_playbook('needle',null,null,null,null,20,0) where slug='ranking-body';
  if title_rank <= body_rank then raise exception 'TEST-4.2 title weighting failed'; end if;

  insert into public.playbook_articles(slug,title,category,article_type,summary,body_md,status)
    values('archived-test','Archived article','Test','troubleshooting','Archived summary','Archived body','archived');
  select count(*) into default_count from public.search_playbook('',null,null,null,null,100,0) where slug='archived-test';
  select count(*) into archived_count from public.search_playbook('',null,null,null,'archived',100,0) where slug='archived-test';
  if default_count <> 0 or archived_count <> 1 then raise exception 'TEST-4.3 archive visibility failed'; end if;

  begin
    insert into public.playbook_articles(slug,title,category,article_type,summary,body_md)
      values('ranking-title','Duplicate','Test','sop','Duplicate summary','Duplicate body');
    raise exception 'TEST-4.1 duplicate slug accepted';
  exception when unique_violation then null; end;

  insert into public.playbook_articles(slug,title,category,article_type,summary,body_md,tags)
    select 'perf-' || n, 'Performance article ' || n, 'Performance', 'reference',
      'Search performance fixture', 'rareperformanceword operational guidance ' || n,
      array['performance'] from generate_series(1,500) n;
  started := clock_timestamp();
  perform * from public.search_playbook('rareperformanceword',null,null,null,null,100,0);
  if clock_timestamp() - started >= interval '500 milliseconds' then
    raise exception 'NFR-4.1 search exceeded 500ms';
  end if;
end $$;

reset role;
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and tablename='playbook_articles'
      and indexdef ilike '%using gin (search_vector)%'
  ) then raise exception 'NFR-4.1 GIN index missing'; end if;
  if has_table_privilege('anon','public.playbook_articles','select,insert,update,delete') then
    raise exception 'Anonymous playbook grant';
  end if;
  if has_function_privilege('anon','public.search_playbook(text,text,text,text,text,integer,integer)','execute') then
    raise exception 'Anonymous search RPC';
  end if;
end $$;
rollback;
