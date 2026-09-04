create or replace function public.check_rate_limit(p_key text, p_route text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_hits integer;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 256 then
    return false;
  end if;
  if p_route is null or length(p_route) = 0 or length(p_route) > 128 then
    return false;
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    return false;
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;

  if random() < 0.1 then
    delete from public.api_rate_limits
    where window_start < now() - interval '24 hours';
  end if;

  insert into public.api_rate_limits (key, route, hits, window_start)
  values (p_key, p_route, 1, now())
  on conflict (key, route) do update
  set hits = case
        when extract(epoch from (now() - public.api_rate_limits.window_start)) > p_window_seconds then 1
        else public.api_rate_limits.hits + 1
      end,
      window_start = case
        when extract(epoch from (now() - public.api_rate_limits.window_start)) > p_window_seconds then 1
        else public.api_rate_limits.hits + 1
      end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$function$;
