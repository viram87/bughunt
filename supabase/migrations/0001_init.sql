-- BugHunt initial schema: tables, constraints, auth sync trigger, and RLS policies.
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query) on a fresh project.

-- =========================================================================
-- Tables
-- =========================================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  avatar text,
  role text not null default 'student' check (role in ('student', 'contributor', 'admin')),
  created_at timestamptz not null default now()
);

create table public.bug_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  language text not null check (language in ('python', 'javascript')),
  bug_category text not null check (
    bug_category in (
      'off_by_one', 'null_or_undefined', 'logic_error', 'infinite_loop',
      'type_error', 'scope_error', 'async_race_condition', 'other'
    )
  ),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  broken_code text not null,
  problem_description text not null,
  symptom_description text not null,
  correct_code text not null,
  test_cases jsonb not null default '[]'::jsonb,
  explanation text not null,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'published')),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.hints (
  id uuid primary key default gen_random_uuid(),
  bug_challenge_id uuid not null references public.bug_challenges (id) on delete cascade,
  hint_order smallint not null check (hint_order in (1, 2, 3)),
  hint_text text not null,
  unique (bug_challenge_id, hint_order)
);

create table public.user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bug_challenge_id uuid not null references public.bug_challenges (id) on delete cascade,
  submitted_code text,
  status text not null check (status in ('passed', 'failed', 'in_progress')),
  hints_used smallint not null default 0,
  time_taken_seconds integer,
  attempted_at timestamptz not null default now(),
  attempt_number integer not null default 1
);

create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bug_category text not null check (
    bug_category in (
      'off_by_one', 'null_or_undefined', 'logic_error', 'infinite_loop',
      'type_error', 'scope_error', 'async_race_condition', 'other'
    )
  ),
  challenges_solved integer not null default 0,
  challenges_attempted integer not null default 0,
  last_activity timestamptz not null default now(),
  unique (user_id, bug_category)
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bug_challenge_id uuid not null references public.bug_challenges (id) on delete cascade,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bug_challenge_id uuid not null references public.bug_challenges (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, bug_challenge_id)
);

-- =========================================================================
-- Indexes
-- =========================================================================

create index bug_challenges_status_idx on public.bug_challenges (status);
create index bug_challenges_language_idx on public.bug_challenges (language);
create index bug_challenges_bug_category_idx on public.bug_challenges (bug_category);
create index bug_challenges_difficulty_idx on public.bug_challenges (difficulty);
create index hints_bug_challenge_id_idx on public.hints (bug_challenge_id);
create index user_attempts_user_id_idx on public.user_attempts (user_id);
create index user_attempts_bug_challenge_id_idx on public.user_attempts (bug_challenge_id);
create index user_progress_user_id_idx on public.user_progress (user_id);
create index contributions_user_id_idx on public.contributions (user_id);
create index bookmarks_user_id_idx on public.bookmarks (user_id);

-- =========================================================================
-- Auth sync: create a public.users row whenever a new auth.users row appears
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================================
-- Helper: is_admin() — security definer so it can read public.users without
-- recursing into the RLS policies defined on that same table.
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- Defense in depth: even though no Phase 1 endpoint exposes role editing,
-- make sure a user can never grant themselves elevated privileges via a
-- direct row update through PostgREST/the client SDKs. auth.uid() is only
-- populated when the request carries a JWT (i.e. it came through the API);
-- direct database access (SQL Editor, service role, migrations) has no JWT
-- context, so auth.uid() is null there and must be left alone, or admin
-- promotion could never happen at all.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_self_escalation
before update on public.users
for each row execute function public.prevent_role_self_escalation();

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.users enable row level security;
alter table public.bug_challenges enable row level security;
alter table public.hints enable row level security;
alter table public.user_attempts enable row level security;
alter table public.user_progress enable row level security;
alter table public.contributions enable row level security;
alter table public.bookmarks enable row level security;

-- users
create policy "Users view own profile, admins view all"
on public.users for select
using (auth.uid() = id or public.is_admin());

create policy "Users update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- bug_challenges
create policy "Published challenges visible to everyone"
on public.bug_challenges for select
using (status = 'published' or public.is_admin() or created_by = auth.uid());

create policy "Admins insert challenges"
on public.bug_challenges for insert
with check (public.is_admin());

create policy "Admins update challenges"
on public.bug_challenges for update
using (public.is_admin());

create policy "Admins delete challenges"
on public.bug_challenges for delete
using (public.is_admin());

-- hints
create policy "Hints visible if parent challenge is visible"
on public.hints for select
using (
  exists (
    select 1 from public.bug_challenges c
    where c.id = hints.bug_challenge_id
      and (c.status = 'published' or public.is_admin() or c.created_by = auth.uid())
  )
);

create policy "Admins manage hints"
on public.hints for all
using (public.is_admin())
with check (public.is_admin());

-- user_attempts
create policy "Users manage own attempts"
on public.user_attempts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins view all attempts"
on public.user_attempts for select
using (public.is_admin());

-- user_progress
create policy "Users manage own progress"
on public.user_progress for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins view all progress"
on public.user_progress for select
using (public.is_admin());

-- contributions
create policy "Users view own contributions, admins view all"
on public.contributions for select
using (auth.uid() = user_id or public.is_admin());

create policy "Users submit contributions"
on public.contributions for insert
with check (auth.uid() = user_id);

create policy "Admins update contributions"
on public.contributions for update
using (public.is_admin());

-- bookmarks
create policy "Users manage own bookmarks"
on public.bookmarks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
