// Picks one featured challenge per ISO week.
//
// Deliberately deterministic rather than stored: the same week always
// resolves to the same challenge for every visitor, with no table, no cron
// and no admin step. Adding a challenge shifts future picks but never
// changes the current week's, because the index is derived from the week
// number against a stably sorted list.

/** ISO-8601 week number. Weeks start Monday, so the pick rolls over then. */
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday determines the ISO year.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * @param {Array<{id: string}>} challenges published challenges
 * @returns {object|null} the challenge featured this week
 */
export function pickBugOfTheWeek(challenges) {
  if (!challenges || challenges.length === 0) return null;

  // Sort by id so the ordering doesn't depend on how the rows came back.
  const ordered = [...challenges].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const { year, week } = isoWeek();

  // Mixing the year in stops the cycle restarting identically each January.
  const index = (year * 53 + week) % ordered.length;
  return ordered[index];
}

/** Seconds until next Monday 00:00 UTC — used to expire the cached pick. */
export function secondsUntilNextWeek(now = new Date()) {
  const next = new Date(now);
  const daysUntilMonday = (8 - (next.getUTCDay() || 7)) % 7 || 7;
  next.setUTCDate(next.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return Math.max(60, Math.floor((next - now) / 1000));
}
