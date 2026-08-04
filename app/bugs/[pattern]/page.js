import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BUG_PATTERNS, PATTERN_BY_SLUG } from "@/lib/bug-patterns";
import { LANGUAGES } from "@/lib/constants";
import { ChallengeCard } from "@/components/challenge-card";
import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

// Content is the same for everyone, so this can be cached hard. Revalidating
// daily picks up newly published challenges without making a crawler hit the
// database on every visit.
export const revalidate = 86400;

export function generateStaticParams() {
  return BUG_PATTERNS.map((p) => ({ pattern: p.slug }));
}

export async function generateMetadata({ params }) {
  const { pattern: slug } = await params;
  const pattern = PATTERN_BY_SLUG[slug];
  if (!pattern) return { title: "Not found", robots: { index: false, follow: false } };

  const url = absoluteUrl(`/bugs/${slug}`);
  const description = `${pattern.blurb} What causes them, how to spot them, and free practice challenges you fix in the browser.`;

  return {
    title: pattern.headline,
    description,
    keywords: pattern.errors,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: pattern.headline,
      description: pattern.blurb,
      siteName: SITE_NAME,
    },
    twitter: { card: "summary_large_image", title: pattern.headline, description: pattern.blurb },
  };
}

export default async function BugPatternPage({ params }) {
  const { pattern: slug } = await params;
  const pattern = PATTERN_BY_SLUG[slug];
  if (!pattern) notFound();

  const supabase = await createClient();
  const { data: challenges } = await supabase
    .from("bug_challenges")
    .select("id, title, language, bug_category, difficulty, problem_description")
    .eq("status", "published")
    .eq("bug_category", pattern.category)
    .order("difficulty", { ascending: true })
    .order("id", { ascending: false });

  const list = challenges ?? [];
  const byLanguage = LANGUAGES.map((l) => ({
    ...l,
    count: list.filter((c) => c.language === l.value).length,
  })).filter((l) => l.count > 0);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Bug patterns", item: absoluteUrl("/bugs") },
        { "@type": "ListItem", position: 3, name: pattern.title, item: absoluteUrl(`/bugs/${slug}`) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: pattern.headline,
      description: pattern.blurb,
      url: absoluteUrl(`/bugs/${slug}`),
      learningResourceType: "Guide",
      teaches: pattern.title,
      inLanguage: "en",
      isAccessibleForFree: true,
      provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      hasPart: list.slice(0, 25).map((c) => ({
        "@type": "LearningResource",
        name: c.title,
        url: absoluteUrl(`/challenges/${c.id}`),
        learningResourceType: "Exercise",
      })),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <JsonLd data={jsonLd} />

      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/bugs" className="hover:text-foreground">
          Bug patterns
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{pattern.title}</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{pattern.headline}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{pattern.blurb}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">
          {list.length} free {list.length === 1 ? "challenge" : "challenges"}
        </Badge>
        {byLanguage.map((l) => (
          <Badge key={l.value} variant="outline">
            {l.count} {l.label}
          </Badge>
        ))}
      </div>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            What is {pattern.title.toLowerCase().replace(/s$/, "")}?
          </h2>
          <p>{pattern.what}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Why it happens</h2>
          <p>{pattern.why}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">How to recognise it</h2>
          <ul className="list-disc space-y-1 pl-5">
            {pattern.tells.map((tell, i) => (
              <li key={i}>{tell}</li>
            ))}
          </ul>
        </section>

        <section>
          {/* The literal strings people paste into a search box. Rendering
              them is the point of this page existing. */}
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Errors and symptoms this causes
          </h2>
          <ul className="flex flex-wrap gap-2">
            {pattern.errors.map((err) => (
              <li
                key={err}
                className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground"
              >
                {err}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">How to fix it</h2>
          <p>{pattern.fix}</p>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Practise {pattern.title.toLowerCase()}
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Working code with one bug in it. Find it, fix it in the browser, and see the explanation.
          No account needed.
        </p>

        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No challenges published yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {list.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} status={null} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Other bug patterns</h2>
        {/* Internal links: gives crawlers a path between every landing page,
            and gives readers the next thing to learn. */}
        <div className="flex flex-wrap gap-2">
          {BUG_PATTERNS.filter((p) => p.slug !== slug).map((p) => (
            <Button
              key={p.slug}
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/bugs/${p.slug}`}>{p.title}</Link>}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
