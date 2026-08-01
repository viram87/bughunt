import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .select("id, bug_challenge_id, created_at, bug_challenges(id, title, language, bug_category, difficulty)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { bug_challenge_id } = await request.json();
  if (!bug_challenge_id) {
    return NextResponse.json({ error: "bug_challenge_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  // upsert rather than insert: the (user_id, bug_challenge_id) unique
  // constraint would otherwise 409 on a double-click.
  const { data, error } = await supabase
    .from("bookmarks")
    .upsert({ user_id: user.id, bug_challenge_id }, { onConflict: "user_id,bug_challenge_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request) {
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
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("bug_challenge_id", bugChallengeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
