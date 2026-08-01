import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Keep-alive endpoint. Supabase's free tier pauses a project after 7 days of
// inactivity, so an external cron (cron-job.org, every 3 days) hits this.
//
// It deliberately runs a real query rather than just returning ok: a ping
// that only reaches Vercel would leave the *database* idle and the project
// would still be paused.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("bug_challenges")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      challenges: count ?? 0,
      db_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Non-200 so the cron service surfaces it as a failed run rather than
    // silently "succeeding" while the database is unreachable.
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err), timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
