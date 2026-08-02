import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { AttemptTimeline } from "@/components/attempt-timeline";

export const dynamic = "force-dynamic";

// Personal history — nothing here should ever be indexed.
export const metadata = {
  title: "Your attempts",
  robots: { index: false, follow: false },
};

export default async function AttemptsPage({ params }) {
  const { id } = await params;
  const { user } = await getCurrentUser();

  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: challenge }, { data: attempts }] = await Promise.all([
    supabase
      .from("bug_challenges")
      .select("id, title, language, broken_code")
      .eq("id", id)
      .single(),
    // RLS already restricts this to the caller's own rows.
    supabase
      .from("user_attempts")
      .select("id, submitted_code, status, hints_used, time_taken_seconds, attempted_at, attempt_number")
      .eq("user_id", user.id)
      .eq("bug_challenge_id", id)
      .order("attempt_number", { ascending: true }),
  ]);

  if (!challenge) notFound();

  const history = attempts ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Link
        href={`/challenges/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Back to the challenge
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">How you solved it</h1>
        <p className="mt-1 text-muted-foreground">{challenge.title}</p>
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            No attempts recorded yet. Run this challenge and your history shows up here.
          </p>
        </div>
      ) : (
        <AttemptTimeline
          attempts={history}
          language={challenge.language}
          brokenCode={challenge.broken_code}
        />
      )}
    </main>
  );
}
