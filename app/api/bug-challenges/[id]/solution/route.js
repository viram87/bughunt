import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * The post-solve payload.
 *
 * Two tiers, because code runs in the browser and the server therefore has no
 * way to verify that a signed-OUT visitor actually solved anything:
 *
 *  - Signed in and passed (or admin): everything, including correct_code, which
 *    is what the side-by-side diff needs. The `passed` row in user_attempts is
 *    real proof of work.
 *  - Anyone else: the explanation only. Withholding the explanation from
 *    someone who just did the work is contrary to the point of the site, and
 *    the explanation teaches the *pattern* rather than handing over an answer.
 *    correct_code stays behind the proof-of-work gate, so this endpoint can
 *    never be used to harvest solutions.
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();

  const supabase = await createClient();

  let entitled = false;
  if (user) {
    if (profile?.role === "admin") {
      entitled = true;
    } else {
      const { count } = await supabase
        .from("user_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("bug_challenge_id", id)
        .eq("status", "passed");
      entitled = Boolean(count);
    }
  }

  const columns = entitled ? "correct_code, explanation, files, entry_file" : "explanation";

  // Restrict to published for everyone except admins — otherwise adding this
  // filter would break an admin previewing a draft they are still writing.
  let query = supabase.from("bug_challenges").select(columns).eq("id", id);
  if (profile?.role !== "admin") query = query.eq("status", "published");

  const { data, error } = await query.single();

  if (error) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // `entitled` tells the client whether to render the diff or a prompt to sign
  // up, so it never has to infer that from a missing field.
  return NextResponse.json({ data, entitled });
}
