// Single source of truth for anything that needs the canonical site URL —
// metadata, canonicals, sitemap, robots, OG image URLs. Env-driven so moving
// to a custom domain later is one Vercel setting, not a code change.
//
// Fallback order matters. NEXT_PUBLIC_VERCEL_URL is deliberately NOT used:
// it's the per-deployment URL (bughunt-a1b2c3.vercel.app), so canonicals and
// sitemap entries would differ on every deploy and preview builds would
// advertise themselves as canonical — duplicate-content territory.
// VERCEL_PROJECT_PRODUCTION_URL is the stable production domain instead.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ||
  "http://localhost:3000";

export const SITE_NAME = "BugHunt";

export const SITE_TAGLINE = "Get good at finding real bugs";

export const SITE_DESCRIPTION =
  "Free debugging practice for CS students. Every challenge is working code with one real, intentional bug — find it, fix it, and learn the pattern so you spot it next time. Python and JavaScript, running entirely in your browser.";

export const KEYWORDS = [
  "debugging practice",
  "learn to debug",
  "debugging exercises",
  "find the bug",
  "python debugging",
  "javascript debugging",
  "coding practice",
  "computer science students",
  "programming exercises",
  "fix the bug challenges",
];

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
