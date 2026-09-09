alter table public.leads
  add column if not exists next_follow_up timestamptz,
  add column if not exists tags text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_tags_max_10'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_tags_max_10
      check (coalesce(array_length(tags, 1), 0) <= 10);
  end if;
end $$;

create index if not exists leads_user_next_follow_up_idx
  on public.leads (user_id, next_follow_up)
  where next_follow_up is not null;
