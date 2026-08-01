// Single source of truth for anything that needs the canonical site URL:
// metadata, canonicals, sitemap, robots, OG image URLs.
//
// Env-driven so moving to a custom domain later is one Vercel setting
// rather than a hunt through the codebase. VERCEL_PROJECT_PRODUCTION_URL is
// set automatically by Vercel and always points at the production domain
// (unlike VERCEL_URL, which is the per-deployment preview host).
function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "BugHunt";

export const SITE_TAGLINE = "Get good at finding real bugs";

// Kept under 155 chars: Google truncates search-result snippets around
// 150-160, and the previous 227-char version was being cut mid-sentence.
export const SITE_DESCRIPTION =
  "Free debugging practice for CS students. Fix real bugs in Python and JavaScript right in your browser, and learn the patterns behind them.";

// Social cards truncate harder than search results — X cuts around 200 and
// mobile previews often show only ~125 — so they get their own shorter copy.
export const SITE_DESCRIPTION_SHORT =
  "Fix real bugs in Python and JavaScript, right in your browser. Free debugging practice for CS students.";

/**
 * Trims to a length limit on a word boundary, with an ellipsis. Used for
 * descriptions built from author-written challenge copy, whose length we
 * don't control.
 */
export function truncate(text, max) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-—]$/, "")}…`;
}

export const KEYWORDS = [
  "debugging practice",
  "learn to debug",
  "debugging exercises",
  "find the bug",
  "python debugging practice",
  "javascript debugging practice",
  "coding practice for students",
  "computer science students",
  "fix the bug challenges",
  "off by one error",
  "debugging skills",
];

// Brand colours, kept in sync with the indigo accent in app/globals.css.
// Hardcoded here because OG image generation and manifest output can't read
// CSS custom properties.
export const BRAND = {
  primary: "#4a52de",
  primaryLight: "#7c83ee",
  background: "#0d0d0d",
  surface: "#1a1a19",
  text: "#ffffff",
  muted: "#a1a1aa",
};

/** Absolute URL for a site-relative path. Used by canonicals, sitemap, robots. */
export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
