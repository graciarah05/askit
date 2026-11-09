-- One explicitly funded period; no automatic monthly renewal. Apply after usage.sql.
begin;
alter table askit_private.ai_policy add column period_start timestamptz, add column period_end timestamptz;
alter table askit_private.ai_policy add constraint valid_period check ((period_start is null and period_end is null) or (period_start is not null and period_end is not null and period_end>period_start));
create or replace function public.askit_reserve(p_id text,p_client text,p_ip text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p askit_private.ai_policy; day_start timestamptz;
begin
 select * into p from askit_private.ai_policy where id for update;
 if not found or not p.enabled or p.period_start is null or p.period_end is null or now()<p.period_start or now()>=p.period_end then return jsonb_build_object('allowed',false,'reason','paused'); end if;
 day_start:=date_trunc('day',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
 if exists(select 1 from askit_private.ai_usage where id=p_id) then return jsonb_build_object('allowed',false,'reason','duplicate'); end if;
 if (select count(*) from askit_private.ai_usage where state='reserved' and lease_until>now())>=p.concurrent_requests then return jsonb_build_object('allowed',false,'reason','busy'); end if;
 if (select count(*) from askit_private.ai_usage where created_at>=day_start and client_hash=p_client)>=p.client_requests
 or (select count(*) from askit_private.ai_usage where created_at>=day_start and ip_hash=p_ip)>=p.ip_requests then return jsonb_build_object('allowed',false,'reason','personal'); end if;
 if (select count(*) from askit_private.ai_usage where created_at>=day_start)>=p.day_requests
 or (select coalesce(sum(charge_usd),0) from askit_private.ai_usage where created_at>=day_start)+1>p.day_usd
 or (select coalesce(sum(charge_usd),0) from askit_private.ai_usage where created_at>=p.period_start and created_at<p.period_end)+1>p.month_usd then return jsonb_build_object('allowed',false,'reason','budget'); end if;
 insert into askit_private.ai_usage(id,client_hash,ip_hash) values(p_id,p_client,p_ip);
 return jsonb_build_object('allowed',true);
end $$;
create or replace function public.askit_health() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('database',true,'generationEnabled',coalesce(enabled and now()>=period_start and now()<period_end,false)) from askit_private.ai_policy where id;
$$;
commit;
