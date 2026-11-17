begin;
create table askit_private.analytics_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('operator','tester'))
);
create table askit_private.analytics_visitors (
 visitor_hash text primary key check(visitor_hash ~ '^[a-f0-9]{64}$'),
 first_seen timestamptz not null default now(),
 last_seen timestamptz not null default now(),
 exclusion text check(exclusion in ('operator','verification','preview','bot'))
);
create table askit_private.analytics_events (
 id uuid primary key,
 visitor_hash text not null references askit_private.analytics_visitors(visitor_hash),
 session_id uuid not null,
 name text not null check(name in ('visit','page_view','prompt_ready','prompt_success','prompt_clarification','prompt_failed','basic_ready','prompt_copy','copy_failed','google_ai_open','popup_blocked','student_benefit_click')),
 occurred_at timestamptz not null,
 received_at timestamptz not null default now(),
 route text not null default '' check(length(route)<=24),
 task text not null default '' check(length(task)<=24),
 tool text not null default '' check(length(tool)<=24),
 generation_id text check(length(generation_id)<=80),
 source text not null default 'client' check(source in ('client','server')),
 duration_ms integer check(duration_ms between 0 and 180000),
 cost_usd numeric(12,6),
 code text check(length(code)<=40)
);
create index analytics_events_time on askit_private.analytics_events(occurred_at);
create index analytics_events_visitor_time on askit_private.analytics_events(visitor_hash,occurred_at);
create unique index analytics_visit_once on askit_private.analytics_events(visitor_hash,session_id) where name='visit';
create unique index analytics_result_once on askit_private.analytics_events(name,generation_id) where name in ('prompt_ready','prompt_success','prompt_clarification','prompt_failed','basic_ready') and generation_id is not null;
alter table askit_private.analytics_access enable row level security;
alter table askit_private.analytics_visitors enable row level security;
alter table askit_private.analytics_events enable row level security;
revoke all on askit_private.analytics_access,askit_private.analytics_visitors,askit_private.analytics_events from public,anon,authenticated;
grant select,insert,update,delete on askit_private.analytics_access,askit_private.analytics_visitors,askit_private.analytics_events to service_role;

create function public.askit_analytics_access(p_user uuid) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('operator',exists(select 1 from askit_private.analytics_access where user_id=p_user and role='operator'),'excluded',exists(select 1 from askit_private.analytics_access where user_id=p_user));
$$;

create function public.askit_analytics_record(p_visitor text,p_exclusion text,p_events jsonb,p_server boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare e jsonb; accepted jsonb:='[]'; event_name text; stamp timestamptz; gid text; sid uuid; eid uuid;
begin
 if jsonb_typeof(p_events)!='array' or jsonb_array_length(p_events)>20 then raise exception 'Invalid events'; end if;
 insert into askit_private.analytics_visitors(visitor_hash,exclusion) values(p_visitor,p_exclusion)
 on conflict(visitor_hash) do update set last_seen=now(),exclusion=coalesce(askit_private.analytics_visitors.exclusion,excluded.exclusion);
 perform 1 from askit_private.analytics_visitors where visitor_hash=p_visitor for update;
 if not p_server and (select count(*) from askit_private.analytics_events where visitor_hash=p_visitor and received_at>now()-interval '1 hour')>600 then return jsonb_build_object('accepted',accepted,'limited',true); end if;
 for e in select value from jsonb_array_elements(p_events) loop
  event_name:=e->>'name';eid:=(e->>'id')::uuid;sid:=(e->>'session')::uuid;gid:=nullif(e->>'generation','');
  if not p_server and event_name in ('prompt_ready','prompt_clarification','prompt_failed') then raise exception 'Server event required'; end if;
  stamp:=case when p_server then now() else (e->>'at')::timestamptz end;
  if stamp<now()-interval '24 hours' or stamp>now()+interval '5 minutes' then stamp:=now(); end if;
  if event_name='prompt_success' and not exists(select 1 from askit_private.analytics_events where name='prompt_ready' and generation_id=gid and visitor_hash=p_visitor) then continue; end if;
  insert into askit_private.analytics_events(id,visitor_hash,session_id,name,occurred_at,route,task,tool,generation_id,source,duration_ms,cost_usd,code)
  values(eid,p_visitor,sid,event_name,stamp,coalesce(e->>'route',''),coalesce(e->>'task',''),coalesce(e->>'tool',''),gid,case when p_server then 'server' else 'client' end,case when p_server then (e->>'duration')::integer end,case when p_server then (e->>'cost')::numeric end,case when p_server then e->>'code' end)
  on conflict do nothing;
  accepted:=accepted||jsonb_build_array(eid);
 end loop;
 return jsonb_build_object('accepted',accepted,'excluded',(select exclusion is not null from askit_private.analytics_visitors where visitor_hash=p_visitor));
end $$;

create function public.askit_settle_measured(p_id text,p_usd numeric,p_measure jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare who text;
begin
 select client_hash into who from askit_private.ai_usage where id=p_id;
 if who is null then raise exception 'Unknown request'; end if;
 perform public.askit_settle(p_id,p_usd);
 perform public.askit_analytics_record(who,p_measure->>'exclusion',jsonb_build_array((p_measure-'exclusion')||jsonb_build_object('generation',p_id,'cost',p_usd)),true);
end $$;

create function public.askit_analytics_summary(p_user uuid,p_from date,p_to date,p_audit boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare answer jsonb;
begin
 if not exists(select 1 from askit_private.analytics_access where user_id=p_user and role='operator') then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_from>p_to or p_to-p_from>61 then raise exception 'Invalid dates'; end if;
 with selected as (
  select e.* from askit_private.analytics_events e join askit_private.analytics_visitors v using(visitor_hash)
  where e.occurred_at>=p_from::timestamp at time zone 'Asia/Seoul' and e.occurred_at<(p_to+1)::timestamp at time zone 'Asia/Seoul'
   and case when p_audit then v.exclusion in ('operator','verification','preview') else v.exclusion is null end
 ), counts as (select name,count(*) as events,count(distinct visitor_hash) as visitors from selected where name!='visit' group by name union all select 'visit',count(distinct (visitor_hash,session_id)),count(distinct visitor_hash) from selected where source='client' having count(*)>0),
 daily as (select (occurred_at at time zone 'Asia/Seoul')::date as day,count(distinct visitor_hash) filter(where source='client') as visitors,count(distinct (visitor_hash,session_id)) filter(where source='client') as visits,count(*) filter(where name='prompt_success') as successes,count(*) filter(where name='prompt_copy') as copies,count(*) filter(where name='google_ai_open') as ai_opens,count(*) filter(where name='student_benefit_click') as benefit_clicks from selected group by 1),
 tools as(select tool,count(*) as opens from selected where name='google_ai_open' group by tool),
 task_counts as(select task,count(*) as successes from selected where name='prompt_success' group by task)
 select jsonb_build_object('from',p_from,'to',p_to,'audit',p_audit,'updatedAt',now(),'startedAt',(select min(first_seen) from askit_private.analytics_visitors),
 'counts',coalesce((select jsonb_object_agg(name,jsonb_build_object('events',events,'visitors',visitors)) from counts),'{}'),
 'daily',coalesce((select jsonb_agg(to_jsonb(daily) order by day) from daily),'[]'),
 'tools',coalesce((select jsonb_agg(to_jsonb(tools) order by opens desc) from tools),'[]'),
 'tasks',coalesce((select jsonb_agg(to_jsonb(task_counts) order by successes desc) from task_counts),'[]'),
 'quality',(select jsonb_build_object('ready',count(*) filter(where name='prompt_ready'),'clarifications',count(*) filter(where name='prompt_clarification'),'failures',count(*) filter(where name='prompt_failed'),'costUsd',coalesce(sum(cost_usd) filter(where source='server'),0),'medianMs',percentile_cont(0.5) within group(order by duration_ms) filter(where name='prompt_ready'),'p95Ms',percentile_cont(0.95) within group(order by duration_ms) filter(where name='prompt_ready')) from selected),
 'excludedEvents',(select count(*) from askit_private.analytics_events e join askit_private.analytics_visitors v using(visitor_hash) where v.exclusion is not null and e.occurred_at>=p_from::timestamp at time zone 'Asia/Seoul' and e.occurred_at<(p_to+1)::timestamp at time zone 'Asia/Seoul')) into answer;
 return answer;
end $$;

create or replace function public.askit_prune_usage() returns bigint language plpgsql security invoker set search_path='' as $$
declare removed bigint; n bigint;
begin
 delete from askit_private.ai_usage where created_at<now()-interval '62 days';get diagnostics removed=row_count;
 delete from askit_private.analytics_events where received_at<now()-interval '62 days';get diagnostics n=row_count;removed:=removed+n;
 delete from askit_private.analytics_visitors where last_seen<now()-interval '62 days' and not exists(select 1 from askit_private.analytics_events e where e.visitor_hash=analytics_visitors.visitor_hash);
 return removed;
end $$;
revoke all on function public.askit_analytics_access(uuid),public.askit_analytics_record(text,text,jsonb,boolean),public.askit_settle_measured(text,numeric,jsonb),public.askit_analytics_summary(uuid,date,date,boolean) from public,anon,authenticated;
grant execute on function public.askit_analytics_access(uuid),public.askit_analytics_record(text,text,jsonb,boolean),public.askit_settle_measured(text,numeric,jsonb),public.askit_analytics_summary(uuid,date,date,boolean) to service_role;
commit;
