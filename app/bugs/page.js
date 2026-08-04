import Link from "next/link";
import { BUG_PATTERNS } from "@/lib/bug-patterns";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata = {
  title: "Common bug patterns in Python and JavaScript",
  description:
    "Off-by-one errors, infinite loops, null and undefined, type errors, scope and closure bugs, async race conditions. What causes each, how to spot it, and free practice.",
  alternates: { canonical: absoluteUrl("/bugs") },
};

export default function BugPatternsIndex() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Common bug patterns",
    itemListElement: BUG_PATTERNS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      item: absoluteUrl(`/bugs/${p.slug}`),
    })),
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <JsonLd data={jsonLd} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Bug patterns", item: absoluteUrl("/bugs") },
          ],
        }}
      />

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Common bug patterns in Python and JavaScript
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Most bugs are not new. They are the same handful of shapes, over and over. Learn to
        recognise the shape and you find the next one in minutes instead of hours.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {BUG_PATTERNS.map((pattern) => (
          <Link
            key={pattern.slug}
            href={`/bugs/${pattern.slug}`}
            className="group rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50"
          >
            <h2 className="font-semibold transition-colors group-hover:text-primary">
              {pattern.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{pattern.blurb}</p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">{pattern.errors[0]}</p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Every pattern comes with free challenges you fix in the browser —{" "}
        <Link href="/challenges" className="text-primary underline underline-offset-2">
          browse all challenges
        </Link>
        . {SITE_NAME} runs your code in your own tab; there is nothing to install.
      </p>
    </main>
  );
}
