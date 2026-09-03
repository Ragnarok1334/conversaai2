create or replace function public.enforce_assistant_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_plan text;
  v_period_end timestamptz;
  v_grace_end timestamptz;
  v_cancel_at_period_end boolean;
  v_trial_end timestamptz;
  v_count integer;
begin
  if new.user_id is null then
    raise exception using errcode = '23514', message = 'assistant user_id is required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  select s.plan, s.assistants_limit, s.current_period_end, s.grace_ends_at, s.cancel_at_period_end
    into v_plan, v_limit, v_period_end, v_grace_end, v_cancel_at_period_end
  from public.subscriptions s where s.user_id = new.user_id order by s.created_at desc nulls last limit 1;
  if v_plan = 'trial' then
    select p.trial_ends_at into v_trial_end from public.profiles p where p.id = new.user_id;
    if v_trial_end is null or v_trial_end < now() then v_limit := 0; else v_limit := 1; end if;
  elsif v_plan in ('starter', 'pro', 'growth', 'business', 'enterprise') then
    if v_period_end is null then v_limit := 0;
    elsif now() <= v_period_end then
      if v_plan = 'enterprise' then v_limit := null;
      elsif v_limit is null then v_limit := case v_plan when 'starter' then 1 when 'pro' then 3 when 'growth' then 8 when 'business' then 20 else 0 end;
      end if;
    elsif coalesce(v_cancel_at_period_end, false) = false and v_grace_end is not null and now() <= v_grace_end then
      if v_plan = 'enterprise' then v_limit := null;
      elsif v_limit is null then v_limit := case v_plan when 'starter' then 1 when 'pro' then 3 when 'growth' then 8 when 'business' then 20 else 0 end;
      end if;
    else v_limit := 0;
    end if;
  else v_limit := 0;
  end if;
  select count(*) into v_count from public.assistants a where a.user_id = new.user_id;
  if v_limit is not null and v_count >= v_limit then raise exception using errcode = 'P0001', message = 'assistant_limit_reached'; end if;
  return new;
end;
$$;
revoke execute on function public.enforce_assistant_limit() from public, anon, authenticated;
drop trigger if exists enforce_assistant_limit_before_insert on public.assistants;
create trigger enforce_assistant_limit_before_insert before insert on public.assistants for each row execute function public.enforce_assistant_limit();
