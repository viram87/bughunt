import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { BUG_CATEGORY_VALUES } from "@/lib/constants";

export async function GET() {
  const { user } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request) {
  const { user } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { bug_category, challenges_solved, challenges_attempted } = body;

  if (!BUG_CATEGORY_VALUES.includes(bug_category)) {
    return NextResponse.json({ error: "Invalid bug_category" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_progress")
    .upsert(
      {
        user_id: user.id,
        bug_category,
        challenges_solved: challenges_solved ?? 0,
        challenges_attempted: challenges_attempted ?? 0,
        last_activity: new Date().toISOString(),
      },
      { onConflict: "user_id,bug_category" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
