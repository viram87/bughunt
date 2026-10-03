export const BATCH4 = [
  {
    title: "The list that remembers",
    language: "python",
    bug_category: "scope_error",
    difficulty: "medium",
    function_name: "append_to_list",
    broken_code: `def append_to_list(val, lst=[]):\n    lst.append(val)\n    return lst`,
    correct_code: `def append_to_list(val, lst=None):\n    if lst is None:\n        lst = []\n    lst.append(val)\n    return lst`,
    problem_description: "append_to_list(val) should create a new list with val if no list is provided.",
    symptom_description: "Calling append_to_list(1) returns [1], but calling append_to_list(2) right after returns [1, 2] instead of [2].",
    explanation: "Default arguments in Python are evaluated exactly ONCE when the function is defined, not each time it is called. Because a list is mutable, every call that omits the argument uses the exact same list in memory. The standard fix is to use None as the default and create a fresh list inside the function.",
    test_cases: [
      { input: [1], expected_output: [1] },
      { input: [2], expected_output: [2] },
      { input: [3, [99]], expected_output: [99, 3] }
    ],
    hints: [
      "Try calling it twice in a row in your head. What happens to 'lst'?",
      "Default arguments are created when the function is defined, not when it runs.",
      "Use lst=None as the default, and set lst = [] inside the function if it is None."
    ]
  },
  {
    title: "Sorting numbers alphabetically",
    language: "javascript",
    bug_category: "logic_error",
    difficulty: "easy",
    function_name: "sortNumbers",
    broken_code: `function sortNumbers(arr) {\n    return arr.sort();\n}`,
    correct_code: `function sortNumbers(arr) {\n    return arr.sort((a, b) => a - b);\n}`,
    problem_description: "sortNumbers(arr) should sort an array of numbers from smallest to largest.",
    symptom_description: "sortNumbers([10, 2, 30]) returns [10, 2, 30] instead of [2, 10, 30].",
    explanation: "In JavaScript, Array.prototype.sort() converts elements to strings and compares their UTF-16 code units by default. Alphabetically, '10' comes before '2'. To sort numbers numerically, you must provide a comparison function that subtracts one from the other.",
    test_cases: [
      { input: [[10, 2, 30]], expected_output: [2, 10, 30] },
      { input: [[5, 1, 100]], expected_output: [1, 5, 100] },
      { input: [[-1, -10, 0]], expected_output: [-10, -1, 0] }
    ],
    hints: [
      "Why would 10 come before 2? What data type sorts like that?",
      "JavaScript's default sort converts everything to strings first.",
      "Pass a comparator function: arr.sort((a, b) => a - b)."
    ]
  },
  {
    title: "Mapping strings to numbers",
    language: "javascript",
    bug_category: "type_error",
    difficulty: "medium",
    function_name: "parseAll",
    broken_code: `function parseAll(strings) {\n    return strings.map(parseInt);\n}`,
    correct_code: `function parseAll(strings) {\n    return strings.map(str => parseInt(str, 10));\n}`,
    problem_description: "parseAll(strings) should take an array of numeric strings and return an array of integers.",
    symptom_description: 'parseAll(["10", "10", "10"]) returns [10, NaN, 2].',
    explanation: "Array.prototype.map passes THREE arguments to the callback: the element, its index, and the array. parseInt takes TWO arguments: the string, and the radix (base). So map calls parseInt('10', 0), parseInt('10', 1), and parseInt('10', 2). Base 0 defaults to 10, base 1 is invalid (NaN), and base 2 parses '10' as 2.",
    test_cases: [
      { input: [["10", "10", "10"]], expected_output: [10, 10, 10] },
      { input: [["11", "12", "13"]], expected_output: [11, 12, 13] },
      { input: [["1"]], expected_output: [1] }
    ],
    hints: [
      "map() passes more than just the array element to its callback.",
      "parseInt() takes a second argument (the radix). What is map() passing as the second argument?",
      "map() passes the index. Wrap it in a function: str => parseInt(str, 10)."
    ]
  }
];

BATCH4.push({
  title: "The loop variable that changed",
  language: "python",
  bug_category: "scope_error",
  difficulty: "hard",
  function_name: "make_multipliers",
  broken_code: `def make_multipliers():\n    return [lambda x: i * x for i in range(3)]`,
  correct_code: `def make_multipliers():\n    return [lambda x, i=i: i * x for i in range(3)]`,
  problem_description: "make_multipliers() should return a list of 3 functions. The first multiplies by 0, the second by 1, and the third by 2.",
  symptom_description: "All three functions multiply by 2 instead of 0, 1, and 2.",
  explanation: "Python closures are late-binding. The lambda function looks up the value of 'i' in the surrounding scope at the time it is CALLED, not when it is created. By the time you call them, the loop has finished and 'i' is 2. The standard fix is to bind 'i' as a default argument (i=i), which forces it to be evaluated immediately.",
  test_cases: [
    { input: [], expected_output: [0, 1, 2] } 
  ],
  hints: [
    "When does the lambda look up the value of 'i' — when it's created, or when it's called?",
    "By the time the functions are called, what is the final value of the loop variable?",
    "Bind 'i' as a default argument to freeze its value: lambda x, i=i: i * x."
  ]
});
