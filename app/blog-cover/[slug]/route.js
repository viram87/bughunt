import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Cover images for the dev.to posts, generated on demand and served from our
// own domain so the drafts can reference a stable URL with no image hosting,
// no design tool and nothing to keep in sync by hand.
//
// 1000x420 is dev.to's recommended cover ratio; anything else gets cropped.
export const contentType = "image/png";

const SIZE = { width: 1000, height: 420 };

const COVERS = {
  pyodide: {
    kicker: "PYODIDE · WEBASSEMBLY",
    title: "4 things that surprised me running Python in the browser",
    accent: "#4a52de",
    // Rendered as a code strip along the bottom — the single most quotable
    // line from the post, which is what makes someone stop scrolling.
    code: "pyodide.toPy(null) is None  →  False",
  },
  debugging: {
    kicker: "LEARNING TO DEBUG",
    title: "Nobody teaches you to debug",
    // Short titles leave a dead band in the middle of a 1000x420 canvas, so
    // this fills it. The pyodide cover wraps to two lines and doesn't need one.
    subtitle: "Courses grade you on writing code. Almost none grade you on fixing it.",
    accent: "#d2604a",
    code: "IndexError: string index out of range",
  },
};

export function generateStaticParams() {
  return Object.keys(COVERS).map((slug) => ({ slug }));
}

export async function GET(request, { params }) {
  const { slug } = await params;
  const cover = COVERS[slug];
  if (!cover) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #16161c 0%, #22223a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 3,
              fontWeight: 600,
              color: cover.accent,
              marginBottom: 20,
            }}
          >
            {cover.kicker}
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 820,
            }}
          >
            {cover.title}
          </div>
          {cover.subtitle && (
            <div style={{ fontSize: 26, color: "#a8a8c0", marginTop: 22, maxWidth: 760 }}>
              {cover.subtitle}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontFamily: "monospace",
              color: "#a8a8c0",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              padding: "12px 18px",
            }}
          >
            {cover.code}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: cover.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              B
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>{SITE_NAME}</div>
          </div>
        </div>
      </div>
    ),
    SIZE
  );
}
