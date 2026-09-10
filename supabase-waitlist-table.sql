-- Run this in the Supabase SQL Editor to create the waitlist table for the under-construction signup.
-- Dashboard: Project → SQL Editor → New query → paste and run.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Optional: enable RLS and allow anonymous inserts (so the app can insert with anon key)
alter table public.waitlist enable row level security;

create policy "Allow anonymous insert"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- Optional: restrict read to service role only (so only you/backend can read the list)
create policy "No public read"
  on public.waitlist
  for select
  to anon
  using (false);
