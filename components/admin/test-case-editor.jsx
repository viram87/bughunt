"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Test cases are { input: [...args], expected_output: any }. Both sides are
// arbitrary JSON, so each field is raw JSON text parsed on change — the
// parsed value is what gets saved, and parse errors surface inline instead
// of silently persisting malformed data.

export function parseJsonField(text) {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (err) {
    return { value: null, error: err.message };
  }
}

export function TestCaseEditor({ testCases, onChange }) {
  function update(index, patch) {
    onChange(testCases.map((tc, i) => (i === index ? { ...tc, ...patch } : tc)));
  }

  function add() {
    onChange([...testCases, { inputText: "[]", expectedText: "null" }]);
  }

  function remove(index) {
    onChange(testCases.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Test cases</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <PlusIcon /> Add case
        </Button>
      </div>

      {testCases.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No test cases yet. A challenge needs at least one to be validated.
        </p>
      )}

      {testCases.map((testCase, index) => {
        const inputParse = parseJsonField(testCase.inputText);
        const expectedParse = parseJsonField(testCase.expectedText);
        const inputNotArray =
          !inputParse.error && !Array.isArray(inputParse.value)
            ? "Input must be an array of arguments, e.g. [5] or [[1,2],3]"
            : null;

        return (
          <div key={index} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Case {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove test case ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2Icon />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs" htmlFor={`tc-input-${index}`}>
                  Input (array of arguments)
                </Label>
                <Input
                  id={`tc-input-${index}`}
                  className="font-mono text-sm"
                  value={testCase.inputText}
                  onChange={(e) => update(index, { inputText: e.target.value })}
                />
                {(inputParse.error || inputNotArray) && (
                  <p className="text-xs text-destructive">{inputParse.error ?? inputNotArray}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs" htmlFor={`tc-expected-${index}`}>
                  Expected output
                </Label>
                <Input
                  id={`tc-expected-${index}`}
                  className="font-mono text-sm"
                  value={testCase.expectedText}
                  onChange={(e) => update(index, { expectedText: e.target.value })}
                />
                {expectedParse.error && (
                  <p className="text-xs text-destructive">{expectedParse.error}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Values are JSON. Strings need quotes (<code>&quot;Boston&quot;</code>), and input is always
        an array — <code>[5]</code> calls the function with one argument.
      </p>
    </div>
  );
}

/** Converts editor rows to the DB shape. Returns null if anything is invalid. */
export function toTestCases(rows) {
  const out = [];
  for (const row of rows) {
    const input = parseJsonField(row.inputText);
    const expected = parseJsonField(row.expectedText);
    if (input.error || expected.error || !Array.isArray(input.value)) return null;
    out.push({ input: input.value, expected_output: expected.value });
  }
  return out;
}

/** Converts stored test cases back into editable rows. */
export function toEditorRows(testCases) {
  return (testCases ?? []).map((tc) => ({
    inputText: JSON.stringify(tc.input ?? []),
    expectedText: JSON.stringify(tc.expected_output ?? null),
  }));
}
