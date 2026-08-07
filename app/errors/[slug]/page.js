import Link from "next/link";
import { notFound } from "next/navigation";
import { ERROR_PAGES, ERROR_BY_SLUG } from "@/lib/error-pages";
import { PATTERN_BY_SLUG } from "@/lib/bug-patterns";
import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

// Static content, so it can be cached hard. Nothing here touches the database.
export const revalidate = 86400;

export function generateStaticParams() {
  return ERROR_PAGES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const entry = ERROR_BY_SLUG[slug];
  if (!entry) return { title: "Not found", robots: { index: false, follow: false } };

  const url = absoluteUrl(`/errors/${slug}`);
  // The title IS the error string, because that is what gets typed into the
  // search box verbatim.
  const title = `${entry.error} — ${entry.language}: causes and fixes`;
  const description = `${entry.summary} Common causes, working fixes, and free practice.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title, description, siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ErrorPage({ params }) {
  const { slug } = await params;
  const entry = ERROR_BY_SLUG[slug];
  if (!entry) notFound();

  const pattern = PATTERN_BY_SLUG[entry.pattern];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Errors", item: absoluteUrl("/errors") },
        { "@type": "ListItem", position: 3, name: entry.error, item: absoluteUrl(`/errors/${slug}`) },
      ],
    },
    {
      // The page is literally a question and its answer, so it is eligible for
      // a rich result on the exact query people type.
      "@context": "https://schema.org",
      "@type": "QAPage",
      mainEntity: {
        "@type": "Question",
        name: `What causes "${entry.error}" in ${entry.language}?`,
        text: `${entry.error} — what it means and how to fix it.`,
        answerCount: 1,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${entry.means} ${entry.fix}`,
          url: absoluteUrl(`/errors/${slug}`),
        },
      },
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <JsonLd data={jsonLd} />

      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/errors" className="hover:text-foreground">
          Errors
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{entry.language}</span>
      </nav>

      <h1 className="font-mono text-2xl font-semibold tracking-tight break-words sm:text-3xl">
        {entry.error}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{entry.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">{entry.language}</Badge>
        {pattern && <Badge variant="outline">{pattern.title}</Badge>}
      </div>

      <section className="mt-10">
        <h2 className="mb-2 text-lg font-semibold">What it means</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{entry.means}</p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Common causes</h2>
        <div className="space-y-6">
          {entry.causes.map((cause, i) => (
            <div key={i} className="rounded-xl border p-4">
              <h3 className="font-medium">
                {i + 1}. {cause.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{cause.why}</p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-destructive">Breaks</p>
                  <pre className="overflow-x-auto rounded-lg bg-destructive/5 p-3 text-xs">
                    <code>{cause.broken}</code>
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-success">Works</p>
                  <pre className="overflow-x-auto rounded-lg bg-success/5 p-3 text-xs">
                    <code>{cause.fixed}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-lg font-semibold">How to find it in your own code</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{entry.fix}</p>
      </section>

      <section className="mt-10 rounded-xl border border-dashed p-5">
        <h2 className="text-lg font-semibold">Still not sure why yours breaks?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste it into the visualizer and watch it run line by line, with every variable at every
          step. Free, and it runs in your browser.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/visualize">Open the visualizer</Link>}
          />
          {pattern && (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/bugs/${pattern.slug}`}>
                  Practise {pattern.title.toLowerCase()}
                </Link>
              }
            />
          )}
        </div>
      </section>

      <section className="mt-12 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Other common errors</h2>
        <div className="flex flex-wrap gap-2">
          {ERROR_PAGES.filter((e) => e.slug !== slug)
            .slice(0, 8)
            .map((e) => (
              <Link
                key={e.slug}
                href={`/errors/${e.slug}`}
                className="rounded-md border px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {e.error}
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
