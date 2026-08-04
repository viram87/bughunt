export const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
];

export const BUG_CATEGORIES = [
  { value: "off_by_one", label: "Off-by-one" },
  { value: "null_or_undefined", label: "Null / Undefined" },
  { value: "logic_error", label: "Logic error" },
  { value: "infinite_loop", label: "Infinite loop" },
  { value: "type_error", label: "Type error" },
  { value: "scope_error", label: "Scope error" },
  { value: "async_race_condition", label: "Async race condition" },
  { value: "other", label: "Other" },
];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export const LANGUAGE_VALUES = LANGUAGES.map((l) => l.value);
export const BUG_CATEGORY_VALUES = BUG_CATEGORIES.map((c) => c.value);
export const DIFFICULTY_VALUES = DIFFICULTIES.map((d) => d.value);

// Why someone is reporting a challenge. Kept deliberately short — a long list
// makes people pick "other" rather than read it.
export const REPORT_REASONS = [
  { value: "wrong_explanation", label: "The explanation is wrong" },
  { value: "unclear", label: "The explanation or hints are confusing" },
  { value: "test_case_wrong", label: "A test case looks wrong" },
  { value: "code_does_not_run", label: "The code doesn't run at all" },
  { value: "other", label: "Something else" },
];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value);
