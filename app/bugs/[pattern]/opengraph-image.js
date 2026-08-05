import { ImageResponse } from "next/og";
import { PATTERN_BY_SLUG, BUG_PATTERNS } from "@/lib/bug-patterns";
import { SITE_NAME } from "@/lib/site";

// Per-pattern social image. These pages declare their own `openGraph`, which
// replaces the inherited one, so without this file they shared with no image
// at all. Naming the file opengraph-image attaches it automatically.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return BUG_PATTERNS.map((p) => ({ pattern: p.slug }));
}

export default async function Image({ params }) {
  const { pattern: slug } = await params;
  const pattern = PATTERN_BY_SLUG[slug];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #16161c 0%, #22223a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 3, color: "#4a52de", marginBottom: 24 }}>
          BUG PATTERN
        </div>
        <div
          style={{
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          {pattern?.headline ?? "Common bug patterns"}
        </div>

        {/* The literal error string is the thing a reader recognises instantly
            — it is what they last saw in their own terminal. */}
        {pattern?.errors?.[0] && (
          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 26,
              fontFamily: "monospace",
              color: "#a8a8c0",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              padding: "14px 20px",
            }}
          >
            {pattern.errors[0]}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 50 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#4a52de",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>{SITE_NAME}</div>
        </div>
      </div>
    ),
    size
  );
}
