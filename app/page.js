import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  BugIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  TerminalIcon,
  TimerIcon,
  ZapIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { BUG_CATEGORIES } from "@/lib/constants";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  alternates: { canonical: absoluteUrl("/") },
};

// A real, illustrative bug rather than a placeholder — a visitor should be
// able to try spotting one before signing up for anything.
const SAMPLE = {
  code: `def sum_range(n):
    total = 0
    for i in range(1, n):
        total += i
    return total`,
  symptom: "sum_range(5) returns 10, but 1+2+3+4+5 is 15.",
  answer:
    "range(1, n) stops before n, so the last number is never added. It needs range(1, n + 1). Once you have been caught by an exclusive upper bound once, you spot it everywhere.",
};

const FEATURES = [
  {
    icon: BugIcon,
    title: "Real bugs, not puzzles",
    body: "Every challenge is ordinary working code with one thing wrong: a wrong operator, a missing guard, a loop that never ends. The kind you meet on a Tuesday afternoon, not the kind invented for an exam.",
  },
  {
    icon: TerminalIcon,
    title: "Runs in your browser",
    body: "Python runs through WebAssembly and JavaScript in a sandboxed worker, right in the tab. Nothing to install, nothing to configure, and your code never leaves your machine.",
  },
  {
    icon: GraduationCapIcon,
    title: "You learn the pattern",
    body: "Fixing one bug is worth little on its own. Every solve ends with an explanation of why that class of bug happens and how to recognise it, so the next one takes seconds instead of an hour.",
  },
];

const STEPS = [
  {
    title: "Read the symptom",
    body: "You get the code and a description of what goes wrong — never where the bug is. Exactly like a real bug report.",
  },
  {
    title: "Find it and fix it",
    body: "Edit in a real editor and run against real test cases. Stuck? Three progressive hints, only if you ask.",
  },
  {
    title: "Learn the pattern",
    body: "Once it passes, read why the bug happens, and compare your fix against a reference solution.",
  },
];

const AUDIENCES = [
  {
    icon: GraduationCapIcon,
    title: "CS students",
    body: "Your course grades you on code that works. Nobody grades you on finding out why code doesn't — which is most of the job.",
  },
  {
    icon: TimerIcon,
    title: "Interview prep",
    body: "Plenty of sites drill algorithms. Almost none drill reading unfamiliar code under time pressure and working out what is wrong with it.",
  },
  {
    icon: ZapIcon,
    title: "Self-taught developers",
    body: "Tutorials show you working code. They rarely show you broken code, which is what you actually spend your days looking at.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Anyone changing language",
    body: "Most bugs are language-specific traps. Mutable default arguments, lexicographic sorting, block scope — learn them deliberately rather than by losing an afternoon.",
  },
];

const FAQS = [
  {
    q: "Is it really free?",
    a: "Yes, with no account required to try a challenge. Your code runs in your own browser rather than on our servers, so there is nothing for us to pay for per user and no reason to put a limit on it.",
  },
  {
    q: "Which languages are supported?",
    a: "Python and JavaScript. Both run natively in the browser — Python via WebAssembly. Compiled languages like Java and C++ would need server-side execution, which is what makes other platforms expensive to run.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. There is no setup, no local environment, and no extension. Open a challenge and start editing.",
  },
  {
    q: "What if I get stuck?",
    a: "Each challenge has three hints that unlock in order: a nudge, then the region of code, then nearly the answer. They are optional, and your dashboard tracks how many you used so you can watch that number fall over time.",
  },
  {
    q: "What happens to my code?",
    a: "It stays in your browser. Execution happens locally in a sandboxed worker, and we only store your submission if you are signed in and want your progress tracked.",
  },
];

export default async function LandingPage() {
  const { user } = await getCurrentUser();

  // Returning students came to practise, not to read the pitch. Crawlers are
  // always signed out, so this doesn't affect indexing.
  if (user) {
    redirect("/challenges");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    isAccessibleForFree: true,
    audience: { "@type": "EducationalAudience", educationalRole: "student" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="flex-1">
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />

      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:py-28">
          <p className="mb-5 inline-flex items-center rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            Free debugging practice · Python &amp; JavaScript
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Get good at finding{" "}
            <span className="bg-gradient-to-r from-primary to-chart-5 bg-clip-text text-transparent">
              real bugs
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            Debugging is what you do most days as a developer, and almost nobody teaches it. BugHunt
            gives you working code with one real bug in it — you find it, fix it, and learn the
            pattern behind it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/challenges">
                  Start debugging <ArrowRightIcon />
                </Link>
              }
            />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/signup">Create a free account</Link>}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No signup needed to try one · nothing to install
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <h2 className="mb-2 font-semibold">{feature.title}</h2>
              <p className="text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why debugging */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Why practise debugging at all?
          </h2>
          <div className="mt-5 space-y-4 text-muted-foreground">
            <p>
              University courses and coding sites almost all work the same way: here is a blank
              editor, write a function that passes these tests. That teaches you to produce code.
            </p>
            <p>
              Professional work is mostly the opposite. You open a codebase you did not write,
              something is behaving oddly, and your job is to form a theory, test it, and narrow it
              down. That is a separate skill, and it is trained by doing it — not by writing more
              greenfield code.
            </p>
            <p className="text-foreground">
              BugHunt exists to give you the reps: read unfamiliar code, spot what is wrong, and
              build the pattern library that makes it fast.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
          Three steps, and none of them are &ldquo;write this function from scratch&rdquo;.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title}>
              <div className="mb-4 flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </div>
              <h3 className="mb-2 font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Try one */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Try one right now</h2>
          <p className="mt-3 text-muted-foreground">
            This function should add up every number from 1 to n. Can you see what is wrong before
            you scroll past it?
          </p>

          <pre className="mt-6 overflow-x-auto rounded-xl border bg-background p-5 text-sm">
            <code className="font-mono">{SAMPLE.code}</code>
          </pre>

          <p className="mt-4 text-sm">
            <span className="font-medium">What goes wrong: </span>
            <span className="text-muted-foreground">{SAMPLE.symptom}</span>
          </p>

          <details className="mt-4 rounded-lg border bg-background p-4">
            <summary className="cursor-pointer text-sm font-medium">Show the answer</summary>
            <p className="mt-3 text-sm text-muted-foreground">{SAMPLE.answer}</p>
          </details>

          <p className="mt-6 text-sm text-muted-foreground">
            Every challenge works like this, except you fix it in a real editor and run it against
            test cases until they pass.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          The bugs you will actually hit
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
          Sorted by the pattern behind them, so you can drill the ones that keep catching you out.
        </p>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BUG_CATEGORIES.map((category) => (
            <Link
              key={category.value}
              href={`/challenges?bug_category=${category.value}`}
              className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:ring-primary/30"
            >
              <p className="font-medium transition-colors group-hover:text-primary">
                {category.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Who it&apos;s for
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {AUDIENCES.map((audience) => (
              <div key={audience.title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <audience.icon className="size-5" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">{audience.title}</h3>
                  <p className="text-sm text-muted-foreground">{audience.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Common questions
        </h2>
        <div className="mt-10 space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="group rounded-xl border bg-card p-5">
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60 bg-gradient-to-b from-transparent to-accent/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:py-24">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Find your first bug in the next five minutes
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-muted-foreground">
            No install, no setup, no account needed to start. Pick a challenge and see how fast you
            spot it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/challenges">
                  Browse the challenges <ArrowRightIcon />
                </Link>
              }
            />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/signup">Track my progress</Link>}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
