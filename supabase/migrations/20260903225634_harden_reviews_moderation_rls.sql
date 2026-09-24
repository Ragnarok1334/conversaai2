drop policy if exists reviews_insert_authenticated on public.reviews;
create policy reviews_insert_authenticated
on public.reviews
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and coalesce(is_approved, false) = false
);

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own
on public.reviews
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and coalesce(is_approved, false) = false
);

