import { ImageResponse } from "next/og";

// Must match app/icon.svg. Google picks an icon for search results and
// tends to prefer a raster like this one over an SVG favicon — so if this
// renders something other than the bug, that's the mark users see next to
// the site in search results.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BUG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="180" height="180">
  <rect width="32" height="32" rx="7" fill="#4a52de"/>
  <g stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none">
    <path d="M10.5 7.5 L13 10.5"/>
    <path d="M21.5 7.5 L19 10.5"/>
    <path d="M6.5 14.5 H9.5"/>
    <path d="M25.5 14.5 H22.5"/>
    <path d="M6.5 19 H9.5"/>
    <path d="M25.5 19 H22.5"/>
    <path d="M7.5 23.5 L10 21"/>
    <path d="M24.5 23.5 L22 21"/>
  </g>
  <ellipse cx="16" cy="17.5" rx="6.5" ry="8" fill="#ffffff"/>
  <circle cx="16" cy="10" r="3.4" fill="#ffffff"/>
</svg>`;

export default function AppleIcon() {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(BUG_SVG).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <img src={dataUri} width={180} height={180} alt="" />
      </div>
    ),
    { ...size }
  );
}
