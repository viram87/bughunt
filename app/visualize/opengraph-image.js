import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Declaring `openGraph` in a page's metadata REPLACES the inherited object, so
// these pages lost the site-wide image and shared as a bare link. A file named
// opengraph-image is attached automatically and can't be forgotten the next
// time someone edits the metadata.
export const alt = "Python visualizer — step through your code line by line";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          FREE · RUNS IN YOUR BROWSER
        </div>
        {/* Satori requires an explicit display on any element with more than
            one child, so the two lines are flex children rather than a <br />. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          <span>Step through Python</span>
          <span>line by line</span>
        </div>
        <div style={{ fontSize: 30, color: "#a8a8c0", marginTop: 28, maxWidth: 900 }}>
          See every variable at every step. No install, no account.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 56 }}>
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
