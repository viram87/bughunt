import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { BUG_CATEGORIES } from "@/lib/constants";
import { computeBadges, computeStreak, computeAverageHints } from "@/lib/badges";
import { CategoryMasteryChart } from "@/components/category-mastery-chart";
import { ChallengeCard } from "@/components/challenge-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// Auth-gated and user-specific — nothing here should be indexed.
export const metadata = {
  title: "Your progress",
  robots: { index: false, follow: false },
};

function StatTile({ label, value, hint }) {
  return (
    <Card className="relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-chart-5" />
      <CardContent className="pt-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const [
    { data: userProgress },
    { data: attempts },
    { data: bookmarks },
    { data: publishedChallenges },
  ] = await Promise.all([
    supabase.from("user_progress").select("*").eq("user_id", user.id),
    supabase
      .from("user_attempts")
      .select("bug_challenge_id, status, hints_used, attempt_number, attempted_at, bug_challenges(difficulty)")
      .eq("user_id", user.id),
    supabase
      .from("bookmarks")
      .select("bug_challenge_id, bug_challenges(id, title, language, bug_category, difficulty)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("bug_challenges").select("bug_category").eq("status", "published"),
  ]);

  const progress = userProgress ?? [];
  const allAttempts = attempts ?? [];
  const passedAttempts = allAttempts.filter((a) => a.status === "passed");

  const totalSolved = progress.reduce((sum, row) => sum + (row.challenges_solved ?? 0), 0);
  const streak = computeStreak(allAttempts);
  const averageHints = computeAverageHints(passedAttempts);
  const badges = computeBadges({ userProgress: progress, passedAttempts });
  const earnedBadges = badges.filter((b) => b.earned);

  const totalsByCategory = (publishedChallenges ?? []).reduce((acc, row) => {
    acc[row.bug_category] = (acc[row.bug_category] ?? 0) + 1;
    return acc;
  }, {});

  const categories = BUG_CATEGORIES.map((category) => {
    const row = progress.find((p) => p.bug_category === category.value);
    return {
      value: category.value,
      label: category.label,
      solved: row?.challenges_solved ?? 0,
      attempted: row?.challenges_attempted ?? 0,
      total: totalsByCategory[category.value] ?? 0,
    };
  });

  const bookmarkedChallenges = (bookmarks ?? []).map((b) => b.bug_challenges).filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your progress</h1>
        <p className="mt-1 text-muted-foreground">
          Where you&apos;re strong, and which bug patterns still trip you up.
        </p>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatTile label="Challenges solved" value={totalSolved} />
        <StatTile
          label="Current streak"
          value={streak}
          hint={streak === 1 ? "day" : "days"}
        />
        <StatTile
          label="Avg. hints used"
          value={averageHints.toFixed(1)}
          hint="per solved challenge"
        />
      </div>

      <Card className="mb-10">
        <CardContent className="pt-6">
          <CategoryMasteryChart categories={categories} />
        </CardContent>
      </Card>

      <section className="mb-10">
        <h2 className="mb-1 text-sm font-medium">Badges</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {earnedBadges.length} of {badges.length} earned.
        </p>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge
              key={badge.id}
              variant={badge.earned ? "default" : "outline"}
              className={badge.earned ? "" : "opacity-50"}
              title={badge.description}
            >
              {badge.label}
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium">Bookmarked challenges</h2>
        {bookmarkedChallenges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bookmarks yet — bookmark a challenge from its page to revisit it later.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {bookmarkedChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        <Link href="/" className="underline">
          Browse all challenges
        </Link>
      </p>
    </main>
  );
}
