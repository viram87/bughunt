// Suggests plausible bugs to inject into working code.
//
// This is an AUTHORING AID, not a content generator. It proposes candidates
// for a human to pick from, edit, and — critically — write an explanation
// and hints for. A generated bug with no explanation of the pattern behind
// it teaches nothing, and the explanation is the part of a BugHunt challenge
// that actually carries the learning.
//
// Every suggestion still has to survive the admin panel's validation: the
// broken version must fail at least one test and the correct version must
// pass all of them. Plenty of mutations produce code that either still
// passes (no bug) or fails to parse — those get filtered out there.

const PYTHON_RULES = [
  {
    category: "off_by_one",
    label: "Exclude the upper bound",
    find: /range\((\s*[^,()]+\s*),(\s*)([^,()]+?)\s*\+\s*1\s*\)/g,
    replace: (_m, a, s, b) => `range(${a},${s}${b})`,
    why: "range()'s upper bound is exclusive, so dropping the + 1 silently misses the last item.",
  },
  {
    category: "off_by_one",
    label: "Start a slice one element early",
    find: /\[len\((\w+)\)\s*-\s*(\w+)\s*:\]/g,
    replace: (_m, name, n) => `[len(${name}) - ${n} - 1:]`,
    why: "An extra -1 in a length-derived index pulls in one element too many.",
  },
  {
    category: "logic_error",
    label: "Flip and to or",
    find: /\band\b/g,
    replace: () => "or",
    why: "or lets either condition alone pass, so checks that should require both silently succeed.",
  },
  {
    category: "logic_error",
    label: "Loosen a strict comparison",
    find: />=/g,
    replace: () => ">",
    why: "Boundary conditions rarely get tested; > excludes the exact threshold value.",
  },
  {
    category: "type_error",
    label: "Drop a str() conversion",
    find: /str\(([^()]+)\)/g,
    replace: (_m, inner) => inner,
    why: "Python won't implicitly convert a number for concatenation — it raises TypeError.",
  },
  {
    category: "type_error",
    label: "Use floor division",
    find: /([^/])\/([^/=])/g,
    replace: (_m, before, after) => `${before}//${after}`,
    why: "// discards the remainder, so results are only wrong for inputs that don't divide evenly.",
  },
  {
    category: "null_or_undefined",
    label: "Replace .get() with direct indexing",
    find: /(\w+)\.get\((\s*[^,()]+\s*)(?:,\s*[^()]+)?\)/g,
    replace: (_m, obj, key) => `${obj}[${key}]`,
    why: "Bracket access raises KeyError when the key is absent; .get() returns a fallback.",
  },
  {
    category: "infinite_loop",
    label: "Remove the loop decrement",
    find: /\n(\s*)(\w+)\s*(?:-=\s*1|\/\/=\s*10)\s*(?=\n|$)/g,
    replace: () => "\n",
    why: "Without the step, the while condition never becomes false.",
  },
  {
    category: "logic_error",
    label: "Flip equality to inequality",
    find: /\s==\s/g,
    replace: () => " != ",
    why: "Inverting a comparison flips the result for every input, and reads almost identically.",
  },
  {
    category: "logic_error",
    label: "Negate a boolean check",
    find: /\bif not \b/g,
    replace: () => "if ",
    why: "Dropping the negation inverts which branch runs.",
  },
  {
    category: "off_by_one",
    label: "Shift a slice start by one",
    find: /\[(\d+):\]/g,
    replace: (_m, n) => `[${Number(n) + 1}:]`,
    why: "Starting one index later silently drops the first element.",
  },
  {
    category: "other",
    label: "Alias instead of copying",
    find: /(\w+)\s*=\s*(\w+)\[:\]/g,
    replace: (_m, target, source) => `${target} = ${source}`,
    why: "Assignment binds a new name to the same list; only [:] or list() actually copies.",
  },
  {
    category: "other",
    label: "Discard a method's return value",
    find: /return\s+(\w+)\.(upper|lower|strip|replace|sort)\(([^()]*)\)/g,
    replace: (_m, obj, method, args) => `${obj}.${method}(${args})\n    return ${obj}`,
    why: "String methods return a new value rather than mutating in place, so the result must be kept.",
  },
  {
    category: "scope_error",
    label: "Use a mutable default argument",
    find: /def (\w+)\(([^)]*?)(\w+)=None\)/g,
    replace: (_m, fn, before, param) => `def ${fn}(${before}${param}=[])`,
    why: "A default is evaluated once at definition, so every call shares the same list.",
  },
];

const JAVASCRIPT_RULES = [
  {
    category: "off_by_one",
    label: "Shift a slice index by one",
    find: /\.slice\(\s*(\w+)\.length\s*-\s*(\w+)\s*\)/g,
    replace: (_m, arr, n) => `.slice(${arr}.length - ${n} - 1)`,
    why: "An extra -1 starts the slice one element early.",
  },
  {
    category: "logic_error",
    label: "Invert a strict equality",
    find: /===\s*0\b/g,
    replace: () => "=== 1",
    why: "Comparing against the wrong remainder inverts the result for every input.",
  },
  {
    category: "logic_error",
    label: "Loosen a boundary comparison",
    find: />=/g,
    replace: () => ">",
    why: "'at least' means >=; using > silently excludes the threshold itself.",
  },
  {
    category: "type_error",
    label: "Drop a Number() conversion",
    find: /Number\(([^()]+)\)/g,
    replace: (_m, inner) => inner,
    why: "+ concatenates when either side is a string, so totals turn into text.",
  },
  {
    category: "type_error",
    label: "Remove a sort comparator",
    find: /\.sort\(\s*\([^)]*\)\s*=>[^)]*\)/g,
    replace: () => ".sort()",
    why: "Array.sort() compares elements as strings, so 10 sorts before 9.",
  },
  {
    category: "null_or_undefined",
    label: "Remove an optional-chaining guard",
    find: /\?\./g,
    replace: () => ".",
    why: "Without the guard, a missing intermediate value throws instead of returning undefined.",
  },
  {
    category: "null_or_undefined",
    label: "Remove a nullish default",
    find: /\s*\?\?\s*[^;,)]+/g,
    replace: () => "",
    why: "undefined then propagates into arithmetic and turns the result into NaN.",
  },
  {
    category: "async_race_condition",
    label: "Drop an await",
    find: /\bawait\s+/g,
    replace: () => "",
    why: "The Promise object itself is used instead of its resolved value.",
  },
  {
    category: "scope_error",
    label: "Change let to var in a loop header",
    find: /for\s*\(\s*let\s+/g,
    replace: () => "for (var ",
    why: "var is function-scoped, so every closure created in the loop shares one binding.",
  },
  {
    category: "logic_error",
    label: "Flip strict equality to inequality",
    find: /\s===\s/g,
    replace: () => " !== ",
    why: "Inverting a comparison flips the result for every input while reading almost the same.",
  },
  {
    category: "logic_error",
    label: "Swap && for ||",
    find: /\s&&\s/g,
    replace: () => " || ",
    why: "|| lets either side alone pass, so a check needing both silently succeeds.",
  },
  {
    category: "off_by_one",
    label: "Make a loop bound inclusive",
    find: /(\w+)\s*<\s*(\w+(?:\.length)?)/g,
    replace: (_m, i, limit) => `${i} <= ${limit}`,
    why: "<= runs one iteration too many and reads past the end of the array.",
  },
  {
    category: "off_by_one",
    label: "Start an index at 1 instead of 0",
    find: /(let|var|const)\s+(\w+)\s*=\s*0\s*;/g,
    replace: (_m, kw, name) => `${kw} ${name} = 1;`,
    why: "Arrays are zero-indexed, so starting at 1 silently skips the first element.",
  },
  {
    category: "other",
    label: "Alias instead of copying an array",
    find: /(\w+)\s*=\s*\[\s*\.\.\.(\w+)\s*\]/g,
    replace: (_m, target, source) => `${target} = ${source}`,
    why: "Assignment shares the same array; only a spread or slice actually copies it.",
  },
  {
    category: "null_or_undefined",
    label: "Remove a length guard",
    find: /(\w+)\.length\s*>\s*0\s*\?\s*/g,
    replace: () => "",
    why: "Without the guard, indexing an empty array yields undefined and throws on the next access.",
  },
];

/**
 * Proposes bugs that could be injected into working code.
 *
 * @param {string} code working, correct source
 * @param {"python"|"javascript"} language
 * @returns {Array<{category,label,why,broken,line}>} one entry per distinct
 *   single-site mutation, most specific rules first
 */
export function suggestMutations(code, language) {
  return runRules(code, language === "python" ? PYTHON_RULES : JAVASCRIPT_RULES);
}

/**
 * True when the selected language finds nothing but the *other* one would.
 * The form defaults to Python, so pasting JavaScript without switching the
 * dropdown is the most likely reason for an empty result — worth naming
 * rather than leaving the author to guess.
 */
export function looksLikeWrongLanguage(code, language) {
  if (!code) return false;
  const selected = suggestMutations(code, language);
  if (selected.length > 0) return false;
  const other = runRules(code, language === "python" ? JAVASCRIPT_RULES : PYTHON_RULES);
  return other.length > 0;
}

function runRules(code, rules) {
  if (!code) return [];
  const seen = new Set();
  const out = [];

  for (const rule of rules) {
    // Mutate one site at a time. Applying a rule everywhere at once usually
    // produces code that's obviously broken rather than subtly wrong, and a
    // subtle bug is the whole point.
    const matches = [...code.matchAll(rule.find)];
    for (const match of matches) {
      const start = match.index ?? 0;
      const broken =
        code.slice(0, start) +
        String(match[0]).replace(new RegExp(rule.find.source), rule.replace) +
        code.slice(start + match[0].length);

      if (broken === code || seen.has(broken)) continue;
      seen.add(broken);

      out.push({
        category: rule.category,
        label: rule.label,
        why: rule.why,
        broken,
        line: code.slice(0, start).split("\n").length,
      });
    }
  }

  return out;
}
