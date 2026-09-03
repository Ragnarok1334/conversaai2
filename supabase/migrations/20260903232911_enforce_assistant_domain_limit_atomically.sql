create or replace function public.add_assistant_domain_atomic(
  p_assistant_id uuid,
  p_user_id uuid,
  p_domain text,
  p_limit integer
)
returns public.assistant_domains
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assistant_user_id uuid;
  v_count integer;
  v_row public.assistant_domains;
begin
  if p_assistant_id is null or p_user_id is null then
    raise exception using errcode = '22023', message = 'invalid_domain_request';
  end if;

  if p_domain is null or length(p_domain) = 0 or length(p_domain) > 253 then
    raise exception using errcode = '22023', message = 'invalid_domain';
  end if;

  if p_limit is null or p_limit < 0 or p_limit > 1000 then
    raise exception using errcode = '22023', message = 'invalid_domain_limit';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_assistant_id::text, 0));

  select a.user_id
    into v_assistant_user_id
  from public.assistants a
  where a.id = p_assistant_id;

  if not found or v_assistant_user_id <> p_user_id then
    raise exception using errcode = '42501', message = 'assistant_access_denied';
  end if;

  select count(*)
    into v_count
  from public.assistant_domains d
  where d.assistant_id = p_assistant_id;

  if v_count >= p_limit then
    raise exception using errcode = 'P0001', message = 'assistant_domain_limit_reached';
  end if;

  insert into public.assistant_domains (
    assistant_id,
    user_id,
    domain,
    is_active,
    is_verified,
    verification_status
  ) values (
    p_assistant_id,
    p_user_id,
    p_domain,
    true,
    false,
    'pending'
  )
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'assistant_domain_already_exists';
end;
$$;

revoke execute on function public.add_assistant_domain_atomic(uuid, uuid, text, integer) from public, anon, authenticated;
