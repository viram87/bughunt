import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUG_CATEGORIES } from "@/lib/constants";
import { computeBadges } from "@/lib/badges";
import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const revalidate = 300;

// Reads the two public views, which expose only safe columns — the users
// table itself stays behind its own RLS.
async function loadProfile(username) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("username, name, avatar, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return null;

  const { data: progress } = await supabase
    .from("public_profile_progress")
    .select("bug_category, challenges_solved, challenges_attempted")
    .eq("username", username);

  return { profile, progress: progress ?? [] };
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const loaded = await loadProfile(username);

  if (!loaded) {
    return { title: "Profile not found", robots: { index: false, follow: false } };
  }

  const solved = loaded.progress.reduce((sum, r) => sum + (r.challenges_solved ?? 0), 0);
  const name = loaded.profile.name || loaded.profile.username;
  const title = `${name} — debugging profile`;
  const description = `${name} has fixed ${solved} ${solved === 1 ? "bug" : "bugs"} on ${SITE_NAME}, across categories like off-by-one, null access and race conditions.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/u/${username}`) },
    openGraph: { type: "profile", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicProfilePage({ params }) {
  const { username } = await params;
  const loaded = await loadProfile(username);

  if (!loaded) notFound();

  const { profile, progress } = loaded;
  const totalSolved = progress.reduce((sum, r) => sum + (r.challenges_solved ?? 0), 0);
  const totalAttempted = progress.reduce((sum, r) => sum + (r.challenges_attempted ?? 0), 0);

  // Badges come from the shared rule set, so a public profile can never
  // claim something the dashboard wouldn't. passedAttempts isn't available
  // publicly (it would leak submission history), so attempt-derived badges
  // simply stay unearned here.
  const badges = computeBadges({ userProgress: progress, passedAttempts: [] }).filter((b) => b.earned);

  const categories = BUG_CATEGORIES.map((category) => ({
    ...category,
    solved: progress.find((p) => p.bug_category === category.value)?.challenges_solved ?? 0,
  }));
  const strongest = [...categories].sort((a, b) => b.solved - a.solved).filter((c) => c.solved > 0);
  const maxSolved = Math.max(1, ...categories.map((c) => c.solved));

  const displayName = profile.name || profile.username;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: profile.username,
      url: absoluteUrl(`/u/${profile.username}`),
    },
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <JsonLd data={jsonLd} />

      <div className="flex flex-wrap items-center gap-4">
        {profile.avatar ? (
          // Remote avatars from Google — plain img avoids configuring
          // next/image remote patterns for a single decorative element.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar}
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-full border"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Bugs fixed
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{totalSolved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Challenges tried
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{totalAttempted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Patterns covered
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{strongest.length}</p>
          </CardContent>
        </Card>
      </div>

      {strongest.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-medium">Bugs fixed by pattern</h2>
          <div className="space-y-3">
            {strongest.map((category) => (
              <div key={category.value} className="grid grid-cols-[minmax(5rem,9rem)_1fr_2rem] items-center gap-3">
                <span className="truncate text-sm text-muted-foreground">{category.label}</span>
                <div className="h-2.5 rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary"
                    style={{ width: `${(category.solved / maxSolved) * 100}%` }}
                  />
                </div>
                <span className="text-right text-sm text-muted-foreground [font-variant-numeric:tabular-nums]">
                  {category.solved}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {badges.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-medium">Badges earned</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge.id} title={badge.description}>
                {badge.label}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {totalSolved === 0 && (
        <p className="mt-10 text-muted-foreground">
          No bugs fixed yet — this profile is just getting started.
        </p>
      )}

      <section className="mt-14 rounded-xl border bg-card p-6 text-center">
        <p className="font-medium">Think you can spot bugs faster?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {SITE_NAME} is free debugging practice for Python and JavaScript, in your browser.
        </p>
        <div className="mt-4">
          <Button nativeButton={false} render={<Link href="/challenges">Try it yourself</Link>} />
        </div>
      </section>
    </main>
  );
}
