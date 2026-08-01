-- Phase 1 smoke-test data: two published challenges (one per language) so the
-- homepage listing + filters have something to render. Paste into the
-- Supabase SQL Editor after running 0001_init.sql. Safe to delete later —
-- real challenges get authored properly in Phase 3/5.

insert into public.bug_challenges (
  title, language, bug_category, difficulty,
  broken_code, problem_description, symptom_description,
  correct_code, test_cases, explanation, status, function_name
) values (
  'Off-by-one in range sum',
  'python',
  'off_by_one',
  'easy',
  $$def sum_range(n):
    total = 0
    for i in range(1, n):
        total += i
    return total$$,
  'sum_range(n) should return the sum of all integers from 1 to n, inclusive.',
  'sum_range(5) returns 10 instead of 15 — the last number is never added.',
  $$def sum_range(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total$$,
  '[{"input": [5], "expected_output": 15}, {"input": [1], "expected_output": 1}, {"input": [10], "expected_output": 55}]'::jsonb,
  'range(1, n) stops before n, excluding it from the loop. This is one of the most common off-by-one mistakes: forgetting that Python''s range() upper bound is exclusive.',
  'published',
  'sum_range'
), (
  'Null check missing before property access',
  'javascript',
  'null_or_undefined',
  'easy',
  $$function getUserCity(user) {
    return user.address.city;
}$$,
  'getUserCity(user) should return the user''s city, or "Unknown" if the user has no address on file.',
  'Calling getUserCity on a user without an address throws "Cannot read properties of undefined (reading ''city'')".',
  $$function getUserCity(user) {
    return user.address ? user.address.city : "Unknown";
}$$,
  '[{"input": [{"address": {"city": "Boston"}}], "expected_output": "Boston"}, {"input": [{}], "expected_output": "Unknown"}]'::jsonb,
  'Accessing a nested property without checking that the parent exists first is a classic null/undefined bug. Guard with a conditional check or optional chaining (user.address?.city ?? "Unknown").',
  'published',
  'getUserCity'
);
