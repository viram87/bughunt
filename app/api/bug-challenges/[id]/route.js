import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const STUDENT_SAFE_COLUMNS =
  "id, title, language, bug_category, difficulty, function_name, broken_code, files, entry_file, problem_description, symptom_description, test_cases, status, created_by, created_at, hints(id, hint_order, hint_text)";

export async function GET(request, { params }) {
  const { id } = await params;
  const { profile } = await getCurrentUser();
  const supabase = await createClient();

  // correct_code/explanation are withheld here so they never show up in the
  // network tab before a student has actually solved the challenge — see
  // GET /api/bug-challenges/[id]/solution. Admins get the full row since
  // they're the ones authoring/reviewing it.
  const columns = profile?.role === "admin" ? "*, hints(id, hint_order, hint_text)" : STUDENT_SAFE_COLUMNS;

  // RLS restricts this to published challenges unless the caller is an
  // admin or the challenge's creator.
  const { data, error } = await supabase
    .from("bug_challenges")
    .select(columns)
    .eq("id", id)
    .order("hint_order", { referencedTable: "hints", ascending: true })
    .single();

  if (error) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Admins get the raw row; everyone else gets the `correct` half of each
  // file removed, the same way correct_code is withheld.
  const safe =
    profile?.role === "admin" || !Array.isArray(data.files)
      ? data
      : { ...data, files: data.files.map((f) => ({ name: f.name, broken: f.broken })) };

  return NextResponse.json({ data: safe });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bug_challenges")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bug_challenges").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
