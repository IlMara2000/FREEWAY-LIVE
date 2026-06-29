create extension if not exists pgcrypto;

alter table public.alarms
  add column if not exists timezone text,
  add column if not exists last_push_notified_key text default '';

create index if not exists idx_alarms_owner_enabled_time
  on public.alarms(owner_id, enabled, "time")
  where enabled;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  subscription jsonb not null default '{}'::jsonb,
  user_agent text not null default '',
  timezone text not null default 'UTC',
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  last_tested_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_error text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  constraint push_subscriptions_owner_endpoint_key unique (owner_id, endpoint)
);

drop index if exists public.idx_push_subscriptions_endpoint;

create index if not exists idx_push_subscriptions_endpoint
  on public.push_subscriptions(endpoint);

create index if not exists idx_push_subscriptions_owner_enabled
  on public.push_subscriptions(owner_id, enabled)
  where enabled;

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can create their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;

create policy "Users can view their own push subscriptions"
  on public.push_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own push subscriptions"
  on public.push_subscriptions
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own push subscriptions"
  on public.push_subscriptions
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.push_subscriptions from anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;

notify pgrst, 'reload schema';
