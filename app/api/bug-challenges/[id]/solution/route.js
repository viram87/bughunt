import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// Only reachable once the caller has actually solved the challenge (or is
// an admin) — keeps correct_code/explanation out of reach until then.
export async function GET(request, { params }) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = await createClient();

  if (profile?.role !== "admin") {
    const { count } = await supabase
      .from("user_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("bug_challenge_id", id)
      .eq("status", "passed");

    if (!count) {
      return NextResponse.json({ error: "Solve the challenge first" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("bug_challenges")
    .select("correct_code, explanation")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
