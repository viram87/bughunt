import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { CONTACT_EMAIL, SITE_NAME, absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "About",
  description:
    "Why BugHunt exists: courses teach you to write code, but almost nothing teaches you to fix it.",
  alternates: { canonical: absoluteUrl("/about") },
};

export default function AboutPage() {
  return (
    <ProsePage
      title={`About ${SITE_NAME}`}
      intro="Courses teach you to write code. Almost nothing teaches you to fix it."
    >
      <p>
        Every CS student has been here: the code looks right, it runs, and the output is wrong. No
        error message, no stack trace, nothing to search for. Coursework rarely prepares you for
        this, because assignments are graded on writing code from scratch — and yet debugging is most
        of what the job actually is.
      </p>

      <h2>How it works</h2>
      <p>
        You get working code with exactly one bug in it, and a description of the symptom rather than
        the cause. You find it, fix it in the browser, and run it against the test cases. When it
        passes, you get an explanation of the <em>pattern</em> behind the bug — not just the diff.
      </p>
      <p>
        That last part is the point. Knowing that this particular loop needed{" "}
        <code>i + 1</code> is worth very little. Recognising the shape of an off-by-one, so you spot
        the next one faster, is worth a great deal.
      </p>

      <h2>Everything runs in your browser</h2>
      <p>
        Python runs through WebAssembly and JavaScript in a sandboxed worker, right in the tab. There
        is no server executing your code — which means it is fast, it works offline once a challenge
        has loaded, and there is no queue.
      </p>

      <h2>The step-through visualiser</h2>
      <p>
        For most challenges you can watch the code run line by line, with the value of every variable
        at every step. Seeing the exact moment a value goes wrong is a different kind of
        understanding from being told where the bug was.
      </p>

      <h2>It is free, and stays free</h2>
      <p>
        No account needed to try it, no paywall, no ads, no upsell. It runs on free hosting tiers
        deliberately, so there is nothing to recoup and no reason to start charging.
      </p>

      <h2>Found a problem?</h2>
      <p>
        Every challenge is written and checked by hand, and each one is executed before it ships —
        the broken version has to fail at least one test and the correct version has to pass them
        all. That still doesn&apos;t guarantee an explanation is <em>clear</em>. If one confuses you,
        use the report button on the challenge, or email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Reports genuinely get read.
      </p>

      <p>
        <Link href="/challenges">Start with a challenge →</Link>
      </p>
    </ProsePage>
  );
}
