-- Apply once to a NEW Supabase project. This does not alter existing applications.
begin;
create table public.posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 nickname text not null check(length(trim(nickname)) between 1 and 24),
 category text not null check(category in ('질문','정보·팁','자유','활용 사례')),
 title text not null check(length(trim(title)) between 1 and 100),
 body text not null check(length(trim(body)) between 1 and 10000),
 image_path text not null default '' check(image_path='' or image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
 tool text not null default '' check(length(tool)<=80),
 prompt text not null default '' check(length(prompt)<=20000),
 result_url text not null default '' check(result_url='' or (length(result_url)<=2000 and result_url ~ '^https://')),
 created_at timestamptz not null default now()
);
create table public.comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 nickname text not null check(length(trim(nickname)) between 1 and 24),
 body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
alter table public.comments add column parent_id uuid;
alter table public.comments add constraint comments_id_post unique(id,post_id);
alter table public.comments add constraint comments_parent foreign key(parent_id,post_id) references public.comments(id,post_id) on delete set null(parent_id);
create table public.post_likes (post_id uuid not null references public.posts(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,primary key(post_id,user_id));
alter table public.post_likes enable row level security;
revoke all on public.post_likes from anon,authenticated;
grant select on public.post_likes to anon,authenticated;
grant insert,delete on public.post_likes to authenticated;
create policy likes_read on public.post_likes for select to anon,authenticated using(true);
create policy likes_add on public.post_likes for insert to authenticated with check((select auth.uid())=user_id);
create policy likes_delete on public.post_likes for delete to authenticated using((select auth.uid())=user_id);
create table public.reports (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(reason in ('광고·도배','욕설·비방','개인정보 노출','기타')),
 created_at timestamptz not null default now(),
 unique(user_id,post_id)
);
create index posts_created on public.posts(created_at desc);
create index posts_owner on public.posts(user_id);
create index comments_post on public.comments(post_id,created_at);
create index comments_owner on public.comments(user_id);
create index reports_post on public.reports(post_id);
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
revoke all on public.posts,public.comments,public.reports from anon,authenticated;
grant select on public.posts,public.comments to anon,authenticated;
grant select on public.reports to authenticated;
grant insert(user_id,nickname,category,title,body,tool,prompt,result_url,image_path) on public.posts to authenticated;
grant update(nickname,category,title,body,tool,prompt,result_url,image_path),delete on public.posts to authenticated;
grant insert(user_id,post_id,nickname,body,parent_id),delete on public.comments to authenticated;
grant insert(user_id,post_id,reason) on public.reports to authenticated;
create policy posts_read on public.posts for select to anon,authenticated using(true);
create policy posts_add on public.posts for insert to authenticated with check((select auth.uid())=user_id and (image_path='' or split_part(image_path,'/',1)=(select auth.uid())::text));
create policy posts_edit on public.posts for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id and (image_path='' or split_part(image_path,'/',1)=(select auth.uid())::text));
create policy posts_delete on public.posts for delete to authenticated using((select auth.uid())=user_id);
create policy comments_read on public.comments for select to anon,authenticated using(true);
create policy comments_add on public.comments for insert to authenticated with check((select auth.uid())=user_id);
create policy comments_delete on public.comments for delete to authenticated using((select auth.uid())=user_id);
create policy reports_add on public.reports for insert to authenticated with check((select auth.uid())=user_id);
create policy reports_read_own on public.reports for select to authenticated using((select auth.uid())=user_id);
-- Per-account posting limits, enforced in DB, not merely in the browser.
create schema if not exists askit_private;
revoke all on schema askit_private from public,anon,authenticated;
create function askit_private.limit_writes() returns trigger language plpgsql security invoker set search_path='' as $$
declare recent integer; max_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 if tg_table_name='posts' then
  select count(*) into recent from public.posts where user_id=new.user_id and created_at>now()-interval '1 hour'; max_count:=10;
 elsif tg_table_name='comments' then
  select count(*) into recent from public.comments where user_id=new.user_id and created_at>now()-interval '1 hour'; max_count:=60;
 else
  select count(*) into recent from public.reports where user_id=new.user_id and created_at>now()-interval '1 hour'; max_count:=20;
 end if;
 if recent>=max_count then raise exception 'Please try again later' using errcode='P0001'; end if;
 return new;
end $$;
revoke all on function askit_private.limit_writes() from public,anon,authenticated;
create trigger posts_limit before insert on public.posts for each row execute function askit_private.limit_writes();
create trigger comments_limit before insert on public.comments for each row execute function askit_private.limit_writes();
create trigger reports_limit before insert on public.reports for each row execute function askit_private.limit_writes();
commit;
