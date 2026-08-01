import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// Replaces all hints for a challenge in one call. A challenge has exactly
// three ordered hints edited together, so wholesale replacement matches the
// UI and sidesteps the unique (bug_challenge_id, hint_order) constraint that
// makes partial updates fiddly.
export async function PUT(request, { params }) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { hints } = await request.json();

  if (!Array.isArray(hints)) {
    return NextResponse.json({ error: "hints must be an array" }, { status: 400 });
  }
  if (hints.length > 3) {
    return NextResponse.json({ error: "At most 3 hints are allowed" }, { status: 400 });
  }

  const rows = hints
    .map((text, index) => ({
      bug_challenge_id: id,
      hint_order: index + 1,
      hint_text: typeof text === "string" ? text.trim() : "",
    }))
    // Blank hints are dropped rather than stored, so an author can leave
    // hint 3 empty without creating an empty row students would see.
    .filter((row) => row.hint_text.length > 0);

  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("hints").delete().eq("bug_challenge_id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data, error } = await supabase.from("hints").insert(rows).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
