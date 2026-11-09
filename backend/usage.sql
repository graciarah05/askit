-- Service-only accounting. No prompt, file, email or raw IP is stored here.
begin;
create table askit_private.ai_policy (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 day_usd numeric(12,6) not null default 3 check(day_usd>0),
 month_usd numeric(12,6) not null default 15 check(month_usd>=day_usd),
 day_requests integer not null default 60 check(day_requests>0),
 client_requests integer not null default 5 check(client_requests>0),
 ip_requests integer not null default 20 check(ip_requests>0),
 concurrent_requests integer not null default 3 check(concurrent_requests>0)
);
insert into askit_private.ai_policy(id) values(true);
create table askit_private.ai_usage (
 id text primary key check(length(id) between 16 and 80),
 client_hash text not null check(length(client_hash)=64),
 ip_hash text not null check(length(ip_hash)=64),
 created_at timestamptz not null default now(),
 lease_until timestamptz not null default now()+interval '2 minutes',
 charge_usd numeric(12,6) not null default 1 check(charge_usd>=0),
 state text not null default 'reserved' check(state in ('reserved','complete','uncertain'))
);
create index ai_usage_time on askit_private.ai_usage(created_at);
create index ai_usage_client on askit_private.ai_usage(client_hash,created_at);
create index ai_usage_ip on askit_private.ai_usage(ip_hash,created_at);
alter table askit_private.ai_policy enable row level security;
alter table askit_private.ai_usage enable row level security;
revoke all on askit_private.ai_policy,askit_private.ai_usage from public,anon,authenticated;
grant usage on schema askit_private to service_role;
grant select,insert,update,delete on askit_private.ai_policy,askit_private.ai_usage to service_role;

create function public.askit_reserve(p_id text,p_client text,p_ip text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p askit_private.ai_policy; day_start timestamptz; month_start timestamptz;
begin
 select * into p from askit_private.ai_policy where id for update;
 if not found or not p.enabled then return jsonb_build_object('allowed',false,'reason','paused'); end if;
 day_start:=date_trunc('day',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
 month_start:=date_trunc('month',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
 if exists(select 1 from askit_private.ai_usage where id=p_id) then return jsonb_build_object('allowed',false,'reason','duplicate'); end if;
 if (select count(*) from askit_private.ai_usage where state='reserved' and lease_until>now())>=p.concurrent_requests then return jsonb_build_object('allowed',false,'reason','busy'); end if;
 if (select count(*) from askit_private.ai_usage where created_at>=day_start and client_hash=p_client)>=p.client_requests
 or (select count(*) from askit_private.ai_usage where created_at>=day_start and ip_hash=p_ip)>=p.ip_requests then return jsonb_build_object('allowed',false,'reason','personal'); end if;
 if (select count(*) from askit_private.ai_usage where created_at>=day_start)>=p.day_requests
 or (select coalesce(sum(charge_usd),0) from askit_private.ai_usage where created_at>=day_start)+1>p.day_usd
 or (select coalesce(sum(charge_usd),0) from askit_private.ai_usage where created_at>=month_start)+1>p.month_usd then return jsonb_build_object('allowed',false,'reason','budget'); end if;
 insert into askit_private.ai_usage(id,client_hash,ip_hash) values(p_id,p_client,p_ip);
 return jsonb_build_object('allowed',true);
end $$;
create function public.askit_settle(p_id text,p_usd numeric) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from askit_private.ai_policy where id for update;
 if p_usd is not null and (p_usd<0 or p_usd>100) then raise exception 'Invalid usage'; end if;
 update askit_private.ai_usage set charge_usd=case when p_usd is null then charge_usd else p_usd end,
 state=case when p_usd is null then 'uncertain' else 'complete' end,lease_until=now()
 where id=p_id and state='reserved';
 -- Unexpectedly expensive output stops future paid calls for operator review.
 if p_usd>1 then update askit_private.ai_policy set enabled=false where id; end if;
end $$;
create function public.askit_health() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('database',true,'generationEnabled',enabled) from askit_private.ai_policy where id;
$$;
create function public.askit_prune_usage() returns bigint language plpgsql security invoker set search_path='' as $$
declare removed bigint;
begin
 delete from askit_private.ai_usage where created_at<now()-interval '62 days';
 get diagnostics removed=row_count;return removed;
end $$;
revoke all on function public.askit_reserve(text,text,text),public.askit_settle(text,numeric),public.askit_health(),public.askit_prune_usage() from public,anon,authenticated;
grant execute on function public.askit_reserve(text,text,text),public.askit_settle(text,numeric),public.askit_health(),public.askit_prune_usage() to service_role;
commit;
