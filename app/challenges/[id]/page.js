import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ChallengeWorkspace } from "@/components/challenge-workspace";

// Without this, Next.js's automatic fetch caching can cache the Supabase
// auth check itself, showing a stale logged-out state on this route even
// after the user signs in — force a fresh render (and fresh auth check)
// on every request instead.
export const dynamic = "force-dynamic";

export default async function ChallengePage({ params }) {
  const { id } = await params;
  const { user } = await getCurrentUser();
  const supabase = await createClient();

  // correct_code/explanation intentionally excluded — see
  // GET /api/bug-challenges/[id]/solution.
  const { data: challenge, error } = await supabase
    .from("bug_challenges")
    .select(
      "id, title, language, bug_category, difficulty, function_name, broken_code, problem_description, symptom_description, test_cases, status, hints(id, hint_order, hint_text)"
    )
    .eq("id", id)
    .order("hint_order", { referencedTable: "hints", ascending: true })
    .single();

  if (error || !challenge) {
    notFound();
  }

  let priorAttempts = [];
  let isBookmarked = false;
  if (user) {
    const [{ data: attempts }, { count }] = await Promise.all([
      supabase
        .from("user_attempts")
        .select("*")
        .eq("user_id", user.id)
        .eq("bug_challenge_id", id)
        .order("attempt_number", { ascending: true }),
      supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("bug_challenge_id", id),
    ]);
    priorAttempts = attempts ?? [];
    isBookmarked = Boolean(count);
  }

  return (
    <ChallengeWorkspace
      challenge={challenge}
      isLoggedIn={!!user}
      priorAttempts={priorAttempts}
      isBookmarked={isBookmarked}
    />
  );
}
