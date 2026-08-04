// Long-form copy for the /bugs/[pattern] landing pages.
//
// These pages exist to be found. Someone hits an IndexError at 2am and
// searches the error text, not "BugHunt" — so each page has to answer the
// question properly on its own, then offer practice. Thin pages that only
// list links get treated as doorway pages and are worth nothing; these carry
// real explanation, the actual error strings people paste into Google, and
// the fixes.
//
// `slug` is the URL. It is intentionally the human phrase ("off-by-one")
// rather than the database value ("off_by_one"), because the URL is itself a
// ranking signal and gets read aloud in search results.

export const BUG_PATTERNS = [
  {
    slug: "off-by-one",
    category: "off_by_one",
    title: "Off-by-one errors",
    headline: "Off-by-one errors in Python and JavaScript",
    blurb:
      "The loop that runs one time too many, the slice that drops the last item, the index that starts in the wrong place.",
    // Literal strings people search. Rendered on the page, so they're indexed.
    errors: [
      "IndexError: list index out of range",
      "IndexError: string index out of range",
      "Cannot read properties of undefined",
      "loop runs one extra time",
      "last item missing from array",
    ],
    what: "An off-by-one error is a loop bound, index or count that is wrong by exactly one. The logic is right; the arithmetic is one step out. They are among the most common bugs in programming precisely because they hide so well — the code produces almost the right answer, which is far harder to notice than no answer at all.",
    why: "Almost every off-by-one comes from mixing two counting conventions in the same expression. Array indices start at 0 but lengths start at 1. Python's range() and JavaScript's slice() exclude their upper bound, while a phrase like \"items 1 to 10\" includes both ends. Whenever those conventions meet without a deliberate conversion, something ends up one out.",
    tells: [
      "The result is right except for the first or last element.",
      "A sum comes out as NaN in JavaScript, because reading past the end gave undefined.",
      "IndexError in Python at exactly the final iteration.",
      "It works for even-sized input and breaks for odd, or vice versa.",
    ],
    fix: "Test the smallest case by hand. A list of length n has indices 0 to n-1; a window of size k fits n - k + 1 times; n items need n - 1 separators. Write the boundary case as a test before you write the loop, because the boundary is exactly where these live and exactly what casual testing skips.",
  },
  {
    slug: "infinite-loops",
    category: "infinite_loop",
    title: "Infinite loops",
    headline: "Infinite loops: why your program hangs and never finishes",
    blurb: "The tab freezes, nothing prints, and the loop condition never becomes false.",
    errors: [
      "while loop never ends",
      "page freezes / tab not responding",
      "program hangs with no output",
      "RecursionError: maximum recursion depth exceeded",
    ],
    what: "An infinite loop is a loop whose exit condition never becomes true. The program does not crash and does not print an error — it simply stops making progress, which makes it one of the more disorienting bugs to hit for the first time.",
    why: "Every loop needs its body to move something toward the exit condition. The failure is almost always that the variable in the condition is not the variable the body changes: the increment sits inside an if, a continue jumps over it, a string method's return value is discarded so the text never actually changes, or a condition is tested against a value nothing updates.",
    tells: [
      "It hangs on some inputs and finishes on others — the working ones avoid the branch that fails to make progress.",
      "A while loop whose body contains continue.",
      "A condition on one variable while the body updates a different one.",
      "In Python, calling text.replace(...) or list.sort() without assigning the result.",
    ],
    fix: "Print the condition variable at the top of every iteration. If it does not change, you have found it. Ask what happens when the branch is false: if the answer is 'nothing', the loop can stall. Put the increment where it always runs — a for loop's header is safer than a while loop's body.",
  },
  {
    slug: "null-and-undefined",
    category: "null_or_undefined",
    title: "Null and undefined errors",
    headline: "Null and undefined: the crash that happens far from the mistake",
    blurb:
      "Cannot read properties of undefined, NoneType has no attribute, NaN appearing from nowhere.",
    errors: [
      "TypeError: Cannot read properties of undefined (reading 'x')",
      "TypeError: Cannot read properties of null",
      "AttributeError: 'NoneType' object has no attribute",
      "TypeError: unsupported operand type(s) for +: 'int' and 'NoneType'",
      "result is NaN",
    ],
    what: "A missing value gets used as if it were present. In JavaScript that is undefined or null; in Python it is None. The crash happens where the value is finally used, which is often nowhere near where it went missing.",
    why: "Lookups that can fail return an empty result rather than raising: Array.find returns undefined, dict.get returns None, an out-of-range index returns undefined in JavaScript. Code then reads a property off it. The gap between where the empty value was created and where it blew up is what makes these hard to trace — the failing line is usually not the wrong line.",
    tells: [
      "The error names a property you are certain exists.",
      "NaN appears in a calculation with no obvious source.",
      "It works with full data and fails with real, incomplete data.",
      "A legitimate 0 or empty string is being treated as missing.",
    ],
    fix: "Check the result of anything that can fail to find something, before using it. Prefer ?? over || and `is None` over truthiness, because 0 and \"\" are falsy but not missing — that distinction is the source of a whole family of these. Work backwards from the crash to where the value was created; the bug is at the creation, not the crash.",
  },
  {
    slug: "type-errors",
    category: "type_error",
    title: "Type errors",
    headline: "Type errors: when a number is secretly a string",
    blurb: "Totals that concatenate, sorts that put 10 before 9, comparisons that refuse to run.",
    errors: [
      "TypeError: unsupported operand type(s)",
      "TypeError: '>' not supported between instances of 'str' and 'int'",
      "TypeError: list indices must be integers or slices, not float",
      "sort puts 10 before 9",
      "numbers concatenating instead of adding",
    ],
    what: "A value is not the type the code assumes. Python usually raises immediately; JavaScript usually converts silently and gives a wrong answer, which is worse because nothing tells you anything went wrong.",
    why: "Data crossing a boundary loses its type. Form fields, JSON, query strings and CSV files all arrive as text. JSON object keys are always strings even when they look like numbers. JavaScript's + means addition or concatenation depending on its operands, and its default sort compares elements as strings.",
    tells: [
      "A total is a string of digits stuck together rather than a sum.",
      "Sorting puts 10 before 9 — string ordering, not numeric.",
      "KeyError on a key you can see in the printed dict (it is \"1\", not 1).",
      "In Python 3, / always returns a float, so it can never be an index.",
    ],
    fix: "Convert once, at the boundary where data enters, rather than scattering int() and Number() through your logic. Use === over == in JavaScript so type mismatches fail loudly. When a value surprises you, print its type before you print its value.",
  },
  {
    slug: "scope-errors",
    category: "scope_error",
    title: "Scope and closure bugs",
    headline: "Scope and closures: variables that are not the variable you meant",
    blurb:
      "Every callback reports the last value, a counter never increments, UnboundLocalError on a variable you can see.",
    errors: [
      "UnboundLocalError: cannot access local variable",
      "ReferenceError: Cannot access before initialization",
      "all callbacks use the last value",
      "counter stays at zero",
      "this is undefined",
    ],
    what: "The name you wrote resolves to a different variable than the one you meant — a shadowed copy, a shared binding, or one that does not exist yet at the moment the line runs.",
    why: "Closures capture variables, not values, so callbacks created in a loop can share one binding and all see the final value. Assigning to a name anywhere in a Python function makes it local for the whole function, even before the assignment. Re-declaring a name inside a callback shadows the outer one, so updates land on the copy. And in JavaScript `this` is decided by how a function is called, not where it was written.",
    tells: [
      "Every item in a loop behaves like the last one.",
      "A counter is visibly incremented but stays at its initial value.",
      "Python reports a variable as local when it is clearly defined above.",
      "A method works when called normally and breaks when passed as a callback.",
    ],
    fix: "Do not re-declare a name you meant to update from an enclosing scope. Capture per-iteration values explicitly — a default argument in Python, let rather than var in JavaScript. Keep a method attached to its object when passing it somewhere. Declare before use, always.",
  },
  {
    slug: "async-race-conditions",
    category: "async_race_condition",
    title: "Async and race conditions",
    headline: "Async bugs and race conditions in JavaScript",
    blurb:
      "A missing await, results in the wrong order, and updates that overwrite each other under load.",
    errors: [
      "[object Promise] in output",
      "value is undefined after await",
      "results in wrong order",
      "try/catch does not catch async error",
      "UnhandledPromiseRejection",
    ],
    what: "Code that assumes work has finished when it has not. The symptom is a Promise where a value should be, results arriving in an unexpected order, or state that is correct with one user and wrong with several.",
    why: "An async function always returns a promise, so forgetting a single await hands the promise itself onward. `return somePromise` inside a try block escapes before it can reject, so the catch never runs. And every await is a point where other code can run — if you read a value, await, then write it back, anything that ran in the gap is silently overwritten.",
    tells: [
      "\"[object Promise]\" or typeof 'object' where a value was expected.",
      "It works with one item and breaks with several.",
      "Output order changes between runs.",
      "A try/catch around async work never catches anything.",
    ],
    fix: "Await everything that returns a promise, and use Promise.all when you need every result rather than the first. Never hold a copy of shared state across an await — read and write without yielding in between. Test concurrency with concurrent input; a sequential test cannot find a race.",
  },
  {
    slug: "logic-errors",
    category: "logic_error",
    title: "Logic errors",
    headline: "Logic errors: code that runs perfectly and answers wrongly",
    blurb: "The wrong operator, an inverted condition, a formula the right way round but backwards.",
    errors: [
      "wrong output but no error",
      "and vs or in condition",
      "any vs all",
      "result has the wrong sign",
      "condition always true",
    ],
    what: "The program does exactly what you wrote, and what you wrote is not what you meant. There is no error message and no crash — only a wrong answer, which is why these are the hardest to spot and the most likely to reach production.",
    why: "Boolean logic and arithmetic are easy to invert without it looking wrong. || instead of && lets either side pass. any() instead of all() accepts one match instead of requiring every one. A reversed subtraction flips the sign of every result while the magnitude stays plausible. Short-circuit guards placed after the thing they guard read as safe while doing nothing.",
    tells: [
      "The magnitude is right but the sign is wrong.",
      "It is correct for uniform input and wrong for mixed input.",
      "A guard clause exists but the crash it prevents still happens.",
      "Boundary values are handled inconsistently at each end.",
    ],
    fix: "Build a small truth table for any condition with more than one term, and test each branch. Check one case per direction for signed results. Read guards in evaluation order, not reading order — `and` short-circuits left to right, so a guard on the right protects nothing.",
  },
  {
    slug: "mutation-and-copying",
    category: "other",
    title: "Mutation and copying bugs",
    headline: "Shared references: when changing a copy changes the original",
    blurb:
      "Assignment does not copy, a shallow copy still shares its contents, and mutating methods return None.",
    errors: [
      "editing copy changes original",
      "list.sort() returns None",
      "shared state between instances",
      "mutable default argument",
      "removing items skips every other one",
    ],
    what: "Two names refer to the same underlying object, so a change through one is visible through the other. Or a method mutates in place and returns nothing, and the nothing gets assigned.",
    why: "Assignment binds a name; it never copies. A shallow copy duplicates the outer container while its elements still point at the originals, so mutating a nested value is visible through both. Python evaluates default arguments once at definition, so a mutable default is shared by every call. And methods that mutate in place return None by convention, which is easy to assign by accident.",
    tells: [
      "A function that should be read-only changes its argument.",
      "Two fresh objects share state.",
      "A variable becomes None after a sort or reverse.",
      "A list changes length while you iterate it, and elements get skipped.",
    ],
    fix: "Copy explicitly, and match the copy's depth to the depth at which you mutate — a shallow copy protects only the top level. Use None as a default and build the mutable value inside the function. Remember which methods return a new value and which return None: that distinction marks the ones that mutate.",
  },
];

export const PATTERN_BY_SLUG = Object.fromEntries(BUG_PATTERNS.map((p) => [p.slug, p]));
export const PATTERN_BY_CATEGORY = Object.fromEntries(BUG_PATTERNS.map((p) => [p.category, p]));
