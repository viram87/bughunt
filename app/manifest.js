import { SITE_NAME, SITE_DESCRIPTION_SHORT } from "@/lib/site";

export default function manifest() {
  return {
    name: `${SITE_NAME} — debugging practice`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION_SHORT,
    start_url: "/challenges",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#4a52de",
    orientation: "any",
    categories: ["education", "developer"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
