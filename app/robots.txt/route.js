import { SITE_URL, absoluteUrl } from "@/lib/site";

// Hand-built rather than Next's robots.js helper, because that helper only
// emits the fields it knows about (allow/disallow/sitemap/host) and cannot
// carry a Content-Signal directive.
//
// Content Signals (contentsignals.org) declares how this content may be used:
//
//   search=yes    — index it and link to it. This is the whole point.
//   ai-input=yes  — an assistant may read a page to answer someone's live
//                   question. That sends readers here, so it is welcome.
//   ai-train=no   — do not absorb it into a training corpus. The challenge
//                   explanations are the part of this site that took the most
//                   work and are the reason to visit; they should not become
//                   something a model recites without anyone arriving.
//
// This is a declaration, not enforcement. Well-behaved crawlers honour it;
// others will not. It is worth stating so the preference is explicit.
const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=no";

// Private, thin, or non-content routes. Keeping these out of the index avoids
// diluting the site's quality signal with pages that are either auth-gated or
// have nothing to rank for.
const DISALLOW = ["/admin", "/dashboard", "/api/", "/auth/"];

export function GET() {
  const body = [
    `# Content preferences: ${CONTENT_SIGNAL}`,
    "# See https://contentsignals.org/",
    "",
    "User-Agent: *",
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Allow: /",
    ...DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    `Host: ${SITE_URL}`,
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Crawlers re-fetch robots.txt often; a day of caching is plenty and
      // keeps it off the serverless function for most hits.
      "Cache-Control": "public, max-age=86400",
    },
  });
}
