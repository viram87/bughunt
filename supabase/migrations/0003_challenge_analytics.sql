-- Per-challenge attempt aggregates for the admin panel.
--
-- security_invoker = on means the view runs with the *querying* user's
-- permissions, so the existing RLS policies still apply: an admin gets true
-- totals via "Admins view all attempts", while anyone else only ever sees
-- their own rows. No service-role key is needed anywhere.

create view public.challenge_analytics
with (security_invoker = on)
as
select
  c.id as bug_challenge_id,
  c.title,
  c.language,
  c.bug_category,
  c.difficulty,
  c.status,
  count(a.id) as total_attempts,
  count(distinct a.user_id) as distinct_users,
  count(a.id) filter (where a.status = 'failed') as failed_attempts,
  count(a.id) filter (where a.status = 'passed') as passed_attempts,
  count(distinct a.user_id) filter (where a.status = 'passed') as users_solved,
  -- Null rather than 0 when untouched, so "no data yet" is distinguishable
  -- from "everyone passes it" when sorting by difficulty signal.
  case
    when count(a.id) = 0 then null
    else round(
      count(a.id) filter (where a.status = 'failed')::numeric / count(a.id) * 100,
      1
    )
  end as failure_rate_pct
from public.bug_challenges c
left join public.user_attempts a on a.bug_challenge_id = c.id
group by c.id, c.title, c.language, c.bug_category, c.difficulty, c.status;
