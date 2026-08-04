// Single source of truth for BugHunt's seeded challenges. Consumed by:
//   - scripts/generate-seed-sql.mjs (emits the INSERT statements)
//   - scripts/verify-challenges.mjs (executes every broken/correct pair and
//     asserts broken fails at least one test and correct passes all of them)
//
// The first two entries (alreadySeeded: true) were already inserted in
// Phase 1 via supabase/seed_phase1_smoke_test.sql — they're included here
// so the validation page re-checks them too, but the SQL generator skips
// re-inserting them to avoid duplicate rows.

export const CHALLENGES = [
  {
    alreadySeeded: true,
    title: "Off-by-one in range sum",
    language: "python",
    bug_category: "off_by_one",
    difficulty: "easy",
    function_name: "sum_range",
    broken_code: `def sum_range(n):
    total = 0
    for i in range(1, n):
        total += i
    return total`,
    correct_code: `def sum_range(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total`,
    problem_description: "sum_range(n) should return the sum of all integers from 1 to n, inclusive.",
    symptom_description: "sum_range(5) returns 10 instead of 15 — the last number is never added.",
    explanation:
      "range(1, n) stops before n, excluding it from the loop. This is one of the most common off-by-one mistakes: forgetting that Python's range() upper bound is exclusive.",
    test_cases: [
      { input: [5], expected_output: 15 },
      { input: [1], expected_output: 1 },
      { input: [10], expected_output: 55 },
    ],
    hints: [
      "Look closely at the loop bounds — does the loop actually visit every number it needs to?",
      "The bug is in the range() call on the for loop line.",
      "range(1, n) produces 1, 2, ..., n-1. To include n itself you need range(1, n + 1).",
    ],
  },
  {
    alreadySeeded: true,
    title: "Null check missing before property access",
    language: "javascript",
    bug_category: "null_or_undefined",
    difficulty: "easy",
    function_name: "getUserCity",
    broken_code: `function getUserCity(user) {
    return user.address.city;
}`,
    correct_code: `function getUserCity(user) {
    return user.address ? user.address.city : "Unknown";
}`,
    problem_description:
      'getUserCity(user) should return the user\'s city, or "Unknown" if the user has no address on file.',
    symptom_description:
      "Calling getUserCity on a user without an address throws \"Cannot read properties of undefined (reading 'city')\".",
    explanation:
      'Accessing a nested property without checking that the parent exists first is a classic null/undefined bug. Guard with a conditional check or optional chaining (user.address?.city ?? "Unknown").',
    test_cases: [
      { input: [{ address: { city: "Boston" } }], expected_output: "Boston" },
      { input: [{}], expected_output: "Unknown" },
    ],
    hints: [
      "What happens when you access a property on something that doesn't exist?",
      "The problem is on the line that reads user.address.city.",
      'Check whether user.address exists before reading .city from it — e.g. user.address ? user.address.city : "Unknown".',
    ],
  },
  {
    title: "Countdown that never ends",
    language: "python",
    bug_category: "infinite_loop",
    difficulty: "medium",
    function_name: "countdown",
    broken_code: `def countdown(n):
    result = []
    while n > 0:
        result.append(n)
    return result`,
    correct_code: `def countdown(n):
    result = []
    while n > 0:
        result.append(n)
        n -= 1
    return result`,
    problem_description: "countdown(n) should return a list counting down from n to 1, e.g. countdown(3) -> [3, 2, 1].",
    symptom_description: "Calling countdown(3) freezes and never returns.",
    explanation:
      "The loop condition (n > 0) never changes because n is never decremented inside the loop, so it runs forever. Every loop needs its condition to eventually become false — always double-check that whatever the condition depends on actually changes each iteration.",
    test_cases: [
      { input: [3], expected_output: [3, 2, 1] },
      { input: [1], expected_output: [1] },
    ],
    hints: [
      "The loop condition depends on n — does anything inside the loop ever change n?",
      "Look at the while loop body — something is missing after result.append(n).",
      "Add n -= 1 inside the loop so n eventually reaches 0 and the condition becomes false.",
    ],
  },
  {
    title: "isEven that returns the opposite",
    language: "javascript",
    bug_category: "logic_error",
    difficulty: "easy",
    function_name: "isEven",
    broken_code: `function isEven(n) {
    return n % 2 === 1;
}`,
    correct_code: `function isEven(n) {
    return n % 2 === 0;
}`,
    problem_description: "isEven(n) should return true if n is even, false otherwise.",
    symptom_description: "isEven(4) returns false and isEven(3) returns true — the results are backwards.",
    explanation:
      "n % 2 === 1 is the condition for odd, not even. A number is even when the remainder after dividing by 2 is 0, so the comparison should be === 0. Small logic inversions like this are easy to introduce and easy to miss without testing both true and false cases.",
    test_cases: [
      { input: [4], expected_output: true },
      { input: [3], expected_output: false },
      { input: [0], expected_output: true },
    ],
    hints: [
      "Test isEven with both an even and an odd number by hand — which one comes out wrong?",
      "The comparison operator on the return line is checking for the wrong remainder.",
      "n % 2 === 0 is true for even numbers; n % 2 === 1 is true for odd numbers. This function needs the first one.",
    ],
  },
  {
    title: "Price formatting crashes on numbers",
    language: "python",
    bug_category: "type_error",
    difficulty: "easy",
    function_name: "format_price",
    broken_code: `def format_price(amount):
    return "$" + amount`,
    correct_code: `def format_price(amount):
    return "$" + str(amount)`,
    problem_description: 'format_price(amount) should return the amount formatted as a price string, e.g. format_price(5) -> "$5".',
    symptom_description: "Calling format_price(5) crashes with: TypeError: can only concatenate str (not \"int\") to str.",
    explanation:
      "Python won't implicitly convert a number to a string when using +. amount needs to be explicitly converted with str(amount) before it can be concatenated onto \"$\". This is a very common type error at the boundary between numbers and display strings.",
    test_cases: [
      { input: [5], expected_output: "$5" },
      { input: [9.99], expected_output: "$9.99" },
      { input: [0], expected_output: "$0" },
    ],
    hints: [
      "What types are being combined with the + operator here?",
      "The return line tries to add a string and a number directly.",
      "Wrap amount in str() before concatenating: \"$\" + str(amount).",
    ],
  },
  {
    title: "Result variable that vanishes after the loop",
    language: "javascript",
    bug_category: "scope_error",
    difficulty: "medium",
    function_name: "findFirstNegative",
    broken_code: `function findFirstNegative(nums) {
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] < 0) {
            let result = nums[i];
        }
    }
    return result;
}`,
    correct_code: `function findFirstNegative(nums) {
    let result = null;
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] < 0) {
            result = nums[i];
            break;
        }
    }
    return result;
}`,
    problem_description: "findFirstNegative(nums) should return the first negative number in the array, or null if there isn't one.",
    symptom_description: "Calling findFirstNegative with any array throws: ReferenceError: result is not defined.",
    explanation:
      "result is declared with let inside the if block, so it only exists within that block — it's completely inaccessible once execution reaches the return statement outside the loop. Declare result once, outside the loop, so it's in scope for the whole function.",
    test_cases: [
      { input: [[3, -2, 5]], expected_output: -2 },
      { input: [[1, 2, 3]], expected_output: null },
      { input: [[-5, -2, 3]], expected_output: -5 },
    ],
    hints: [
      "Where is result declared, and where is it being used? Are those the same scope?",
      "let and const are block-scoped — look at exactly which block result is declared inside.",
      "Move `let result = null;` to before the loop so it's visible both inside the loop and at the return statement.",
    ],
  },
  {
    title: "Doubled value returned before it's ready",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "hard",
    function_name: "delayedDouble",
    broken_code: `function delayedDouble(n) {
    let result;
    new Promise((resolve) => setTimeout(() => resolve(n * 2), 10)).then((r) => {
        result = r;
    });
    return result;
}`,
    correct_code: `function delayedDouble(n) {
    return new Promise((resolve) => setTimeout(() => resolve(n * 2), 10)).then((r) => r);
}`,
    problem_description: "delayedDouble(n) should asynchronously resolve to n doubled, e.g. delayedDouble(5) eventually resolves to 10.",
    symptom_description: "Awaiting delayedDouble(5) gives undefined instead of 10.",
    explanation:
      "The function returns result immediately, before the Promise's setTimeout callback ever runs — result is still undefined at that point. The function needs to return the Promise itself (or the chained .then()) so callers can await the value once it's actually ready, instead of racing ahead of it.",
    test_cases: [
      { input: [5], expected_output: 10 },
      { input: [3], expected_output: 6 },
      { input: [0], expected_output: 0 },
    ],
    hints: [
      "When does the code inside setTimeout actually run, compared to when the function returns?",
      "The function returns result on the line right after starting the Promise — is that too early?",
      "Return the Promise chain itself (return new Promise(...).then(...)) instead of a variable that the async callback hasn't filled in yet.",
    ],
  },
  {
    title: "Factorial that never stops recursing",
    language: "python",
    bug_category: "other",
    difficulty: "medium",
    function_name: "factorial",
    broken_code: `def factorial(n):
    return n * factorial(n - 1)`,
    correct_code: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
    problem_description: "factorial(n) should return n! (n factorial), e.g. factorial(5) -> 120.",
    symptom_description: "Calling factorial(5) crashes with a RecursionError about exceeding the maximum recursion depth.",
    explanation:
      "The function has no base case, so it keeps calling itself with smaller and smaller n forever (n, n-1, n-2, ... with no stopping point) until Python's recursion limit is hit. Every recursive function needs a base case that returns a value directly instead of recursing again.",
    test_cases: [
      { input: [5], expected_output: 120 },
      { input: [0], expected_output: 1 },
      { input: [1], expected_output: 1 },
    ],
    hints: [
      "What stops this function from calling itself? Is there any condition that returns without recursing?",
      "Recursive functions need a base case — this one is missing entirely.",
      "Add `if n <= 1: return 1` before the recursive call, so the recursion has somewhere to stop.",
    ],
  },
  {
    title: "Off-by-one when slicing the last N items",
    language: "javascript",
    bug_category: "off_by_one",
    difficulty: "medium",
    function_name: "getLastNItems",
    broken_code: `function getLastNItems(arr, n) {
    return arr.slice(arr.length - n - 1);
}`,
    correct_code: `function getLastNItems(arr, n) {
    return arr.slice(arr.length - n);
}`,
    problem_description: "getLastNItems(arr, n) should return the last n items of arr, e.g. getLastNItems([1,2,3,4,5], 2) -> [4, 5].",
    symptom_description: "getLastNItems([1,2,3,4,5], 2) returns [3, 4, 5] — one extra item at the front.",
    explanation:
      "arr.length - n - 1 starts the slice one index too early, pulling in an extra element. The correct starting index for \"the last n items\" is exactly arr.length - n, with no extra -1.",
    test_cases: [
      { input: [[1, 2, 3, 4, 5], 2], expected_output: [4, 5] },
      { input: [[1, 2, 3], 1], expected_output: [3] },
      { input: [[1, 2, 3, 4], 0], expected_output: [] },
    ],
    hints: [
      "Work out arr.length - n - 1 by hand for a small example — does the slice start where you'd expect?",
      "The extra -1 in the slice's starting index is the problem.",
      "The last n items of an array start at index arr.length - n — drop the extra - 1.",
    ],
  },
  {
    title: "Checkout allowed without valid payment",
    language: "python",
    bug_category: "logic_error",
    difficulty: "easy",
    function_name: "can_checkout",
    broken_code: `def can_checkout(cart_total, has_valid_payment):
    return cart_total > 0 or has_valid_payment`,
    correct_code: `def can_checkout(cart_total, has_valid_payment):
    return cart_total > 0 and has_valid_payment`,
    problem_description:
      "can_checkout(cart_total, has_valid_payment) should return True only when the cart has items AND payment is valid.",
    symptom_description: "can_checkout(50, False) returns True — checkout is allowed even without valid payment.",
    explanation:
      "or lets either condition alone make the result True, so a full cart with no valid payment (or an empty cart with valid payment) both incorrectly pass. Checkout should require both conditions to hold at once, which is what and does.",
    test_cases: [
      { input: [50, false], expected_output: false },
      { input: [0, true], expected_output: false },
      { input: [50, true], expected_output: true },
    ],
    hints: [
      "Try a cart with items but no valid payment — should checkout succeed? What does the function actually do?",
      "The boolean operator joining the two conditions is the issue.",
      "Both conditions need to be true at once for checkout to succeed — use `and` instead of `or`.",
    ],
  },
];
