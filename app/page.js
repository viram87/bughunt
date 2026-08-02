import Link from "next/link";
import { redirect } from "next/navigation";
import { BugIcon, ZapIcon, GraduationCapIcon, ArrowRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
// able to try spotting it before signing up for anything.
const SAMPLE = {
  language: "python",
  code: `def sum_range(n):
    total = 0
    for i in range(1, n):
        total += i
    return total`,
  symptom: "sum_range(5) returns 10, but 1+2+3+4+5 is 15.",
  answer: "range(1, n) stops before n, so the last number is never added.",
};

const STEPS = [
  {
    icon: BugIcon,
    title: "Read the symptom",
    body: "You get working code and a description of what goes wrong — never where the bug is. Same as a real bug report.",
  },
  {
    icon: ZapIcon,
    title: "Find it and fix it",
    body: "Edit the code in the browser and run it against real test cases. Stuck? Three progressive hints, only if you want them.",
  },
  {
    icon: GraduationCapIcon,
    title: "Learn the pattern",
    body: "Once it passes, you get an explanation of why the bug happens and how to recognise it — so the next one is faster.",
  },
];

export default async function LandingPage() {
  const { user } = await getCurrentUser();

  // Returning students came to practise, not to read the pitch. Crawlers are
  // always signed out, so this doesn't affect indexing.
  if (user) {
    redirect("/challenges");
  }

  const supabase = await createClient();
  const { data: published } = await supabase
    .from("bug_challenges")
    .select("bug_category, difficulty")
    .eq("status", "published");

  const challenges = published ?? [];
  // Counts come from the same data the list page uses, so the landing page
  // can never advertise numbers that don't exist.
  const countByCategory = challenges.reduce((acc, row) => {
    acc[row.bug_category] = (acc[row.bug_category] ?? 0) + 1;
    return acc;
  }, {});
  const total = challenges.length;

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

  return (
    <main className="flex-1">
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:py-28">
          <p className="mb-5 inline-flex items-center rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            Free debugging practice for CS students
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Get good at finding{" "}
            <span className="bg-gradient-to-r from-primary to-chart-5 bg-clip-text text-transparent">
              real bugs
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            Debugging is the skill you use every day at work and barely practise at university.
            BugHunt gives you working code with one real bug in it — you find it, fix it, and learn
            the pattern behind it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/challenges">
              Start debugging <ArrowRightIcon />
            </Link>} />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/signup">Create a free account</Link>}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {total} challenges · Python and JavaScript · no signup needed to try one
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
          Three steps, and none of them are &ldquo;write this function from scratch&rdquo;.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="size-5" />
              </div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Step {index + 1}</p>
              <h3 className="mb-2 font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Try one right here */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Try one right now</h2>
          <p className="mt-2 text-muted-foreground">
            This function is supposed to add up every number from 1 to n. Can you see what&apos;s
            wrong before you scroll past it?
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
            test cases.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          The bugs you&apos;ll actually hit
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
          Sorted by the pattern behind them, so you can practise the ones you keep getting wrong.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BUG_CATEGORIES.map((category) => (
            <Link
              key={category.value}
              href={`/challenges?bug_category=${category.value}`}
              className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:ring-primary/30"
            >
              <p className="font-medium transition-colors group-hover:text-primary">
                {category.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {countByCategory[category.value] ?? 0} challenges
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Why free */}
      <section className="border-t border-border/60 bg-gradient-to-b from-transparent to-accent/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Free, and it runs in your browser</h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            Your code never leaves your machine. Python runs through WebAssembly and JavaScript in a
            sandboxed worker, right in the tab — which means there are no servers to pay for, no
            queues, and no usage limits. That is why this is free and stays free.
          </p>
          <div className="mt-8">
            <Button size="lg" nativeButton={false} render={<Link href="/challenges">
              Browse all {total} challenges <ArrowRightIcon />
            </Link>} />
          </div>
        </div>
      </section>
    </main>
  );
}
