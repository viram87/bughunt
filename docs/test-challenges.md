# Test challenges for the admin panel

Ready-to-paste challenge data for exercising the admin authoring flow at
`/admin/challenges/new`. Neither duplicates an existing category + language
combination in the seeded set.

Both were verified by actually executing the code before being written down:
the broken version fails at least one test, the correct version passes all of
them. If either behaves differently in the browser, that's a real signal about
the CodeRunner and worth investigating rather than working around.

---

## Challenge 1 — JavaScript · Type error · Easy

| Field | Value |
|---|---|
| Title | Cart total comes out as gibberish |
| Function name | `calculateTotal` |
| Language | JavaScript |
| Difficulty | Easy |
| Bug category | Type error |

**What the code should do**

```
calculateTotal(items) should add up the price of every item and return the total, e.g. two items at 10 and 20 gives 30.
```

**What goes wrong**

```
calculateTotal returns "01020" instead of 30 — the total looks like the prices glued together rather than added.
```

**Broken code**

```javascript
function calculateTotal(items) {
    let total = 0;
    for (const item of items) {
        total += item.price;
    }
    return total;
}
```

**Correct code**

```javascript
function calculateTotal(items) {
    let total = 0;
    for (const item of items) {
        total += Number(item.price);
    }
    return total;
}
```

**Test cases**

| Input | Expected output |
|---|---|
| `[[{"price":"10"},{"price":"20"}]]` | `30` |
| `[[{"price":"5"},{"price":"5"},{"price":"5"}]]` | `15` |
| `[[]]` | `0` |

**Explanation**

```
The prices are strings, not numbers — they came from form inputs or JSON. In JavaScript, + means addition for numbers but concatenation when either side is a string, so 0 + "10" produces "010" instead of 10. Convert explicitly with Number(item.price) before adding. This is one of the most common real-world JS bugs because the code looks correct and only misbehaves depending on where the data came from.
```

**Hints**

1. `Look at what type item.price actually is — is it really a number?`
2. `The problem is the += line inside the loop.`
3. `+ concatenates when either operand is a string. Wrap the value in Number() before adding it.`

> The empty-array case passes even on the broken code. That's realistic and
> fine — validation only requires that *some* test fails.

**Verified behaviour**

```
BROKEN   test 1: FAIL — got "01020", expected 30
         test 2: FAIL — got "0555",  expected 15
         test 3: PASS — got 0,       expected 0
CORRECT  all 3 pass
```

---

## Challenge 2 — Python · Null / Undefined · Easy

| Field | Value |
|---|---|
| Title | Missing config key crashes the lookup |
| Function name | `get_setting` |
| Language | Python |
| Difficulty | Easy |
| Bug category | Null / Undefined |

**What the code should do**

```
get_setting(config, key) should return the value for a key, or the string "default" when that key isn't present.
```

**What goes wrong**

```
Looking up a key that isn't in the config crashes with KeyError instead of returning "default".
```

**Broken code**

```python
def get_setting(config, key):
    return config[key]
```

**Correct code**

```python
def get_setting(config, key):
    return config.get(key, "default")
```

**Test cases**

| Input | Expected output |
|---|---|
| `[{"theme":"dark"},"theme"]` | `"dark"` |
| `[{"theme":"dark"},"font"]` | `"default"` |
| `[{},"anything"]` | `"default"` |

**Explanation**

```
Square-bracket access raises KeyError when the key is missing — it assumes the key is always there. dict.get(key, fallback) returns the fallback instead of raising, which is what you want whenever a key is genuinely optional. The bug hides easily because it only appears for configs that omit the key.
```

**Hints**

1. `What happens when the key you're asking for isn't in the dictionary?`
2. `The square-bracket lookup on the return line is the problem.`
3. `dict.get(key, "default") returns a fallback instead of raising KeyError.`

**Verified behaviour**

```
BROKEN   test 1: PASS — got "dark", expected "dark"
         test 2: FAIL — KeyError: 'font'
         test 3: FAIL — KeyError: 'anything'
CORRECT  all 3 pass
```

---

## Notes on the test-case format

- **Input is always an array of arguments.** `[5]` calls the function with one
  argument; `[{"theme":"dark"},"theme"]` calls it with two.
- **Values are JSON.** Strings need quotes (`"dark"`), booleans are lowercase
  (`true`), and Python `None` should be written as `null`.
- Avoid expected outputs of `null` for Python challenges — Python's `None`
  does not round-trip cleanly to JSON `null` through Pyodide. Prefer a
  sentinel value like `"default"`, as Challenge 2 does.
