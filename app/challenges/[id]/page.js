import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ChallengeWorkspace } from "@/components/challenge-workspace";
import { JsonLd } from "@/components/json-ld";
import { BUG_CATEGORIES, DIFFICULTIES, LANGUAGES } from "@/lib/constants";
import { SITE_NAME, SITE_URL, absoluteUrl, truncate } from "@/lib/site";

// Without this, Next.js's automatic fetch caching can cache the Supabase
// auth check itself, showing a stale logged-out state on this route even
// after the user signs in — force a fresh render (and fresh auth check)
// on every request instead.
export const dynamic = "force-dynamic";

function labelFor(list, value) {
  return list.find((x) => x.value === value)?.label ?? value;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("bug_challenges")
    .select("title, language, bug_category, difficulty, problem_description, symptom_description")
    .eq("id", id)
    .single();

  if (!challenge) {
    return { title: "Challenge not found", robots: { index: false, follow: false } };
  }

  const language = labelFor(LANGUAGES, challenge.language);
  const category = labelFor(BUG_CATEGORIES, challenge.bug_category);
  const difficulty = labelFor(DIFFICULTIES, challenge.difficulty);

  const title = `${challenge.title} — ${language} debugging challenge`;
  // The author-written problem description is real, unique copy, which is
  // far better for search results than a templated blurb.
  const article = /^[aeiou]/i.test(difficulty) ? "An" : "A";
  // Author-written copy is arbitrary length, so both variants get trimmed to
  // their platform's limit rather than being truncated mid-word by Google/X.
  const fullDescription = `${challenge.problem_description} ${article} ${difficulty.toLowerCase()} ${category.toLowerCase()} bug to find and fix, in your browser.`;
  const description = truncate(fullDescription, 155);
  const socialDescription = truncate(fullDescription, 120);
  const url = absoluteUrl(`/challenges/${id}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description: socialDescription,
      siteName: SITE_NAME,
    },
    twitter: { card: "summary_large_image", title, description: socialDescription },
  };
}

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: challenge.title,
    description: challenge.problem_description,
    url: absoluteUrl(`/challenges/${id}`),
    learningResourceType: "Exercise",
    educationalLevel: labelFor(DIFFICULTIES, challenge.difficulty),
    teaches: `${labelFor(BUG_CATEGORIES, challenge.bug_category)} bugs in ${labelFor(LANGUAGES, challenge.language)}`,
    programmingLanguage: labelFor(LANGUAGES, challenge.language),
    inLanguage: "en",
    isAccessibleForFree: true,
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <ChallengeWorkspace
        challenge={challenge}
        isLoggedIn={!!user}
        priorAttempts={priorAttempts}
        isBookmarked={isBookmarked}
      />
    </>
  );
}
