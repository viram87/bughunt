import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site";

// Regenerate hourly rather than per-request: challenges change rarely, and
// this keeps crawler traffic from hitting the database every time.
export const revalidate = 3600;

export default async function sitemap() {
  const staticRoutes = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/challenges"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/login"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/signup"), changeFrequency: "yearly", priority: 0.3 },
  ].map((route) => ({ ...route, lastModified: new Date() }));

  try {
    const supabase = await createClient();
    // Anonymous read is fine here — RLS restricts this to published rows,
    // which is exactly what should be indexed.
    const { data } = await supabase
      .from("bug_challenges")
      .select("id, created_at")
      .eq("status", "published");

    const challengeRoutes = (data ?? []).map((challenge) => ({
      url: absoluteUrl(`/challenges/${challenge.id}`),
      lastModified: challenge.created_at ? new Date(challenge.created_at) : new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...challengeRoutes];
  } catch {
    // A database hiccup shouldn't produce a 500 for crawlers — serve the
    // static routes and let the next revalidation pick up the rest.
    return staticRoutes;
  }
}
