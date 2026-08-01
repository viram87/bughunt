// Second content batch: 32 challenges, four per bug category, weighted
// toward medium/hard (the original 12 were 7 easy / 4 medium / 1 hard).
//
// Every entry here is executed before it ships — see
// scripts/verify-challenges.mjs. Broken code must fail at least one test;
// correct code must pass all of them.
//
// Test-case notes: `input` is always an array of arguments. Avoid `null`
// expected outputs for Python — None doesn't round-trip cleanly through
// Pyodide — use a sentinel value instead.

export const BATCH2 = [
  // ── off_by_one ────────────────────────────────────────────────────────
  {
    title: "Last N characters comes back one too long",
    language: "python",
    bug_category: "off_by_one",
    difficulty: "medium",
    function_name: "last_n_chars",
    broken_code: `def last_n_chars(text, n):
    return text[len(text) - n - 1:]`,
    correct_code: `def last_n_chars(text, n):
    return text[len(text) - n:]`,
    problem_description:
      'last_n_chars(text, n) should return the last n characters of a string, so last_n_chars("debugging", 3) gives "ing".',
    symptom_description: 'last_n_chars("debugging", 3) returns "ging" — four characters instead of three.',
    explanation:
      "The slice starts one index too early. The last n characters begin at index len(text) - n; subtracting an extra 1 reaches back one character further. Whenever you compute an index from a length, check it against a tiny example by hand — here, a 9-character string wanting the last 3 should start at index 6, not 5.",
    test_cases: [
      { input: ["debugging", 3], expected_output: "ing" },
      { input: ["hello", 2], expected_output: "lo" },
      { input: ["abc", 3], expected_output: "abc" },
    ],
    hints: [
      "Count the characters in the result by hand — how many did you get versus how many you asked for?",
      "The starting index of the slice is the problem.",
      "The last n characters start at len(text) - n. Drop the extra - 1.",
    ],
  },
  {
    title: "First chunk drops its last item",
    language: "javascript",
    bug_category: "off_by_one",
    difficulty: "easy",
    function_name: "firstChunk",
    broken_code: `function firstChunk(arr, size) {
    return arr.slice(0, size - 1);
}`,
    correct_code: `function firstChunk(arr, size) {
    return arr.slice(0, size);
}`,
    problem_description:
      "firstChunk(arr, size) should return the first `size` items of an array, so firstChunk([1,2,3,4,5], 3) gives [1,2,3].",
    symptom_description: "firstChunk([1,2,3,4,5], 3) returns [1,2] — one item short.",
    explanation:
      "slice's second argument is the index to stop *before*, not the last index to include. slice(0, size) already returns exactly `size` items, so subtracting 1 removes one too many. This is the mirror image of the more common mistake of forgetting that the end index is exclusive.",
    test_cases: [
      { input: [[1, 2, 3, 4, 5], 3], expected_output: [1, 2, 3] },
      { input: [[1, 2], 2], expected_output: [1, 2] },
      { input: [[1, 2, 3], 1], expected_output: [1] },
    ],
    hints: [
      "Count the items you get back versus the number you asked for.",
      "Look at the second argument to slice().",
      "slice(0, size) already returns exactly size items — the - 1 is removing one too many.",
    ],
  },
  {
    title: "Binary search misses the last element",
    language: "python",
    bug_category: "off_by_one",
    difficulty: "hard",
    function_name: "binary_search",
    broken_code: `def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    while low < high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
    correct_code: `def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
    problem_description:
      "binary_search(nums, target) should return the index of target in a sorted list, or -1 if it isn't there.",
    symptom_description:
      "It works for most values but returns -1 for some that are definitely present — searching for 9 in [1,3,5,7,9] gives -1.",
    explanation:
      "The loop condition `low < high` exits when low and high meet, so the single remaining candidate is never checked. Binary search must keep going while the search window still contains one element, which means `low <= high`. Bugs like this hide well because they only show up when the target lands on the final narrowing step.",
    test_cases: [
      { input: [[1, 3, 5, 7, 9], 9], expected_output: 4 },
      { input: [[1, 3, 5, 7, 9], 1], expected_output: 0 },
      { input: [[1, 3, 5, 7, 9], 5], expected_output: 2 },
      { input: [[1, 3, 5], 4], expected_output: -1 },
    ],
    hints: [
      "It only fails for certain targets. What do those targets have in common?",
      "Think about the moment when low and high become equal — does the loop still run?",
      "When low == high there is still one unchecked element. The condition should be low <= high.",
    ],
  },

  // ── null_or_undefined ─────────────────────────────────────────────────
  {
    title: "First item's name crashes on an empty list",
    language: "javascript",
    bug_category: "null_or_undefined",
    difficulty: "easy",
    function_name: "firstItemName",
    broken_code: `function firstItemName(items) {
    return items[0].name;
}`,
    correct_code: `function firstItemName(items) {
    return items.length > 0 ? items[0].name : "None";
}`,
    problem_description:
      'firstItemName(items) should return the name of the first item, or "None" when the list is empty.',
    symptom_description:
      "Passing an empty array throws \"Cannot read properties of undefined (reading 'name')\".",
    explanation:
      "Indexing past the end of an array gives undefined rather than throwing, so the error surfaces one step later when .name is read from it. Guard on the array being non-empty before reaching into it. The lesson generalises: in JavaScript an out-of-range index fails silently, and you find out at the next property access.",
    test_cases: [
      { input: [[{ name: "first" }, { name: "second" }]], expected_output: "first" },
      { input: [[]], expected_output: "None" },
    ],
    hints: [
      "What does items[0] evaluate to when the array has nothing in it?",
      "The return line assumes there is always a first item.",
      "Check items.length before reading items[0].name, and return \"None\" otherwise.",
    ],
  },
  {
    title: "Optional middle name breaks the full name",
    language: "python",
    bug_category: "null_or_undefined",
    difficulty: "medium",
    function_name: "full_name",
    broken_code: `def full_name(user):
    return user["first"] + " " + user["middle"] + " " + user["last"]`,
    correct_code: `def full_name(user):
    parts = [user["first"], user.get("middle"), user["last"]]
    return " ".join(p for p in parts if p)`,
    problem_description:
      'full_name(user) should join a user\'s name parts with single spaces, skipping the middle name when there isn\'t one.',
    symptom_description:
      'A user without a "middle" key crashes with KeyError, and one whose middle name is None crashes with a TypeError.',
    explanation:
      "The code assumes every optional field is both present and a string. Two separate failure modes hide here: a missing key raises KeyError, and a present-but-None value fails to concatenate. Collecting the parts and filtering out the falsy ones handles both at once, and keeps the spacing correct instead of leaving a double space.",
    test_cases: [
      { input: [{ first: "Ada", middle: "Byron", last: "Lovelace" }], expected_output: "Ada Byron Lovelace" },
      { input: [{ first: "Alan", last: "Turing" }], expected_output: "Alan Turing" },
      { input: [{ first: "Grace", middle: null, last: "Hopper" }], expected_output: "Grace Hopper" },
    ],
    hints: [
      "There are two different ways this breaks — try a user with no middle key, then one whose middle is None.",
      "Both failures come from the same line assuming every part exists and is a string.",
      'Gather the parts into a list, drop the empty ones, and " ".join() what remains.',
    ],
  },
  {
    title: "Total score comes out as NaN",
    language: "javascript",
    bug_category: "null_or_undefined",
    difficulty: "medium",
    function_name: "sumScores",
    broken_code: `function sumScores(players) {
    let total = 0;
    for (const player of players) {
        total += player.score;
    }
    return total;
}`,
    correct_code: `function sumScores(players) {
    let total = 0;
    for (const player of players) {
        total += player.score ?? 0;
    }
    return total;
}`,
    problem_description:
      "sumScores(players) should add up every player's score, treating a player with no score as 0.",
    symptom_description:
      "As soon as one player is missing a score, the total becomes NaN instead of a number.",
    explanation:
      "Reading a missing property gives undefined, and undefined + number is NaN. Worse, NaN is contagious: once it enters the running total every later addition stays NaN, so one bad record poisons the whole result. Default the value at the point you read it.",
    test_cases: [
      { input: [[{ score: 10 }, { score: 20 }]], expected_output: 30 },
      { input: [[{ score: 10 }, {}, { score: 5 }]], expected_output: 15 },
      { input: [[]], expected_output: 0 },
    ],
    hints: [
      "What is the value of player.score for a player object with no score property?",
      "Once the total becomes NaN it never recovers — look at what is being added.",
      "Use player.score ?? 0 so a missing score contributes zero instead of undefined.",
    ],
  },

  // ── logic_error ───────────────────────────────────────────────────────
  {
    title: "Leap year check gets century years wrong",
    language: "python",
    bug_category: "logic_error",
    difficulty: "medium",
    function_name: "is_leap_year",
    broken_code: `def is_leap_year(year):
    return year % 4 == 0 and year % 100 != 0`,
    correct_code: `def is_leap_year(year):
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)`,
    problem_description:
      "is_leap_year(year) should return True for leap years: divisible by 4, except centuries, unless divisible by 400.",
    symptom_description: "is_leap_year(2000) returns False, even though 2000 was a leap year.",
    explanation:
      "The rule has three parts and the code only implements two. Years divisible by 100 are excluded — correct for 1900 — but the exception to that exception is missing: years divisible by 400 are leap years after all. Whenever a spec says 'except… unless…', make sure every clause made it into the code.",
    test_cases: [
      { input: [2000], expected_output: true },
      { input: [1900], expected_output: false },
      { input: [2024], expected_output: true },
      { input: [2023], expected_output: false },
    ],
    hints: [
      "Test a year divisible by 400, like 2000. What should it be, and what do you get?",
      "The rule has three clauses; the code has two.",
      "Add the exception: divisible by 400 makes it a leap year even though it is divisible by 100.",
    ],
  },
  {
    title: "Free shipping threshold is off by a cent",
    language: "javascript",
    bug_category: "logic_error",
    difficulty: "easy",
    function_name: "qualifiesForFreeShipping",
    broken_code: `function qualifiesForFreeShipping(total) {
    return total > 50;
}`,
    correct_code: `function qualifiesForFreeShipping(total) {
    return total >= 50;
}`,
    problem_description:
      "qualifiesForFreeShipping(total) should return true when the order total is 50 or more — spending exactly 50 qualifies.",
    symptom_description: "An order of exactly 50 returns false, so customers hitting the threshold are still charged.",
    explanation:
      "'50 or more' includes 50 itself, which means >= rather than >. Boundary conditions are where requirements and code most often drift apart, and they rarely show up in casual testing because people try 49 and 51, not 50. When a spec says 'at least' or 'or more', the comparison is inclusive.",
    test_cases: [
      { input: [50], expected_output: true },
      { input: [49.99], expected_output: false },
      { input: [75], expected_output: true },
    ],
    hints: [
      "Try an order for exactly the threshold amount.",
      "The comparison operator on the return line excludes one value it shouldn't.",
      '"50 or more" includes 50, so use >= instead of >.',
    ],
  },
  {
    title: "Grade boundaries return the wrong letter",
    language: "python",
    bug_category: "logic_error",
    difficulty: "medium",
    function_name: "grade",
    broken_code: `def grade(score):
    if score >= 60:
        return "D"
    elif score >= 70:
        return "C"
    elif score >= 80:
        return "B"
    elif score >= 90:
        return "A"
    return "F"`,
    correct_code: `def grade(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    return "F"`,
    problem_description:
      'grade(score) should return "A" for 90+, "B" for 80-89, "C" for 70-79, "D" for 60-69, and "F" below 60.',
    symptom_description: 'A score of 95 returns "D" instead of "A".',
    explanation:
      "In an if/elif chain the first matching branch wins, so the order of the conditions is part of the logic. Because 95 >= 60 is true, the chain stops at the very first branch and never reaches the check for 90. Overlapping ranges must be tested from the most restrictive to the least — highest threshold first.",
    test_cases: [
      { input: [95], expected_output: "A" },
      { input: [85], expected_output: "B" },
      { input: [72], expected_output: "C" },
      { input: [45], expected_output: "F" },
    ],
    hints: [
      "Walk through what happens for a score of 95, condition by condition.",
      "Every branch after the first is unreachable for high scores. Why?",
      "In an if/elif chain the first true branch wins — check the highest threshold first.",
    ],
  },

  // ── infinite_loop ─────────────────────────────────────────────────────
  {
    title: "Digit sum never finishes",
    language: "python",
    bug_category: "infinite_loop",
    difficulty: "medium",
    function_name: "sum_digits",
    broken_code: `def sum_digits(n):
    total = 0
    while n > 0:
        total += n % 10
    return total`,
    correct_code: `def sum_digits(n):
    total = 0
    while n > 0:
        total += n % 10
        n //= 10
    return total`,
    problem_description: "sum_digits(n) should add up the digits of a number, so sum_digits(123) gives 6.",
    symptom_description: "Calling sum_digits(123) hangs and never returns.",
    explanation:
      "The loop reads the last digit with n % 10 but never removes it, so n keeps its original value and the condition n > 0 stays true forever. Digit-extraction loops need both halves: read the last digit, then drop it with integer division. Any while loop should make you ask what changes the condition.",
    test_cases: [
      { input: [123], expected_output: 6 },
      { input: [9], expected_output: 9 },
      { input: [4070], expected_output: 11 },
    ],
    hints: [
      "The loop condition depends on n. Does anything in the body change n?",
      "You read the last digit, but never remove it.",
      "Add n //= 10 after the addition so the number shrinks each pass.",
    ],
  },
  {
    title: "Reversing a string hangs the tab",
    language: "javascript",
    bug_category: "infinite_loop",
    difficulty: "medium",
    function_name: "reverseString",
    broken_code: `function reverseString(text) {
    let out = "";
    let i = text.length - 1;
    while (i >= 0) {
        out += text[i];
    }
    return out;
}`,
    correct_code: `function reverseString(text) {
    let out = "";
    let i = text.length - 1;
    while (i >= 0) {
        out += text[i];
        i--;
    }
    return out;
}`,
    problem_description: 'reverseString(text) should return the string backwards, so "abc" becomes "cba".',
    symptom_description: 'Calling reverseString("abc") freezes and never returns a value.',
    explanation:
      "The index i is initialised and tested but never decremented, so the same character is appended forever and i >= 0 never becomes false. Manual index loops need three pieces — initialise, test, and step — and it's the step that's easiest to leave out when the loop body is doing something interesting.",
    test_cases: [
      { input: ["abc"], expected_output: "cba" },
      { input: ["a"], expected_output: "a" },
      { input: ["debug"], expected_output: "gubed" },
    ],
    hints: [
      "Which variable does the loop condition depend on, and where is it changed?",
      "The loop body appends a character but never moves the index.",
      "Add i-- inside the loop so i eventually drops below 0.",
    ],
  },
  {
    title: "Duplicate removal spins forever",
    language: "javascript",
    bug_category: "infinite_loop",
    difficulty: "hard",
    function_name: "dedupe",
    broken_code: `function dedupe(arr) {
    const out = [];
    let i = 0;
    while (i < arr.length) {
        if (!out.includes(arr[i])) {
            out.push(arr[i]);
        }
    }
    return out;
}`,
    correct_code: `function dedupe(arr) {
    const out = [];
    let i = 0;
    while (i < arr.length) {
        if (!out.includes(arr[i])) {
            out.push(arr[i]);
        }
        i++;
    }
    return out;
}`,
    problem_description:
      "dedupe(arr) should return the array with duplicates removed, keeping the first occurrence of each value.",
    symptom_description: "Calling dedupe([1,2,2,3]) hangs — it never gets past the first element.",
    explanation:
      "The index i is never incremented, so the loop re-tests position 0 forever — the first item gets added once, then the `includes` check keeps rejecting it while i stays put. A for...of loop would have advanced automatically; a manual while loop needs you to step the index yourself, and it's easy to forget when the body already has an if inside it.",
    test_cases: [
      { input: [[1, 2, 2, 3]], expected_output: [1, 2, 3] },
      { input: [[1, 1, 1]], expected_output: [1] },
      { input: [[]], expected_output: [] },
    ],
    hints: [
      "Trace the first two iterations by hand. What is i each time?",
      "The loop condition depends on i, and nothing in the body changes it.",
      "Add i++ at the end of the loop body so it advances through the array.",
    ],
  },

  // ── type_error ────────────────────────────────────────────────────────
  {
    title: "Sorting numbers puts 10 before 9",
    language: "javascript",
    bug_category: "type_error",
    difficulty: "medium",
    function_name: "sortNumbers",
    broken_code: `function sortNumbers(nums) {
    return nums.sort();
}`,
    correct_code: `function sortNumbers(nums) {
    return nums.sort((a, b) => a - b);
}`,
    problem_description: "sortNumbers(nums) should return the numbers sorted from smallest to largest.",
    symptom_description: "sortNumbers([10, 9, 100, 1]) returns [1, 10, 100, 9] — 9 ends up last.",
    explanation:
      "Array.sort() converts each element to a string and sorts lexicographically, so \"10\" sorts before \"9\" the same way \"apple\" sorts before \"banana\". Numeric sorting needs an explicit comparator, (a, b) => a - b. The default behaviour surprises almost everyone because it looks right for single-digit arrays.",
    test_cases: [
      { input: [[10, 9, 100, 1]], expected_output: [1, 9, 10, 100] },
      { input: [[3, 1, 2]], expected_output: [1, 2, 3] },
      { input: [[20, 3]], expected_output: [3, 20] },
    ],
    hints: [
      "Look closely at where 9 ends up relative to 10 and 100. Does that ordering look like anything else you know?",
      "sort() with no arguments does not compare numbers the way you'd expect.",
      "Pass a comparator: nums.sort((a, b) => a - b).",
    ],
  },
  {
    title: "Average always comes back as a whole number",
    language: "python",
    bug_category: "type_error",
    difficulty: "easy",
    function_name: "average",
    broken_code: `def average(nums):
    return sum(nums) // len(nums)`,
    correct_code: `def average(nums):
    return sum(nums) / len(nums)`,
    problem_description: "average(nums) should return the mean of a list of numbers, including any fractional part.",
    symptom_description: "average([1, 2]) returns 1 instead of 1.5 — the decimal part disappears.",
    explanation:
      "// is floor division: it discards the remainder and returns a whole number. Regular division with / keeps the fractional part. The two look almost identical when skimming code, and the bug only shows up for inputs that don't divide evenly — which is exactly why [2, 4] would have passed a casual test.",
    test_cases: [
      { input: [[1, 2]], expected_output: 1.5 },
      { input: [[2, 4]], expected_output: 3 },
      { input: [[1, 2, 4]], expected_output: 2.3333333333333335 },
    ],
    hints: [
      "Try a list whose values don't divide evenly and compare with what you'd expect.",
      "There are two division operators in Python. Which one is used here?",
      "// floors the result. Use / to keep the fractional part.",
    ],
  },
  {
    title: "Counting votes concatenates instead of adding",
    language: "javascript",
    bug_category: "type_error",
    difficulty: "medium",
    function_name: "countVotes",
    broken_code: `function countVotes(entries) {
    let total = 0;
    for (const entry of entries) {
        total += entry.votes;
    }
    return total;
}`,
    correct_code: `function countVotes(entries) {
    let total = 0;
    for (const entry of entries) {
        total += Number(entry.votes);
    }
    return total;
}`,
    problem_description:
      "countVotes(entries) should add up the votes field of every entry and return the numeric total.",
    symptom_description:
      'countVotes with votes of "3" and "4" returns "034" instead of 7 — the digits are strung together.',
    explanation:
      "The vote counts arrive as strings, and + means concatenation as soon as either operand is a string. Because the running total becomes a string on the very first addition, every later one concatenates too. Convert at the boundary where untrusted data enters your arithmetic, with Number() or parseInt(value, 10).",
    test_cases: [
      { input: [[{ votes: "3" }, { votes: "4" }]], expected_output: 7 },
      { input: [[{ votes: "10" }, { votes: "5" }, { votes: "1" }]], expected_output: 16 },
      { input: [[]], expected_output: 0 },
    ],
    hints: [
      "What type is entry.votes? Look at the quotes in the test cases.",
      "In JavaScript + does two different jobs depending on the operand types.",
      "Wrap the value in Number() before adding it to the total.",
    ],
  },

  // ── scope_error ───────────────────────────────────────────────────────
  {
    title: "Every callback reports the same index",
    language: "javascript",
    bug_category: "scope_error",
    difficulty: "hard",
    function_name: "collectIndexes",
    broken_code: `function collectIndexes(n) {
    const out = [];
    const pending = [];
    for (var i = 0; i < n; i++) {
        pending.push(new Promise((resolve) => {
            setTimeout(() => { out.push(i); resolve(); }, 1);
        }));
    }
    return Promise.all(pending).then(() => out);
}`,
    correct_code: `function collectIndexes(n) {
    const out = [];
    const pending = [];
    for (let i = 0; i < n; i++) {
        pending.push(new Promise((resolve) => {
            setTimeout(() => { out.push(i); resolve(); }, 1);
        }));
    }
    return Promise.all(pending).then(() => out);
}`,
    problem_description:
      "collectIndexes(n) should schedule one callback per index and resolve to the list of indexes, so collectIndexes(3) gives [0, 1, 2].",
    symptom_description: "collectIndexes(3) resolves to [3, 3, 3] — every callback reports the final value.",
    explanation:
      "`var` is function-scoped, so all three callbacks close over the *same* i, and by the time the timeouts fire the loop has finished and i is 3. `let` is block-scoped and creates a fresh binding per iteration, so each callback captures its own value. This is the single most famous JavaScript closure bug, and it only appears when the callback runs later than the loop.",
    test_cases: [
      { input: [3], expected_output: [0, 1, 2] },
      { input: [1], expected_output: [0] },
    ],
    hints: [
      "The callbacks run after the loop has already finished. What is i by then?",
      "All the callbacks are sharing one variable rather than each getting their own.",
      "var is function-scoped; let creates a new binding per iteration. Change var i to let i.",
    ],
  },
  {
    title: "Shopping list remembers items between calls",
    language: "python",
    bug_category: "scope_error",
    difficulty: "hard",
    function_name: "make_baskets",
    broken_code: `def add_item(item, basket=[]):
    basket.append(item)
    return basket

def make_baskets(first, second):
    return [add_item(first), add_item(second)]`,
    correct_code: `def add_item(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket

def make_baskets(first, second):
    return [add_item(first), add_item(second)]`,
    problem_description:
      'make_baskets(first, second) should start a separate basket for each item, so make_baskets("apple", "bread") gives [["apple"], ["bread"]].',
    symptom_description:
      'make_baskets("apple", "bread") returns [["apple", "bread"], ["apple", "bread"]] — both baskets hold both items.',
    explanation:
      "A default argument is evaluated once, when the function is defined, not on every call. So every call that omits `basket` shares one list that keeps growing for the lifetime of the program. The fix is the standard Python idiom: default to None and build a new list inside the function. Never use a mutable value as a default argument.",
    test_cases: [
      { input: ["apple", "bread"], expected_output: [["apple"], ["bread"]] },
      { input: ["milk", "eggs"], expected_output: [["milk"], ["eggs"]] },
    ],
    hints: [
      "Both baskets contain the same two items. Are they even two different lists?",
      "When exactly does Python evaluate the default value in a function signature — once, or on every call?",
      "Default to None and create the list inside the function body.",
    ],
  },
  {
    title: "Discounted price is unreachable outside the branch",
    language: "javascript",
    bug_category: "scope_error",
    difficulty: "medium",
    function_name: "finalPrice",
    broken_code: `function finalPrice(price, isMember) {
    if (isMember) {
        const discounted = price * 0.9;
    } else {
        const discounted = price;
    }
    return discounted;
}`,
    correct_code: `function finalPrice(price, isMember) {
    let discounted;
    if (isMember) {
        discounted = price * 0.9;
    } else {
        discounted = price;
    }
    return discounted;
}`,
    problem_description:
      "finalPrice(price, isMember) should apply a 10% discount for members and return the price to pay.",
    symptom_description: "Every call throws: ReferenceError: discounted is not defined.",
    explanation:
      "`const` and `let` are block-scoped, so a variable declared inside an if or else block does not exist outside it — the two declarations here are separate variables, both gone by the time the return runs. Declare once in the enclosing scope and assign inside the branches.",
    test_cases: [
      { input: [100, true], expected_output: 90 },
      { input: [100, false], expected_output: 100 },
      { input: [50, true], expected_output: 45 },
    ],
    hints: [
      "Which block is discounted declared in, and which block is it read from?",
      "There are two separate declarations here, not one variable assigned twice.",
      "Declare `let discounted;` before the if, then assign inside each branch.",
    ],
  },

  // ── async_race_condition ──────────────────────────────────────────────
  {
    title: "forEach finishes before the work does",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "hard",
    function_name: "doubleAll",
    broken_code: `function fetchDouble(n) {
    return new Promise((resolve) => setTimeout(() => resolve(n * 2), 5));
}

async function doubleAll(nums) {
    const results = [];
    nums.forEach(async (n) => {
        results.push(await fetchDouble(n));
    });
    return results;
}`,
    correct_code: `function fetchDouble(n) {
    return new Promise((resolve) => setTimeout(() => resolve(n * 2), 5));
}

async function doubleAll(nums) {
    const results = [];
    for (const n of nums) {
        results.push(await fetchDouble(n));
    }
    return results;
}`,
    problem_description: "doubleAll(nums) should resolve to a list with every number doubled.",
    symptom_description: "doubleAll([1, 2, 3]) resolves to an empty array instead of [2, 4, 6].",
    explanation:
      "forEach ignores the promise its callback returns, so it fires all three callbacks and moves on immediately — the function returns while every await is still pending. Array.forEach is simply not async-aware. Use a for...of loop with await inside, or Promise.all with map when the work can run in parallel.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: [2, 4, 6] },
      { input: [[5]], expected_output: [10] },
    ],
    hints: [
      "The results array is empty, not wrong — so the pushes hadn't happened yet when it was returned.",
      "Does forEach wait for an async callback to finish before moving on?",
      "forEach ignores returned promises. Use a for...of loop with await, or Promise.all(nums.map(...)).",
    ],
  },
  {
    title: "Missing await turns the total into text",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "medium",
    function_name: "sumDelayed",
    broken_code: `function delay(n) {
    return new Promise((resolve) => setTimeout(() => resolve(n), 1));
}

async function sumDelayed(nums) {
    let total = 0;
    for (const n of nums) {
        total += delay(n);
    }
    return total;
}`,
    correct_code: `function delay(n) {
    return new Promise((resolve) => setTimeout(() => resolve(n), 1));
}

async function sumDelayed(nums) {
    let total = 0;
    for (const n of nums) {
        total += await delay(n);
    }
    return total;
}`,
    problem_description:
      "sumDelayed(nums) should add up numbers that each arrive asynchronously, resolving to the total.",
    symptom_description:
      'sumDelayed([1, 2, 3]) resolves to "0[object Promise][object Promise][object Promise]" instead of 6.',
    explanation:
      "delay() returns a Promise, and without await you add the Promise object itself rather than its resolved value. JavaScript coerces it to the string \"[object Promise]\", so the total silently becomes text instead of throwing. A result containing \"[object Promise]\" is almost always a missing await.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: 6 },
      { input: [[10]], expected_output: 10 },
      { input: [[]], expected_output: 0 },
    ],
    hints: [
      "Look at the exact text in the result — what type is being added to the total?",
      "delay() hands back a Promise, not a number.",
      "Add await before delay(n) so the resolved value is what gets added.",
    ],
  },
  {
    title: "map returns promises instead of values",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "medium",
    function_name: "wordLengths",
    broken_code: `async function wordLengths(words) {
    return words.map(async (word) => word.length);
}`,
    correct_code: `async function wordLengths(words) {
    return Promise.all(words.map(async (word) => word.length));
}`,
    problem_description: "wordLengths(words) should resolve to a list of each word's length.",
    symptom_description: 'wordLengths(["abc", "defg"]) resolves to [{}, {}] instead of [3, 4].',
    explanation:
      "An async callback always returns a Promise, so map produces an array *of Promises*, and awaiting the outer function only unwraps one layer — not the promises inside the array. Promise.all turns an array of promises into a promise of an array, which is what you actually want.",
    test_cases: [
      { input: [["abc", "defg"]], expected_output: [3, 4] },
      { input: [["hi"]], expected_output: [2] },
    ],
    hints: [
      "The array has the right number of entries but the wrong contents. What are those entries?",
      "An async function always returns a Promise — even a one-line one inside map.",
      "Wrap the mapped array in Promise.all() so every inner promise resolves.",
    ],
  },

  // ── other ─────────────────────────────────────────────────────────────
  {
    title: "Copying settings changes the original",
    language: "python",
    bug_category: "other",
    difficulty: "hard",
    function_name: "with_theme",
    broken_code: `def with_theme(settings, theme):
    updated = settings.copy()
    updated["display"]["theme"] = theme
    return updated["display"]["theme"] + "|" + settings["display"]["theme"]`,
    correct_code: `import copy

def with_theme(settings, theme):
    updated = copy.deepcopy(settings)
    updated["display"]["theme"] = theme
    return updated["display"]["theme"] + "|" + settings["display"]["theme"]`,
    problem_description:
      'with_theme(settings, theme) should return a copy with a new theme, leaving the original untouched. It returns "newtheme|originaltheme" so you can see both.',
    symptom_description:
      'Both halves come back the same — "dark|dark" — showing the original was modified too.',
    explanation:
      "dict.copy() is a shallow copy: the new dict has its own top level, but the nested dicts are the *same objects* as the original's. Mutating settings['display'] therefore changes both. copy.deepcopy() recursively copies the nested structures. Shallow-copy bugs are nasty because the code looks defensive and passes any test using flat data.",
    test_cases: [
      { input: [{ display: { theme: "light" } }, "dark"], expected_output: "dark|light" },
      { input: [{ display: { theme: "blue" } }, "red"], expected_output: "red|blue" },
    ],
    hints: [
      "The original was supposed to stay unchanged. Check whether .copy() protects nested values.",
      "copy() duplicates the outer dict only — the inner dict is shared between both.",
      "Use copy.deepcopy(settings) so nested dictionaries are copied too.",
    ],
  },
  {
    title: "Removing items skips every other one",
    language: "python",
    bug_category: "other",
    difficulty: "hard",
    function_name: "remove_evens",
    broken_code: `def remove_evens(nums):
    for n in nums:
        if n % 2 == 0:
            nums.remove(n)
    return nums`,
    correct_code: `def remove_evens(nums):
    return [n for n in nums if n % 2 != 0]`,
    problem_description: "remove_evens(nums) should return the list with all even numbers removed.",
    symptom_description: "remove_evens([2, 4, 6, 1]) returns [4, 1] — one of the even numbers survives.",
    explanation:
      "Removing from a list while iterating over it shifts every later element down one position, but the loop's internal index still advances — so the element that slid into the removed slot is skipped entirely. Never mutate a collection you're iterating. Build a new list instead, which a comprehension does cleanly.",
    test_cases: [
      { input: [[2, 4, 6, 1]], expected_output: [1] },
      { input: [[1, 3]], expected_output: [1, 3] },
      { input: [[2, 2]], expected_output: [] },
    ],
    hints: [
      "Which even number survives, and where was it sitting relative to the one removed before it?",
      "The list is being changed while the loop is walking through it.",
      "Build a new list with a comprehension instead of removing from the one you're iterating.",
    ],
  },
  {
    title: "Money totals gain a fraction of a cent",
    language: "javascript",
    bug_category: "other",
    difficulty: "medium",
    function_name: "addPrices",
    broken_code: `function addPrices(a, b) {
    return a + b;
}`,
    correct_code: `function addPrices(a, b) {
    return Math.round((a + b) * 100) / 100;
}`,
    problem_description:
      "addPrices(a, b) should add two prices in dollars and return a value correct to the cent.",
    symptom_description: "addPrices(0.1, 0.2) returns 0.30000000000000004 instead of 0.3.",
    explanation:
      "Floating-point numbers can't represent 0.1 or 0.2 exactly in binary, so the sum lands a hair off. This isn't a JavaScript quirk — it's how IEEE-754 works in nearly every language. For money, either round to the required precision after arithmetic, or work in integer cents and divide only when displaying.",
    test_cases: [
      { input: [0.1, 0.2], expected_output: 0.3 },
      { input: [1.005, 2.005], expected_output: 3.01 },
      { input: [5, 5], expected_output: 10 },
    ],
    hints: [
      "Look at the exact digits in the result — how far off is it, really?",
      "This is about how computers store decimal fractions in binary.",
      "Round after the arithmetic: Math.round((a + b) * 100) / 100.",
    ],
  },
  {
    title: "Flatten only unwraps one level",
    language: "javascript",
    bug_category: "other",
    difficulty: "medium",
    function_name: "flattenDeep",
    broken_code: `function flattenDeep(arr) {
    return arr.flat();
}`,
    correct_code: `function flattenDeep(arr) {
    return arr.flat(Infinity);
}`,
    problem_description:
      "flattenDeep(arr) should flatten a nested array completely, however many levels deep it goes.",
    symptom_description: "flattenDeep([1, [2, [3, [4]]]]) returns [1, 2, [3, [4]]] — still nested.",
    explanation:
      "Array.flat() defaults to a depth of 1, so it removes exactly one level of nesting no matter how deep the structure is. Passing Infinity flattens all the way down. Defaults like this are easy to miss because the shallow case works perfectly, and the bug only appears once the data gets deeper.",
    test_cases: [
      { input: [[1, [2, [3, [4]]]]], expected_output: [1, 2, 3, 4] },
      { input: [[1, [2]]], expected_output: [1, 2] },
      { input: [[[[5]]]], expected_output: [5] },
    ],
    hints: [
      "It worked partially — exactly how many levels did it remove?",
      "flat() takes an argument you're not passing.",
      "flat() defaults to depth 1. Pass Infinity to flatten completely.",
    ],
  },
  {
    title: "Uppercasing a string does nothing",
    language: "python",
    bug_category: "other",
    difficulty: "easy",
    function_name: "shout",
    broken_code: `def shout(text):
    text.upper()
    return text`,
    correct_code: `def shout(text):
    return text.upper()`,
    problem_description: 'shout(text) should return the text in uppercase, so "hello" becomes "HELLO".',
    symptom_description: 'shout("hello") returns "hello" unchanged.',
    explanation:
      "Strings are immutable in Python, so .upper() cannot modify text in place — it returns a new string, and here that return value is discarded. Any string method that looks like it 'does something' actually hands back a new string you have to keep. The same trap applies to .strip(), .replace() and friends.",
    test_cases: [
      { input: ["hello"], expected_output: "HELLO" },
      { input: ["Debug"], expected_output: "DEBUG" },
      { input: [""], expected_output: "" },
    ],
    hints: [
      "The call to upper() runs — so where does its result go?",
      "Strings in Python cannot be changed in place.",
      "upper() returns a new string. Return it directly instead of discarding it.",
    ],
  },

  // ── extras rounding out the thinner categories ────────────────────────
  {
    title: "Capitalise repeats the first letter",
    language: "javascript",
    bug_category: "off_by_one",
    difficulty: "easy",
    function_name: "capitalize",
    broken_code: `function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(0);
}`,
    correct_code: `function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}`,
    problem_description: 'capitalize(word) should upper-case the first letter, so "debug" becomes "Debug".',
    symptom_description: 'capitalize("debug") returns "Ddebug" — the first letter appears twice.',
    explanation:
      "slice(0) returns the whole string, including the character that was already upper-cased and prepended. It needs to start from index 1 so the remainder excludes the first letter. An index of 0 where 1 was meant is one of the quietest off-by-one bugs, because the output looks almost right.",
    test_cases: [
      { input: ["debug"], expected_output: "Debug" },
      { input: ["a"], expected_output: "A" },
      { input: ["hello world"], expected_output: "Hello world" },
    ],
    hints: [
      "Compare the output to the input letter by letter. What got duplicated?",
      "The slice is returning more of the string than intended.",
      "The first character is already handled, so the rest should start at index 1: slice(1).",
    ],
  },
  {
    title: "Grouping keeps only the last match",
    language: "javascript",
    bug_category: "logic_error",
    difficulty: "medium",
    function_name: "groupByLength",
    broken_code: `function groupByLength(words) {
    const groups = {};
    for (const word of words) {
        groups[word.length] = [word];
    }
    return groups;
}`,
    correct_code: `function groupByLength(words) {
    const groups = {};
    for (const word of words) {
        if (!groups[word.length]) {
            groups[word.length] = [];
        }
        groups[word.length].push(word);
    }
    return groups;
}`,
    problem_description:
      'groupByLength(words) should group words by their length, so ["ab","cd","x"] gives {"1":["x"],"2":["ab","cd"]}.',
    symptom_description: 'Each group only ever holds one word — ["ab","cd"] gives {"2":["cd"]}, losing "ab".',
    explanation:
      "Assigning a fresh single-item array replaces whatever was already stored under that key, so each group only keeps the last word seen. Grouping needs accumulation: create the array once if it's missing, then push onto it. The distinction between assigning and appending is what separates a grouping from a lookup.",
    test_cases: [
      { input: [["ab", "cd", "x"]], expected_output: { 1: ["x"], 2: ["ab", "cd"] } },
      { input: [["a"]], expected_output: { 1: ["a"] } },
    ],
    hints: [
      "Each group holds exactly one word. Which one — the first or the last?",
      "The assignment inside the loop overwrites whatever was there before.",
      "Create the array only if it doesn't exist yet, then push onto it instead of assigning.",
    ],
  },
  {
    title: "Word count breaks on double spaces",
    language: "python",
    bug_category: "logic_error",
    difficulty: "easy",
    function_name: "count_words",
    broken_code: `def count_words(text):
    return len(text.split(" "))`,
    correct_code: `def count_words(text):
    return len(text.split())`,
    problem_description: "count_words(text) should count the words in a string, however much whitespace separates them.",
    symptom_description: 'count_words("hello  world") returns 3 instead of 2 — the double space is counted as a word.',
    explanation:
      'split(" ") splits on every single space, so consecutive spaces produce empty strings between them. Calling split() with no argument splits on any run of whitespace and discards the empties — which is almost always what you want for words. The two forms look interchangeable until the input has irregular spacing.',
    test_cases: [
      { input: ["hello  world"], expected_output: 2 },
      { input: ["one two three"], expected_output: 3 },
      { input: ["single"], expected_output: 1 },
    ],
    hints: [
      "Try a string with two spaces in a row and print the list that split produces.",
      "Splitting on a literal single space leaves empty strings behind.",
      "Call split() with no arguments — it splits on any whitespace and drops the empties.",
    ],
  },
  {
    title: "Merging settings mutates the defaults",
    language: "python",
    bug_category: "other",
    difficulty: "medium",
    function_name: "merge_settings",
    broken_code: `def merge_settings(defaults, overrides):
    defaults.update(overrides)
    return str(defaults.get("mode")) + "|" + str(len(defaults))`,
    correct_code: `def merge_settings(defaults, overrides):
    merged = dict(defaults)
    merged.update(overrides)
    return str(merged.get("mode")) + "|" + str(len(defaults))`,
    problem_description:
      'merge_settings(defaults, overrides) should merge overrides on top of defaults without changing the defaults. It returns "mode|numberOfDefaultKeys" so you can see both.',
    symptom_description:
      'The key count reflects the merged result rather than the original defaults — merging a brand-new key into a one-key defaults dict reports 2 instead of 1.',
    explanation:
      "dict.update() modifies the dictionary it's called on, in place. Since `defaults` was passed in by the caller, the caller's dictionary is changed too — a side effect the function name doesn't advertise. Copy first with dict(defaults), then update the copy. Functions that quietly mutate their arguments are a classic source of action-at-a-distance bugs.",
    test_cases: [
      { input: [{ mode: "light" }, { size: "big" }], expected_output: "light|1" },
      { input: [{ mode: "light" }, { mode: "dark", size: "big" }], expected_output: "dark|1" },
    ],
    hints: [
      "The merge itself is right — check whether the defaults you passed in survived unchanged.",
      "update() works in place on the dictionary it is called on.",
      "Copy first with dict(defaults), then update the copy and return that.",
    ],
  },
];
