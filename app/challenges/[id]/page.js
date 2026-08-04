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

// Matches the error names that actually appear in search queries. Deliberately
// a fixed list rather than a loose pattern: a greedy regex over author prose
// produces noise, and keyword spam is worse than no keywords.
const ERROR_NAMES =
  /\b(IndexError|KeyError|TypeError|ValueError|AttributeError|NameError|UnboundLocalError|ZeroDivisionError|StopIteration|RecursionError|ReferenceError|SyntaxError|RangeError|NaN|undefined|None)\b/g;

function extractErrorSignatures(text) {
  return [...new Set((text ?? "").match(ERROR_NAMES) ?? [])];
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

  // Lead the description with the SYMPTOM, not the spec. symptom_description
  // is where the literal error text lives ("IndexError: string index out of
  // range", "Cannot read properties of undefined"), and that is what someone
  // actually types into Google at 2am. The problem description explains what
  // the function should do, which nobody searches for.
  const article = /^[aeiou]/i.test(difficulty) ? "An" : "A";
  const fullDescription = `${challenge.symptom_description} ${article} ${difficulty.toLowerCase()} ${category.toLowerCase()} bug to find and fix in your browser, with the explanation afterwards.`;
  // Author-written copy is arbitrary length, so both variants get trimmed to
  // their platform's limit rather than being truncated mid-word by Google/X.
  const description = truncate(fullDescription, 155);

  // Error identifiers pulled out of the author's own text — no invented
  // keywords, just the strings already on the page made explicit.
  const errorSignatures = extractErrorSignatures(
    `${challenge.symptom_description} ${challenge.problem_description}`
  );
  const socialDescription = truncate(fullDescription, 120);
  const url = absoluteUrl(`/challenges/${id}`);

  return {
    title,
    description,
    keywords: [
      ...errorSignatures,
      `${language} debugging`,
      `${category.toLowerCase()} ${language}`,
      "debugging practice",
    ],
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
      "id, title, language, bug_category, difficulty, function_name, broken_code, files, entry_file, problem_description, symptom_description, test_cases, status, hints(id, hint_order, hint_text)"
    )
    .eq("id", id)
    .order("hint_order", { referencedTable: "hints", ascending: true })
    .single();

  if (error || !challenge) {
    notFound();
  }

  // `files` carries both the broken and correct version of every file, so the
  // correct halves are stripped before this reaches the browser — same reason
  // correct_code is withheld from the student-facing payload.
  const safeChallenge = {
    ...challenge,
    files: Array.isArray(challenge.files)
      ? challenge.files.map((f) => ({ name: f.name, broken: f.broken }))
      : null,
  };

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
        challenge={safeChallenge}
        isLoggedIn={!!user}
        priorAttempts={priorAttempts}
        isBookmarked={isBookmarked}
      />
    </>
  );
}
