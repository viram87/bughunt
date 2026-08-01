import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { BUG_CATEGORIES, DIFFICULTIES, LANGUAGES } from "@/lib/constants";
import { SITE_NAME } from "@/lib/site";

export const alt = "BugHunt challenge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DIFFICULTY_COLOR = {
  easy: "#4ade80",
  medium: "#fbbf24",
  hard: "#f87171",
};

function labelFor(list, value) {
  return list.find((x) => x.value === value)?.label ?? value;
}

export default async function ChallengeOgImage({ params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: challenge } = await supabase
    .from("bug_challenges")
    .select("title, language, bug_category, difficulty, problem_description")
    .eq("id", id)
    .single();

  // Generated at request time, so a challenge added through the admin panel
  // gets a correct preview card with no extra work.
  const title = challenge?.title ?? "Debugging challenge";
  const language = challenge ? labelFor(LANGUAGES, challenge.language) : "";
  const category = challenge ? labelFor(BUG_CATEGORIES, challenge.bug_category) : "";
  const difficulty = challenge ? labelFor(DIFFICULTIES, challenge.difficulty) : "";
  const accent = DIFFICULTY_COLOR[challenge?.difficulty] ?? "#8b93ff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #16161c 0%, #22223a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
          <div style={{ fontSize: 30, fontWeight: 600, color: "#c9c9d6" }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
            {[language, category].filter(Boolean).map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: "#c9c9d6",
                  border: "1px solid #3a3a52",
                  borderRadius: 999,
                  padding: "8px 22px",
                }}
              >
                {tag}
              </div>
            ))}
            {difficulty && (
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: accent,
                  border: `1px solid ${accent}`,
                  borderRadius: 999,
                  padding: "8px 22px",
                }}
              >
                {difficulty}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.1,
              // Long titles would otherwise overflow the card.
              display: "block",
              overflow: "hidden",
              maxHeight: 240,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ fontSize: 27, color: "#a5a5b8" }}>
          Find the bug · Fix it · Learn the pattern
        </div>
      </div>
    ),
    { ...size }
  );
}
