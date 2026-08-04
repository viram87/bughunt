import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { LANGUAGE_VALUES, BUG_CATEGORY_VALUES, DIFFICULTY_VALUES } from "@/lib/constants";
import { buildSearchFilter } from "@/lib/challenge-search";

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

  // Pagination is opt-in: without ?limit the response is the full list, which
  // is what the existing callers expect. The challenge grid passes limit and
  // offset to load more as the reader scrolls.
  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");
  const limit = rawLimit === null ? null : Number.parseInt(rawLimit, 10);
  const offset = rawOffset === null ? 0 : Number.parseInt(rawOffset, 10);
  const q = (searchParams.get("q") ?? "").trim();

  if (rawLimit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    return NextResponse.json({ error: "limit must be between 1 and 100" }, { status: 400 });
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return NextResponse.json({ error: "offset must be a non-negative integer" }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("bug_challenges")
    .select(
      "id, title, language, bug_category, difficulty, problem_description, symptom_description, status, created_at",
      { count: "exact" }
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    // created_at is not unique — the seeded batches share timestamps to the
    // second. Ordering by a non-unique column leaves ties in an arbitrary
    // order that can differ between queries, so paginating shuffled rows
    // across page boundaries: two challenges were returned twice and two were
    // never returned at all. The id tiebreaker makes the sort total, which is
    // what pagination needs to be correct.
    .order("id", { ascending: false });

  if (language) query = query.eq("language", language);
  if (bugCategory) query = query.eq("bug_category", bugCategory);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (q) query = query.or(buildSearchFilter(q));

  if (limit !== null) query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count ?? data.length,
    // Derived from the row count rather than the returned length, so a final
    // page that happens to be exactly `limit` long doesn't report more to come.
    hasMore: limit !== null && count !== null ? offset + data.length < count : false,
  });
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
