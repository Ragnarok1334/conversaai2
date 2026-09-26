-- Complete RLS policies for assistant_domains
-- Adds INSERT, UPDATE and DELETE protection for authenticated tenants.
-- Existing SELECT policy remains unchanged.

create policy assistant_domains_insert_own 
on public.assistant_domains 
for insert 
to authenticated 
with check ((select auth.uid()) = user_id);

create policy assistant_domains_update_own 
on public.assistant_domains 
for update 
to authenticated 
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy assistant_domains_delete_own 
on public.assistant_domains 
for delete 
to authenticated 
using ((select auth.uid()) = user_id);