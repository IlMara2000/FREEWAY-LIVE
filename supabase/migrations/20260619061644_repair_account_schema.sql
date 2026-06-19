-- Freeway Life - repair an older/partial Supabase schema without deleting data.
-- The existing project already has a minimal profiles table, while the other
-- account tables were never created. Keep existing profile rows and attach
-- them to their matching auth user through profiles.id.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists owner_id uuid,
  add column if not exists total_xp integer not null default 0,
  add column if not exists level integer not null default 1,
  add column if not exists active_theme text not null default 'emerald',
  add column if not exists unlocked_themes text[] not null default array['emerald']::text[],
  add column if not exists total_focus_minutes integer not null default 0,
  add column if not exists total_tasks_completed integer not null default 0,
  add column if not exists streak_days integer not null default 0,
  add column if not exists last_active_date date not null default current_date,
  add column if not exists day_by_day jsonb,
  add column if not exists freeway_os jsonb,
  add column if not exists initial_onboarding jsonb,
  add column if not exists created_date timestamptz not null default now(),
  add column if not exists updated_date timestamptz not null default now();

alter table public.profiles
  alter column id set default gen_random_uuid();

update public.profiles
set owner_id = id
where owner_id is null;

alter table public.profiles
  alter column owner_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_owner_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_owner_id_fkey
      foreign key (owner_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

create unique index if not exists idx_profiles_owner_id
  on public.profiles(owner_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'inbox'
    check (status in ('today', 'inbox', 'scheduled', 'done')),
  due_date text default '',
  start_time text default '',
  end_time text default '',
  task_type text not null default 'task'
    check (task_type in ('task', 'work', 'study', 'event', 'memo')),
  is_brain_dump boolean not null default false,
  xp_value integer not null default 25,
  day_by_day boolean not null default false,
  day_by_day_date text default '',
  day_by_day_section text default '',
  day_by_day_area text default '',
  day_by_day_weight text default '',
  source text default '',
  recurrence_rule text default '',
  recurrence_group_id text default '',
  recurrence_index integer default 0,
  recurrence_total integer default 0,
  copied_from_title text default '',
  linked_note_ids text[] default array[]::text[],
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes integer not null default 25,
  completed boolean not null default false,
  xp_earned integer not null default 0,
  task_id text default '',
  task_title text default '',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.alarms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Sveglia',
  time text not null default '09:00',
  date text default '',
  repeat text not null default 'none',
  enabled boolean not null default true,
  reminder_text text default '',
  linked_task_id text default '',
  last_notified_key text default '',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nuova nota',
  content text not null default '',
  priority text not null default 'medium',
  source text default 'brain_dump_note',
  due_date text default '',
  folder_id text default '',
  attachments jsonb default '[]'::jsonb,
  linked_task_ids text[] default array[]::text[],
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists idx_tasks_owner_id on public.tasks(owner_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_is_brain_dump
  on public.tasks(is_brain_dump)
  where is_brain_dump = true;
create index if not exists idx_focus_sessions_owner_id on public.focus_sessions(owner_id);
create index if not exists idx_alarms_owner_id on public.alarms(owner_id);
create index if not exists idx_notes_owner_id on public.notes(owner_id);
create index if not exists idx_note_folders_owner_id on public.note_folders(owner_id);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.alarms enable row level security;
alter table public.notes enable row level security;
alter table public.note_folders enable row level security;

drop policy if exists "Users can manage their own profile" on public.profiles;
drop policy if exists "Users can manage their own tasks" on public.tasks;
drop policy if exists "Users can manage their own focus_sessions" on public.focus_sessions;
drop policy if exists "Users can manage their own alarms" on public.alarms;
drop policy if exists "Users can manage their own notes" on public.notes;
drop policy if exists "Users can manage their own note_folders" on public.note_folders;

create policy "Users can manage their own profile"
  on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can manage their own tasks"
  on public.tasks
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can manage their own focus_sessions"
  on public.focus_sessions
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can manage their own alarms"
  on public.alarms
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can manage their own notes"
  on public.notes
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can manage their own note_folders"
  on public.note_folders
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on table public.profiles from anon;
revoke all on table public.tasks from anon;
revoke all on table public.focus_sessions from anon;
revoke all on table public.alarms from anon;
revoke all on table public.notes from anon;
revoke all on table public.note_folders from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.focus_sessions to authenticated;
grant select, insert, update, delete on table public.alarms to authenticated;
grant select, insert, update, delete on table public.notes to authenticated;
grant select, insert, update, delete on table public.note_folders to authenticated;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.tasks to service_role;
grant select, insert, update, delete on table public.focus_sessions to service_role;
grant select, insert, update, delete on table public.alarms to service_role;
grant select, insert, update, delete on table public.notes to service_role;
grant select, insert, update, delete on table public.note_folders to service_role;

notify pgrst, 'reload schema';
