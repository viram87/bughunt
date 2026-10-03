-- Track editing and run behaviour per attempt, enabling richer solve
-- signatures on the dashboard (edit count, run count per solve).

alter table public.user_attempts
  add column edit_count integer not null default 0,
  add column run_count integer not null default 0;
