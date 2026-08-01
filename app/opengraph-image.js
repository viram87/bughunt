import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 48 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#4a52de",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>{SITE_NAME}</div>
        </div>

        <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.05 }}>
          Get good at finding
        </div>
        <div
          style={{
            fontSize: 82,
            fontWeight: 700,
            letterSpacing: -2.5,
            lineHeight: 1.05,
            color: "#8b93ff",
          }}
        >
          real bugs
        </div>

        <div style={{ fontSize: 30, color: "#a5a5b8", marginTop: 36, lineHeight: 1.4 }}>
          Working code with one intentional bug. Find it, fix it, learn the pattern.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {["Python", "JavaScript", "Runs in your browser"].map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                fontSize: 24,
                color: "#c9c9d6",
                border: "1px solid #3a3a52",
                borderRadius: 999,
                padding: "10px 24px",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
