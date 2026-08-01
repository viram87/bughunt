import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BUG_CATEGORIES, DIFFICULTIES } from "@/lib/constants";
import { DeleteChallengeButton } from "@/components/admin/delete-challenge-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_CLASS = {
  published: "border-transparent bg-success/12 text-success",
  draft: "border-transparent bg-muted text-muted-foreground",
  pending_review: "border-transparent bg-warning/15 text-warning-foreground dark:text-warning",
};

function label(list, value) {
  return list.find((x) => x.value === value)?.label ?? value;
}

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("challenge_analytics")
    .select("*")
    .order("title", { ascending: true });

  const analytics = rows ?? [];

  // Most-failed first, but only challenges anyone has actually attempted —
  // failure_rate_pct is null when untouched, which is why the view
  // distinguishes "no data" from zero.
  const mostFailed = [...analytics]
    .filter((r) => r.total_attempts > 0)
    .sort((a, b) => (b.failed_attempts ?? 0) - (a.failed_attempts ?? 0))
    .slice(0, 5);

  const byCategory = Object.values(
    analytics.reduce((acc, row) => {
      const key = row.bug_category;
      acc[key] ??= { bug_category: key, attempts: 0, challenges: 0 };
      acc[key].attempts += Number(row.total_attempts ?? 0);
      acc[key].challenges += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.attempts - a.attempts);

  const totalAttempts = analytics.reduce((sum, r) => sum + Number(r.total_attempts ?? 0), 0);
  const publishedCount = analytics.filter((r) => r.status === "published").length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-muted-foreground">
            {analytics.length} challenges · {publishedCount} published · {totalAttempts} attempts
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/challenges/new">
          <PlusIcon /> New challenge
        </Link>} />
      </div>

      {error && (
        <p className="mb-6 text-sm text-destructive">
          Failed to load analytics: {error.message}. Has migration 0003 been run?
        </p>
      )}

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most failed</CardTitle>
            <p className="text-sm text-muted-foreground">
              High failure counts can mean a genuinely hard challenge — or a broken test case.
            </p>
          </CardHeader>
          <CardContent>
            {mostFailed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attempts recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {mostFailed.map((row) => (
                  <li key={row.bug_challenge_id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/admin/challenges/${row.bug_challenge_id}`}
                      className="truncate hover:text-primary hover:underline"
                    >
                      {row.title}
                    </Link>
                    <span className="shrink-0 text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {row.failed_attempts} failed · {row.failure_rate_pct}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attempts by category</CardTitle>
            <p className="text-sm text-muted-foreground">Which bug patterns students engage with.</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {byCategory.map((row) => (
                <li key={row.bug_category} className="flex items-center justify-between gap-3">
                  <span>{label(BUG_CATEGORIES, row.bug_category)}</span>
                  <span className="text-muted-foreground [font-variant-numeric:tabular-nums]">
                    {row.attempts} attempts · {row.challenges} challenges
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All challenges</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Title</th>
                <th className="py-2 font-medium">Language</th>
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 font-medium">Difficulty</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Attempts</th>
                <th className="py-2 text-right font-medium">Solved by</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {analytics.map((row) => (
                <tr key={row.bug_challenge_id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/admin/challenges/${row.bug_challenge_id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.language}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {label(BUG_CATEGORIES, row.bug_category)}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {label(DIFFICULTIES, row.difficulty)}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge className={STATUS_CLASS[row.status]}>{row.status}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-right text-muted-foreground [font-variant-numeric:tabular-nums]">
                    {row.total_attempts}
                  </td>
                  <td className="py-2 pr-3 text-right text-muted-foreground [font-variant-numeric:tabular-nums]">
                    {row.users_solved}
                  </td>
                  <td className="py-2 text-right">
                    <DeleteChallengeButton id={row.bug_challenge_id} title={row.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
