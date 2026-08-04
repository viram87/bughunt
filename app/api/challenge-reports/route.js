import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { REPORT_REASON_VALUES } from "@/lib/constants";

// Reporting is open to anonymous readers on purpose — requiring an account
// would filter out the first-time visitor whose confusion is the most useful
// signal we can get. RLS allows the insert; nothing here can read reports back.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { bug_challenge_id, reason, details } = body;

  if (!bug_challenge_id || typeof bug_challenge_id !== "string") {
    return NextResponse.json({ error: "bug_challenge_id is required" }, { status: 400 });
  }
  if (!REPORT_REASON_VALUES.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  if (details != null && (typeof details !== "string" || details.length > 2000)) {
    return NextResponse.json(
      { error: "details must be a string of at most 2000 characters" },
      { status: 400 }
    );
  }

  const { user } = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase.from("challenge_reports").insert({
    bug_challenge_id,
    user_id: user?.id ?? null,
    reason,
    details: details?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// Admin-only listing. RLS enforces this too, but checking here returns a clean
// 403 rather than a confusing empty list.
export async function GET() {
  const { user, profile } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_reports")
    .select("id, bug_challenge_id, reason, details, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// Admins mark a report resolved or dismissed.
export async function PATCH(request) {
  const { user, profile } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { id, status } = body ?? {};

  if (!id || !["open", "resolved", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("challenge_reports")
    .update({ status, resolved_at: status === "open" ? null : new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
