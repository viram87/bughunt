import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const STATUS_VALUES = ["passed", "failed", "in_progress"];

export async function GET(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bugChallengeId = searchParams.get("bug_challenge_id");
  if (!bugChallengeId) {
    return NextResponse.json({ error: "bug_challenge_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("bug_challenge_id", bugChallengeId)
    .order("attempt_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// Records one "Run & Check" submission and, the first time this user
// attempts/solves this specific challenge, bumps the matching
// user_progress row for its bug_category. attempt_number and the progress
// counters both track distinct challenges, not button clicks — so we look
// at prior attempts before deciding what to increment.
export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { bug_challenge_id, submitted_code, status, hints_used, time_taken_seconds } = body;

  if (!bug_challenge_id || !STATUS_VALUES.includes(status)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: challenge, error: challengeError } = await supabase
    .from("bug_challenges")
    .select("bug_category")
    .eq("id", bug_challenge_id)
    .single();

  if (challengeError) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const { data: priorAttempts, error: priorError } = await supabase
    .from("user_attempts")
    .select("status")
    .eq("user_id", user.id)
    .eq("bug_challenge_id", bug_challenge_id);

  if (priorError) {
    return NextResponse.json({ error: priorError.message }, { status: 500 });
  }

  const attempt_number = (priorAttempts?.length ?? 0) + 1;
  const alreadySolvedBefore = (priorAttempts ?? []).some((a) => a.status === "passed");

  const { data: attempt, error: insertError } = await supabase
    .from("user_attempts")
    .insert({
      user_id: user.id,
      bug_challenge_id,
      submitted_code,
      status,
      hints_used: hints_used ?? 0,
      time_taken_seconds: time_taken_seconds ?? null,
      attempt_number,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const isFirstAttempt = attempt_number === 1;
  const isFirstSolve = status === "passed" && !alreadySolvedBefore;

  if (isFirstAttempt || isFirstSolve) {
    const { data: progressRow } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("bug_category", challenge.bug_category)
      .maybeSingle();

    await supabase.from("user_progress").upsert(
      {
        user_id: user.id,
        bug_category: challenge.bug_category,
        challenges_attempted: (progressRow?.challenges_attempted ?? 0) + (isFirstAttempt ? 1 : 0),
        challenges_solved: (progressRow?.challenges_solved ?? 0) + (isFirstSolve ? 1 : 0),
        last_activity: new Date().toISOString(),
      },
      { onConflict: "user_id,bug_category" }
    );
  }

  return NextResponse.json({ data: attempt }, { status: 201 });
}
