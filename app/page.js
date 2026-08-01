import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGE_VALUES, BUG_CATEGORY_VALUES, DIFFICULTY_VALUES } from "@/lib/constants";
import { ChallengeFilters } from "@/components/challenge-filters";
import { ChallengeCard } from "@/components/challenge-card";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const language = params.language;
  const bugCategory = params.bug_category;
  const difficulty = params.difficulty;

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

  return (
    <main className="flex-1">
      <section className="border-b border-border/60 bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:py-20">
          <p className="mb-4 inline-flex items-center rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            Debugging practice for CS students
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Get good at finding{" "}
            <span className="bg-gradient-to-r from-primary to-chart-5 bg-clip-text text-transparent">
              real bugs
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            Every challenge is working code with one intentional bug. Find it, fix it, and learn the
            pattern so you spot it next time.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Challenges</h2>
            <p className="text-sm text-muted-foreground">
              {challenges?.length ?? 0} {challenges?.length === 1 ? "challenge" : "challenges"}{" "}
              available
            </p>
          </div>
          <Suspense fallback={null}>
            <ChallengeFilters />
          </Suspense>
        </div>

        {error && (
          <p className="text-sm text-destructive">Failed to load challenges: {error.message}</p>
        )}

        {!error && challenges?.length === 0 && (
          <div className="rounded-xl border border-dashed py-16 text-center">
            <p className="text-muted-foreground">No challenges match these filters yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {challenges?.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </div>
    </main>
  );
}
