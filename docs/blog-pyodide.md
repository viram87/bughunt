---
title: "Four things that surprised me running Python in the browser"
published: false
description: "I built a debugging-practice platform where every line of user code runs client-side — Python through Pyodide, JavaScript in a worker. No backend executes anything. Here is what actually bit me."
tags: python, webassembly, javascript, webdev
---

I wanted to build a site where students practise debugging: you get working code
with one bug in it, you find it, you fix it in the browser, and it runs against
test cases.

The obvious architecture is a sandboxed execution service. I did not want one.
Running untrusted code on a server means containers, timeouts, resource limits,
a queue, and a bill that grows with every user. For a free tool aimed at
students, that bill is the thing that eventually kills the project.

So everything runs client-side. Python through [Pyodide](https://pyodide.org)
(CPython compiled to WebAssembly), JavaScript in a sandboxed Web Worker. The
server stores challenges and progress and never executes a line of user code.

The upside is real: it costs nothing per execution, there is no queue, and it
scales to any number of users because the compute is on their machine. The
downside is a set of sharp edges nobody warns you about. Here are the four that
cost me the most time.

## 1. Your arguments arrive as JsProxy, not as Python objects

Pyodide gives you a `globals` object you can write into, and it is tempting to
pass arguments straight through:

```js
const globals = pyodide.toPy({});
await pyodide.runPythonAsync(userCode, { globals });
const fn = globals.get("solve");

const result = fn(...input);   // input came from JSON
```

This works fine until an argument is an object or an array. Then you get:

```
TypeError: 'pyodide.ffi.JsProxy' object is not subscriptable
```

A plain JS object crossing into Python does not become a `dict`. It arrives as a
`JsProxy` — a live view of the JavaScript object — which supports neither
`obj[key]` nor `.get()`. Any challenge taking a dict or a list blew up with an
error that pointed at the user's code rather than at my harness.

The fix is to convert explicitly:

```js
const pyArgs = input.map((arg) => pyodide.toPy(arg));
const result = fn(...pyArgs);
```

`toPy` returns a real `dict` or `list`. It also returns a proxy for
objects and arrays, so you have to destroy them afterwards or you leak:

```js
pyArgs.forEach((arg) => {
  if (arg && typeof arg.destroy === "function") arg.destroy();
});
```

Primitives come back as plain values with no `destroy`, which is why the check
is there rather than an unconditional call.

## 2. JavaScript `null` is not Python `None`

This one shipped past my entire test suite.

I had a challenge teaching the difference between truthiness and existence — the
classic bug where `if reading:` rejects a perfectly valid reading of `0`:

```python
def describe_temp(reading):
    if reading:            # bug: 0 is falsy
        return "recorded"
    return "missing"
```

Test cases were `[0] → "recorded"`, `[12] → "recorded"`, `[null] → "missing"`.
It passed in my Node-based verification harness, which used `json.loads`. Then I
ran the same challenges through real Pyodide and it failed.

In Pyodide 0.28, `toPy(null)` does not give you `None`. It gives you a distinct
`JsNull` sentinel:

```js
pyodide.toPy(null)   // -> jsnull, type JsNull
```

```python
repr(v)        # 'jsnull'
type(v)        # JsNull
v is None      # False   <-- the surprise
bool(v)        # False
```

It is *falsy*, so truthiness checks behave exactly as expected. But `x is None`
is `False`, which is precisely the check the challenge was teaching. My correct
answer returned the wrong result in the actual product while passing every test.

There is no clever fix — it is a boundary you have to respect. If Python code
needs a real `None`, create it in Python (`dict.get()` on a missing key) rather
than passing `null` across:

```python
def describe_temp(readings, station):
    reading = readings.get(station)   # a real None
    if reading is not None:
        return "recorded"
    return "missing"
```

The wider lesson is the one worth taking away: **if your test harness uses a
different conversion path than production, it is not testing production.** My
harness used `json.loads`; the app used `toPy`. Those disagree, so I now run
every Python challenge through real Pyodide before shipping it.

## 3. `sys.settrace` gives you a step debugger almost for free

The feature I most wanted was letting students watch the code run line by line
with every variable visible — because seeing the exact step where a value goes
wrong is a completely different kind of understanding from being told the answer.

In Python this is remarkably easy. `sys.settrace` calls you back on every line:

```python
def _bh_make_tracer(target):
    def _tracer(frame, event, arg):
        if frame.f_code.co_name != target:
            return None                     # ignore library frames
        if event == "line":
            _bh_steps.append({
                "line": frame.f_lineno,
                "locals": _bh_locals(frame),
            })
        return _tracer
    return _tracer
```

Filtering on `frame.f_code.co_name` matters more than it looks. Without it you
capture every frame Pyodide's own machinery executes and the trace becomes
unreadable.

Two refinements the naive version gets wrong:

**A hard step cap, separate from your timeout.** A tight loop generates steps far
faster than it exhausts a five-second clock, so you need both guards or you run
the tab out of memory:

```python
if len(_bh_steps) >= _BH_LIMIT:      # 5000
    return None
```

**Exceptions.** When a frame unwinds from an exception, the `return` event still
fires — with `arg=None`. Handle only `line` and `return` and your trace cheerfully
reports "returned None" for code that actually crashed. You have to catch the
`exception` event and mark the step:

```python
elif event == "exception":
    if _bh_steps:
        exc_type, exc_value = arg[0], arg[1]
        _bh_steps[-1]["raised"] = "%s: %s" % (exc_type.__name__, exc_value)
```

## 4. Your variable snapshots are lying to you

This was my favourite bug, because a user screenshot exposed it and the cause is
completely invisible in the code.

The tracer snapshots `frame.f_locals` at every line. A student traced a function
that mutates a list, and every single step showed the *final* state of the list.
Step 1 showed the list as it looked at the end. The trace was internally
consistent and completely wrong.

The reason: `frame.f_locals` hands you **references**. Storing a list in your
snapshot stores a pointer to a list that the program then keeps mutating. By the
time you serialise the trace, every snapshot points at the same, final object.

The fix is to deep-copy at capture time, and JSON is a convenient way to do it
since the trace has to be JSON-serialisable anyway:

```python
def _bh_safe(value):
    try:
        return _json.loads(_json.dumps(value))
    except Exception:
        try:
            return repr(value)
        except Exception:
            return "<unrepresentable>"
```

The `repr` fallback matters: plenty of real values are not JSON-serialisable, and
a trace that drops them is worse than one showing `<Foo object at 0x...>`.

If you take one thing from this post, take this: **any time you snapshot mutable
state over time, you are one reference away from a history that silently
rewrites itself.**

## The JavaScript side has no `settrace`

Python hands you a tracing hook. JavaScript does not, so the equivalent feature
meant instrumenting the source: parse with [acorn](https://github.com/acornjs/acorn),
inject a recording call before each statement, and print it back out with
[astring](https://github.com/davidbonnet/astring).

That is a much larger job than the Python version, and it has a failure mode the
Python one does not: **instrumented code can behave differently from the original**.
Getting temporal-dead-zone semantics right — not reporting a `let` as defined
before its declaration executes — took a while, and `async`/`await` needed care
so that traced code did not change its own interleaving.

Worth it, but budget three to five times the Python effort if you are considering it.

## Would I do it again?

Yes, without hesitation.

The economics are the whole argument. There is no execution bill, no queue, no
container orchestration, no sandbox escape to worry about — the browser's sandbox
is doing that work and it is far better tested than anything I would write. A
student on a laptop in a lab with no admin rights can use it, because there is
nothing to install.

What I would do differently is verify against the real runtime from day one. Every
one of the bugs above was found by running the actual thing — real Pyodide, the
real worker — and not by unit tests around it. The `JsNull` one in particular
passed a full green suite while being wrong in production.

If you are building anything on Pyodide, make your test harness use the same
conversion path as your app. Everything else in this post is a detail; that one
is the difference between a suite that means something and a suite that does not.

---

*I built this for [BugHunt](https://trybughunt.vercel.app), a free debugging
practice platform for CS students. Everything runs in your browser — no account
needed to try it.*
