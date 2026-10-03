import { BUG_CATEGORIES } from "@/lib/constants";

// Thresholds live here so they can be retuned in one place as the challenge
// library grows (Phases 5-6 add authoring + community contributions).
// Current library: 104 challenges, 12-14 per category — thresholds
// tuned so the first badges come quickly but later ones take real work.
export const TOTAL_MILESTONES = [5, 10, 25, 50, 100];
export const CATEGORY_THRESHOLD = 5;

/**
 * Derives badges from progress/attempt data — no badges table needed.
 *
 * @param {{
 *   userProgress: Array<{ bug_category: string, challenges_solved: number }>,
 *   passedAttempts: Array<{ hints_used: number, bug_challenges?: { difficulty: string } }>,
 * }} params
 * @returns {Array<{ id: string, label: string, description: string, earned: boolean }>}
 */
export function computeBadges({ userProgress = [], passedAttempts = [] }) {
  const totalSolved = userProgress.reduce((sum, row) => sum + (row.challenges_solved ?? 0), 0);
  const badges = [];

  badges.push({
    id: "first-fix",
    label: "First fix",
    description: "Solve your first challenge",
    earned: totalSolved >= 1,
  });

  for (const milestone of TOTAL_MILESTONES) {
    badges.push({
      id: `solved-${milestone}`,
      label: `${milestone} solved`,
      description: `Solve ${milestone} challenges`,
      earned: totalSolved >= milestone,
    });
  }

  for (const category of BUG_CATEGORIES) {
    const solved = userProgress.find((row) => row.bug_category === category.value)?.challenges_solved ?? 0;
    badges.push({
      id: `category-${category.value}`,
      label: `${category.label} hunter`,
      description: `Solve ${CATEGORY_THRESHOLD} ${category.label.toLowerCase()} challenges`,
      earned: solved >= CATEGORY_THRESHOLD,
    });
  }

  badges.push({
    id: "hard-no-hints",
    label: "No hints needed",
    description: "Solve a hard challenge without using any hints",
    earned: passedAttempts.some(
      (attempt) => attempt.bug_challenges?.difficulty === "hard" && (attempt.hints_used ?? 0) === 0
    ),
  });

  return badges;
}

/**
 * Consecutive calendar days (UTC) with at least one attempt, counting back
 * from today. A gap of a full day ends the streak; being active yesterday
 * but not yet today still counts, so the streak doesn't appear to reset
 * just because the student hasn't started today's session.
 */
export function computeStreak(attempts = []) {
  if (attempts.length === 0) return 0;

  const days = new Set(attempts.map((a) => new Date(a.attempted_at).toISOString().slice(0, 10)));

  const MS_PER_DAY = 86_400_000;
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = new Date(today.getTime() - MS_PER_DAY).toISOString().slice(0, 10);

  let cursor;
  if (days.has(todayKey)) {
    cursor = today;
  } else if (days.has(yesterdayKey)) {
    cursor = new Date(today.getTime() - MS_PER_DAY);
  } else {
    return 0;
  }

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return streak;
}

/**
 * Average hints used across each distinct challenge's FIRST passing attempt.
 * Averaging every attempt would be skewed by failed retries, which don't
 * represent how much help the student ultimately needed to solve it.
 */
export function computeAverageHints(passedAttempts = []) {
  const firstPassByChallenge = new Map();

  for (const attempt of passedAttempts) {
    const existing = firstPassByChallenge.get(attempt.bug_challenge_id);
    if (!existing || (attempt.attempt_number ?? 0) < (existing.attempt_number ?? 0)) {
      firstPassByChallenge.set(attempt.bug_challenge_id, attempt);
    }
  }

  if (firstPassByChallenge.size === 0) return 0;

  const total = [...firstPassByChallenge.values()].reduce((sum, a) => sum + (a.hints_used ?? 0), 0);
  return total / firstPassByChallenge.size;
}
