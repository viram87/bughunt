-- Multi-file challenges: the bug lives in one file, the symptom shows in
-- another. Teaches tracing across a codebase rather than reading a single
-- function.
--
-- Backward compatible by design. `files` is nullable, and when it is null a
-- challenge behaves exactly as before, using broken_code/correct_code. All
-- 42 existing challenges are untouched and keep working.

alter table public.bug_challenges
  add column files jsonb,
  add column entry_file text;

-- Shape of `files`:
--   [
--     {"name": "validators.py", "broken": "...", "correct": "..."},
--     {"name": "main.py",       "broken": "...", "correct": "..."}
--   ]
-- `entry_file` names the file whose module exposes function_name.
--
-- The check keeps the two representations from disagreeing: either it's a
-- single-file challenge (both null) or a complete multi-file one (both set,
-- with a non-empty array). A half-populated row would fail at runtime in the
-- worker, which is far harder to diagnose than a constraint violation here.
alter table public.bug_challenges
  add constraint bug_challenges_files_shape
  check (
    (files is null and entry_file is null)
    or (
      files is not null
      and entry_file is not null
      and jsonb_typeof(files) = 'array'
      and jsonb_array_length(files) > 0
    )
  );

comment on column public.bug_challenges.files is
  'Multi-file challenges: array of {name, broken, correct}. Null means single-file, using broken_code/correct_code.';
comment on column public.bug_challenges.entry_file is
  'Name of the file in `files` that exposes function_name.';
