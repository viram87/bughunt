// Deliberately dependency-free so it can be unit-tested in plain Node
// without the "@/" alias or any Next.js runtime.
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };

/**
 * Picks the challenge a student should do next.
 *
 * The ordering is deliberate. A category the student has *tried and failed*
 * is a stronger signal than one they've never touched — it's demonstrated
 * weakness rather than absence of data — so unfinished business comes first.
 * Only then do we push into new categories, and only then harder material.
 *
 * @param {{
 *   challenges: Array<{id,bug_category,difficulty,language}>,
 *   progress: Array<{bug_category,challenges_solved,challenges_attempted}>,
 *   solvedIds: Set<string>,
 *   attemptedIds?: Set<string>,
 * }} params
 * @returns {{challenge: object, reason: string} | null}
 */
export function pickNextChallenge({ challenges, progress = [], solvedIds, attemptedIds }) {
  const unsolved = (challenges ?? []).filter((c) => !solvedIds?.has(c.id));
  if (unsolved.length === 0) return null;

  const byCategory = new Map(progress.map((p) => [p.bug_category, p]));
  const easiestFirst = (a, b) =>
    (DIFFICULTY_RANK[a.difficulty] ?? 1) - (DIFFICULTY_RANK[b.difficulty] ?? 1);

  // 1. Something already started but not finished — least wasted context.
  const started = unsolved.filter((c) => attemptedIds?.has(c.id)).sort(easiestFirst);
  if (started.length > 0) {
    return { challenge: started[0], reason: "You started this one — pick up where you left off" };
  }

  // 2. A category with failures and no solves. Demonstrated weakness.
  const weakCategories = progress
    .filter((p) => (p.challenges_attempted ?? 0) > 0 && (p.challenges_solved ?? 0) === 0)
    .map((p) => p.bug_category);
  const weakMatch = unsolved
    .filter((c) => weakCategories.includes(c.bug_category))
    .sort(easiestFirst);
  if (weakMatch.length > 0) {
    return {
      challenge: weakMatch[0],
      reason: `You've tried ${labelFor(weakMatch[0].bug_category)} bugs but haven't cracked one yet`,
    };
  }

  // 3. A category never attempted — broaden coverage before going deeper.
  const untouched = unsolved
    .filter((c) => !byCategory.has(c.bug_category))
    .sort(easiestFirst);
  if (untouched.length > 0) {
    return {
      challenge: untouched[0],
      reason: `A bug pattern you haven't met yet: ${labelFor(untouched[0].bug_category)}`,
    };
  }

  // 4. Everything's been touched — step up the difficulty in the strongest
  //    area, since that's where they can handle a harder one.
  const solvedRank = Math.max(
    0,
    ...(challenges ?? [])
      .filter((c) => solvedIds?.has(c.id))
      .map((c) => DIFFICULTY_RANK[c.difficulty] ?? 0)
  );
  const harder = unsolved
    .filter((c) => (DIFFICULTY_RANK[c.difficulty] ?? 0) >= solvedRank)
    .sort(easiestFirst);
  if (harder.length > 0) {
    return { challenge: harder[0], reason: "Ready to step up — try a harder one" };
  }

  return { challenge: unsolved.sort(easiestFirst)[0], reason: "Next one up" };
}

function labelFor(value) {
  return String(value ?? "").replace(/_/g, " ");
}

export { DIFFICULTY_RANK };
