import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChallengeForm } from "@/components/admin/challenge-form";

export const dynamic = "force-dynamic";

export default async function EditChallengePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  // Admins get the full row (including correct_code/explanation) — RLS and
  // the admin layout gate both already restrict who can reach this.
  const { data: challenge, error } = await supabase
    .from("bug_challenges")
    .select("*, hints(id, hint_order, hint_text)")
    .eq("id", id)
    .single();

  if (error || !challenge) notFound();

  const { hints, ...rest } = challenge;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to admin
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Edit challenge</h1>
        <p className="mt-1 text-muted-foreground">{challenge.title}</p>
      </div>

      <ChallengeForm challenge={rest} hints={hints} />
    </main>
  );
}
