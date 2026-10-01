create table public.progress_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phase_type text not null check (phase_type in ('recomposition', 'bulk', 'cut')),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  constraint progress_phases_date_order check (ends_on is null or ends_on >= starts_on)
);

comment on table public.progress_phases is 'User-defined body transformation phases linked by date to progress photo check-ins.';
create index progress_phases_user_dates_idx
  on public.progress_phases (user_id, starts_on, ends_on);

alter table public.progress_phases enable row level security;
revoke all on table public.progress_phases from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.progress_phases to authenticated;

create policy "Users can read their own progress phases"
  on public.progress_phases for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own progress phases"
  on public.progress_phases for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own progress phases"
  on public.progress_phases for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own progress phases"
  on public.progress_phases for delete to authenticated
  using ((select auth.uid()) = user_id);
