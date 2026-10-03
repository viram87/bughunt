// Third content batch: 60 challenges, taking the library from 44 to 104.
//
// Weighted at the two thin spots identified from the live distribution:
// hard JavaScript (only 4 existed) and the under-filled categories
// (async_race_condition, scope_error, infinite_loop, type_error,
// null_or_undefined all sat at 4-5 each).
//
// async_race_condition is JavaScript-only on purpose. The Python worker
// calls fn(*args) without awaiting (public/workers/python-worker.js), so an
// `async def` challenge would hand back a coroutine object rather than a
// value. Adding Python async here would mean shipping challenges that can
// never pass.
//
// Every entry is executed before it ships — see scripts/verify-challenges.mjs.
// Broken code must fail at least one test; correct code must pass all.
//
// Test-case notes: `input` is always an array of arguments. Avoid `null`
// expected outputs for Python — None doesn't round-trip cleanly through
// Pyodide — use a sentinel value instead. Async challenges keep their
// delays tiny (0-20ms) so the suite stays fast and deterministic.
//
// Never pass a JS `null` as INPUT to a Python challenge either. Verified
// against Pyodide 0.28.3: toPy(null) produces a JsNull sentinel, not None —
// it is falsy, so truthiness checks behave, but `x is None` is FALSE. A
// challenge teaching `is None` must therefore create the None inside Python
// (dict.get() on a missing key), never receive it across the boundary. The
// node harness uses json.loads and will not catch this, which is why the
// Python entries are also run through real Pyodide before shipping.

export const BATCH3 = [
  // ── async_race_condition ──────────────────────────────────────────────
  {
    title: "Concurrent tally loses most of the votes",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "hard",
    function_name: "tallyVotes",
    broken_code: `const tick = () => new Promise((r) => setTimeout(r, 5));

async function tallyVotes(votes) {
    let total = 0;
    await Promise.all(
        votes.map(async (v) => {
            const current = total;
            await tick();
            total = current + v;
        })
    );
    return total;
}`,
    correct_code: `const tick = () => new Promise((r) => setTimeout(r, 5));

async function tallyVotes(votes) {
    let total = 0;
    for (const v of votes) {
        await tick();
        total = total + v;
    }
    return total;
}`,
    problem_description:
      "tallyVotes(votes) should add up every vote, so tallyVotes([1, 2, 3, 4]) returns 10.",
    symptom_description:
      "tallyVotes([1, 2, 3, 4]) returns 4 instead of 10. Only the last vote seems to survive.",
    explanation:
      "This is a lost-update race. Every callback reads `total` into `current` BEFORE awaiting, then all of them resume and write back `current + v`. Since they all read 0, each write overwrites the last, and only the final one survives. The read and the write are separated by an await, and anything can happen in that gap. The fix is to make the read-modify-write happen without yielding in between — either await first and then touch `total`, or process sequentially as the correct version does. Promise.all is not the villain here; interleaved access to shared mutable state is.",
    test_cases: [
      { input: [[1, 2, 3, 4]], expected_output: 10 },
      { input: [[5, 5]], expected_output: 10 },
      { input: [[7]], expected_output: 7 },
    ],
    hints: [
      "Add a log inside the callback showing `current` each time. What value does every callback see?",
      "Look at what happens between reading `total` and writing it back.",
      "Each callback reads total before awaiting, so they all read 0. Don't hold a stale copy across an await.",
    ],
  },
  {
    title: "Only the fastest request comes back",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "medium",
    function_name: "loadAll",
    broken_code: `const load = (id) =>
    new Promise((r) => setTimeout(() => r(id * 10), id));

async function loadAll(ids) {
    return await Promise.race(ids.map(load));
}`,
    correct_code: `const load = (id) =>
    new Promise((r) => setTimeout(() => r(id * 10), id));

async function loadAll(ids) {
    return await Promise.all(ids.map(load));
}`,
    problem_description:
      "loadAll(ids) should load every id and return all the results as an array, so loadAll([1, 2, 3]) returns [10, 20, 30].",
    symptom_description:
      "loadAll([1, 2, 3]) returns 10 — a single number rather than an array of three results.",
    explanation:
      "Promise.race settles as soon as the FIRST promise settles and gives you that one value; the rest keep running but their results are thrown away. Promise.all waits for every promise and resolves to an array of results in the original order. The names are easy to mix up because both take an array — remember that race is for 'whichever finishes first wins' (timeouts, fallbacks) and all is for 'I need all of these'.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: [10, 20, 30] },
      { input: [[2]], expected_output: [20] },
      { input: [[3, 1]], expected_output: [30, 10] },
    ],
    hints: [
      "The return value is a single number, not an array. What kind of thing returns just one result?",
      "Compare what Promise.race resolves to against what Promise.all resolves to.",
      "Promise.race resolves with the first settled value. You want Promise.all.",
    ],
  },
  {
    title: "try/catch never catches the async failure",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "hard",
    function_name: "safeDivide",
    broken_code: `const divide = async (a, b) => {
    if (b === 0) throw new Error("divide by zero");
    return a / b;
};

async function safeDivide(a, b) {
    try {
        return divide(a, b);
    } catch (err) {
        return -1;
    }
}`,
    correct_code: `const divide = async (a, b) => {
    if (b === 0) throw new Error("divide by zero");
    return a / b;
};

async function safeDivide(a, b) {
    try {
        return await divide(a, b);
    } catch (err) {
        return -1;
    }
}`,
    problem_description:
      "safeDivide(a, b) should return a / b, or -1 when the division fails. safeDivide(10, 0) should return -1.",
    symptom_description:
      "safeDivide(10, 0) throws 'divide by zero' instead of returning -1, even though the call is wrapped in try/catch.",
    explanation:
      "`return somePromise` inside a try block hands the promise back before it settles, so the try block has already exited by the time the rejection happens — there is nothing left on the stack to catch it. try/catch only catches synchronous throws and awaited rejections. Adding `await` keeps the function suspended inside the try block until the promise settles, so a rejection becomes a real throw the catch can see. This is the one place where the often-flagged 'redundant' `return await` is genuinely necessary.",
    test_cases: [
      { input: [10, 2], expected_output: 5 },
      { input: [10, 0], expected_output: -1 },
      { input: [9, 3], expected_output: 3 },
    ],
    hints: [
      "The catch block never runs. When does a try block stop being 'active'?",
      "The function returns the promise rather than its resolved value.",
      "return await divide(a, b) — without await, the try block exits before the promise rejects.",
    ],
  },
  {
    title: "Async reduce builds a string of Promises",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "hard",
    function_name: "sumAsync",
    broken_code: `const fetchValue = async (n) => n;

async function sumAsync(nums) {
    return nums.reduce(async (acc, n) => acc + (await fetchValue(n)), 0);
}`,
    correct_code: `const fetchValue = async (n) => n;

async function sumAsync(nums) {
    return nums.reduce(
        async (acc, n) => (await acc) + (await fetchValue(n)),
        Promise.resolve(0)
    );
}`,
    problem_description:
      "sumAsync(nums) should add up values fetched asynchronously, so sumAsync([1, 2, 3]) returns 6.",
    symptom_description:
      'sumAsync([1, 2, 3]) returns the string "[object Promise]3" instead of 6.',
    explanation:
      "An async callback always returns a promise, so on the second iteration `acc` is not a number — it is the promise returned by the previous iteration. Adding a promise to a number coerces it via toString, giving '[object Promise]'. The accumulator has to be awaited too: `(await acc) + ...`. Seeding with Promise.resolve(0) keeps the type consistent from the first iteration. If you find yourself writing this, a plain for...of loop is usually clearer — async reduce is a well-known readability trap.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: 6 },
      { input: [[10]], expected_output: 10 },
      { input: [[4, 6]], expected_output: 10 },
    ],
    hints: [
      "The result is a string. What turned a number into text?",
      "What type is `acc` on the second iteration of an async reduce callback?",
      "acc is a Promise, not a number. You need (await acc) + (await fetchValue(n)).",
    ],
  },
  {
    title: "Results arrive in whatever order they finish",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "hard",
    function_name: "labelAll",
    broken_code: `const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function labelAll(items) {
    const out = [];
    await Promise.all(
        items.map(async (item) => {
            await delay(item.ms);
            out.push(item.name);
        })
    );
    return out;
}`,
    correct_code: `const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function labelAll(items) {
    const out = [];
    await Promise.all(
        items.map(async (item, index) => {
            await delay(item.ms);
            out[index] = item.name;
        })
    );
    return out;
}`,
    problem_description:
      "labelAll(items) should return the names in the same order they were passed in, regardless of how long each one takes.",
    symptom_description:
      'labelAll([{name:"a",ms:20},{name:"b",ms:1}]) returns ["b","a"] — the order is wrong whenever a later item finishes first.',
    explanation:
      "push() appends in COMPLETION order, and with concurrent work completion order has nothing to do with input order — the fastest item lands first. Promise.all preserves order in the array it resolves to, but this code ignores that and builds its own array by side effect. Writing to out[index] pins each result to its original slot, so timing no longer affects the output. The general rule: when order matters, index into a slot rather than appending, or just use the array Promise.all already gives you.",
    test_cases: [
      {
        input: [
          [
            { name: "a", ms: 20 },
            { name: "b", ms: 1 },
          ],
        ],
        expected_output: ["a", "b"],
      },
      {
        input: [
          [
            { name: "x", ms: 15 },
            { name: "y", ms: 10 },
            { name: "z", ms: 1 },
          ],
        ],
        expected_output: ["x", "y", "z"],
      },
      { input: [[{ name: "solo", ms: 1 }]], expected_output: ["solo"] },
    ],
    hints: [
      "Which item finishes first? Compare that against where it lands in the output.",
      "push() appends whenever the callback happens to finish.",
      "Use the map index to write into a fixed slot: out[index] = item.name.",
    ],
  },
  {
    title: "Value returned from setTimeout goes nowhere",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "medium",
    function_name: "doubleLater",
    broken_code: `function doubleLater(value) {
    setTimeout(() => {
        return value * 2;
    }, 1);
}`,
    correct_code: `function doubleLater(value) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(value * 2);
        }, 1);
    });
}`,
    problem_description:
      "doubleLater(value) should resolve to double the value after a short delay, so doubleLater(4) gives 8.",
    symptom_description: "doubleLater(4) returns undefined instead of 8.",
    explanation:
      "The return statement belongs to the arrow function passed to setTimeout, not to doubleLater. doubleLater itself falls off the end and returns undefined immediately — long before the timer even fires. A value produced later can only be handed back through a promise (or a callback). Wrapping the timer in `new Promise` and calling resolve gives the caller something to await. Returning from inside a callback and expecting it to escape the outer function is one of the most common early async mistakes.",
    test_cases: [
      { input: [4], expected_output: 8 },
      { input: [0], expected_output: 0 },
      { input: [-3], expected_output: -6 },
    ],
    hints: [
      "Which function does that `return` actually belong to?",
      "doubleLater finishes before the timer fires. What can it hand back in the meantime?",
      "Wrap the setTimeout in new Promise and call resolve(value * 2) instead of returning.",
    ],
  },
  {
    title: "Cache stampede loads the config twice",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "hard",
    function_name: "countLoads",
    broken_code: `async function countLoads(callCount) {
    let loads = 0;
    let cache = null;

    const getConfig = async () => {
        if (!cache) {
            loads = loads + 1;
            await new Promise((r) => setTimeout(r, 5));
            cache = { ready: true };
        }
        return cache;
    };

    const calls = [];
    for (let i = 0; i < callCount; i++) calls.push(getConfig());
    await Promise.all(calls);
    return loads;
}`,
    correct_code: `async function countLoads(callCount) {
    let loads = 0;
    let cache = null;

    const getConfig = () => {
        if (!cache) {
            cache = (async () => {
                loads = loads + 1;
                await new Promise((r) => setTimeout(r, 5));
                return { ready: true };
            })();
        }
        return cache;
    };

    const calls = [];
    for (let i = 0; i < callCount; i++) calls.push(getConfig());
    await Promise.all(calls);
    return loads;
}`,
    problem_description:
      "countLoads(n) makes n concurrent calls to a cached loader and returns how many times the expensive load actually ran. It should always be 1.",
    symptom_description:
      "countLoads(3) returns 3 — the cache does nothing when the calls overlap, though countLoads(1) correctly returns 1.",
    explanation:
      "The cache is only populated AFTER the await, so every caller that arrives during the in-flight load still sees `cache` as null and starts its own. This is a cache stampede, and it is invisible in sequential tests — it only appears under concurrency. The fix is to cache the PROMISE rather than the resolved value, and to do it synchronously before any await. Later callers then get the same in-flight promise and wait on the one load already running. The same pattern applies to any deduplicated async work: memoise the promise, not the result.",
    test_cases: [
      { input: [3], expected_output: 1 },
      { input: [1], expected_output: 1 },
      { input: [5], expected_output: 1 },
    ],
    hints: [
      "Sequential calls work; concurrent ones don't. What is different about the timing?",
      "When does `cache` actually get set, relative to the await?",
      "Store the promise in the cache synchronously, before awaiting, so overlapping callers share it.",
    ],
  },
  {
    title: "Missing await leaves a Promise in the array",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "medium",
    function_name: "collectNames",
    broken_code: `const fetchName = async (id) => "user" + id;

async function collectNames(ids) {
    const names = ids.map((id) => fetchName(id));
    return names.length + "-" + typeof names[0];
}`,
    correct_code: `const fetchName = async (id) => "user" + id;

async function collectNames(ids) {
    const names = await Promise.all(ids.map((id) => fetchName(id)));
    return names.length + "-" + typeof names[0];
}`,
    problem_description:
      'collectNames(ids) should resolve every name and report the count and the type of the first entry, so collectNames([1,2]) gives "2-string".',
    symptom_description: 'collectNames([1, 2]) returns "2-object" instead of "2-string".',
    explanation:
      "map with an async callback gives you an array of PROMISES, not an array of values — the length is right, which is exactly why this slips through, but every element is a pending promise (typeof 'object'). Awaiting the array itself does nothing either, since an array is not thenable. Promise.all converts the array of promises into a promise of an array, which is what you actually want. If you see 'object' where you expected a string, or [object Promise] in your output, this is almost always the cause.",
    test_cases: [
      { input: [[1, 2]], expected_output: "2-string" },
      { input: [[7]], expected_output: "1-string" },
      { input: [[1, 2, 3]], expected_output: "3-string" },
    ],
    hints: [
      "The count is right but the type is wrong. What is actually sitting in the array?",
      "An async callback returns a promise, even inside map.",
      "Wrap the mapped array in await Promise.all(...).",
    ],
  },
  {
    title: "Arrow body swallows the returned name",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "easy",
    function_name: "getName",
    broken_code: `const loadUser = async (id) => ({ id: id, name: "user" + id });

function getName(id) {
    return loadUser(id).then((user) => {
        user.name;
    });
}`,
    correct_code: `const loadUser = async (id) => ({ id: id, name: "user" + id });

function getName(id) {
    return loadUser(id).then((user) => {
        return user.name;
    });
}`,
    problem_description:
      'getName(id) should resolve to the loaded user\'s name, so getName(1) gives "user1".',
    symptom_description: "getName(1) resolves to undefined instead of the name.",
    explanation:
      "An arrow function with a BLOCK body needs an explicit return; only the concise form (no braces) returns its expression automatically. Here the handler evaluates user.name and discards it, so the promise resolves with undefined. Because `.then` happily passes undefined along, nothing errors — the value just quietly disappears. Either add `return`, or drop the braces: `.then(user => user.name)`.",
    test_cases: [
      { input: [1], expected_output: "user1" },
      { input: [42], expected_output: "user42" },
      { input: [0], expected_output: "user0" },
    ],
    hints: [
      "Nothing throws, the value is simply missing. Where does it get lost?",
      "Look closely at the arrow function's body — does it return anything?",
      "An arrow with { } needs an explicit return. Add `return user.name;`.",
    ],
  },
  {
    title: "Overbooking when everyone checks at once",
    language: "javascript",
    bug_category: "async_race_condition",
    difficulty: "hard",
    function_name: "bookSeats",
    broken_code: `async function bookSeats(requests) {
    let seatsLeft = 1;
    let booked = 0;

    const attempts = [];
    for (let i = 0; i < requests; i++) {
        attempts.push(
            (async () => {
                if (seatsLeft > 0) {
                    await new Promise((r) => setTimeout(r, 5));
                    seatsLeft = seatsLeft - 1;
                    booked = booked + 1;
                }
            })()
        );
    }
    await Promise.all(attempts);
    return booked;
}`,
    correct_code: `async function bookSeats(requests) {
    let seatsLeft = 1;
    let booked = 0;

    const attempts = [];
    for (let i = 0; i < requests; i++) {
        attempts.push(
            (async () => {
                if (seatsLeft > 0) {
                    seatsLeft = seatsLeft - 1;
                    booked = booked + 1;
                    await new Promise((r) => setTimeout(r, 5));
                }
            })()
        );
    }
    await Promise.all(attempts);
    return booked;
}`,
    problem_description:
      "bookSeats(n) handles n concurrent booking requests for a single remaining seat and returns how many bookings succeeded. It should never exceed 1.",
    symptom_description:
      "bookSeats(3) returns 3 — three people booked the same single seat. bookSeats(1) correctly returns 1, so the bug only shows up under load.",
    explanation:
      "This is a time-of-check to time-of-use (TOCTOU) race. Every request checks `seatsLeft > 0` and then awaits BEFORE decrementing, so all of them pass the check while the seat is still nominally available and only then start taking it. The check and the act must not be separated by a suspension point: decrementing before the await makes the seat unavailable to everyone who checks afterwards. This is the shape of real overbooking, double-spend and duplicate-signup bugs — and note that it is invisible to a single-user test, which is why concurrency needs its own test cases.",
    test_cases: [
      { input: [3], expected_output: 1 },
      { input: [1], expected_output: 1 },
      { input: [5], expected_output: 1 },
    ],
    hints: [
      "One request works fine; three do not. What do the three have in common?",
      "Between checking seatsLeft and changing it, what else gets a chance to run?",
      "Decrement seatsLeft before the await, so the check and the booking cannot be interleaved.",
    ],
  },
  // ── scope_error ───────────────────────────────────────────────────────
  {
    title: "Method loses its object when passed as a callback",
    language: "javascript",
    bug_category: "scope_error",
    difficulty: "hard",
    function_name: "countAll",
    broken_code: `class Counter {
    constructor() {
        this.n = 0;
    }
    inc() {
        this.n = this.n + 1;
    }
}

function countAll(items) {
    const counter = new Counter();
    items.forEach(counter.inc);
    return counter.n;
}`,
    correct_code: `class Counter {
    constructor() {
        this.n = 0;
    }
    inc() {
        this.n = this.n + 1;
    }
}

function countAll(items) {
    const counter = new Counter();
    items.forEach(() => counter.inc());
    return counter.n;
}`,
    problem_description:
      "countAll(items) should count how many items were passed in, so countAll([1, 2, 3]) returns 3.",
    symptom_description:
      "countAll([1, 2, 3]) throws \"Cannot read properties of undefined (reading 'n')\", even though counter is clearly defined.",
    explanation:
      "`this` in JavaScript is decided by HOW a function is called, not where it was defined. Writing `counter.inc` extracts the bare function and forgets the object entirely — forEach then calls it with no receiver, so inside inc, `this` is undefined (class bodies are always strict mode). Wrapping it in an arrow, `() => counter.inc()`, preserves the call as a method call. counter.inc.bind(counter) works too. Any time you pass a method somewhere as a value — forEach, setTimeout, an event handler — you have to keep the receiver attached.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: 3 },
      { input: [[]], expected_output: 0 },
      { input: [["a", "b"]], expected_output: 2 },
    ],
    hints: [
      "The error says something is undefined. Inside inc(), what exactly is `this`?",
      "Passing counter.inc hands over the function but not the object it belongs to.",
      "Call it as a method: items.forEach(() => counter.inc()).",
    ],
  },
  {
    title: "Hoisted var shadows the value you wanted",
    language: "javascript",
    bug_category: "scope_error",
    difficulty: "hard",
    function_name: "describe",
    broken_code: `const label = "global";

function describe(useLocal) {
    if (!useLocal) {
        return label;
    }
    var label = "local";
    return label;
}`,
    correct_code: `const label = "global";

function describe(useLocal) {
    if (!useLocal) {
        return label;
    }
    var localLabel = "local";
    return localLabel;
}`,
    problem_description:
      'describe(useLocal) should return "local" when useLocal is true and the outer "global" when it is false.',
    symptom_description:
      'describe(false) throws "Cannot access \'label\' before initialization" instead of returning "global".',
    explanation:
      "`var label` is hoisted to the top of the whole function, so the inner declaration shadows the outer `label` everywhere inside describe — including in the early return that runs before the assignment. The outer constant becomes unreachable from this function entirely. This is why shadowing an outer name with var is dangerous: the shadow covers the entire function body, not just the lines after it. Rename the inner variable, or use let/const, which at least confines the shadow to its block.",
    test_cases: [
      { input: [true], expected_output: "local" },
      { input: [false], expected_output: "global" },
    ],
    hints: [
      'The outer `label` is a const with a value, so why is it "not initialized"?',
      "Where does a `var` declaration actually take effect inside a function?",
      "The inner var label shadows the outer one across the whole function. Give it a different name.",
    ],
  },
  {
    title: "Constant used one line before it exists",
    language: "javascript",
    bug_category: "scope_error",
    difficulty: "medium",
    function_name: "priceWithFee",
    broken_code: `function priceWithFee(base) {
    const total = base + fee;
    const fee = 5;
    return total;
}`,
    correct_code: `function priceWithFee(base) {
    const fee = 5;
    const total = base + fee;
    return total;
}`,
    problem_description:
      "priceWithFee(base) should add a flat fee of 5 to the base price, so priceWithFee(10) returns 15.",
    symptom_description:
      "priceWithFee(10) throws \"Cannot access 'fee' before initialization\".",
    explanation:
      "let and const are hoisted, but they sit in the temporal dead zone until their declaration line actually runs — touching them before that is a ReferenceError rather than undefined. This is deliberate: it turns a silent bug into a loud one. (With var you would have got undefined and NaN, which is far harder to trace.) The fix is simply to declare before use. The error message names the variable, which makes this one of the friendlier errors to debug once you recognise the phrase.",
    test_cases: [
      { input: [10], expected_output: 15 },
      { input: [0], expected_output: 5 },
      { input: [2.5], expected_output: 7.5 },
    ],
    hints: [
      "Read the two const lines in the order they execute.",
      "`fee` is declared, but has it been assigned yet at the point it is used?",
      "Move `const fee = 5;` above the line that uses it.",
    ],
  },
  {
    title: "Every tracker shares one counter",
    language: "javascript",
    bug_category: "scope_error",
    difficulty: "hard",
    function_name: "trackTwice",
    broken_code: `const defaults = { count: 0 };

function makeTracker() {
    const state = defaults;
    return (n) => {
        state.count = state.count + n;
        return state.count;
    };
}

function trackTwice(a, b) {
    const first = makeTracker();
    first(a);
    const second = makeTracker();
    return second(b);
}`,
    correct_code: `const defaults = { count: 0 };

function makeTracker() {
    const state = { ...defaults };
    return (n) => {
        state.count = state.count + n;
        return state.count;
    };
}

function trackTwice(a, b) {
    const first = makeTracker();
    first(a);
    const second = makeTracker();
    return second(b);
}`,
    problem_description:
      "Each tracker from makeTracker() should start at zero, so trackTwice(5, 3) returns 3 — the second tracker's own total.",
    symptom_description:
      "trackTwice(5, 3) returns 8 instead of 3. The second tracker somehow already knows about the first one's total.",
    explanation:
      "`const state = defaults` does not copy anything — it binds a second name to the SAME object, so every tracker mutates one shared piece of state. const only prevents rebinding the name; the object it points at stays fully mutable. Spreading into a fresh object, { ...defaults }, gives each tracker its own. Note this is a shallow copy: nested objects would still be shared, which is the next version of this same bug.",
    test_cases: [
      { input: [5, 3], expected_output: 3 },
      { input: [0, 7], expected_output: 7 },
      { input: [100, 1], expected_output: 1 },
    ],
    hints: [
      "The second tracker's answer equals a + b. Where could it have learned about a?",
      "Does `const state = defaults` create a new object, or another reference to the old one?",
      "Copy it: const state = { ...defaults }.",
    ],
  },
  {
    title: "Inner count shadows the one being returned",
    language: "javascript",
    bug_category: "scope_error",
    difficulty: "medium",
    function_name: "countMatches",
    broken_code: `function countMatches(words, target) {
    let count = 0;
    words.forEach(function (word) {
        let count = 0;
        if (word === target) {
            count = count + 1;
        }
    });
    return count;
}`,
    correct_code: `function countMatches(words, target) {
    let count = 0;
    words.forEach(function (word) {
        if (word === target) {
            count = count + 1;
        }
    });
    return count;
}`,
    problem_description:
      'countMatches(words, target) should count how many times target appears, so countMatches(["a","b","a"], "a") returns 2.',
    symptom_description:
      'countMatches(["a","b","a"], "a") returns 0 — nothing is ever counted, even though the matches clearly exist.',
    explanation:
      "The callback declares its OWN `count`, which shadows the outer one. Every increment lands on the inner variable, which is recreated at zero on each iteration and then thrown away, while the outer count never moves. Because the names match, the code reads as if it works. A closure can already see and modify the outer variable — declaring it again is what breaks the link. If you mean to use an outer variable, do not redeclare it.",
    test_cases: [
      { input: [["a", "b", "a"], "a"], expected_output: 2 },
      { input: [["x"], "y"], expected_output: 0 },
      { input: [["z", "z", "z"], "z"], expected_output: 3 },
    ],
    hints: [
      "The matches happen — add a log inside the if to confirm. So why is the total zero?",
      "There are two variables called count. Which one does the increment touch?",
      "Remove the inner `let count = 0;` so the callback updates the outer one.",
    ],
  },
  {
    title: "Adding to a global total raises UnboundLocalError",
    language: "python",
    bug_category: "scope_error",
    difficulty: "medium",
    function_name: "add_all",
    broken_code: `total = 0

def add_all(nums):
    for n in nums:
        total += n
    return total`,
    correct_code: `total = 0

def add_all(nums):
    running = 0
    for n in nums:
        running += n
    return running`,
    problem_description:
      "add_all(nums) should return the sum of the numbers, so add_all([1, 2, 3]) returns 6.",
    symptom_description:
      "add_all([1, 2, 3]) raises UnboundLocalError: cannot access local variable 'total' — even though total is defined at the top of the file.",
    explanation:
      "Assigning to a name anywhere inside a function makes it local for the WHOLE function, so `total += n` is read-then-write on a local that has never been assigned. Python decides local-vs-global when it compiles the function, not while it runs, which is why the module-level total is invisible here. You could declare `global total`, but that leaves the function stateful — calling it twice would keep accumulating. Using a fresh local accumulator is almost always the better fix: the function then depends on nothing outside itself.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: 6 },
      { input: [[]], expected_output: 0 },
      { input: [[10, -4]], expected_output: 6 },
    ],
    hints: [
      "total is defined at module level, yet Python calls it local. What made it local?",
      "`total += n` both reads and writes total. Which one fails?",
      "Assigning to a name makes it local for the entire function. Use a new local accumulator instead.",
    ],
  },
  {
    title: "All the lambdas use the last factor",
    language: "python",
    bug_category: "scope_error",
    difficulty: "hard",
    function_name: "apply_first",
    broken_code: `def make_multipliers(factors):
    return [lambda x: x * f for f in factors]

def apply_first(factors, value):
    return make_multipliers(factors)[0](value)`,
    correct_code: `def make_multipliers(factors):
    return [lambda x, f=f: x * f for f in factors]

def apply_first(factors, value):
    return make_multipliers(factors)[0](value)`,
    problem_description:
      "make_multipliers([2, 3, 4]) should build one multiplier per factor, so the FIRST one doubles: apply_first([2, 3, 4], 10) returns 20.",
    symptom_description:
      "apply_first([2, 3, 4], 10) returns 40 — the first multiplier is using 4, the last factor, instead of 2.",
    explanation:
      "Closures in Python capture the VARIABLE, not its value at the time the lambda was created. Every lambda refers to the same `f`, and by the time any of them runs, the comprehension has finished and f holds the final factor. Binding it as a default argument, `lambda x, f=f:`, evaluates f immediately at definition time and freezes it per lambda. This is called late binding, and it bites hardest when building callbacks or handlers in a loop — the symptom is always 'they all behave like the last one'.",
    test_cases: [
      { input: [[2, 3, 4], 10], expected_output: 20 },
      { input: [[5, 1], 3], expected_output: 15 },
      { input: [[7], 2], expected_output: 14 },
    ],
    hints: [
      "Every multiplier behaves identically. Which factor are they all using?",
      "When the lambda finally runs, what does `f` refer to?",
      "Capture the value at definition time with a default argument: lambda x, f=f: x * f.",
    ],
  },
  {
    title: "Two baskets share the same list",
    language: "python",
    bug_category: "scope_error",
    difficulty: "hard",
    function_name: "two_baskets",
    broken_code: `class Basket:
    items = []

    def add(self, item):
        self.items.append(item)


def two_baskets(first, second):
    a = Basket()
    a.add(first)
    b = Basket()
    b.add(second)
    return len(b.items)`,
    correct_code: `class Basket:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)


def two_baskets(first, second):
    a = Basket()
    a.add(first)
    b = Basket()
    b.add(second)
    return len(b.items)`,
    problem_description:
      "Each Basket should have its own items, so after adding one thing to a fresh basket, two_baskets('x', 'y') returns 1.",
    symptom_description:
      "two_baskets('x', 'y') returns 2 — the second basket already contains the first basket's item.",
    explanation:
      "`items = []` in the class body is a CLASS attribute, created once when the class is defined and shared by every instance. self.items.append() mutates that one shared list rather than a per-instance one. Assigning in __init__ gives each instance its own list. The trap is that this looks like a normal field declaration in most other languages. A useful tell: mutating a class attribute affects all instances, whereas rebinding one (self.items = [...]) silently creates an instance attribute and hides the bug in a different way.",
    test_cases: [
      { input: ["x", "y"], expected_output: 1 },
      { input: ["a", "b"], expected_output: 1 },
      { input: [1, 2], expected_output: 1 },
    ],
    hints: [
      "Print b.items. Where did the extra entry come from?",
      "When is `items = []` evaluated — once, or once per Basket?",
      "Move it into __init__ so each instance gets its own list.",
    ],
  },
  {
    title: "Result variable never exists when nothing matches",
    language: "python",
    bug_category: "scope_error",
    difficulty: "easy",
    function_name: "last_even",
    broken_code: `def last_even(nums):
    for n in nums:
        if n % 2 == 0:
            found = n
    return found`,
    correct_code: `def last_even(nums):
    found = -1
    for n in nums:
        if n % 2 == 0:
            found = n
    return found`,
    problem_description:
      "last_even(nums) should return the last even number, or -1 if there are none. last_even([1, 3]) should return -1.",
    symptom_description:
      "last_even([1, 3]) raises UnboundLocalError: cannot access local variable 'found'. It works fine when the list contains an even number.",
    explanation:
      "`found` is only created if the if-branch runs at least once. When no element is even, the assignment never executes and the return line refers to a name that was never bound. Python has no concept of a declared-but-unset local — a variable exists only once something assigns to it. Initialising before the loop guarantees the name exists on every path and, just as importantly, makes the 'nothing found' answer explicit rather than accidental.",
    test_cases: [
      { input: [[1, 2, 3, 4]], expected_output: 4 },
      { input: [[1, 3]], expected_output: -1 },
      { input: [[]], expected_output: -1 },
    ],
    hints: [
      "It only breaks for some inputs. What is different about those?",
      "Trace which lines run when no number is even.",
      "Initialise found = -1 before the loop so it always exists.",
    ],
  },
  // ── infinite_loop ─────────────────────────────────────────────────────
  {
    title: "continue skips past the increment",
    language: "javascript",
    bug_category: "infinite_loop",
    difficulty: "medium",
    function_name: "countOdds",
    broken_code: `function countOdds(nums) {
    let i = 0;
    let count = 0;
    while (i < nums.length) {
        if (nums[i] % 2 === 0) {
            continue;
        }
        count = count + 1;
        i = i + 1;
    }
    return count;
}`,
    correct_code: `function countOdds(nums) {
    let i = 0;
    let count = 0;
    while (i < nums.length) {
        if (nums[i] % 2 !== 0) {
            count = count + 1;
        }
        i = i + 1;
    }
    return count;
}`,
    problem_description:
      "countOdds(nums) should count the odd numbers, so countOdds([1, 2, 3]) returns 2.",
    symptom_description:
      "countOdds([1, 3]) returns 2 correctly, but countOdds([1, 2, 3]) hangs the page forever.",
    explanation:
      "`continue` jumps straight back to the loop condition, skipping every remaining statement in the body — including `i = i + 1`. So the moment an even number appears, i stops advancing and the loop re-tests the same element forever. This is the classic hazard of `continue` in a while loop: the increment lives in the body, so any early jump strands it. Either advance the index before continuing, or restructure so the increment always runs — a plain for loop puts the increment in the header where continue cannot skip it.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: 2 },
      { input: [[2, 4]], expected_output: 0 },
      { input: [[1, 3, 5]], expected_output: 3 },
    ],
    hints: [
      "It only hangs for some inputs. What do those inputs contain?",
      "Follow what `continue` skips over on an even number.",
      "continue jumps past i = i + 1, so the index never moves. Make sure the increment always runs.",
    ],
  },
  {
    title: "Binary search that stops narrowing",
    language: "javascript",
    bug_category: "infinite_loop",
    difficulty: "hard",
    function_name: "indexOfValue",
    broken_code: `function indexOfValue(sorted, target) {
    let low = 0;
    let high = sorted.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (sorted[mid] === target) {
            return mid;
        }
        if (sorted[mid] < target) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return -1;
}`,
    correct_code: `function indexOfValue(sorted, target) {
    let low = 0;
    let high = sorted.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (sorted[mid] === target) {
            return mid;
        }
        if (sorted[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}`,
    problem_description:
      "indexOfValue(sorted, target) should return the index of target in a sorted array, or -1 if it is absent.",
    symptom_description:
      "Finding a value that IS present usually works, but searching for a missing value hangs forever.",
    explanation:
      "Setting low = mid (rather than mid + 1) leaves mid inside the search range, so when low and high end up adjacent the midpoint stops changing and the range never shrinks. Since mid was already ruled out by the equality check above, it is safe — and necessary — to exclude it. Every binary search needs the range to get strictly smaller each iteration; if it can stay the same size, the loop can spin. The tell is that it only hangs when the target is absent, because a present target escapes through the early return before the range collapses.",
    test_cases: [
      { input: [[1, 3, 5, 7], 5], expected_output: 2 },
      { input: [[1, 3, 5, 7], 4], expected_output: -1 },
      { input: [[2], 9], expected_output: -1 },
    ],
    hints: [
      "It hangs only when the value is missing. What lets a successful search escape?",
      "Print low, high and mid each iteration. Do they keep changing?",
      "mid has already been ruled out, so exclude it: low = mid + 1 and high = mid - 1.",
    ],
  },
  {
    title: "Index only advances on a match",
    language: "javascript",
    bug_category: "infinite_loop",
    difficulty: "medium",
    function_name: "countUppercase",
    broken_code: `function countUppercase(text) {
    let i = 0;
    let count = 0;
    while (i < text.length) {
        if (text[i] === text[i].toUpperCase()) {
            count = count + 1;
            i = i + 1;
        }
    }
    return count;
}`,
    correct_code: `function countUppercase(text) {
    let i = 0;
    let count = 0;
    while (i < text.length) {
        if (text[i] === text[i].toUpperCase()) {
            count = count + 1;
        }
        i = i + 1;
    }
    return count;
}`,
    problem_description:
      'countUppercase(text) should count the uppercase letters, so countUppercase("aBc") returns 1.',
    symptom_description:
      'countUppercase("ABC") returns 3, but countUppercase("aBc") never finishes.',
    explanation:
      "The increment sits INSIDE the if, so the index only moves when the character matches. Hit a lowercase letter and the loop re-examines that same character forever. Advancing the cursor is the loop's own bookkeeping and belongs outside any conditional — it must happen on every iteration regardless of what the body decides. All-uppercase input hides the bug completely, which is a good reminder to test the case where the condition is false.",
    test_cases: [
      { input: ["ABC"], expected_output: 3 },
      { input: ["aBc"], expected_output: 1 },
      { input: ["xyz"], expected_output: 0 },
    ],
    hints: [
      "All-uppercase input works. What happens on the first lowercase letter?",
      "Which statements run when the if condition is false?",
      "Move i = i + 1 outside the if so it runs every iteration.",
    ],
  },
  {
    title: "Doubling loop that never doubles",
    language: "javascript",
    bug_category: "infinite_loop",
    difficulty: "easy",
    function_name: "stepsToExceed",
    broken_code: `function stepsToExceed(limit) {
    let value = 1;
    let steps = 0;
    while (value <= limit) {
        steps = steps + 1;
    }
    return steps;
}`,
    correct_code: `function stepsToExceed(limit) {
    let value = 1;
    let steps = 0;
    while (value <= limit) {
        value = value * 2;
        steps = steps + 1;
    }
    return steps;
}`,
    problem_description:
      "stepsToExceed(limit) counts how many times you must double 1 before passing limit, so stepsToExceed(8) returns 4.",
    symptom_description: "stepsToExceed(8) never returns — the page freezes.",
    explanation:
      "The loop condition tests `value`, but nothing in the body ever changes it, so the condition is stuck true forever. Every while loop needs its body to make progress toward the condition becoming false. When a loop hangs, the first thing to check is which variable the condition depends on and whether the body actually modifies it — here `steps` changes but is not part of the condition, which is exactly the kind of near-miss that reads as correct.",
    test_cases: [
      { input: [8], expected_output: 4 },
      { input: [1], expected_output: 1 },
      { input: [100], expected_output: 7 },
    ],
    hints: [
      "Which variable does the while condition look at?",
      "Does anything in the loop body change that variable?",
      "`value` is never doubled. Add value = value * 2 inside the loop.",
    ],
  },
  {
    title: "Cleaning double spaces never terminates",
    language: "python",
    bug_category: "infinite_loop",
    difficulty: "medium",
    function_name: "squash_spaces",
    broken_code: `def squash_spaces(text):
    while "  " in text:
        text.replace("  ", " ")
    return text`,
    correct_code: `def squash_spaces(text):
    while "  " in text:
        text = text.replace("  ", " ")
    return text`,
    problem_description:
      'squash_spaces(text) should collapse runs of spaces into one, so squash_spaces("a  b") returns "a b".',
    symptom_description:
      'squash_spaces("a b") returns immediately, but squash_spaces("a  b") hangs forever.',
    explanation:
      "Strings in Python are immutable, so .replace() cannot modify text in place — it returns a NEW string and leaves the original untouched. Discarding that return value means text still contains the double space, the while condition stays true, and the loop spins. Assigning the result back is the fix. The same trap applies to .strip(), .upper() and .lower(); the methods that DO mutate in place, like list.append() and list.sort(), return None instead — which is the clue that tells the two families apart.",
    test_cases: [
      { input: ["a  b"], expected_output: "a b" },
      { input: ["a b"], expected_output: "a b" },
      { input: ["x   y"], expected_output: "x y" },
    ],
    hints: [
      "Input with no double space returns fine. What has to change for the loop to end?",
      "Does text ever actually change?",
      "str.replace returns a new string. Assign it back: text = text.replace(...).",
    ],
  },
  {
    title: "Outer index advances only when a pair is found",
    language: "python",
    bug_category: "infinite_loop",
    difficulty: "hard",
    function_name: "count_pairs",
    broken_code: `def count_pairs(nums, target):
    count = 0
    i = 0
    while i < len(nums):
        j = i + 1
        while j < len(nums):
            if nums[i] + nums[j] == target:
                count += 1
                i += 1
            j += 1
    return count`,
    correct_code: `def count_pairs(nums, target):
    count = 0
    i = 0
    while i < len(nums):
        j = i + 1
        while j < len(nums):
            if nums[i] + nums[j] == target:
                count += 1
            j += 1
        i += 1
    return count`,
    problem_description:
      "count_pairs(nums, target) should count the pairs that add up to target, so count_pairs([1, 2, 3], 4) returns 1.",
    symptom_description:
      "count_pairs([1, 2, 3], 5) hangs. It only returns when a pair happens to be found on every pass.",
    explanation:
      "`i += 1` ended up inside the inner loop's if-branch, so the outer index only advances when a matching pair turns up. Once a pass finds nothing, i stays put and the outer loop repeats the same pass forever. The outer loop's counter belongs after the inner loop, at the outer loop's own indentation — this is a pure indentation bug, and Python's whitespace-as-syntax makes it easy to introduce and easy to miss. It also means the broken version double-counts when it does terminate, since advancing i mid-scan skips comparisons.",
    test_cases: [
      { input: [[1, 2, 3], 4], expected_output: 1 },
      { input: [[1, 2, 3], 5], expected_output: 1 },
      { input: [[1, 1, 1], 2], expected_output: 3 },
    ],
    hints: [
      "Print i at the top of the outer loop. Does it always move?",
      "Look at the indentation of `i += 1` — which loop does it belong to?",
      "i += 1 should sit after the inner while loop, at the outer loop's level.",
    ],
  },
  {
    title: "Retry flag compared instead of assigned",
    language: "python",
    bug_category: "infinite_loop",
    difficulty: "easy",
    function_name: "attempts_until_success",
    broken_code: `def attempts_until_success(succeed_on):
    tries = 0
    done = False
    while not done:
        tries += 1
        if tries == succeed_on:
            done == True
    return tries`,
    correct_code: `def attempts_until_success(succeed_on):
    tries = 0
    done = False
    while not done:
        tries += 1
        if tries == succeed_on:
            done = True
    return tries`,
    problem_description:
      "attempts_until_success(n) retries until the nth attempt succeeds and returns the number of tries, so attempts_until_success(3) returns 3.",
    symptom_description: "attempts_until_success(3) never returns.",
    explanation:
      "`done == True` is a comparison, not an assignment. It computes False, throws the answer away, and leaves `done` exactly as it was — so the loop condition never flips. Python allows a bare expression as a statement, which is why this is legal code rather than a syntax error. One character separates == from =, and the line reads almost identically. Some linters flag a statement with no effect; it is worth turning that warning on.",
    test_cases: [
      { input: [3], expected_output: 3 },
      { input: [1], expected_output: 1 },
      { input: [5], expected_output: 5 },
    ],
    hints: [
      "The loop ends when `done` becomes True. Does it ever become True?",
      "Look very carefully at the line that is supposed to set the flag.",
      "`done == True` compares; you want `done = True` to assign.",
    ],
  },
  {
    title: "Halving loop with no plan for odd numbers",
    language: "python",
    bug_category: "infinite_loop",
    difficulty: "medium",
    function_name: "shrink_to_one",
    broken_code: `def shrink_to_one(n):
    steps = 0
    while n != 1:
        if n % 2 == 0:
            n = n // 2
        steps += 1
    return steps`,
    correct_code: `def shrink_to_one(n):
    steps = 0
    while n != 1:
        if n % 2 == 0:
            n = n // 2
        else:
            n = 3 * n + 1
        steps += 1
    return steps`,
    problem_description:
      "shrink_to_one(n) applies the Collatz rule — halve even numbers, and turn odd n into 3n + 1 — counting steps until n reaches 1. shrink_to_one(6) returns 8.",
    symptom_description:
      "shrink_to_one(8) returns 3, but shrink_to_one(6) hangs. Powers of two work; everything else freezes.",
    explanation:
      "There is no else branch, so when n is odd nothing changes it — the loop keeps testing the same odd value forever. Powers of two halve cleanly all the way to 1 and never meet an odd number above 1, which is why they hide the bug entirely. Whenever a loop's progress depends on a condition, ask what happens when that condition is false: if the answer is 'nothing', the loop can stall. Choosing test inputs that exercise BOTH branches would have caught this immediately.",
    test_cases: [
      { input: [6], expected_output: 8 },
      { input: [8], expected_output: 3 },
      { input: [7], expected_output: 16 },
    ],
    hints: [
      "Powers of two work; other numbers hang. What is special about powers of two here?",
      "Trace what happens to n when it is odd.",
      "The if has no else, so odd values never change. Add else: n = 3 * n + 1.",
    ],
  },
  // ── type_error ────────────────────────────────────────────────────────
  {
    title: "Loose equality counts empty strings as zero",
    language: "javascript",
    bug_category: "type_error",
    difficulty: "medium",
    function_name: "countZeros",
    broken_code: `function countZeros(values) {
    return values.filter((v) => v == 0).length;
}`,
    correct_code: `function countZeros(values) {
    return values.filter((v) => v === 0).length;
}`,
    problem_description:
      'countZeros(values) should count how many entries are the number zero, so countZeros([0, "", false, 0]) returns 2.',
    symptom_description:
      'countZeros([0, "", false, 0]) returns 4 — empty strings and false are being counted as zero.',
    explanation:
      '== converts both sides to a common type before comparing, and "" , false and even [] all convert to 0. So the filter matches far more than intended. === compares type first and returns false immediately when the types differ, which is almost always what you actually mean. This is why the default advice is to use === everywhere; the one common exception is `x == null`, which conveniently matches both null and undefined.',
    test_cases: [
      { input: [[0, "", false, 0]], expected_output: 2 },
      { input: [[1, 2, 3]], expected_output: 0 },
      { input: [[0, "0", 0]], expected_output: 2 },
    ],
    hints: [
      'Which of "" and false does the filter currently accept?',
      "Think about what == does before it compares.",
      "== coerces types. Use === so type mismatches fail immediately.",
    ],
  },
  {
    title: "parseInt quietly throws away the decimals",
    language: "javascript",
    bug_category: "type_error",
    difficulty: "medium",
    function_name: "sumPrices",
    broken_code: `function sumPrices(prices) {
    return prices.reduce((sum, p) => sum + parseInt(p), 0);
}`,
    correct_code: `function sumPrices(prices) {
    return prices.reduce((sum, p) => sum + parseFloat(p), 0);
}`,
    problem_description:
      'sumPrices(prices) should total a list of price strings, so sumPrices(["1.5", "2.5"]) returns 4.',
    symptom_description:
      'sumPrices(["1.5", "2.5"]) returns 3 instead of 4 — every price loses its decimal part.',
    explanation:
      "parseInt stops reading at the first character that cannot be part of an integer, so it takes '1.5', reads '1', hits the dot and stops — silently returning 1. It does not round and it does not complain. parseFloat (or Number) keeps the fractional part. The wider trap is that parseInt is lenient in both directions: parseInt('12abc') is 12, so it accepts input you might want rejected. Number('12abc') gives NaN, which is often the safer signal.",
    test_cases: [
      { input: [["1.5", "2.5"]], expected_output: 4 },
      { input: [["10"]], expected_output: 10 },
      { input: [["0.25", "0.25", "0.5"]], expected_output: 1 },
    ],
    hints: [
      "The total is always a bit low. How much is each price losing?",
      "What does parseInt do when it reaches the decimal point?",
      "parseInt truncates at the dot. Use parseFloat or Number.",
    ],
  },
  {
    title: "typeof reports null as an object",
    language: "javascript",
    bug_category: "type_error",
    difficulty: "hard",
    function_name: "describeType",
    broken_code: `function describeType(value) {
    if (typeof value === "object") {
        return "object";
    }
    return typeof value;
}`,
    correct_code: `function describeType(value) {
    if (value === null) {
        return "null";
    }
    if (typeof value === "object") {
        return "object";
    }
    return typeof value;
}`,
    problem_description:
      'describeType(value) should name the type of a value, returning "null" for null and "object" for real objects.',
    symptom_description: 'describeType(null) returns "object" instead of "null".',
    explanation:
      "typeof null has returned 'object' since the first version of JavaScript. It is a long-standing bug in the language that cannot be fixed without breaking the web, so it is now permanent. That means typeof alone can never distinguish null from a real object — you have to check `value === null` explicitly, and check it FIRST. This is the root cause of countless 'cannot read property of null' crashes: a typeof guard that looked like it covered the case but did not.",
    test_cases: [
      { input: [null], expected_output: "null" },
      { input: [{ a: 1 }], expected_output: "object" },
      { input: [5], expected_output: "number" },
    ],
    hints: [
      "Run typeof null in a console. Does the answer surprise you?",
      "The object branch is catching something it should not.",
      "typeof null is 'object' — a famous language bug. Check value === null before the typeof test.",
    ],
  },
  {
    title: "Identical objects counted as different",
    language: "javascript",
    bug_category: "type_error",
    difficulty: "hard",
    function_name: "countUnique",
    broken_code: `function countUnique(records) {
    const seen = [];
    for (const record of records) {
        if (!seen.some((s) => s === record)) {
            seen.push(record);
        }
    }
    return seen.length;
}`,
    correct_code: `function countUnique(records) {
    const seen = [];
    for (const record of records) {
        const key = JSON.stringify(record);
        if (!seen.some((s) => JSON.stringify(s) === key)) {
            seen.push(record);
        }
    }
    return seen.length;
}`,
    problem_description:
      "countUnique(records) should count distinct records by their contents, so two records with the same fields count once.",
    symptom_description:
      'countUnique([{id:1},{id:1}]) returns 2 instead of 1, even though the two objects look identical.',
    explanation:
      "=== on objects compares REFERENCES, not contents — it asks 'are these the same object in memory', and two separately created objects are never equal no matter how identical they look. Primitives compare by value, which is why this catches people out: the same operator means something different depending on the type. To compare contents you need a value-based key; JSON.stringify works for simple flat data (though it is order-sensitive and cannot handle cycles). For anything richer, compare field by field or use a proper deep-equal.",
    test_cases: [
      { input: [[{ id: 1 }, { id: 1 }]], expected_output: 1 },
      { input: [[{ id: 1 }, { id: 2 }]], expected_output: 2 },
      { input: [[{ id: 3 }]], expected_output: 1 },
    ],
    hints: [
      "The two objects have the same contents. Does === care about contents?",
      "Try comparing two freshly created objects with === in a console.",
      "=== compares object identity. Compare a value-based key such as JSON.stringify(record).",
    ],
  },
  {
    title: "Numbers arriving as text never compare properly",
    language: "python",
    bug_category: "type_error",
    difficulty: "medium",
    function_name: "count_above",
    broken_code: `def count_above(values, threshold):
    return len([v for v in values if v > threshold])`,
    correct_code: `def count_above(values, threshold):
    return len([v for v in values if int(v) > threshold])`,
    problem_description:
      'count_above(values, threshold) counts how many values exceed the threshold. The values arrive as strings from a form, so count_above(["1", "5", "10"], 3) should return 2.',
    symptom_description:
      "count_above([\"1\", \"5\", \"10\"], 3) raises TypeError: '>' not supported between instances of 'str' and 'int'.",
    explanation:
      "Python 3 refuses to order values of unrelated types, so comparing a str to an int is an error rather than a guess. This is deliberate: Python 2 allowed it and produced meaningless results that silently corrupted data. Converting explicitly with int(v) makes the intent obvious. The real lesson is about boundaries — anything coming from a form, a CSV, a query string or JSON arrives as text, and converting it once at the edge is far better than scattering int() calls through your logic.",
    test_cases: [
      { input: [["1", "5", "10"], 3], expected_output: 2 },
      { input: [["1", "2"], 5], expected_output: 0 },
      { input: [["7"], 3], expected_output: 1 },
    ],
    hints: [
      "Read the error carefully — which two types is it refusing to compare?",
      "What type are the entries in `values`, really?",
      "They are strings. Convert before comparing: int(v) > threshold.",
    ],
  },
  {
    title: "Float division makes an invalid index",
    language: "python",
    bug_category: "type_error",
    difficulty: "easy",
    function_name: "middle_item",
    broken_code: `def middle_item(items):
    return items[len(items) / 2]`,
    correct_code: `def middle_item(items):
    return items[len(items) // 2]`,
    problem_description:
      "middle_item(items) should return the middle element, so middle_item([1, 2, 3]) returns 2.",
    symptom_description:
      "middle_item([1, 2, 3]) raises TypeError: list indices must be integers or slices, not float.",
    explanation:
      "In Python 3, `/` is true division and ALWAYS produces a float — 3 / 2 is 1.5, and even 4 / 2 is 2.0 rather than 2. A float can never be a list index, however round it looks. `//` is floor division and returns an int for int operands, which is what indexing needs. This changed from Python 2, where / on two ints did floor division, so older code and older tutorials get this wrong.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: 2 },
      { input: [["a", "b", "c"]], expected_output: "b" },
      { input: [[10, 20, 30, 40, 50]], expected_output: 30 },
    ],
    hints: [
      "The error names a type. What type is len(items) / 2?",
      "Try printing 4 / 2 in Python 3 and look at how it displays.",
      "/ always returns a float. Use // for an integer index.",
    ],
  },
  {
    title: "JSON keys are strings, but the ids are numbers",
    language: "python",
    bug_category: "type_error",
    difficulty: "hard",
    function_name: "total_for_ids",
    broken_code: `def total_for_ids(counts, ids):
    return sum(counts[i] for i in ids)`,
    correct_code: `def total_for_ids(counts, ids):
    return sum(counts[str(i)] for i in ids)`,
    problem_description:
      'total_for_ids(counts, ids) totals the counts for the given ids. counts comes from a JSON payload, e.g. {"1": 10, "2": 20}, and ids are integers.',
    symptom_description:
      "total_for_ids({\"1\": 10, \"2\": 20}, [1, 2]) raises KeyError: 1 — even though the key is plainly there in the dict.",
    explanation:
      "JSON object keys are ALWAYS strings, so parsing {\"1\": 10} gives you the key \"1\", not 1. Python dicts distinguish them: \"1\" and 1 hash differently and are entirely separate keys. The KeyError is confusing because printing the dict shows quotes that are easy to skim past. Converting the lookup with str(i) fixes it here, but the more robust habit is to normalise keys once when the data comes in, so the rest of your code does not have to remember which side of the boundary it is on.",
    test_cases: [
      { input: [{ 1: 10, 2: 20 }, [1, 2]], expected_output: 30 },
      { input: [{ 5: 3 }, [5]], expected_output: 3 },
      { input: [{ 1: 1, 2: 2, 3: 3 }, [1, 3]], expected_output: 4 },
    ],
    hints: [
      "The KeyError says 1. Print list(counts.keys()) and look closely at what you get.",
      'Is the key the integer 1, or the string "1"?',
      "JSON keys are always strings. Look up counts[str(i)].",
    ],
  },
  {
    title: "Highest score picked alphabetically",
    language: "python",
    bug_category: "type_error",
    difficulty: "medium",
    function_name: "highest",
    broken_code: `def highest(values):
    return max(values)`,
    correct_code: `def highest(values):
    return max(values, key=int)`,
    problem_description:
      'highest(values) should return the largest number from a list of numeric strings, so highest(["9", "10", "2"]) returns "10".',
    symptom_description:
      'highest(["9", "10", "2"]) returns "9" instead of "10".',
    explanation:
      'Comparing strings compares them character by character, so "9" beats "10" because \'9\' comes after \'1\'. It is the same reason files sort as 1, 10, 2 in a file browser. max() is doing exactly what it was asked; the values are simply the wrong type for the comparison you meant. Passing key=int tells max how to rank them without changing what it returns. Converting the whole list to ints up front works too, and is better if you need the numbers afterwards.',
    test_cases: [
      { input: [["9", "10", "2"]], expected_output: "10" },
      { input: [["100", "99"]], expected_output: "100" },
      { input: [["5"]], expected_output: "5" },
    ],
    hints: [
      'Compare "9" and "10" directly in Python. Which one is greater?',
      "How does Python order two strings?",
      'Strings compare character by character. Use max(values, key=int).',
    ],
  },
  // ── null_or_undefined ─────────────────────────────────────────────────
  {
    title: "A setting of zero falls back to the default",
    language: "javascript",
    bug_category: "null_or_undefined",
    difficulty: "medium",
    function_name: "retriesFor",
    broken_code: `function retriesFor(settings) {
    return settings.retries || 3;
}`,
    correct_code: `function retriesFor(settings) {
    return settings.retries ?? 3;
}`,
    problem_description:
      "retriesFor(settings) should use settings.retries when it is provided and fall back to 3 when it is missing. Setting retries to 0 means 'do not retry'.",
    symptom_description:
      "retriesFor({ retries: 0 }) returns 3 instead of 0 — turning retries off silently turns them back on.",
    explanation:
      "|| falls back whenever the left side is FALSY, and 0 is falsy — along with \"\", false and NaN. So a legitimate zero is indistinguishable from a missing value. ?? (nullish coalescing) only falls back for null and undefined, which is what 'was this provided?' actually means. Use || when you genuinely want to replace any falsy value, and ?? when you mean 'unless it was not supplied'. This bug class is nasty precisely because it works for every value except the ones that mean 'off' or 'empty'.",
    test_cases: [
      { input: [{ retries: 0 }], expected_output: 0 },
      { input: [{ retries: 5 }], expected_output: 5 },
      { input: [{}], expected_output: 3 },
    ],
    hints: [
      "It works for 5 but not for 0. What is special about 0?",
      "List the values || treats as 'missing'.",
      "0 is falsy, so || replaces it. Use ?? to fall back only on null/undefined.",
    ],
  },
  {
    title: "find() result used without checking",
    language: "javascript",
    bug_category: "null_or_undefined",
    difficulty: "medium",
    function_name: "priceOf",
    broken_code: `function priceOf(items, name) {
    return items.find((item) => item.name === name).price;
}`,
    correct_code: `function priceOf(items, name) {
    const found = items.find((item) => item.name === name);
    return found ? found.price : 0;
}`,
    problem_description:
      "priceOf(items, name) should return the named item's price, or 0 when there is no such item.",
    symptom_description:
      'priceOf([{name:"a",price:5}], "b") throws "Cannot read properties of undefined (reading \'price\')" instead of returning 0.',
    explanation:
      "Array.find returns undefined when nothing matches — it does not throw, and it does not return an empty object. Chaining .price straight onto the result assumes a match always exists, so the very first miss crashes. Any lookup that can fail needs its result checked before use. Note that find returning undefined is also why `find(...)?.price` gives undefined rather than 0 — if you need a specific fallback you still have to supply it.",
    test_cases: [
      {
        input: [
          [
            { name: "a", price: 5 },
            { name: "b", price: 8 },
          ],
          "b",
        ],
        expected_output: 8,
      },
      { input: [[{ name: "a", price: 5 }], "b"], expected_output: 0 },
      { input: [[], "x"], expected_output: 0 },
    ],
    hints: [
      "What does find return when nothing matches?",
      "The error says something is undefined — trace back to what produced it.",
      "Store the result, check it, then read .price only if it exists.",
    ],
  },
  {
    title: "Destructuring default ignores an explicit null",
    language: "javascript",
    bug_category: "null_or_undefined",
    difficulty: "hard",
    function_name: "greet",
    broken_code: `function greet(user) {
    const { name = "guest" } = user;
    return "hi " + name;
}`,
    correct_code: `function greet(user) {
    const name = user.name ?? "guest";
    return "hi " + name;
}`,
    problem_description:
      'greet(user) should greet the user by name, falling back to "guest" when no name is available.',
    symptom_description:
      'greet({ name: null }) returns "hi null" instead of "hi guest", although greet({}) works fine.',
    explanation:
      "Destructuring defaults are applied ONLY when the value is undefined. An explicit null is a real value, so the default is skipped and null flows straight into the string. The same rule governs default parameters: f(x = 1) uses 1 for undefined but not for null. This matters constantly with API and database data, where a missing field is usually null rather than undefined. When both need the same fallback, ?? is the tool — it treats null and undefined alike.",
    test_cases: [
      { input: [{ name: null }], expected_output: "hi guest" },
      { input: [{}], expected_output: "hi guest" },
      { input: [{ name: "vir" }], expected_output: "hi vir" },
    ],
    hints: [
      "The empty object works but an explicit null does not. What distinguishes them?",
      "Exactly which value triggers a destructuring default?",
      "Defaults only apply to undefined, never null. Use user.name ?? \"guest\".",
    ],
  },
  {
    title: "Optional chaining only guards the first link",
    language: "javascript",
    bug_category: "null_or_undefined",
    difficulty: "hard",
    function_name: "cityOf",
    broken_code: `function cityOf(user) {
    return user?.address.city ?? "unknown";
}`,
    correct_code: `function cityOf(user) {
    return user?.address?.city ?? "unknown";
}`,
    problem_description:
      'cityOf(user) should return the user\'s city, or "unknown" if any part of the path is missing.',
    symptom_description:
      "cityOf(null) returns \"unknown\" as expected, but cityOf({}) throws \"Cannot read properties of undefined (reading 'city')\".",
    explanation:
      "`?.` guards exactly the one access it is attached to — nothing further along the chain. user?.address safely yields undefined when user is null, but the very next `.city` is a plain access on that undefined and throws. Every link that can be missing needs its own ?. The reason it looks like it works is that a null user short-circuits the WHOLE expression, so the most obvious test case passes while the realistic one (an object that simply lacks the field) still crashes.",
    test_cases: [
      { input: [{}], expected_output: "unknown" },
      { input: [{ address: { city: "pune" } }], expected_output: "pune" },
      { input: [null], expected_output: "unknown" },
    ],
    hints: [
      "null works but {} does not. What is different about the second case?",
      "How far along the chain does a single ?. actually protect you?",
      "?. guards only its own access. You need user?.address?.city.",
    ],
  },
  {
    title: "Zero retries becomes three retries",
    language: "python",
    bug_category: "null_or_undefined",
    difficulty: "medium",
    function_name: "retries_for",
    broken_code: `def retries_for(config):
    return config.get("retries") or 3`,
    correct_code: `def retries_for(config):
    value = config.get("retries")
    if value is None:
        return 3
    return value`,
    problem_description:
      "retries_for(config) should use config['retries'] when present and default to 3 when it is missing. A value of 0 means 'do not retry'.",
    symptom_description:
      "retries_for({'retries': 0}) returns 3 instead of 0, so disabling retries has no effect.",
    explanation:
      "`or` returns the right-hand side whenever the left is falsy, and in Python 0, \"\", [], {} and False are all falsy. So a deliberate 0 is treated exactly like a missing key. Testing `is None` asks the question you actually meant: was a value supplied at all? The `x = y or default` idiom is common and usually harmless, but it quietly breaks for every legitimate empty-or-zero value — which are often the most important cases.",
    test_cases: [
      { input: [{ retries: 0 }], expected_output: 0 },
      { input: [{ retries: 5 }], expected_output: 5 },
      { input: [{}], expected_output: 3 },
    ],
    hints: [
      "5 works, 0 does not. Which values does Python consider falsy?",
      "`or` cannot tell 0 apart from a missing key.",
      "Check `is None` explicitly instead of relying on truthiness.",
    ],
  },
  {
    title: "next() explodes when nothing matches",
    language: "python",
    bug_category: "null_or_undefined",
    difficulty: "hard",
    function_name: "first_match",
    broken_code: `def first_match(items, target):
    return next(i for i in items if i == target)`,
    correct_code: `def first_match(items, target):
    return next((i for i in items if i == target), -1)`,
    problem_description:
      "first_match(items, target) should return the first matching item, or -1 when there is no match.",
    symptom_description:
      "first_match([1, 2, 3], 5) raises StopIteration instead of returning -1.",
    explanation:
      "next() raises StopIteration when the generator is exhausted — that is how iteration signals 'nothing left', and here it means 'no match'. Passing a second argument gives next() a default to return instead, which turns the exception into an ordinary value. Note the extra parentheses in the fix: with two arguments, the generator expression must be parenthesised or Python cannot tell where the first argument ends. StopIteration escaping into normal code is especially confusing because inside a for loop it is invisible — the loop consumes it.",
    test_cases: [
      { input: [[1, 2, 3], 2], expected_output: 2 },
      { input: [[1, 2, 3], 5], expected_output: -1 },
      { input: [[], 1], expected_output: -1 },
    ],
    hints: [
      "What does next() do when the generator produces nothing?",
      "next() accepts a second argument. What is it for?",
      "next((...), -1) returns the default instead of raising StopIteration.",
    ],
  },
  {
    title: "Missing score turns the total into a crash",
    language: "python",
    bug_category: "null_or_undefined",
    difficulty: "medium",
    function_name: "total_score",
    broken_code: `def total_score(scores, names):
    return sum(scores.get(n) for n in names)`,
    correct_code: `def total_score(scores, names):
    return sum(scores.get(n, 0) for n in names)`,
    problem_description:
      "total_score(scores, names) should add up the scores for the named players, treating anyone without a score as 0.",
    symptom_description:
      "total_score({'a': 5}, ['a', 'b']) raises TypeError: unsupported operand type(s) for +: 'int' and 'NoneType'.",
    explanation:
      ".get() returns None for a missing key — that is its whole point, as opposed to [] which raises KeyError. But None is not a number, so it blows up as soon as it reaches the addition. Supplying a second argument, .get(n, 0), gives a fallback of the right TYPE. The error surfaces at the sum rather than at the lookup, which is what makes this hard to trace: the line that crashes is not the line that is wrong. That gap between where a None is created and where it is finally used is the defining feature of null bugs.",
    test_cases: [
      { input: [{ a: 5 }, ["a", "b"]], expected_output: 5 },
      { input: [{ a: 5, b: 3 }, ["a", "b"]], expected_output: 8 },
      { input: [{}, ["x"]], expected_output: 0 },
    ],
    hints: [
      "The error mentions NoneType. Where could a None have come from?",
      "What does dict.get() return for a key that is not there?",
      "Give .get a default of the right type: scores.get(n, 0).",
    ],
  },
  {
    title: "A reading of zero counts as no reading",
    language: "python",
    bug_category: "null_or_undefined",
    difficulty: "hard",
    function_name: "describe_temp",
    broken_code: `def describe_temp(readings, station):
    reading = readings.get(station)
    if reading:
        return "recorded"
    return "missing"`,
    correct_code: `def describe_temp(readings, station):
    reading = readings.get(station)
    if reading is not None:
        return "recorded"
    return "missing"`,
    problem_description:
      "describe_temp(readings, station) should report 'recorded' whenever that station reported a temperature — including a reading of 0 degrees — and 'missing' only when the station is absent.",
    symptom_description:
      "describe_temp({'north': 0}, 'north') returns 'missing' instead of 'recorded'. A genuine zero-degree reading is reported as no reading at all.",
    explanation:
      "`if reading:` tests truthiness, not existence, and 0 is falsy — so a perfectly valid measurement is discarded. dict.get() returns None for a missing key, which is also falsy, and that is exactly why the two cases become indistinguishable. `is not None` asks the real question. This is most dangerous where zero is meaningful: temperatures, balances, counts, coordinates. A good habit — whenever a value might legitimately be 0, \"\" or an empty list, write the None check explicitly rather than leaning on truthiness.",
    test_cases: [
      { input: [{ north: 0 }, "north"], expected_output: "recorded" },
      { input: [{ north: 12 }, "north"], expected_output: "recorded" },
      { input: [{ north: 3 }, "south"], expected_output: "missing" },
    ],
    hints: [
      "A reading of 12 works, 0 does not. Is 0 truthy in Python?",
      "The check is asking 'is this truthy', not 'does this exist'.",
      "Use `if reading is not None:` so a zero reading still counts.",
    ],
  },  // ── off_by_one ────────────────────────────────────────────────────────
  {
    title: "Page 1 shows the second page of results",
    language: "javascript",
    bug_category: "off_by_one",
    difficulty: "hard",
    function_name: "pageItems",
    broken_code: `function pageItems(items, page, size) {
    return items.slice(page * size, page * size + size);
}`,
    correct_code: `function pageItems(items, page, size) {
    const start = (page - 1) * size;
    return items.slice(start, start + size);
}`,
    problem_description:
      "pageItems(items, page, size) returns one page of results. Pages are numbered from 1, so pageItems([1,2,3,4,5,6], 1, 3) gives [1,2,3].",
    symptom_description:
      "pageItems([1,2,3,4,5,6], 1, 3) returns [4,5,6] — page 1 shows page 2's contents, and the first three items are unreachable.",
    explanation:
      "The formula page * size assumes pages are numbered from 0, but the API numbers them from 1 — so every page is shifted by one full page and the first page can never be reached. Converting at the boundary with (page - 1) * size keeps the 1-based public interface while doing 0-based arithmetic internally. Mixing 1-based and 0-based counting in the same expression is one of the most common sources of off-by-one bugs; decide which convention each layer uses and convert deliberately at the edge.",
    test_cases: [
      { input: [[1, 2, 3, 4, 5, 6], 1, 3], expected_output: [1, 2, 3] },
      { input: [[1, 2, 3, 4, 5, 6], 2, 3], expected_output: [4, 5, 6] },
      { input: [[1, 2, 3], 1, 2], expected_output: [1, 2] },
    ],
    hints: [
      "Work out by hand what start index page 1 should use.",
      "Are pages numbered from 0 or from 1? Does the formula agree?",
      "Pages start at 1, so the offset is (page - 1) * size.",
    ],
  },
  {
    title: "Loop runs one step past the end",
    language: "javascript",
    bug_category: "off_by_one",
    difficulty: "easy",
    function_name: "sumAll",
    broken_code: `function sumAll(nums) {
    let total = 0;
    for (let i = 0; i <= nums.length; i++) {
        total = total + nums[i];
    }
    return total;
}`,
    correct_code: `function sumAll(nums) {
    let total = 0;
    for (let i = 0; i < nums.length; i++) {
        total = total + nums[i];
    }
    return total;
}`,
    problem_description:
      "sumAll(nums) should add up every number in the array, so sumAll([1, 2, 3]) returns 6.",
    symptom_description: "sumAll([1, 2, 3]) returns NaN instead of 6.",
    explanation:
      "Array indices run from 0 to length - 1, so `i <= nums.length` takes one extra step and reads nums[3] on a three-element array. That is undefined, and 6 + undefined is NaN — which then poisons the rest of the sum. JavaScript does not throw for an out-of-range index, it just hands back undefined, so the mistake surfaces later and somewhere else. NaN appearing from nowhere in a numeric loop is a strong hint to check the bounds.",
    test_cases: [
      { input: [[1, 2, 3]], expected_output: 6 },
      { input: [[5]], expected_output: 5 },
      { input: [[]], expected_output: 0 },
    ],
    hints: [
      "What is the last valid index of a 3-element array?",
      "Log nums[i] each iteration and watch the final one.",
      "`i <= nums.length` reads one past the end. Use `<`.",
    ],
  },
  {
    title: "Joined string ends with a stray dash",
    language: "javascript",
    bug_category: "off_by_one",
    difficulty: "medium",
    function_name: "joinWithDash",
    broken_code: `function joinWithDash(words) {
    let out = "";
    for (let i = 0; i < words.length; i++) {
        out = out + words[i] + "-";
    }
    return out;
}`,
    correct_code: `function joinWithDash(words) {
    let out = "";
    for (let i = 0; i < words.length; i++) {
        if (i > 0) {
            out = out + "-";
        }
        out = out + words[i];
    }
    return out;
}`,
    problem_description:
      'joinWithDash(words) should join words with dashes between them, so joinWithDash(["a","b"]) returns "a-b".',
    symptom_description: 'joinWithDash(["a","b"]) returns "a-b-" — there is a trailing dash.',
    explanation:
      "This is the fencepost problem: n items need only n - 1 separators, but the loop adds one separator per item. Adding the dash BEFORE each item except the first gets the count right, and it handles the empty array correctly too. The name comes from fencing — a 10-metre fence with posts every metre needs 11 posts, not 10. Whenever you are alternating between items and separators, count them separately and check the difference.",
    test_cases: [
      { input: [["a", "b"]], expected_output: "a-b" },
      { input: [["solo"]], expected_output: "solo" },
      { input: [["x", "y", "z"]], expected_output: "x-y-z" },
    ],
    hints: [
      "Count the words and count the dashes. How do the totals compare?",
      "How many separators do 3 items actually need?",
      "n items need n-1 separators. Add the dash before each item except the first.",
    ],
  },
  {
    title: "Chunking silently drops the last group",
    language: "python",
    bug_category: "off_by_one",
    difficulty: "hard",
    function_name: "chunk",
    broken_code: `def chunk(items, size):
    out = []
    for i in range(0, len(items) - size, size):
        out.append(items[i:i + size])
    return out`,
    correct_code: `def chunk(items, size):
    out = []
    for i in range(0, len(items), size):
        out.append(items[i:i + size])
    return out`,
    problem_description:
      "chunk(items, size) should split a list into groups of size, keeping any short final group. chunk([1,2,3,4,5], 2) gives [[1,2],[3,4],[5]].",
    symptom_description:
      "chunk([1,2,3,4,5], 2) returns [[1,2],[3,4]] — the final [5] is missing entirely.",
    explanation:
      "Stopping at len(items) - size means the loop never starts a group that would run past the end, so any incomplete final chunk is skipped. But slicing in Python already clamps to the end of the list — items[4:6] on a 5-element list is simply [5], with no error — so the guard is unnecessary and actively harmful. Ranging over the full length lets the last partial group through. Losing trailing data is a particularly nasty bug because the output still looks well-formed.",
    test_cases: [
      { input: [[1, 2, 3, 4, 5], 2], expected_output: [[1, 2], [3, 4], [5]] },
      { input: [[1, 2, 3, 4], 2], expected_output: [[1, 2], [3, 4]] },
      { input: [[1], 3], expected_output: [[1]] },
    ],
    hints: [
      "An even-sized list works. What is different when the size does not divide evenly?",
      "What is the last value of i the range produces?",
      "Slicing already stops safely at the end, so range over len(items), not len(items) - size.",
    ],
  },
  {
    title: "Last character index is out of range",
    language: "python",
    bug_category: "off_by_one",
    difficulty: "easy",
    function_name: "last_char",
    broken_code: `def last_char(text):
    return text[len(text)]`,
    correct_code: `def last_char(text):
    return text[len(text) - 1]`,
    problem_description:
      'last_char(text) should return the final character, so last_char("hello") returns "o".',
    symptom_description: 'last_char("hello") raises IndexError: string index out of range.',
    explanation:
      "Indices start at 0, so a 5-character string has indices 0 through 4 — index 5 does not exist. The last valid index is always len - 1. Python also offers text[-1], which counts from the end and is both shorter and harder to get wrong. Unlike JavaScript, Python raises IndexError rather than returning undefined, which is genuinely helpful: the failure appears exactly where the mistake is.",
    test_cases: [
      { input: ["hello"], expected_output: "o" },
      { input: ["a"], expected_output: "a" },
      { input: ["debug"], expected_output: "g" },
    ],
    hints: [
      'Write out the indices of "hello" one by one.',
      "If the length is 5, what is the highest valid index?",
      "Use len(text) - 1, or simply text[-1].",
    ],
  },
  {
    title: "Sliding window never reaches the end",
    language: "python",
    bug_category: "off_by_one",
    difficulty: "hard",
    function_name: "max_window_sum",
    broken_code: `def max_window_sum(nums, k):
    best = 0
    for i in range(len(nums) - k):
        best = max(best, sum(nums[i:i + k]))
    return best`,
    correct_code: `def max_window_sum(nums, k):
    best = 0
    for i in range(len(nums) - k + 1):
        best = max(best, sum(nums[i:i + k]))
    return best`,
    problem_description:
      "max_window_sum(nums, k) should return the largest sum of any k consecutive numbers. max_window_sum([1,2,3,10], 2) is 13.",
    symptom_description:
      "max_window_sum([1,2,3,10], 2) returns 5 instead of 13 — the window containing the largest value is never examined.",
    explanation:
      "A list of length n has exactly n - k + 1 windows of size k, not n - k. Dropping the +1 means the final window — starting at index n - k — is never generated, so the answer is silently wrong rather than crashing. Check it on the smallest case: with n = k there is exactly 1 window, and n - k gives 0. Deriving the count from a tiny example is the fastest way to get these bounds right, and it catches the mistake before any test does.",
    test_cases: [
      { input: [[1, 2, 3, 10], 2], expected_output: 13 },
      { input: [[5, 1, 1], 2], expected_output: 6 },
      { input: [[4, 4], 2], expected_output: 8 },
    ],
    hints: [
      "How many windows of size 2 fit in a list of 4 numbers? How many does the loop make?",
      "Which window is missing from the ones being checked?",
      "There are len(nums) - k + 1 windows. The range is missing the + 1.",
    ],
  },
  {
    title: "Range check excludes its own lower bound",
    language: "python",
    bug_category: "off_by_one",
    difficulty: "medium",
    function_name: "count_in_range",
    broken_code: `def count_in_range(nums, low, high):
    return len([n for n in nums if low < n <= high])`,
    correct_code: `def count_in_range(nums, low, high):
    return len([n for n in nums if low <= n <= high])`,
    problem_description:
      "count_in_range(nums, low, high) counts values between low and high INCLUSIVE, so count_in_range([1,2,3], 1, 3) returns 3.",
    symptom_description:
      "count_in_range([1,2,3], 1, 3) returns 2 instead of 3 — a value exactly equal to low is not counted, although one equal to high is.",
    explanation:
      "The two comparisons are inconsistent: `<` excludes low while `<=` includes high, so the range is half-open when the specification calls for it to be closed. Boundary values are exactly the inputs least likely to be tested, which is how this survives. When a spec says 'inclusive', both ends need <=. It is worth writing one test per boundary — at low, at high, and just outside each — since that is where nearly all range bugs live.",
    test_cases: [
      { input: [[1, 2, 3], 1, 3], expected_output: 3 },
      { input: [[1, 2, 3], 2, 3], expected_output: 2 },
      { input: [[5], 1, 4], expected_output: 0 },
    ],
    hints: [
      "Which of the boundary values is being counted, and which is not?",
      "Compare the two comparison operators in that condition.",
      "'Inclusive' needs <= on both sides. Change low < n to low <= n.",
    ],
  },
  // ── logic_error ───────────────────────────────────────────────────────
  {
    title: "Availability check uses or instead of and",
    language: "javascript",
    bug_category: "logic_error",
    difficulty: "hard",
    function_name: "isAvailable",
    broken_code: `function isAvailable(item) {
    return item.inStock || !item.discontinued;
}`,
    correct_code: `function isAvailable(item) {
    return item.inStock && !item.discontinued;
}`,
    problem_description:
      "isAvailable(item) should be true only when the item is in stock AND not discontinued.",
    symptom_description:
      "isAvailable({inStock: false, discontinued: false}) returns true — an out-of-stock item is offered for sale.",
    explanation:
      "With ||, either condition alone is enough, so an item that is merely 'not discontinued' passes even with nothing in stock. Requirements phrased with 'and' need &&; 'or' is strictly weaker and will let extra cases through. These read almost identically, and the bug only shows up for inputs where the two conditions disagree — which is precisely the combination that a happy-path test never covers. Build a small truth table when a boolean expression has more than one term.",
    test_cases: [
      { input: [{ inStock: false, discontinued: false }], expected_output: false },
      { input: [{ inStock: true, discontinued: false }], expected_output: true },
      { input: [{ inStock: true, discontinued: true }], expected_output: false },
    ],
    hints: [
      "Try an item that is out of stock but not discontinued. What should happen?",
      "The requirement says AND. What does the code say?",
      "|| passes if either side is true. Use && so both must hold.",
    ],
  },
  {
    title: "Percentage change comes out backwards",
    language: "javascript",
    bug_category: "logic_error",
    difficulty: "medium",
    function_name: "percentChange",
    broken_code: `function percentChange(oldValue, newValue) {
    return ((oldValue - newValue) / oldValue) * 100;
}`,
    correct_code: `function percentChange(oldValue, newValue) {
    return ((newValue - oldValue) / oldValue) * 100;
}`,
    problem_description:
      "percentChange(oldValue, newValue) should report the change as a percentage of the old value. Going from 100 to 150 is +50.",
    symptom_description:
      "percentChange(100, 150) returns -50 instead of 50 — a rise is reported as a fall.",
    explanation:
      "The subtraction is the wrong way round. Change is always new minus old, so growth is positive and a drop is negative; reversing it flips the sign of every result. The magnitude is right, which is what makes it easy to miss — the numbers look plausible on a dashboard until someone notices growth being drawn downwards. Whenever a formula produces a signed result, test one case in each direction.",
    test_cases: [
      { input: [100, 150], expected_output: 50 },
      { input: [100, 50], expected_output: -50 },
      { input: [200, 200], expected_output: 0 },
    ],
    hints: [
      "The size of the answer is right but something else is not.",
      "Should an increase come out positive or negative?",
      "Change is new - old, not old - new.",
    ],
  },
  {
    title: "any where all was meant",
    language: "python",
    bug_category: "logic_error",
    difficulty: "medium",
    function_name: "all_positive",
    broken_code: `def all_positive(nums):
    return any(n > 0 for n in nums)`,
    correct_code: `def all_positive(nums):
    return all(n > 0 for n in nums)`,
    problem_description:
      "all_positive(nums) should return True only when EVERY number is greater than zero.",
    symptom_description:
      "all_positive([1, -2]) returns True even though -2 is not positive.",
    explanation:
      "any() is True when at least one item passes; all() requires every item to pass. Swapping them gives an answer that is right whenever the list is entirely positive or entirely negative, and wrong for every mixed list — so casual testing tends to confirm it. One more difference worth knowing: on an empty list any() is False but all() is True, which is the mathematically standard 'vacuous truth' and occasionally surprising in its own right.",
    test_cases: [
      { input: [[1, -2]], expected_output: false },
      { input: [[1, 2, 3]], expected_output: true },
      { input: [[-1, -2]], expected_output: false },
    ],
    hints: [
      "Try a list with one positive and one negative number.",
      "Does the code require every item to pass, or just one?",
      "any() needs only one match. Use all().",
    ],
  },
  {
    title: "Guard checked after the division it protects",
    language: "python",
    bug_category: "logic_error",
    difficulty: "hard",
    function_name: "safe_ratio",
    broken_code: `def safe_ratio(a, b):
    if a / b > 1 and b != 0:
        return True
    return False`,
    correct_code: `def safe_ratio(a, b):
    if b != 0 and a / b > 1:
        return True
    return False`,
    problem_description:
      "safe_ratio(a, b) should return True when a / b is greater than 1, and False when b is zero rather than crashing.",
    symptom_description:
      "safe_ratio(1, 0) raises ZeroDivisionError instead of returning False, even though the code checks b != 0.",
    explanation:
      "`and` evaluates left to right and short-circuits, so the guard has to come FIRST to be of any use. Written the other way round, the division has already happened by the time b != 0 is considered. The check is present but powerless — which is worse than no check at all, because it makes the code look safe under review. The rule: a guard must appear before whatever it guards, in evaluation order rather than in reading order.",
    test_cases: [
      { input: [4, 2], expected_output: true },
      { input: [1, 0], expected_output: false },
      { input: [1, 4], expected_output: false },
    ],
    hints: [
      "The zero check exists. Has it run yet at the point of the crash?",
      "In what order does Python evaluate the two sides of `and`?",
      "Short-circuiting only helps if the guard is on the left: b != 0 and a / b > 1.",
    ],
  },
  {
    title: "Gaps between readings come out negative",
    language: "python",
    bug_category: "logic_error",
    difficulty: "medium",
    function_name: "largest_gap",
    broken_code: `def largest_gap(nums):
    gaps = []
    for i in range(len(nums) - 1):
        gaps.append(nums[i] - nums[i + 1])
    return max(gaps)`,
    correct_code: `def largest_gap(nums):
    gaps = []
    for i in range(len(nums) - 1):
        gaps.append(nums[i + 1] - nums[i])
    return max(gaps)`,
    problem_description:
      "largest_gap(nums) should return the biggest jump between consecutive values in an ascending list, so largest_gap([1, 5, 6]) returns 4.",
    symptom_description:
      "largest_gap([1, 5, 6]) returns -1 instead of 4 — every gap is negative.",
    explanation:
      "The subtraction is reversed: for an ascending list, nums[i] - nums[i+1] is always negative, so max() ends up picking the SMALLEST real gap (the one closest to zero). Two errors stack here — the sign flip and the resulting inversion of what max means — which is why the answer looks unrelated to the input rather than merely negated. Reversing a subtraction is easy to do and easy to spot once you check a single pair by hand.",
    test_cases: [
      { input: [[1, 5, 6]], expected_output: 4 },
      { input: [[0, 1, 2]], expected_output: 1 },
      { input: [[2, 10]], expected_output: 8 },
    ],
    hints: [
      "Work out the first gap by hand and compare it with what the code computes.",
      "For an ascending list, which of the two values is larger?",
      "The subtraction is backwards: use nums[i + 1] - nums[i].",
    ],
  },
  // ── other ─────────────────────────────────────────────────────────────
  {
    title: "Only the first dash gets removed",
    language: "javascript",
    bug_category: "other",
    difficulty: "medium",
    function_name: "stripDashes",
    broken_code: `function stripDashes(text) {
    return text.replace("-", "");
}`,
    correct_code: `function stripDashes(text) {
    return text.replace(/-/g, "");
}`,
    problem_description:
      'stripDashes(text) should remove every dash, so stripDashes("a-b-c") returns "abc".',
    symptom_description: 'stripDashes("a-b-c") returns "ab-c" — only the first dash is removed.',
    explanation:
      "When replace() is given a STRING to search for, it replaces only the first occurrence. Replacing every match requires a regular expression with the global flag, /-/g. This trips people up because the single-replacement behaviour is easy to miss on short test input with only one match. Modern JavaScript also offers replaceAll(), which does what most people expect from the name — but note it throws if you hand it a non-global regex.",
    test_cases: [
      { input: ["a-b-c"], expected_output: "abc" },
      { input: ["no dashes"], expected_output: "no dashes" },
      { input: ["-x-"], expected_output: "x" },
    ],
    hints: [
      "How many dashes were removed, and how many were there?",
      "What does replace() do when its first argument is a plain string?",
      'Use a global regex: text.replace(/-/g, "") — or replaceAll.',
    ],
  },
  {
    title: "Rounded values get glued together",
    language: "javascript",
    bug_category: "other",
    difficulty: "hard",
    function_name: "addRounded",
    broken_code: `function addRounded(a, b) {
    return a.toFixed(2) + b.toFixed(2);
}`,
    correct_code: `function addRounded(a, b) {
    return Number((a + b).toFixed(2));
}`,
    problem_description:
      "addRounded(a, b) should add two numbers and return the result rounded to two decimal places, as a number. addRounded(1, 2) is 3.",
    symptom_description: 'addRounded(1, 2) returns the string "1.002.00" instead of 3.',
    explanation:
      "toFixed() returns a STRING, not a number, so + concatenates instead of adding. Two mistakes compound here: rounding was applied to each operand rather than to the result, and the string type was never converted back. Rounding intermediate values also loses precision that the final rounding would have preserved. The habit worth forming: round once, at the very end, and convert back with Number() if a number is what the caller expects.",
    test_cases: [
      { input: [1, 2], expected_output: 3 },
      { input: [0.1, 0.2], expected_output: 0.3 },
      { input: [1.5, 1], expected_output: 2.5 },
    ],
    hints: [
      "The output is a string. Which operation produced text?",
      "Check what toFixed() actually returns.",
      "toFixed gives a string, so + concatenates. Round the sum once and wrap it in Number().",
    ],
  },
  {
    title: "Sorting the names returns nothing",
    language: "python",
    bug_category: "other",
    difficulty: "easy",
    function_name: "sorted_names",
    broken_code: `def sorted_names(names):
    return names.sort()`,
    correct_code: `def sorted_names(names):
    return sorted(names)`,
    problem_description:
      'sorted_names(names) should return the names in alphabetical order, so sorted_names(["b","a"]) returns ["a","b"].',
    symptom_description: 'sorted_names(["b","a"]) returns None instead of the sorted list.',
    explanation:
      "list.sort() sorts the list IN PLACE and returns None — that None return is deliberate, a convention marking methods that mutate rather than produce a new value. sorted() is the counterpart that leaves the input alone and returns a new sorted list. The same distinction applies to list.reverse() versus reversed(). If a function mysteriously returns None, check whether the last thing it called was a mutating method.",
    test_cases: [
      { input: [["b", "a"]], expected_output: ["a", "b"] },
      { input: [["c", "a", "b"]], expected_output: ["a", "b", "c"] },
      { input: [["only"]], expected_output: ["only"] },
    ],
    hints: [
      "The function returns None. What was the last thing it evaluated?",
      "Look up what list.sort() returns.",
      "sort() sorts in place and returns None. Use sorted(names).",
    ],
  },
  {
    title: "Copying a grid still shares its rows",
    language: "python",
    bug_category: "other",
    difficulty: "hard",
    function_name: "original_after_edit",
    broken_code: `def original_after_edit(grid):
    copy = grid[:]
    copy[0][0] = 99
    return grid[0][0]`,
    correct_code: `def original_after_edit(grid):
    copy = [row[:] for row in grid]
    copy[0][0] = 99
    return grid[0][0]`,
    problem_description:
      "The function copies a grid, edits the copy, then reports the ORIGINAL's first cell — which should be unchanged. For [[1,2],[3,4]] it returns 1.",
    symptom_description:
      "original_after_edit([[1,2],[3,4]]) returns 99 — editing the copy changed the original too.",
    explanation:
      "grid[:] makes a SHALLOW copy: a new outer list whose elements still point at the very same inner lists. Replacing a whole row in the copy would be safe, but reaching into a row mutates an object both grids share. Copying each row as well gives real independence. Beyond two levels, copy.deepcopy() handles arbitrary nesting. The rule to remember: a shallow copy protects only the top level, and the depth of your copy has to match the depth at which you mutate.",
    test_cases: [
      {
        input: [
          [
            [1, 2],
            [3, 4],
          ],
        ],
        expected_output: 1,
      },
      { input: [[[7]]], expected_output: 7 },
      {
        input: [
          [
            [5, 0],
            [0, 0],
          ],
        ],
        expected_output: 5,
      },
    ],
    hints: [
      "The copy was edited, not the original. So why did the original change?",
      "What exactly does grid[:] duplicate — the outer list, the inner ones, or both?",
      "It is a shallow copy. Copy each row too: [row[:] for row in grid].",
    ],
  },
  {
    title: "Summing a dict adds up the keys",
    language: "python",
    bug_category: "other",
    difficulty: "medium",
    function_name: "total_values",
    broken_code: `def total_values(data):
    return sum(data)`,
    correct_code: `def total_values(data):
    return sum(data.values())`,
    problem_description:
      "total_values(data) should add up a dictionary's values, so total_values({'a': 1, 'b': 2}) returns 3.",
    symptom_description:
      "total_values({'a': 1, 'b': 2}) raises TypeError: unsupported operand type(s) for +: 'int' and 'str'.",
    explanation:
      "Iterating a dictionary yields its KEYS, not its values — so sum(data) tries to add the strings 'a' and 'b'. The error at least makes the problem visible here; with numeric keys it would have silently returned the sum of the wrong numbers, which is far worse. Use .values() for the values, .items() for both, and remember that the same rule governs `for k in data` and `if x in data`, which both work on keys.",
    test_cases: [
      { input: [{ a: 1, b: 2 }], expected_output: 3 },
      { input: [{ x: 10 }], expected_output: 10 },
      { input: [{ y: 5, z: 15 }], expected_output: 20 },
    ],
    hints: [
      "The error mentions a str. Where would a string have come from?",
      "What do you get when you iterate over a dictionary directly?",
      "Iterating a dict gives keys. Use sum(data.values()).",
    ],
  },
];
