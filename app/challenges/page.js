import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { LANGUAGE_VALUES, BUG_CATEGORY_VALUES, DIFFICULTY_VALUES } from "@/lib/constants";
import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { ChallengeFilters } from "@/components/challenge-filters";
import { ChallengeGrid } from "@/components/challenge-grid";
import { pickBugOfTheWeek } from "@/lib/bug-of-the-week";
import { buildSearchFilter, PAGE_SIZE } from "@/lib/challenge-search";
import { Badge } from "@/components/ui/badge";
import { absoluteUrl } from "@/lib/site";

// Reads the signed-in user's attempts, so it can't be statically cached.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "All debugging challenges",
  description:
    "Browse every BugHunt challenge by language, bug category and difficulty. Python and JavaScript, free, running entirely in your browser.",
  alternates: { canonical: absoluteUrl("/challenges") },
};

export default async function ChallengesPage({ searchParams }) {
  const params = await searchParams;
  const language = LANGUAGE_VALUES.includes(params.language) ? params.language : undefined;
  const bugCategory = BUG_CATEGORY_VALUES.includes(params.bug_category)
    ? params.bug_category
    : undefined;
  const difficulty = DIFFICULTY_VALUES.includes(params.difficulty) ? params.difficulty : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const { user } = await getCurrentUser();
  const supabase = await createClient();

  const isFiltered = Boolean(language || bugCategory || difficulty || q);

  // Only the FIRST page is rendered on the server; ChallengeGrid loads the
  // rest as the reader scrolls. Rendering all 104 produced 677KB of HTML and
  // grew linearly with the library.
  let firstPage = supabase
    .from("bug_challenges")
    .select("id, title, language, bug_category, difficulty, problem_description", {
      count: "exact",
    })
    .eq("status", "published")
    .order("created_at", { ascending: false })
    // created_at is not unique — the seeded batches share timestamps to the
    // second. Ordering by a non-unique column leaves ties in an arbitrary
    // order that can differ between queries, so paginating shuffled rows
    // across page boundaries: two challenges were returned twice and two were
    // never returned at all. The id tiebreaker makes the sort total, which is
    // what pagination needs to be correct.
    .order("id", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (language) firstPage = firstPage.eq("language", language);
  if (bugCategory) firstPage = firstPage.eq("bug_category", bugCategory);
  if (difficulty) firstPage = firstPage.eq("difficulty", difficulty);
  if (q) firstPage = firstPage.or(buildSearchFilter(q));

  // Bug of the week indexes into the whole library, so it needs every id — but
  // only three narrow columns, and only on the unfiltered view where it
  // actually renders.
  const bugOfTheWeekQuery = isFiltered
    ? Promise.resolve({ data: null })
    : supabase
        .from("bug_challenges")
        .select("id, title, problem_description")
        .eq("status", "published");

  // The user's whole attempt history, fetched once. It is one row per
  // challenge touched, so it stays small, and it lets every page the grid
  // loads later show its solved/tried state without another request.
  const attemptsQuery = user
    ? supabase.from("user_attempts").select("bug_challenge_id, status").eq("user_id", user.id)
    : Promise.resolve({ data: [] });

  // Independent queries, so they run concurrently instead of stacking up as
  // three sequential round trips to Supabase.
  const [{ data: challenges, error, count }, { data: attempts }, { data: allForFeature }] =
    await Promise.all([firstPage, attemptsQuery, bugOfTheWeekQuery]);

  const solved = new Set();
  const tried = new Set();
  for (const attempt of attempts ?? []) {
    if (attempt.status === "passed") solved.add(attempt.bug_challenge_id);
    else tried.add(attempt.bug_challenge_id);
  }

  const total = count ?? challenges?.length ?? 0;

  // A raw total advertises how small the library is; a *filtered* count is
  // genuinely useful ("how many match what I picked"). So only show the
  // number when it answers a question the reader just asked.
  const subtitle = q
    ? `${total} ${total === 1 ? "result" : "results"} for “${q}”`
    : isFiltered
    ? `${total} ${total === 1 ? "challenge matches" : "challenges match"} these filters`
    : user
    ? `${solved.size} solved so far — keep going`
    : "Filter by language, bug pattern or difficulty";

  // Only shown on the unfiltered view — it's a starting point, not something
  // to interrupt a deliberate search with.
  const featured = isFiltered ? null : pickBugOfTheWeek(allForFeature ?? []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      {featured && (
        <Link href={`/challenges/${featured.id}`} className="group mb-8 block">
          <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-accent/50 to-transparent p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/50">
            <div className="mb-2 flex items-center gap-2">
              <Badge className="border-transparent bg-primary/12 text-primary">
                <SparklesIcon className="size-3" /> Bug of the week
              </Badge>
              {solved.has(featured.id) && (
                <Badge className="border-transparent bg-success/12 text-success">Solved</Badge>
              )}
            </div>
            <p className="text-lg font-semibold transition-colors group-hover:text-primary">
              {featured.title}
            </p>
            {featured.problem_description && (
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {featured.problem_description}
              </p>
            )}
          </div>
        </Link>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Challenges</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Suspense fallback={null}>
          <ChallengeFilters />
        </Suspense>
      </div>

      {error && (
        <p className="text-sm text-destructive">Failed to load challenges: {error.message}</p>
      )}

      {!error && total === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No challenges match these filters yet.</p>
        </div>
      )}

      {!error && total > 0 && (
        <ChallengeGrid
          // Remount on any filter change so the grid restarts from the new
          // first page instead of appending onto the previous filter's rows.
          key={`${language ?? ""}|${bugCategory ?? ""}|${difficulty ?? ""}|${q}`}
          initialChallenges={challenges ?? []}
          total={total}
          filters={{ language, bug_category: bugCategory, difficulty, q: q || undefined }}
          solvedIds={[...solved]}
          triedIds={[...tried]}
        />
      )}
    </main>
  );
}
