import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site";
import { BUG_PATTERNS } from "@/lib/bug-patterns";
import { ERROR_PAGES } from "@/lib/error-pages";

// Regenerate hourly rather than per-request: challenges change rarely, and
// this keeps crawler traffic from hitting the database every time.
export const revalidate = 3600;

export default async function sitemap() {
  const staticRoutes = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/challenges"), changeFrequency: "daily", priority: 0.9 },
    // A standalone tool with its own search intent ("python visualizer"),
    // so it ranks alongside the main sections rather than below them.
    { url: absoluteUrl("/visualize"), changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/errors"), changeFrequency: "weekly", priority: 0.9 },
    ...ERROR_PAGES.map((e) => ({
      url: absoluteUrl(`/errors/${e.slug}`),
      changeFrequency: "monthly",
      priority: 0.85,
    })),
    { url: absoluteUrl("/bugs"), changeFrequency: "weekly", priority: 0.9 },
    // The landing pages are the main organic entry points, so they rank
    // alongside /challenges rather than below the legal pages.
    ...BUG_PATTERNS.map((p) => ({
      url: absoluteUrl(`/bugs/${p.slug}`),
      changeFrequency: "weekly",
      priority: 0.85,
    })),
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.4 },
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

    // Public profiles are opt-in and genuinely indexable content, so they
    // belong in the sitemap. The view already filters to opted-in users.
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("username, created_at");

    const profileRoutes = (profiles ?? []).map((profile) => ({
      url: absoluteUrl(`/u/${profile.username}`),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    return [...staticRoutes, ...challengeRoutes, ...profileRoutes];
  } catch {
    // A database hiccup shouldn't produce a 500 for crawlers — serve the
    // static routes and let the next revalidation pick up the rest.
    return staticRoutes;
  }
}
