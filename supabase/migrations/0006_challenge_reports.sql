-- Lets readers report a challenge that is wrong, confusing, or broken.
--
-- Every challenge is executed before it ships, so the code is known to run
-- and the tests are known to be consistent. What that cannot check is whether
-- an EXPLANATION is clear or a hint gives the answer away — and with 100+
-- hand-authored challenges, some won't be. This is the only way to find out.

create table public.challenge_reports (
  id uuid primary key default gen_random_uuid(),
  bug_challenge_id uuid not null references public.bug_challenges (id) on delete cascade,
  -- Nullable: reporting is deliberately open to logged-out readers. Requiring
  -- an account would filter out exactly the frustrated first-time visitor
  -- whose feedback is most valuable. on delete set null so deleting an
  -- account doesn't destroy the report itself.
  user_id uuid references public.users (id) on delete set null,
  reason text not null check (
    reason in ('wrong_explanation', 'unclear', 'test_case_wrong', 'code_does_not_run', 'other')
  ),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index challenge_reports_status_idx on public.challenge_reports (status, created_at desc);
create index challenge_reports_challenge_idx on public.challenge_reports (bug_challenge_id);

alter table public.challenge_reports enable row level security;

-- Anyone may file a report, including anonymous visitors. The check keeps a
-- logged-in reporter from filing under someone else's id, while still
-- allowing a null user_id for anonymous reports.
create policy "Anyone can file a report"
on public.challenge_reports for insert
with check (user_id is null or user_id = auth.uid());

-- Reports are NOT publicly readable: free-text details could contain anything,
-- and a public list of "broken" challenges would be trivially abusable.
create policy "Admins read reports"
on public.challenge_reports for select
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

create policy "Admins update reports"
on public.challenge_reports for update
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);
