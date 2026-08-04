# BugHunt

A free platform for practising **debugging** — the skill barely taught in CS courses but essential in real work.

Instead of writing code from scratch like typical DSA sites, students are given working code with one real, intentional bug. They find it, fix it, run it against test cases, and afterwards get an explanation of the bug *pattern* so they recognise it next time.

## How it works

All student code runs **entirely in the browser** — Pyodide (CPython compiled to WebAssembly) for Python, a sandboxed Web Worker for JavaScript. There is no server-side code execution anywhere, which is what keeps the platform free to run at any scale: each student's browser does its own work.

Infinite loops are handled by terminating the worker on a per-test-case timeout, so a runaway loop fails gracefully instead of freezing the tab.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, JavaScript) |
| Styling | Tailwind CSS v4 + shadcn/ui (Base UI) |
| Database | PostgreSQL via Supabase, with Row Level Security |
| Auth | Supabase Auth — email/password + Google OAuth |
| Editor | Monaco (with diff view) |
| Execution | Pyodide + Web Workers, client-side only |
| Hosting | Vercel |

Supported languages are **Python and JavaScript only**. Compiled languages would need a server-side runner, which is out of scope by design.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the values below
npm run dev
```

### Environment variables

Set these in `.env.local` (never committed):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, "anon public" |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, "service_role" — not currently used by any code path |

### Database setup

Run the migrations in order in the Supabase SQL Editor:

Run every file in `supabase/migrations/` in order:

1. `0001_init.sql` — tables, RLS policies, auth-sync trigger
2. `0002_add_function_name.sql` — entry-point column the runner calls
3. `0003_challenge_analytics.sql` — aggregate view for the admin panel
4. `0004_public_profiles.sql` — opt-in public profiles
5. `0005_multi_file_challenges.sql` — multi-file challenge support
6. `0006_challenge_reports.sql` — reader-submitted challenge reports

Then seed content. The challenge SQL is **generated, not committed** — build it first:

```bash
node scripts/generate-seed-sql.mjs
```

That writes `seed_phase3_challenges.sql` and the `seed_batch2_part*` /
`seed_batch3_part*` files into `supabase/`. Paste them into the SQL Editor one
at a time; they are split into ~10KB parts because a single combined file is
large enough that the editor fails to submit it.

Two seed files are hand-written and committed: `seed_phase1_smoke_test.sql`
(2 starter challenges) and `seed_multifile_example.sql` (one multi-file
challenge per language, run after migration 0005).

### Google OAuth

In Supabase → Authentication → Providers → Google, paste your Google Cloud client ID and secret, then copy the **callback URL** Supabase shows you into the Google client's *Authorized redirect URIs*. Your app's own domain goes in *Authorized JavaScript origins*, not the redirect URIs — Google always redirects to Supabase first, never straight to the app.

### Making yourself an admin

Sign up normally, then in the SQL Editor:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

Admins get `/admin`, where challenges can be authored without touching SQL.

## Authoring challenges

Use `/admin` — the form has side-by-side editors for the broken and correct code, structured test-case entry, and a **Test this challenge** button that runs both versions through the real execution engine. Publishing is blocked until validation passes: the broken code must fail at least one test and the correct code must pass all of them.

Test-case format notes:

- **Input is always an array of arguments** — `[5]` calls the function with one argument.
- **Values are JSON** — strings need quotes, and Python `None` is written `null`.
- Avoid `null` expected outputs for Python; `None` doesn't round-trip cleanly through Pyodide. Use a sentinel value instead.

## Regenerating seed SQL

The files in `lib/seed-data/` are the source of truth for every bundled
challenge. The SQL is a build artifact — it is gitignored, because a committed
copy goes stale the moment the source changes. Recreate it any time with:

```bash
node scripts/generate-seed-sql.mjs
```

Every challenge is executed before it ships: the broken version must fail at
least one test and the correct version must pass all of them. Run
`node scripts/verify-challenges.mjs` to check them, or pass `batch3` to check
one batch.

## Notes

- **Restart the dev server if the styling looks broken.** Turbopack's incremental CSS rebuild occasionally drops utility classes (`.grid`, `.h-3`) from the dev bundle. Production builds are unaffected.
- `/api/health` is a keep-alive endpoint; Supabase's free tier pauses after 7 days of inactivity, so an external cron pings it every few days. It runs a real query so the *database* is touched, not just the server.
- The code editor is desktop-oriented by design. Browsing and reading are mobile-friendly; debugging on a phone is not the target experience.
# bughunt
# bughunt
