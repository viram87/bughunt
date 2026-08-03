"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { validateChallenge } from "@/lib/challenge-validation";
import { LANGUAGES, BUG_CATEGORIES, DIFFICULTIES } from "@/lib/constants";
import { TestCaseEditor, toTestCases, toEditorRows } from "@/components/admin/test-case-editor";
import { MutationSuggestions } from "@/components/admin/mutation-suggestions";
import { FileSetEditor } from "@/components/admin/file-set-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Monaco touches `window` at import time — same ssr:false guard as the
// student-facing workspace.
const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.Editor), { ssr: false });

const EMPTY = {
  title: "",
  language: "python",
  bug_category: "off_by_one",
  difficulty: "easy",
  function_name: "",
  problem_description: "",
  symptom_description: "",
  explanation: "",
  broken_code: "",
  correct_code: "",
};

function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ResultList({ title, ok, run }) {
  return (
    <div className="rounded-lg border p-3">
      <p className={`mb-2 flex items-center gap-1.5 text-sm font-medium ${ok ? "text-success" : "text-destructive"}`}>
        {ok ? <CheckCircle2Icon className="size-4" /> : <XCircleIcon className="size-4" />}
        {title}
      </p>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {run.results.map((r, i) => (
          <li key={i}>
            Test {i + 1}:{" "}
            {r.skipped
              ? "skipped"
              : r.timedOut
              ? "timed out"
              : r.error
              ? `error — ${r.error}`
              : r.passed
              ? "passed"
              : `got ${JSON.stringify(r.actual)}, expected ${JSON.stringify(r.expected)}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChallengeForm({ challenge, hints: initialHints }) {
  const router = useRouter();
  const isEdit = Boolean(challenge?.id);

  const [form, setForm] = useState(() => ({ ...EMPTY, ...(challenge ?? {}) }));
  const [rows, setRows] = useState(() => toEditorRows(challenge?.test_cases));
  const [hints, setHints] = useState(() => {
    const sorted = [...(initialHints ?? [])].sort((a, b) => a.hint_order - b.hint_order);
    return [0, 1, 2].map((i) => sorted[i]?.hint_text ?? "");
  });

  // Multi-file challenges keep their own file set; single-file ones keep
  // using broken_code/correct_code exactly as before.
  const [multiFile, setMultiFile] = useState(() => Array.isArray(challenge?.files) && challenge.files.length > 0);
  const [files, setFiles] = useState(
    () => challenge?.files ?? [{ name: "main.py", broken: "", correct: "" }]
  );
  const [entryFile, setEntryFile] = useState(challenge?.entry_file ?? "main.py");

  const [validation, setValidation] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Any edit invalidates a prior passing run — otherwise an author could
    // validate, then change the code, then publish something untested.
    setValidation(null);
  }

  const testCases = toTestCases(rows);
  // Every file needs a name, the entry file has to be one of them, and both
  // versions of the entry file need content — the runner resolves the
  // challenge function from there, so an empty entry file can't run at all.
  const filesReady =
    files.length > 0 &&
    files.every((f) => f.name.trim() && f.broken?.trim() && f.correct?.trim()) &&
    files.some((f) => f.name === entryFile);
  const canTest =
    Boolean(form.function_name) &&
    (multiFile ? filesReady : Boolean(form.broken_code && form.correct_code)) &&
    testCases !== null &&
    testCases.length > 0;

  async function handleTest() {
    setTesting(true);
    setError(null);
    setValidation(null);
    try {
      const result = await validateChallenge(
        {
          language: form.language,
          functionName: form.function_name,
          brokenCode: form.broken_code,
          correctCode: form.correct_code,
          brokenFiles: multiFile ? files.map((f) => ({ name: f.name, code: f.broken })) : null,
          correctFiles: multiFile ? files.map((f) => ({ name: f.name, code: f.correct })) : null,
          entryFile: multiFile ? entryFile : null,
          testCases,
        },
        setTestStatus
      );
      setValidation(result);
    } catch (err) {
      setError(err?.message ?? String(err));
    } finally {
      setTesting(false);
      setTestStatus(null);
    }
  }

  async function handleSave(status) {
    if (status === "published" && !validation?.ok) {
      setError("Run “Test this challenge” and get a passing result before publishing.");
      return;
    }
    if (testCases === null) {
      setError("Fix the invalid JSON in the test cases before saving.");
      return;
    }

    setSaving(true);
    setError(null);

    const comment = form.language === "python" ? "#" : "//";
    const placeholderSource = `${comment} see ${entryFile} and the other files in this challenge`;

    const payload = {
      ...form,
      status,
      test_cases: testCases,
      files: multiFile ? files : null,
      entry_file: multiFile ? entryFile : null,
      // The columns are NOT NULL, so multi-file challenges still need a
      // placeholder here; the file set is what actually gets executed.
      // broken_code/correct_code are NOT NULL, but multi-file challenges keep
      // their real source in `files`. Comment syntax has to match the
      // language or the placeholder itself becomes a syntax error.
      broken_code: multiFile ? placeholderSource : form.broken_code,
      correct_code: multiFile ? placeholderSource : form.correct_code,
    };
    delete payload.id;
    delete payload.created_at;
    delete payload.created_by;
    delete payload.hints;

    try {
      const res = isEdit
        ? await fetch(`/api/bug-challenges/${challenge.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/bug-challenges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      const savedId = isEdit ? challenge.id : json.data.id;

      const hintsRes = await fetch(`/api/bug-challenges/${savedId}/hints`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hints }),
      });
      if (!hintsRes.ok) {
        const hintsJson = await hintsRes.json();
        throw new Error(hintsJson.error ?? "Challenge saved, but hints failed to save");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err?.message ?? String(err));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title">
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>

          <Field
            label="Function name"
            htmlFor="function_name"
            hint="The function the tests call, e.g. sum_range"
          >
            <Input
              id="function_name"
              className="font-mono"
              value={form.function_name}
              onChange={(e) => set("function_name", e.target.value)}
            />
          </Field>

          <Field label="Language">
            <Select value={form.language} onValueChange={(v) => set("language", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Difficulty">
            <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Bug category">
            <Select value={form.bug_category} onValueChange={(v) => set("bug_category", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUG_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="What the code should do"
              htmlFor="problem_description"
              hint="Shown to the student — describe intent, not the bug."
            >
              <Input
                id="problem_description"
                value={form.problem_description}
                onChange={(e) => set("problem_description", e.target.value)}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="What goes wrong"
              htmlFor="symptom_description"
              hint="The symptom only — never the bug's location."
            >
              <Input
                id="symptom_description"
                value={form.symptom_description}
                onChange={(e) => set("symptom_description", e.target.value)}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Explanation"
              htmlFor="explanation"
              hint="Shown after solving — explain the bug pattern and why it happens."
            >
              <textarea
                id="explanation"
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={form.explanation}
                onChange={(e) => set("explanation", e.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Code</CardTitle>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={multiFile}
                className="size-4 accent-[var(--primary)]"
                onChange={(e) => {
                  const on = e.target.checked;
                  setMultiFile(on);
                  setValidation(null);
                  if (on && files.length === 1 && !files[0].broken && !files[0].correct) {
                    // Carry any single-file work across rather than losing it.
                    const name = form.language === "python" ? "main.py" : "main.js";
                    setFiles([{ name, broken: form.broken_code, correct: form.correct_code }]);
                    setEntryFile(name);
                  }
                }}
              />
              Split across multiple files
            </label>
          </div>
          {multiFile && (
            <p className="text-sm text-muted-foreground">
              For the harder tier: put the bug in one file and let the symptom show up in another.
            </p>
          )}
        </CardHeader>
        {multiFile ? (
          <CardContent className="space-y-3">
            <FileSetEditor
              files={files}
              entryFile={entryFile}
              language={form.language}
              onChange={(next) => {
                setFiles(next);
                setValidation(null);
              }}
              onEntryChange={(name) => {
                setEntryFile(name);
                setValidation(null);
              }}
            />
            <MutationSuggestions
              correctCode={files.find((f) => f.name === entryFile)?.correct ?? ""}
              language={form.language}
              onApply={(suggestion) => {
                setFiles((prev) =>
                  prev.map((f) => (f.name === entryFile ? { ...f, broken: suggestion.broken } : f))
                );
                set("bug_category", suggestion.category);
              }}
            />
          </CardContent>
        ) : (
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Broken code (what students see)</Label>
            <div className="overflow-hidden rounded-lg border">
              <Editor
                height="260px"
                language={form.language}
                value={form.broken_code}
                onChange={(v) => set("broken_code", v ?? "")}
                theme="vs-dark"
                options={{ minimap: { enabled: false }, fontSize: 13 }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Correct code (reference solution)</Label>
            <div className="overflow-hidden rounded-lg border">
              <Editor
                height="260px"
                language={form.language}
                value={form.correct_code}
                onChange={(v) => set("correct_code", v ?? "")}
                theme="vs-dark"
                options={{ minimap: { enabled: false }, fontSize: 13 }}
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <MutationSuggestions
              correctCode={form.correct_code}
              language={form.language}
              onApply={(suggestion) => {
                set("broken_code", suggestion.broken);
                set("bug_category", suggestion.category);
              }}
            />
          </div>
        </CardContent>
        )}
      </Card>

      <Card>
        <CardContent className="pt-6">
          <TestCaseEditor
            testCases={rows}
            onChange={(next) => {
              setRows(next);
              setValidation(null);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hints.map((hint, index) => (
            <Field
              key={index}
              label={`Hint ${index + 1}`}
              htmlFor={`hint-${index}`}
              hint={
                [
                  "A vague nudge — point at the behaviour, not the code.",
                  "Point to the region of code without naming the fix.",
                  "Nearly give it away, without writing the exact fix.",
                ][index]
              }
            >
              <Input
                id={`hint-${index}`}
                value={hint}
                onChange={(e) =>
                  setHints((prev) => prev.map((h, i) => (i === index ? e.target.value : h)))
                }
              />
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={handleTest} disabled={!canTest || testing}>
              {testing
                ? testStatus === "loading-runtime"
                  ? "Loading runtime…"
                  : "Running…"
                : "Test this challenge"}
            </Button>
            {!canTest && (
              <p className="text-sm text-muted-foreground">
                Needs a function name, both code versions, and at least one valid test case.
              </p>
            )}
          </div>

          {validation && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultList
                  title="Broken code fails (as it should)"
                  ok={validation.broken.ok}
                  run={validation.broken.run}
                />
                <ResultList
                  title="Correct code passes"
                  ok={validation.correct.ok}
                  run={validation.correct.run}
                />
              </div>
              {validation.problems.map((problem) => (
                <p key={problem} className="text-sm text-destructive">
                  {problem}
                </p>
              ))}
              {validation.ok && (
                <p className="text-sm text-success">
                  Looks good — this challenge is ready to publish.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => handleSave("published")} disabled={saving || !validation?.ok}>
          {saving ? "Saving…" : "Save & publish"}
        </Button>
        <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
          Save as draft
        </Button>
        <Button variant="ghost" onClick={() => router.push("/admin")} disabled={saving}>
          Cancel
        </Button>
      </div>

      {!validation?.ok && (
        <p className="text-xs text-muted-foreground">
          Publishing is unlocked by a passing validation run. Drafts can always be saved.
        </p>
      )}
    </div>
  );
}
