import { ImageResponse } from "next/og";

// Generated rather than shipped as a binary, so the icon stays in sync with
// the brand color and there's no asset to hand-maintain.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4a52de",
          color: "#ffffff",
          fontSize: 104,
          fontWeight: 700,
        }}
      >
        {/* A glyph rather than the SVG bug: at 180px on a home screen a
            single bold letterform stays crisper than fine strokes. */}
        B
      </div>
    ),
    { ...size }
  );
}
