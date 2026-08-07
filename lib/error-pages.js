// One landing page per error message people actually paste into a search box.
//
// This is the legitimate way to widen search coverage: not more keywords on
// one page, but more pages each answering one real question properly. A
// pattern page covers five errors at once and ranks strongly for none of them;
// a page whose title IS the error text can win that exact query.
//
// Every entry must answer the question on its own. Thin pages that exist only
// to hold a keyword get classified as doorway pages and rank for nothing — the
// bar is "would this actually help someone at 2am", not "does it contain the
// string".

export const ERROR_PAGES = [
  {
    slug: "indexerror-list-index-out-of-range",
    error: "IndexError: list index out of range",
    language: "Python",
    pattern: "off-by-one",
    summary:
      "You asked for an index the list does not have. Almost always a loop bound that is one too far, or an empty list you assumed had items.",
    means:
      "Python lists are indexed from 0, so a list of 5 items has valid indices 0 to 4. Asking for index 5 — or any index at or beyond the length — raises IndexError immediately. Unlike JavaScript, which quietly returns undefined, Python fails loudly at the exact line, which is genuinely helpful once you know what it means.",
    causes: [
      {
        title: "A loop that runs one time too many",
        why: "range(len(items) + 1) or a while loop testing <= length both step one past the end.",
        broken: "for i in range(len(items) + 1):\n    print(items[i])",
        fixed: "for i in range(len(items)):\n    print(items[i])",
      },
      {
        title: "Using the length as an index",
        why: "The last valid index is len - 1. len itself is always one past the end.",
        broken: "last = items[len(items)]",
        fixed: "last = items[len(items) - 1]   # or items[-1]",
      },
      {
        title: "The list is empty",
        why: "items[0] fails on an empty list. This is common when a filter or an API call returned nothing.",
        broken: "first = results[0]",
        fixed: "first = results[0] if results else None",
      },
      {
        title: "Removing items while looping over them",
        why: "The list shrinks as you iterate, so the index eventually points past the new end.",
        broken: "for i in range(len(items)):\n    if items[i] < 0:\n        items.pop(i)",
        fixed: "items = [x for x in items if x >= 0]",
      },
    ],
    fix: "Print len(items) and the index right before the failing line. If the index equals the length, your bound is one too far. If the length is 0, the real bug is upstream — something returned nothing and you did not check.",
  },
  {
    slug: "indexerror-string-index-out-of-range",
    error: "IndexError: string index out of range",
    language: "Python",
    pattern: "off-by-one",
    summary:
      "Same cause as the list version: you asked for a character position the string does not have.",
    means:
      "Strings index from 0, so \"hello\" has valid indices 0 to 4. text[len(text)] is always one past the end, and any index on an empty string fails immediately.",
    causes: [
      {
        title: "Reaching for the last character with len",
        why: "The final character sits at len - 1, or more simply at -1.",
        broken: "last = text[len(text)]",
        fixed: "last = text[-1]",
      },
      {
        title: "The string is empty",
        why: "text[0] raises on \"\". Common with input that was stripped to nothing, or a missing field.",
        broken: "initial = name[0]",
        fixed: "initial = name[0] if name else \"\"",
      },
      {
        title: "Walking a string with an index that outpaces it",
        why: "A while loop whose condition uses <= rather than < steps one too far.",
        broken: "i = 0\nwhile i <= len(text):\n    print(text[i])\n    i += 1",
        fixed: "i = 0\nwhile i < len(text):\n    print(text[i])\n    i += 1",
      },
    ],
    fix: "Prefer slicing over indexing where you can — text[-1:] returns \"\" on an empty string instead of raising. When you must index, check the string is non-empty first.",
  },
  {
    slug: "cannot-read-properties-of-undefined",
    error: "TypeError: Cannot read properties of undefined",
    language: "JavaScript",
    pattern: "null-and-undefined",
    summary:
      "You read a property off something that does not exist. The crash is usually far from the real mistake — the value went missing earlier.",
    means:
      "Something you expected to be an object is undefined, and reading a property off undefined throws. The message names the property it tried to read, which tells you the shape you expected but not where the value disappeared. That gap is what makes it the most-reported error in JavaScript.",
    causes: [
      {
        title: "Array.find() found nothing",
        why: "find returns undefined when nothing matches. It does not throw and does not return an empty object.",
        broken: "const price = items.find(i => i.id === id).price;",
        fixed: "const item = items.find(i => i.id === id);\nconst price = item ? item.price : 0;",
      },
      {
        title: "Reading past the end of an array",
        why: "JavaScript returns undefined for an out-of-range index rather than throwing, so the failure surfaces on the next line.",
        broken: "for (let i = 0; i <= arr.length; i++) {\n  console.log(arr[i].name);\n}",
        fixed: "for (let i = 0; i < arr.length; i++) {\n  console.log(arr[i].name);\n}",
      },
      {
        title: "Optional chaining that only guards the first link",
        why: "?. protects exactly the access it is attached to. The next dot is an ordinary access.",
        broken: "const city = user?.address.city;",
        fixed: "const city = user?.address?.city;",
      },
      {
        title: "Data has not arrived yet",
        why: "State starts undefined and the first render reads it before the fetch resolves.",
        broken: "return <p>{data.title}</p>;",
        fixed: "if (!data) return null;\nreturn <p>{data.title}</p>;",
      },
    ],
    fix: "Work backwards from the crash to where the value was created, not where it exploded. The bug is at the creation. Log the whole object one line above the failure — it is usually undefined for an obvious reason once you see it.",
  },
  {
    slug: "nonetype-object-has-no-attribute",
    error: "AttributeError: 'NoneType' object has no attribute",
    language: "Python",
    pattern: "null-and-undefined",
    summary:
      "Something returned None and you called a method on it. Usually a lookup that failed, or a function that forgot to return.",
    means:
      "None is Python's empty value and it has almost no attributes. The message tells you the attribute you tried to reach, which reveals what type you expected. The interesting question is always where the None came from.",
    causes: [
      {
        title: "A function with no return statement",
        why: "A Python function without an explicit return gives back None. Easy to miss when the function is long.",
        broken: "def build_name(first, last):\n    full = first + \" \" + last\n\nname = build_name(\"Ada\", \"Lovelace\")\nprint(name.upper())",
        fixed: "def build_name(first, last):\n    return first + \" \" + last",
      },
      {
        title: "Assigning the result of a mutating method",
        why: "list.sort(), list.append() and list.reverse() change the list in place and return None. That None return is the convention marking a mutating method.",
        broken: "names = names.sort()",
        fixed: "names.sort()          # in place\n# or\nnames = sorted(names)  # new list",
      },
      {
        title: "dict.get() on a missing key",
        why: "get returns None rather than raising, which is its point — but None then flows onward until something uses it.",
        broken: "city = config.get(\"city\").upper()",
        fixed: "city = config.get(\"city\", \"\").upper()",
      },
      {
        title: "A regex that did not match",
        why: "re.search returns None when there is no match, not an empty match object.",
        broken: "digits = re.search(r\"\\d+\", text).group()",
        fixed: "m = re.search(r\"\\d+\", text)\ndigits = m.group() if m else \"\"",
      },
    ],
    fix: "Print the variable just before the failing line to confirm it is None, then trace back to what produced it. If a function is meant to return something, check every branch actually does — an if with no else returns None silently.",
  },
  {
    slug: "unsupported-operand-type-int-and-nonetype",
    error: "TypeError: unsupported operand type(s) for +: 'int' and 'NoneType'",
    language: "Python",
    pattern: "null-and-undefined",
    summary:
      "You did arithmetic with a None. Something in the sum was missing and nobody checked.",
    means:
      "Python refuses to add a number and None rather than guessing. The line that crashes is where the None was used, which is often nowhere near where it was created.",
    causes: [
      {
        title: "dict.get() with no default",
        why: "get returns None for a missing key. Give it a default of the right type.",
        broken: "total = sum(scores.get(n) for n in names)",
        fixed: "total = sum(scores.get(n, 0) for n in names)",
      },
      {
        title: "A function that returns None on some path",
        why: "An if with no else silently returns None for the inputs that miss the branch.",
        broken: "def bonus(score):\n    if score > 50:\n        return 10\n\ntotal = score + bonus(score)",
        fixed: "def bonus(score):\n    if score > 50:\n        return 10\n    return 0",
      },
      {
        title: "Missing data from a database or API",
        why: "A nullable column comes back as None, and it only fails for the rows that are empty.",
        broken: "total = row[\"base\"] + row[\"extra\"]",
        fixed: "total = row[\"base\"] + (row[\"extra\"] or 0)",
      },
    ],
    fix: "Give every lookup a typed default rather than letting None travel. Prefer `x is None` over truthiness when checking, because a legitimate 0 is falsy but not missing.",
  },
  {
    slug: "unboundlocalerror-cannot-access-local-variable",
    error: "UnboundLocalError: cannot access local variable",
    language: "Python",
    pattern: "scope-errors",
    summary:
      "You assigned to a name somewhere inside a function, which made it local for the whole function — including before the assignment runs.",
    means:
      "Python decides local versus global when it compiles the function, not while it runs. If a name is assigned anywhere in the body, every reference to it in that function is local. Reading it before the assignment executes raises UnboundLocalError, even if a module-level variable of the same name exists.",
    causes: [
      {
        title: "Modifying a global without declaring it",
        why: "total += n is a read then a write, and the read happens against an unassigned local.",
        broken: "total = 0\n\ndef add_all(nums):\n    for n in nums:\n        total += n\n    return total",
        fixed: "def add_all(nums):\n    running = 0\n    for n in nums:\n        running += n\n    return running",
      },
      {
        title: "A variable only assigned inside an if",
        why: "If the branch never runs, the name was never bound, and the return line fails.",
        broken: "def last_even(nums):\n    for n in nums:\n        if n % 2 == 0:\n            found = n\n    return found",
        fixed: "def last_even(nums):\n    found = None\n    for n in nums:\n        if n % 2 == 0:\n            found = n\n    return found",
      },
    ],
    fix: "Initialise before the loop or branch so the name exists on every path. Using `global` works but leaves the function stateful across calls — a local accumulator is almost always the better fix.",
  },
  {
    slug: "referenceerror-cannot-access-before-initialization",
    error: "ReferenceError: Cannot access before initialization",
    language: "JavaScript",
    pattern: "scope-errors",
    summary:
      "You used a let or const before its declaration line executed. This is the temporal dead zone.",
    means:
      "let and const are hoisted like var, but they stay unusable until their declaration runs. Touching one before that is a ReferenceError rather than undefined — deliberately, because it turns a silent bug into a loud one. The error names the variable, which makes it one of the friendlier failures once you recognise the phrase.",
    causes: [
      {
        title: "Declaring after use",
        why: "The lines read top to bottom; the constant does not exist yet on the earlier line.",
        broken: "const total = base + fee;\nconst fee = 5;",
        fixed: "const fee = 5;\nconst total = base + fee;",
      },
      {
        title: "Shadowing an outer name",
        why: "The inner declaration covers the whole block, so the outer value is unreachable within it.",
        broken: "const label = \"outer\";\nfunction show() {\n  console.log(label);\n  const label = \"inner\";\n}",
        fixed: "const label = \"outer\";\nfunction show() {\n  console.log(label);\n  const innerLabel = \"inner\";\n}",
      },
    ],
    fix: "Declare before use, always. If the error names a variable that clearly exists above, look for a second declaration of the same name inside the current block — that shadow is the culprit.",
  },
  {
    slug: "recursionerror-maximum-recursion-depth-exceeded",
    error: "RecursionError: maximum recursion depth exceeded",
    language: "Python",
    pattern: "infinite-loops",
    summary:
      "A function kept calling itself without reaching a stopping condition.",
    means:
      "Python caps the call stack at roughly 1000 frames to stop runaway recursion from exhausting memory. Hitting the cap almost always means the base case is missing, unreachable, or the recursive call is not moving toward it.",
    causes: [
      {
        title: "No base case",
        why: "Nothing stops the descent, so it runs until the stack limit.",
        broken: "def countdown(n):\n    print(n)\n    countdown(n - 1)",
        fixed: "def countdown(n):\n    if n <= 0:\n        return\n    print(n)\n    countdown(n - 1)",
      },
      {
        title: "The base case can be skipped",
        why: "Testing == 0 misses it entirely if n starts negative or steps by more than one.",
        broken: "def countdown(n):\n    if n == 0:\n        return\n    countdown(n - 2)",
        fixed: "def countdown(n):\n    if n <= 0:\n        return\n    countdown(n - 2)",
      },
      {
        title: "The argument never changes",
        why: "Recursing with the same value repeats forever.",
        broken: "def walk(items):\n    if not items:\n        return\n    walk(items)",
        fixed: "def walk(items):\n    if not items:\n        return\n    walk(items[1:])",
      },
    ],
    fix: "Print the argument at the top of the function. If it is not moving toward the base case on every call, that is the bug. Use <= rather than == for the base case so it cannot be stepped over.",
  },
  {
    slug: "sort-returns-none-python",
    error: "list.sort() returns None",
    language: "Python",
    pattern: "mutation-and-copying",
    summary:
      "sort() sorts in place and gives back None. Assigning its result throws the list away.",
    means:
      "Python marks methods that mutate by returning None. list.sort(), list.reverse() and list.append() all do this, and the None return is a deliberate signal that the object changed rather than a new one being produced.",
    causes: [
      {
        title: "Assigning the result of sort()",
        why: "The list is sorted correctly, then replaced with None.",
        broken: "names = names.sort()",
        fixed: "names.sort()            # in place\n# or\nnames = sorted(names)   # new list",
      },
      {
        title: "Chaining off a mutating method",
        why: "The chain continues on None, so the next call fails.",
        broken: "first = names.sort()[0]",
        fixed: "first = sorted(names)[0]",
      },
    ],
    fix: "Remember the pair: sort/sorted, reverse/reversed. The bare verb mutates and returns None; the -ed form returns a new list. If a variable mysteriously becomes None, check whether the last thing assigned to it was a mutating method.",
  },
  {
    slug: "object-promise-in-output",
    error: "[object Promise] in output",
    language: "JavaScript",
    pattern: "async-race-conditions",
    summary:
      "A promise was used where its resolved value was expected — nearly always a missing await.",
    means:
      "An async function always returns a promise. Using that promise in a string or a calculation converts it via toString, giving [object Promise]. The count or shape often looks right, which is why it slips through.",
    causes: [
      {
        title: "Missing await",
        why: "The promise itself flows onward instead of the value.",
        broken: "const total = getTotal();\nconsole.log(`Total: ${total}`);",
        fixed: "const total = await getTotal();\nconsole.log(`Total: ${total}`);",
      },
      {
        title: "map with an async callback",
        why: "map gives an array of promises. The length is right, which is the trap.",
        broken: "const names = ids.map(async id => fetchName(id));",
        fixed: "const names = await Promise.all(ids.map(id => fetchName(id)));",
      },
      {
        title: "reduce with an async callback",
        why: "The accumulator is a promise from the second iteration onward.",
        broken: "nums.reduce(async (acc, n) => acc + await f(n), 0);",
        fixed: "nums.reduce(async (acc, n) => (await acc) + await f(n), Promise.resolve(0));",
      },
    ],
    fix: "If you see [object Promise], or typeof gives 'object' where you expected a number or string, look for the await you dropped. Promise.all is what you want whenever you need every result rather than the first.",
  },
  {
    slug: "str-and-int-comparison-typeerror",
    error: "TypeError: '>' not supported between instances of 'str' and 'int'",
    language: "Python",
    pattern: "type-errors",
    summary:
      "You compared text with a number. The value arrived as a string and was never converted.",
    means:
      "Python 3 refuses to order unrelated types rather than guessing. This is deliberate — Python 2 allowed it and produced meaningless results. Anything from input(), a form, a CSV, JSON or a query string arrives as text.",
    causes: [
      {
        title: "input() always returns a string",
        why: "Even when the user types digits, you get \"42\", not 42.",
        broken: "age = input(\"Age: \")\nif age > 18:\n    print(\"adult\")",
        fixed: "age = int(input(\"Age: \"))\nif age > 18:\n    print(\"adult\")",
      },
      {
        title: "Values from a file or API",
        why: "CSV columns and query parameters are text until you convert them.",
        broken: "if row[\"score\"] > 50:",
        fixed: "if int(row[\"score\"]) > 50:",
      },
    ],
    fix: "Convert once, at the boundary where data enters your program, rather than scattering int() through your logic. When a value surprises you, print its type before its value.",
  },
  {
    slug: "list-indices-must-be-integers-not-float",
    error: "TypeError: list indices must be integers or slices, not float",
    language: "Python",
    pattern: "type-errors",
    summary:
      "You used a float as an index. In Python 3, / always produces a float — even when the result looks whole.",
    means:
      "Python 3 changed / to true division, so 4 / 2 is 2.0, not 2. A float can never be a list index however round it looks. // is floor division and returns an int for int operands.",
    causes: [
      {
        title: "Dividing to find a midpoint",
        why: "len(items) / 2 is a float. This is the single most common source of this error.",
        broken: "middle = items[len(items) / 2]",
        fixed: "middle = items[len(items) // 2]",
      },
      {
        title: "Code written for Python 2",
        why: "In Python 2, / on two ints did floor division. Older tutorials still teach it that way.",
        broken: "half = items[count / 2]",
        fixed: "half = items[count // 2]",
      },
    ],
    fix: "Use // whenever the result is going to be an index. If a value must be an int, int() it explicitly rather than hoping the arithmetic keeps it whole.",
  },
];

export const ERROR_BY_SLUG = Object.fromEntries(ERROR_PAGES.map((e) => [e.slug, e]));
