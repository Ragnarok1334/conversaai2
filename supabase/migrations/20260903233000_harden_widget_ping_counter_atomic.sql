create or replace function public.record_widget_install_event(
  p_domain_id uuid,
  p_assistant_id uuid,
  p_domain text,
  p_page_url text,
  p_user_agent text,
  p_ip text
)
returns table (
  id uuid,
  user_id uuid,
  install_events_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.assistant_domains;
begin
  if p_domain_id is null or p_assistant_id is null or p_domain is null or length(p_domain) = 0 or length(p_domain) > 253 then
    raise exception using errcode = '22023', message = 'invalid_widget_ping';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_domain_id::text, 0));

  select * into v_row
  from public.assistant_domains d
  where d.id = p_domain_id
    and d.assistant_id = p_assistant_id
    and d.domain = p_domain
    and d.is_active = true
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'widget_domain_not_found';
  end if;

  update public.assistant_domains
  set is_verified = true,
      verification_status = 'verified',
      last_seen_at = now(),
      last_seen_url = p_page_url,
      last_seen_user_agent = p_user_agent,
      last_seen_ip = p_ip,
      install_events_count = coalesce(install_events_count, 0) + 1,
      updated_at = now()
  where id = p_domain_id
    and assistant_id = p_assistant_id
    and domain = p_domain
    and is_active = true
  returning public.assistant_domains.id,
            public.assistant_domains.user_id,
            public.assistant_domains.install_events_count
  into id, user_id, install_events_count;

  return next;
end;
$$;

revoke all on function public.record_widget_install_event(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_widget_install_event(uuid, uuid, text, text, text, text) to service_role;
