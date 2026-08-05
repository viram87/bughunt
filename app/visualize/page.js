import Link from "next/link";
import { Visualizer } from "@/components/visualizer";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Python visualizer — step through your code line by line",
  description:
    "Paste Python and watch it run, one line at a time, with every variable at every step. Free, no account, no install — it runs in your browser.",
  keywords: [
    "python visualizer",
    "visualize python code",
    "step through python code online",
    "python code execution visualizer",
    "online python debugger",
  ],
  alternates: { canonical: absoluteUrl("/visualize") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/visualize"),
    title: "Python visualizer — step through your code line by line",
    description:
      "Paste Python and watch it run, one line at a time, with every variable at every step. Free and instant.",
    siteName: SITE_NAME,
  },
};

export default function VisualizePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} Python Visualizer`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any (runs in the browser)",
    url: absoluteUrl("/visualize"),
    description:
      "Step through Python code line by line and see every variable at every step. Runs entirely in the browser.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  // The page already answers these in prose; declaring them as an FAQPage is
  // what makes them eligible to appear directly in search results. Every
  // question here is one people actually type, and every answer is the same
  // text rendered below — Google penalises FAQ markup that isn't on the page.
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I visualize Python code execution?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paste your code into the editor and press Visualize execution. It runs one line at a time and shows every variable at every step, including inside your own functions. It runs in your browser through WebAssembly, so there is nothing to install and no account needed.",
        },
      },
      {
        "@type": "Question",
        name: "Can I step through Python code online for free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. This visualizer is free with no sign-up. Python runs inside your own browser tab rather than on a server, so your code is never uploaded and there is no queue or usage limit.",
        },
      },
      {
        "@type": "Question",
        name: "Does it work with input()?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. If your code calls input(), an input box appears where you supply one answer per line. They are handed to the program in order. When they run out, Python raises EOFError, exactly as it would if you pressed Ctrl-D in a terminal.",
        },
      },
      {
        "@type": "Question",
        name: "Why is my Python code giving the wrong output with no error?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A wrong answer with no exception usually means a logic error: a loop that runs one time too many, a condition that is inverted, or a value that was never updated. Stepping through the code shows the exact step where a variable stops matching what you expected, which is normally faster than re-reading the code.",
        },
      },
      {
        "@type": "Question",
        name: "Is my code sent to a server?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Python is compiled to WebAssembly and runs entirely inside your browser tab. Nothing you paste leaves your machine.",
        },
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <JsonLd data={jsonLd} />
      <JsonLd data={faq} />

      <h1 className="text-3xl font-semibold tracking-tight">Python visualizer</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Paste your code and watch it run, one line at a time, with every variable at every step.
        Seeing the exact moment a value goes wrong is usually faster than reading the code again.
      </p>

      <div className="mt-8">
        <Visualizer />
      </div>

      <section className="mt-14 max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">How it works</h2>
        <p>
          Python runs through WebAssembly inside your own browser tab — there is no server, so your
          code is never uploaded and there is nothing to install or sign up for. The first run
          downloads the Python runtime; after that it is instant.
        </p>
        <p>
          Execution is traced with <code>sys.settrace</code>, which records every line as it runs
          along with the variables in scope. Your own functions are traced too; library internals
          are filtered out so the trace stays readable.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-foreground">Why step through code?</h2>
        <p>
          Reading code tells you what you <em>think</em> it does. Watching it run tells you what it
          actually does. Most bugs live in that gap — a loop that runs one time too many, a variable
          that never changes, a value that is <code>None</code> long before it crashes anything.
        </p>
        <p>
          If you find yourself here often, the pattern behind your bug is usually more useful than
          the fix.{" "}
          <Link href="/bugs" className="text-primary underline underline-offset-2">
            Read about the common ones
          </Link>{" "}
          or{" "}
          <Link href="/challenges" className="text-primary underline underline-offset-2">
            practise finding them
          </Link>
          .
        </p>

        <h2 className="pt-2 text-lg font-semibold text-foreground">Does it work with input()?</h2>
        <p>
          Yes. If your code calls <code>input()</code>, a box appears where you supply one answer
          per line, handed to the program in order. When they run out Python raises{" "}
          <code>EOFError</code>, exactly as it would if you pressed Ctrl-D in a terminal. The value
          that was read is shown on the step that consumed it.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-foreground">
          Why is my code giving the wrong output with no error?
        </h2>
        <p>
          A wrong answer with no exception is usually a logic error — a loop that runs one time too
          many, an inverted condition, or a value that was never updated. Stepping through shows the
          exact step where a variable stops matching what you expected, which is normally faster
          than reading the code again.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-foreground">Is my code sent to a server?</h2>
        <p>
          No. Python is compiled to WebAssembly and runs entirely inside your browser tab. Nothing
          you paste leaves your machine.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-foreground">Limits</h2>
        <p>
          Tracing stops after 5,000 steps, which is generous for normal code and stops an infinite
          loop from hanging the tab. JavaScript is not supported yet.
        </p>
      </section>
    </main>
  );
}
