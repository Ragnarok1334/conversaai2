drop policy if exists "Users can delete own assistants" on public.assistants;
drop policy if exists "Users can insert own assistants" on public.assistants;
drop policy if exists "Users can update own assistants" on public.assistants;
drop policy if exists "Users can view own assistants" on public.assistants;
drop policy if exists "Users delete own assistants" on public.assistants;
drop policy if exists "Users insert own assistants" on public.assistants;
drop policy if exists "Users see own assistants" on public.assistants;
drop policy if exists "Users update own assistants" on public.assistants;
drop policy if exists assistants_delete_own on public.assistants;
drop policy if exists assistants_insert_own on public.assistants;
drop policy if exists assistants_select_own on public.assistants;
drop policy if exists assistants_update_own on public.assistants;
create policy assistants_select_own on public.assistants for select to authenticated using ((select auth.uid()) = user_id);
create policy assistants_insert_own on public.assistants for insert to authenticated with check ((select auth.uid()) = user_id);
create policy assistants_update_own on public.assistants for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy assistants_delete_own on public.assistants for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own assistant channels" on public.assistant_channels;
drop policy if exists "Users can insert own assistant channels" on public.assistant_channels;
drop policy if exists "Users can update own assistant channels" on public.assistant_channels;
drop policy if exists "Users can view own assistant channels" on public.assistant_channels;
drop policy if exists assistant_channels_insert_own on public.assistant_channels;
drop policy if exists assistant_channels_select_own on public.assistant_channels;
drop policy if exists assistant_channels_update_own on public.assistant_channels;
create policy assistant_channels_select_own on public.assistant_channels for select to authenticated using ((select auth.uid()) = user_id);
create policy assistant_channels_insert_own on public.assistant_channels for insert to authenticated with check ((select auth.uid()) = user_id);
create policy assistant_channels_update_own on public.assistant_channels for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy assistant_channels_delete_own on public.assistant_channels for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own assistant domains" on public.assistant_domains;
create policy assistant_domains_select_own on public.assistant_domains for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users delete own test messages" on public.assistant_test_messages;
drop policy if exists "Users insert own test messages" on public.assistant_test_messages;
drop policy if exists "Users see own test messages" on public.assistant_test_messages;
create policy assistant_test_messages_select_own on public.assistant_test_messages for select to authenticated using ((select auth.uid()) = user_id);
create policy assistant_test_messages_insert_own on public.assistant_test_messages for insert to authenticated with check ((select auth.uid()) = user_id);
create policy assistant_test_messages_update_own on public.assistant_test_messages for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy assistant_test_messages_delete_own on public.assistant_test_messages for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own conversations" on public.conversations;
drop policy if exists "Users can insert own conversations" on public.conversations;
drop policy if exists "Users can update own conversations" on public.conversations;
drop policy if exists "Users can view own conversations" on public.conversations;
drop policy if exists "Users delete own conversations" on public.conversations;
drop policy if exists "Users see own conversations" on public.conversations;
drop policy if exists "Users update own conversations" on public.conversations;
drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own on public.conversations for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own leads" on public.leads;
drop policy if exists "Users can insert own leads" on public.leads;
drop policy if exists "Users can update own leads" on public.leads;
drop policy if exists "Users can view own leads" on public.leads;
drop policy if exists "Users delete own leads" on public.leads;
drop policy if exists "Users see own leads" on public.leads;
drop policy if exists "Users update own leads" on public.leads;
drop policy if exists leads_select_own on public.leads;
create policy leads_select_own on public.leads for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own messages" on public.messages;
drop policy if exists "Users can insert own messages" on public.messages;
drop policy if exists "Users can update own messages" on public.messages;
drop policy if exists "Users can view own messages" on public.messages;
drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_update_own on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own audit logs" on public.audit_logs;
create policy audit_logs_select_own on public.audit_logs for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists billing_payments_select_own on public.billing_payments;
create policy billing_payments_select_own on public.billing_payments for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own settings" on public.user_settings;
drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Anyone can view approved reviews" on public.reviews;
drop policy if exists "Authenticated users can insert reviews" on public.reviews;
drop policy if exists "Users can delete their own reviews" on public.reviews;
drop policy if exists "Users can update their own reviews" on public.reviews;
create policy reviews_select_approved on public.reviews for select to anon, authenticated using (is_approved = true);
create policy reviews_insert_authenticated on public.reviews for insert to authenticated with check ((user_id is null) or ((select auth.uid()) = user_id));
create policy reviews_update_own on public.reviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reviews_delete_own on public.reviews for delete to authenticated using ((select auth.uid()) = user_id);
