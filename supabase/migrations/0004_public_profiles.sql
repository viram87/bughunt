-- Public solver profiles: a shareable page proving what someone has solved.
--
-- Opt-in by design. profile_public defaults to false, so nothing about an
-- existing user becomes visible until they pick a username and switch it on.

alter table public.users
  add column username text unique,
  add column profile_public boolean not null default false;

-- Lowercase, 3-30 chars, letters/numbers/hyphen/underscore. Enforced in the
-- database rather than only in the API, so a direct PostgREST call can't
-- create a username the routing can't handle.
alter table public.users
  add constraint users_username_format
  check (username is null or username ~ '^[a-z0-9_-]{3,30}$');

create index users_username_idx on public.users (username) where username is not null;

-- IMPORTANT: no public SELECT policy is added to public.users.
--
-- RLS grants access to whole ROWS, not columns. A policy like
-- "using (profile_public = true)" would let anyone with the anon key run
-- ?select=email&profile_public=eq.true and harvest the email addresses of
-- everyone who opted in. Instead, expose only the safe columns through
-- views that run with the definer's rights (security_invoker = off), so the
-- underlying table stays fully protected by its existing policies.

create view public.public_profiles
with (security_invoker = off)
as
select
  id,
  username,
  name,
  avatar,
  created_at
from public.users
where profile_public = true
  and username is not null;

create view public.public_profile_progress
with (security_invoker = off)
as
select
  p.user_id,
  u.username,
  p.bug_category,
  p.challenges_solved,
  p.challenges_attempted,
  p.last_activity
from public.user_progress p
join public.users u on u.id = p.user_id
where u.profile_public = true
  and u.username is not null;

-- PostgREST reaches these as the anon/authenticated roles.
grant select on public.public_profiles to anon, authenticated;
grant select on public.public_profile_progress to anon, authenticated;
