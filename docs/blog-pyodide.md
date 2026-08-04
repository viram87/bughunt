---
title: "4 things that surprised me running Python in the browser"
published: false
description: "I run Python client-side with Pyodide — no backend executes any code. Here are the four gotchas that cost me the most time."
tags: python, webassembly, javascript, webdev
# cover_image only works in dev.to's markdown editor. In the default
# editor use "Add a cover image" and upload docs/cover-pyodide.png instead.
cover_image: https://trybughunt.vercel.app/blog-cover/pyodide
---

I built a debugging-practice site where student code runs **entirely in the
browser**. Python via [Pyodide](https://pyodide.org), JavaScript in a worker. No
server executes anything.

No execution bill, no queue, no sandbox to maintain. But four things bit me hard.

---

## 1. Your arguments aren't Python objects

Pass a JS object into Python and you get this:

```
TypeError: 'pyodide.ffi.JsProxy' object is not subscriptable
```

It's not a `dict`. It's a live view of the JS object, and it supports neither
`obj[key]` nor `.get()`.

Convert explicitly:

```js
const pyArgs = input.map((arg) => pyodide.toPy(arg));
const result = fn(...pyArgs);
```

---

## 2. `null` is not `None`

This one passed my entire test suite while being broken in production.

```js
pyodide.toPy(null)
```

| check | result | |
|---|---|---|
| `type(v)` | `JsNull` | |
| `bool(v)` | `False` | ✅ falsy, as expected |
| `v is None` | `False` | ❌ the surprise |

It's falsy, so truthiness checks work fine. But `is None` fails — which was
exactly what my code was checking.

**Why my tests missed it:** the harness used `json.loads`. The app used `toPy`.
Different conversion paths, different answers.

If you need a real `None`, create it *in* Python. Don't pass one across.

---

## 3. `sys.settrace` is a free step debugger

Want to show users their code running line by line? Python basically hands it to you:

```python
def _tracer(frame, event, arg):
    if frame.f_code.co_name != target:
        return None                    # skip library frames
    if event == "line":
        steps.append({
            "line": frame.f_lineno,
            "locals": dict(frame.f_locals),
        })
    return _tracer
```

Two things this naive version gets wrong:

- **Add a step cap.** A tight loop generates steps faster than it burns a 5-second
  timeout. You need both guards.
- **Handle `exception`.** During unwinding, the `return` event still fires with
  `arg=None`. Miss it and your trace says "returned None" for code that crashed.

---

## 4. Your snapshots are lying

A user screenshot exposed this one.

Every step in the trace showed the **final** state of a list. Step 1 included
mutations that hadn't happened yet.

```diff
  tracing:  nums = []; nums.append(1); nums.append(2)

- what the trace showed        + what actually happened
- step 1   nums = [1, 2]       + step 1   nums = []
- step 2   nums = [1, 2]       + step 2   nums = [1]
- step 3   nums = [1, 2]       + step 3   nums = [1, 2]
```

`frame.f_locals` gives you **references**. Snapshot a list and you've stored a
pointer to something the program keeps mutating.

```python
# copy at capture time
return json.loads(json.dumps(value))
```

> Any time you snapshot mutable state over time, you're one reference away from
> a history that rewrites itself.

---

## Worth it?

Yes. Zero execution cost, scales infinitely, works on a locked-down lab machine
with nothing installed.

But **test against the real runtime.** Every bug above was found by running the
actual thing — not by unit tests around it. The `JsNull` one passed a fully green
suite.

---

*Built for [BugHunt](https://trybughunt.vercel.app) — free debugging practice,
runs in your browser, no account needed.*
