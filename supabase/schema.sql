-- InspectReport cloud schema (single-user MVP)
-- Run in Supabase SQL editor or via CLI migration.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  report_template text not null default 'site_observation_report',
  -- Legacy / template fields mapped from app Project type
  site_name text not null default '',
  client_name text not null default '',
  inspector_name text not null default '',
  inspection_date date,
  project_number text,
  report_number text,
  site_address text,
  building_permit_no text,
  contractor_name text,
  prepared_by text,
  reviewed_by text,
  visit_date date,
  report_date date,
  reason_for_visit text,
  weather_conditions text,
  contractor_present text,
  distribution_list text,
  is_sample_project boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  location text not null default '',
  status text not null default 'general',
  discipline text not null default 'general',
  priority text,
  contractor_action_required boolean not null default false,
  note text not null default '',
  draft_text text not null default '',
  recommended_action text,
  transcripts jsonb not null default '{}'::jsonb,
  draft_warnings jsonb not null default '[]'::jsonb,
  draft_generated_at timestamptz,
  draft_source_summary text,
  draft_manually_edited boolean not null default false,
  observation_number text,
  code_reference_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  observation_id uuid not null references public.observations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('photo', 'audio')),
  storage_path text not null,
  filename text not null,
  mime_type text not null default 'application/octet-stream',
  size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists observations_project_id_idx on public.observations (project_id);
create index if not exists observations_user_id_idx on public.observations (user_id);
create index if not exists media_items_observation_id_idx on public.media_items (observation_id);
create index if not exists media_items_project_id_idx on public.media_items (project_id);
create index if not exists media_items_user_id_idx on public.media_items (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists observations_set_updated_at on public.observations;
create trigger observations_set_updated_at
  before update on public.observations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.observations enable row level security;
alter table public.media_items enable row level security;

-- Projects
create policy "Users can select own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Observations
create policy "Users can select own observations"
  on public.observations for select
  using (auth.uid() = user_id);

create policy "Users can insert own observations"
  on public.observations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own observations"
  on public.observations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own observations"
  on public.observations for delete
  using (auth.uid() = user_id);

-- Media items
create policy "Users can select own media_items"
  on public.media_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own media_items"
  on public.media_items for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own media_items"
  on public.media_items for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket (private — use signed URLs for preview/export)
-- Path convention: {user_id}/{project_id}/{observation_id}/{media_id}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('inspection-media', 'inspection-media', false)
on conflict (id) do nothing;

create policy "Users can read own media files"
  on storage.objects for select
  using (
    bucket_id = 'inspection-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own media files"
  on storage.objects for insert
  with check (
    bucket_id = 'inspection-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own media files"
  on storage.objects for delete
  using (
    bucket_id = 'inspection-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
