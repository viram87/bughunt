import Link from "next/link";
import { ChallengeForm } from "@/components/admin/challenge-form";

export default function NewChallengePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to admin
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">New challenge</h1>
        <p className="mt-1 text-muted-foreground">
          Validation must pass before this can be published.
        </p>
      </div>

      <ChallengeForm />
    </main>
  );
}
