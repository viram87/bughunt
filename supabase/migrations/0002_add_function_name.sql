-- Adds the entry-point column the client-side CodeRunner needs: it calls
-- function_name(*input) on the student's code and compares the return value
-- to each test case's expected_output. Missing from the original schema.

alter table public.bug_challenges
  add column function_name text not null default '';

update public.bug_challenges set function_name = 'sum_range'
  where title = 'Off-by-one in range sum';

update public.bug_challenges set function_name = 'getUserCity'
  where title = 'Null check missing before property access';
