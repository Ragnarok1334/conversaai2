-- Read-only regression test for ConversaAI tenant isolation.
-- Run with a privileged SQL connection in a non-production verification step.
-- Every *_cross_tenant_visible value must be false.

begin;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from auth.users order by created_at asc limit 1),
  true
);

set local role authenticated;

select jsonb_build_object(
  'identity_present', auth.uid() is not null,
  'assistants_cross_tenant_visible',
    exists(select 1 from public.assistants where user_id <> auth.uid()),
  'conversations_cross_tenant_visible',
    exists(select 1 from public.conversations where user_id <> auth.uid()),
  'leads_cross_tenant_visible',
    exists(select 1 from public.leads where user_id <> auth.uid()),
  'messages_cross_tenant_visible',
    exists(select 1 from public.messages where user_id <> auth.uid()),
  'subscriptions_cross_tenant_visible',
    exists(select 1 from public.subscriptions where user_id <> auth.uid()),
  'profiles_cross_tenant_visible',
    exists(select 1 from public.profiles where id <> auth.uid())
) as tenant_isolation_result;

rollback;
