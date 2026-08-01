import { SITE_URL, absoluteUrl } from "@/lib/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, thin, or non-content routes. Keeping these out of the
        // index avoids diluting the site's quality signal with pages that
        // are either auth-gated or have nothing to rank for.
        disallow: ["/admin", "/dashboard", "/api/", "/dev/", "/auth/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
