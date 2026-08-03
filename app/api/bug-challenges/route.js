import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { LANGUAGE_VALUES, BUG_CATEGORY_VALUES, DIFFICULTY_VALUES } from "@/lib/constants";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");
  const bugCategory = searchParams.get("bug_category");
  const difficulty = searchParams.get("difficulty");

  if (language && !LANGUAGE_VALUES.includes(language)) {
    return NextResponse.json({ error: "Invalid language filter" }, { status: 400 });
  }
  if (bugCategory && !BUG_CATEGORY_VALUES.includes(bugCategory)) {
    return NextResponse.json({ error: "Invalid bug_category filter" }, { status: 400 });
  }
  if (difficulty && !DIFFICULTY_VALUES.includes(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty filter" }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("bug_challenges")
    .select(
      "id, title, language, bug_category, difficulty, problem_description, symptom_description, status, created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (language) query = query.eq("language", language);
  if (bugCategory) query = query.eq("bug_category", bugCategory);
  if (difficulty) query = query.eq("difficulty", difficulty);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request) {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title,
    language,
    bug_category,
    difficulty,
    broken_code,
    problem_description,
    symptom_description,
    correct_code,
    test_cases,
    explanation,
    status,
    function_name,
    files,
    entry_file,
  } = body;

  if (
    !title ||
    !LANGUAGE_VALUES.includes(language) ||
    !BUG_CATEGORY_VALUES.includes(bug_category) ||
    !DIFFICULTY_VALUES.includes(difficulty) ||
    !broken_code ||
    !problem_description ||
    !symptom_description ||
    !correct_code ||
    !explanation ||
    // The CodeRunner calls function_name(*input) — without it a challenge is
    // unrunnable, so it's required even though the column defaults to ''.
    !function_name
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  // Multi-file challenges must name an entry file that actually exists —
  // otherwise the worker fails at run time, which is far harder to diagnose
  // than a 400 here.
  if (files != null) {
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files must be a non-empty array" }, { status: 400 });
    }
    if (files.some((f) => !f?.name)) {
      return NextResponse.json({ error: "Every file needs a name" }, { status: 400 });
    }
    if (!entry_file || !files.some((f) => f.name === entry_file)) {
      return NextResponse.json(
        { error: "entry_file must match one of the file names" },
        { status: 400 }
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bug_challenges")
    .insert({
      title,
      language,
      bug_category,
      difficulty,
      broken_code,
      problem_description,
      symptom_description,
      correct_code,
      test_cases: test_cases ?? [],
      explanation,
      status: status ?? "draft",
      function_name,
      files: files ?? null,
      entry_file: files ? entry_file : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
