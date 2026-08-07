# BugHunt — project guide for AI assistants

Read this before changing anything. It covers what the project is, the
constraints that are non-negotiable, how to add challenges, and the bugs that
have already cost hours — several of which are invisible until they reach a
real browser.

---

## What it is

A free web platform teaching **debugging** to CS students. A student gets
working code with exactly one bug, is told the **symptom** rather than the
cause, fixes it in the browser, runs it against test cases, and then gets an
explanation of the **pattern** behind the bug.

Live at <https://trybughunt.com>.

The explanation is the product. "This loop needed `i + 1`" is worth little;
"this is what an off-by-one looks like, here is how to recognise the next one"
is the whole point. Any change that makes the explanation harder to reach is
going the wrong way.

---

## Hard constraints

Breaking these is not a trade-off, it is a different project.

1. **Zero cost.** Supabase free tier + Vercel Hobby only. If something appears
   to need a paid service, stop and propose a free alternative rather than
   assuming an upgrade.
2. **All code execution is client-side.** Python via Pyodide (WebAssembly),
   JavaScript in a sandboxed Web Worker. **No server ever executes user code** —
   no Judge0, no container runner, no execution API. This is what makes the
   platform free and infinitely scalable, and it is the single most important
   architectural fact.
3. **Row Level Security on every table.** The anon key is public; RLS is the
   only thing between a visitor and the data.
4. **Challenges are data, not code.** Adding a challenge must never require a
   code change.

---

## Stack

- **Next.js 16 App Router**, JavaScript (not TypeScript), Turbopack
- **Tailwind v4** + shadcn/ui built on **Base UI** — note: Base UI, not Radix.
  It uses a `render` prop and `nativeButton={false}`, **not** `asChild`.
- **Supabase** — Postgres, auth (email + Google OAuth), RLS
- **Monaco** editor, **Pyodide** from jsdelivr CDN, **acorn + astring** for JS
  AST instrumentation
- Deployed on **Vercel**

---

## Adding new challenges

This is the most common task. The workflow is deliberate — do not shortcut it.

### 1. Edit the source of truth

Challenges live in `lib/seed-data/*.mjs`, **not** in SQL. Current files:

| File | Count |
|---|---|
| `phase3-challenges.mjs` | 10 |
| `batch2-challenges.mjs` | 30 |
| `batch3-challenges.mjs` | 60 |

Add to an existing batch or create a new one. Each entry:

```js
{
  title: "Short, symptom-flavoured, no spoilers",
  language: "python" | "javascript",
  bug_category: "off_by_one" | "null_or_undefined" | "logic_error" |
                "infinite_loop" | "type_error" | "scope_error" |
                "async_race_condition" | "other",
  difficulty: "easy" | "medium" | "hard",
  function_name: "the_entry_point",     // the runner calls this
  broken_code: `...`,
  correct_code: `...`,
  problem_description: "What the function should do, with an example.",
  symptom_description: "What actually happens. PUT THE LITERAL ERROR TEXT HERE.",
  explanation: "Why it happens and how to recognise the pattern next time.",
  test_cases: [{ input: [args], expected_output: value }],
  hints: ["nudge", "warmer", "the answer"],   // exactly 3, escalating
}
```

**`symptom_description` carries the SEO.** Challenge page metadata leads with
it, because people search `IndexError: string index out of range`, never
"Last character index is out of range". Include the real error string.

### 2. Verify — non-negotiable

```bash
node scripts/verify-challenges.mjs          # all batches
node scripts/verify-challenges.mjs batch3   # one batch
```

This executes every broken and correct version and asserts the contract:
**broken must fail at least one test; correct must pass all of them.** It has
caught genuine duds — challenges whose "bug" did not change behaviour at all.

**The node harness is not sufficient on its own for Python.** It uses
`json.loads`; the browser uses `pyodide.toPy`. Those disagree (see gotchas).
Python challenges must also be run through real Pyodide before shipping.

### 3. Generate SQL and run it

```bash
node scripts/generate-seed-sql.mjs
```

Writes `supabase/seed_*_part*.sql`. **These files are gitignored build
artifacts** — the `.mjs` files are the source of truth, and a committed copy
goes stale silently.

Paste each part into the **Supabase SQL Editor**, one at a time. They are split
into ~10KB parts because a single combined file is large enough that the editor
fails to submit it ("Load failed").

**Parts are not idempotent.** Running one twice inserts those challenges twice;
there is no unique constraint on title. Check progress with
`select count(*) from bug_challenges;`.

### 4. Confirm

No code change or redeploy is needed — the site reads challenges from the
database. New challenges appear immediately.

---

## Gotchas that have already cost hours

Each of these was found the hard way. Several pass every test and only fail in
a real browser.

### Pyodide: arguments arrive as `JsProxy`, not `dict`

A plain JS object crossing into Python is a live proxy supporting neither
`obj[key]` nor `.get()`. Convert explicitly and destroy afterwards:

```js
const pyArgs = input.map((arg) => pyodide.toPy(arg));
// ... later
pyArgs.forEach((a) => a?.destroy?.());
```

### Pyodide: `toPy(null)` is NOT `None`

Verified against Pyodide 0.28.3. It produces a `JsNull` sentinel:

```python
bool(v)     # False   ← falsy, as expected
v is None   # False   ← the surprise
```

**Never pass a JS `null` as input to a Python challenge.** A challenge teaching
`is None` must create the None inside Python (`dict.get()` on a missing key).
This passed the full node suite while being broken in production.

### `frame.f_locals` returns references, not copies

Snapshotting locals for a trace stores a *pointer*. If the program then mutates
that list, every earlier snapshot shows the final state — the trace silently
lies about its own history. Deep-copy at capture time (`json.loads(json.dumps(v))`
with a `repr()` fallback).

### `sys.settrace`: the `return` event fires during exception unwinding

With `arg=None`. Handle only `line` and `return` and your trace reports
"returned None" for code that actually crashed. Catch the `exception` event.

### A step cap stops recording, not execution

Returning `None` from the tracer at the limit leaves a runaway loop running to
the wall-clock timeout. The script tracer raises a `BaseException` subclass
instead, which actually halts it. `BaseException` so a user's `except Exception:`
cannot swallow it.

### Ordering by a non-unique column breaks pagination

`created_at` is not unique — seeded batches share timestamps to the second.
Paginating on it shuffled rows across page boundaries: **two challenges were
returned twice and two were unreachable**, while the count still said 104.
Every paginated query must break the tie on `id`.

### Backticks inside the worker's `TRACER_SOURCE`

The Python tracer lives inside a JS template literal. A backtick anywhere in
that Python — even in a comment — terminates the string and breaks the whole
worker. Lint catches it; do not ignore a parse error there.

### Declaring `openGraph` metadata replaces the inherited object

Adding a custom `openGraph` title to a page silently drops the site-wide OG
image. Use a colocated `opengraph-image.js` file, which attaches automatically.

### Base UI, not Radix

No `asChild`. Use `render={<Link .../>}` with `nativeButton={false}`. Passing a
`<Link>` as a child of a `<Button>` produces nested `<button>` hydration errors.

### Stale Turbopack dev cache

If styling breaks, or a deleted route still 500s, **restart the dev server**.
Production builds are unaffected. This has caused several false alarms.

---

## Verification discipline

The rule that has repeatedly paid for itself: **test against the real runtime,
not a stand-in.**

- Extract logic from the **shipped** file (read `public/workers/*.js` and pull
  the source out) rather than copying it into a test. Copies drift.
- Python challenges: run through **real Pyodide**, not `json.loads`.
- JavaScript challenges: run through the **shipped worker's own**
  `resolveFunction`, so async challenges prove the `await` is really there.
- Browser behaviour: drive a real browser (Playwright). Simulated Monaco
  keystrokes mangle Python string literals via auto-closing quotes — set the
  editor model directly instead.

Two of this project's worst bugs passed a fully green test suite. Both were
found by running the actual thing.

---

## Map of the codebase

```
app/
  challenges/            list (infinite scroll) + challenge detail
  bugs/[pattern]/        SEO landing pages, one per bug pattern
  visualize/             Python step-through visualizer (standalone tool)
  admin/                 challenge authoring + report triage
  api/                   internal API for the frontend (NOT a public API)
  robots.txt/route.js    hand-built, carries Content-Signal
lib/
  seed-data/*.mjs        SOURCE OF TRUTH for challenges
  bug-patterns.js        long-form copy for /bugs landing pages
  code-runner/index.js   runChallenge(), traceExecution(), traceScript()
  auth.js                getCurrentUser(), wrapped in React cache()
  site.js                SITE_URL, absoluteUrl() — drives every canonical
public/workers/
  python-worker.js       Pyodide: run + trace + script trace (visualizer)
  javascript-worker.js   classic worker, no `export` allowed
  javascript-trace-worker.js   module worker, acorn/astring instrumentation
scripts/
  verify-challenges.mjs  the contract check — run before shipping content
  generate-seed-sql.mjs  .mjs -> SQL (gitignored artifacts)
supabase/migrations/     0001..0006, run in order, never delete
```

---

## Operations

- **Supabase free tier pauses after 7 days idle.** `/api/health` runs a real
  query; an external cron (cron-job.org) hits it every few days. Do not replace
  it with a static OK — that would touch the server but not the database.
- **`NEXT_PUBLIC_SITE_URL`** drives every canonical, sitemap entry and OG image
  URL. If it is wrong, canonicals point at the wrong host and tell Google to
  ignore the live one.
- **`NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`** shows the Google sign-in button. It
  exists because the OAuth consent screen's status can change outside this
  codebase; while it was in Testing, only allow-listed emails could sign in.
  Email sign-up never depends on it.
- **Admin role** is set directly in the `users` table. A trigger blocks
  self-escalation, but `auth.uid()` is NULL in the SQL Editor, so the trigger
  has an `auth.uid() is not null` guard.

---

## Deliberately not done

Do not "fix" these without asking — each was a decision.

- **Java/C++** — out of scope.
- **AI hints** — explicitly excluded by the owner.
- **Classroom mode** — deferred until a specific teacher asks for it.
- **JavaScript in the visualizer** — the tracer instruments a *named function*;
  a whole program needs `ast.body` instrumentation plus `console.log` capture.
  `traceScript` returns `{ supported: false }` and the page says so.
- **Interactive `input()`** — the visualizer takes pre-supplied stdin. True
  mid-execution prompting needs `SharedArrayBuffer` + `Atomics.wait` and
  cross-origin isolation headers affecting the whole site.
- **Agent-discovery endpoints** (API catalog, OAuth discovery, MCP server card)
  — the `/api/*` routes serve this app's own frontend and are `Disallow`ed.
  Advertising them for third-party agents would be a downgrade.
- **`force-dynamic` on the root layout** — it disables caching site-wide. Worth
  narrowing, but it exists because the header/footer render auth state, and
  removing it previously shipped a stale logged-out footer.

---

## Working style that suits this project

- **Verify before claiming.** Run it, read the output, report what happened.
- **Read the diff, not just `git status`.** A truncated file once showed as a
  normal modification.
- Content changes need the contract check; UI changes need a real browser.
- When something "does not work" but every layer passes in isolation, suspect
  caching — browser, service worker, Turbopack, or DNS negative cache (30
  minutes for this domain).
