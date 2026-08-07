---
title: "Nobody teaches you to debug"
published: false
description: "Courses grade you on writing code. Almost none grade you on fixing it — which is most of the job. So I built free debugging practice that runs in your browser."
tags: beginners, learning, python, javascript
# cover_image only works in dev.to's markdown editor. In the default
# editor use "Add a cover image" and upload docs/cover-debugging.png instead.
cover_image: https://trybughunt.com/blog-cover/debugging
---

You've been here.

The code looks right. It runs. The output is wrong.

No error. No stack trace. Nothing to paste into Google. Just a number that should
be 10 and is 4, and no idea where it went.

---

## Three years of writing code, zero of fixing it

Every assignment I was given was graded on writing something from scratch.

Not one was graded on fixing something broken.

Then you get to real work and it inverts completely. You spend far more time
reading code you didn't write and finding out why it misbehaves than you ever
spend on a blank file.

**We're trained for the rare case and left to improvise the common one.**

---

## Bugs aren't infinite. They're a handful of shapes

This is the thing that changed how I think about it.

Almost every bug is one of a small number of patterns:

| the shape | what you see |
|---|---|
| 🔁 Loop runs one time too many | `IndexError` on the last item |
| 0️⃣ A valid `0` treated as missing | Setting it to zero has no effect |
| 🔒 Closure captures the variable, not the value | Every callback reports the last one |
| 📋 A "copy" that's the same object | Editing the copy changes the original |

Once you can recognise the shape, you stop debugging line by line and start
recognising. **The next one takes minutes instead of an afternoon.**

You can't get that from reading. You get it from finding bugs, repeatedly, and
being told what you just found.

---

## So I built the practice

[BugHunt](https://trybughunt.com) gives you working code with exactly one
bug in it.

You get the **symptom**, not the cause:

> `last_char("hello")` raises `IndexError: string index out of range`

```python
def last_char(text):
    return text[len(text)]     # ← one character too far
```

You find it. Fix it in the browser. Run it against the test cases.

When it passes, you get an explanation of the **pattern** — not just the diff.
Knowing this loop needed `i + 1` is nearly worthless. Recognising an off-by-one
on sight is worth a lot.

---

## A few things that matter

**Nothing to install.** Python runs through WebAssembly right in the tab. Works on
a locked-down college lab machine with no admin rights.

**No account needed.** Solve a bug, read the explanation, close the tab. An account
only saves your progress.

**Watch it run.** Step through line by line and see every variable at every step.
Seeing the exact moment a value goes wrong is very different from being told
where the bug was.

**Free.** No ads, no paywall. It runs on free hosting tiers on purpose — there's
nothing to recoup, so there's no reason to start charging.

---

## Try one

Pick a bug and see how long it takes you:

**[trybughunt.com](https://trybughunt.com)**

If an explanation is confusing, there's a report button on every challenge. I
read them.
