create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_path text not null unique,
  measured_at date not null default current_date,
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg > 0),
  body_fat_percent numeric(5, 2) check (body_fat_percent is null or body_fat_percent between 0 and 100),
  measurements jsonb not null default '{}'::jsonb check (jsonb_typeof(measurements) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.progress_entries is 'Private user photo check-ins with optional body measurements.';
comment on column public.progress_entries.measurements is 'Optional centimeter values keyed by body area.';

create index progress_entries_user_date_idx
  on public.progress_entries (user_id, measured_at, created_at);

alter table public.progress_entries enable row level security;
revoke all on table public.progress_entries from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.progress_entries to authenticated;

create policy "Users can read their own progress entries"
  on public.progress_entries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own progress entries"
  on public.progress_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own progress entries"
  on public.progress_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own progress entries"
  on public.progress_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can view their own progress photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can upload their own progress photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete their own progress photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
