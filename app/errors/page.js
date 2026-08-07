import Link from "next/link";
import { ERROR_PAGES } from "@/lib/error-pages";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata = {
  title: "Common Python and JavaScript errors, explained",
  description:
    "IndexError, Cannot read properties of undefined, NoneType has no attribute, UnboundLocalError and more — what each one means, what causes it, and how to fix it.",
  alternates: { canonical: absoluteUrl("/errors") },
};

export default function ErrorsIndex() {
  const byLanguage = ["Python", "JavaScript"].map((lang) => ({
    lang,
    items: ERROR_PAGES.filter((e) => e.language === lang),
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Common Python and JavaScript errors",
          itemListElement: ERROR_PAGES.map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: e.error,
            item: absoluteUrl(`/errors/${e.slug}`),
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Errors", item: absoluteUrl("/errors") },
          ],
        }}
      />

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Common errors, explained
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        What each one actually means, the handful of things that usually cause it, and a working fix
        for each.
      </p>

      {byLanguage.map(({ lang, items }) => (
        <section key={lang} className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">{lang}</h2>
          <div className="space-y-2">
            {items.map((e) => (
              <Link
                key={e.slug}
                href={`/errors/${e.slug}`}
                className="group block rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50"
              >
                <p className="font-mono text-sm break-words transition-colors group-hover:text-primary">
                  {e.error}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{e.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-10 text-sm text-muted-foreground">
        Not listed?{" "}
        <Link href="/visualize" className="text-primary underline underline-offset-2">
          Step through your code
        </Link>{" "}
        to see exactly where the value goes wrong, or{" "}
        <Link href="/bugs" className="text-primary underline underline-offset-2">
          read about the bug patterns
        </Link>{" "}
        behind them.
      </p>
    </main>
  );
}
