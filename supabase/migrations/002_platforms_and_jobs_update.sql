-- ============================================================
-- Migration 002: platforms, platform_status_options, jobs update
-- Paste and run this in the Supabase SQL Editor.
-- ============================================================

-- platform_status_options
create table if not exists platform_status_options (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  label             text not null,
  "order"           integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table platform_status_options enable row level security;
create policy "Users manage own platform_status_options"
  on platform_status_options for all using (auth.uid() = user_id);

-- platforms
create table if not exists platforms (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  url                   text,
  profile_status_id     uuid references platform_status_options(id) on delete set null,
  subscription_type     text,
  login_email           text,
  last_application_date date,
  personal_rating       smallint check (personal_rating between 1 and 5),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, name)
);
alter table platforms enable row level security;
create policy "Users manage own platforms"
  on platforms for all using (auth.uid() = user_id);

-- Add source_platform_id to jobs
alter table jobs
  add column if not exists source_platform_id uuid references platforms(id) on delete set null;

-- Extend handle_new_user_statuses to also seed platform_status_options
create or replace function handle_new_user_statuses()
returns trigger language plpgsql security definer as $$
begin
  insert into statuses (user_id, label, color, "order") values
    (new.id, 'Applied',      '#60a5fa', 0),
    (new.id, 'Interviewing', '#a78bfa', 1),
    (new.id, 'Offer',        '#22c55e', 2),
    (new.id, 'Rejected',     '#ef4444', 3);

  insert into platform_status_options (user_id, label, "order") values
    (new.id, 'Profile Pending', 0),
    (new.id, 'Profile Created', 1),
    (new.id, 'Active',          2);

  return new;
end;
$$;

-- Auto-update platforms.last_application_date via trigger
create or replace function update_platform_last_application_date()
returns trigger language plpgsql security definer as $$
declare
  v_platform_id uuid;
  v_max_date    date;
begin
  v_platform_id := coalesce(new.source_platform_id, old.source_platform_id);
  if v_platform_id is null then return new; end if;

  select max(coalesce(stage_date, created_at::date))
    into v_max_date
    from jobs
   where source_platform_id = v_platform_id
     and is_archived = false;

  update platforms set last_application_date = v_max_date where id = v_platform_id;
  return new;
end;
$$;

drop trigger if exists jobs_platform_last_application_date on jobs;
create trigger jobs_platform_last_application_date
  after insert or update or delete on jobs
  for each row execute function update_platform_last_application_date();
