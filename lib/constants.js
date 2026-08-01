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
