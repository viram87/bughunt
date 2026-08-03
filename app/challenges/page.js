import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { LANGUAGE_VALUES, BUG_CATEGORY_VALUES, DIFFICULTY_VALUES } from "@/lib/constants";
import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { ChallengeFilters } from "@/components/challenge-filters";
import { ChallengeCard } from "@/components/challenge-card";
import { pickBugOfTheWeek } from "@/lib/bug-of-the-week";
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
  const language = params.language;
  const bugCategory = params.bug_category;
  const difficulty = params.difficulty;

  const { user } = await getCurrentUser();
  const supabase = await createClient();

  let query = supabase
    .from("bug_challenges")
    .select("id, title, language, bug_category, difficulty, problem_description")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (LANGUAGE_VALUES.includes(language)) query = query.eq("language", language);
  if (BUG_CATEGORY_VALUES.includes(bugCategory)) query = query.eq("bug_category", bugCategory);
  if (DIFFICULTY_VALUES.includes(difficulty)) query = query.eq("difficulty", difficulty);

  const { data: challenges, error } = await query;

  // One extra query gives every card its solved/tried state, which is what
  // keeps 42 cards from reading as an undifferentiated wall.
  const solved = new Set();
  const tried = new Set();
  if (user) {
    const { data: attempts } = await supabase
      .from("user_attempts")
      .select("bug_challenge_id, status")
      .eq("user_id", user.id);

    for (const attempt of attempts ?? []) {
      if (attempt.status === "passed") solved.add(attempt.bug_challenge_id);
      else tried.add(attempt.bug_challenge_id);
    }
  }

  const total = challenges?.length ?? 0;
  const solvedShown = challenges?.filter((c) => solved.has(c.id)).length ?? 0;
  const isFiltered = Boolean(language || bugCategory || difficulty);

  // A raw total advertises how small the library is; a *filtered* count is
  // genuinely useful ("how many match what I picked"). So only show the
  // number when it answers a question the reader just asked.
  const subtitle = isFiltered
    ? `${total} ${total === 1 ? "challenge matches" : "challenges match"} these filters`
    : user
    ? `${solvedShown} solved so far — keep going`
    : "Filter by language, bug pattern or difficulty";

  // Only shown on the unfiltered view — it's a starting point, not something
  // to interrupt a deliberate search with.
  const featured = isFiltered ? null : pickBugOfTheWeek(challenges ?? []);

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

      {error && <p className="text-sm text-destructive">Failed to load challenges: {error.message}</p>}

      {!error && total === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No challenges match these filters yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {challenges?.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            status={solved.has(challenge.id) ? "solved" : tried.has(challenge.id) ? "tried" : null}
          />
        ))}
      </div>
    </main>
  );
}
