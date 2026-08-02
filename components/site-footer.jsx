import Link from "next/link";
import { BugIcon } from "lucide-react";
import { BUG_CATEGORIES, LANGUAGES } from "@/lib/constants";
import { SITE_NAME } from "@/lib/site";

// Site-wide footer. Also does real SEO work: the category and language
// links give crawlers a path to every filtered view from any page.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30">
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BugIcon className="size-3.5" />
              </span>
              Bug<span className="-ml-[0.3rem] text-primary">Hunt</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Free debugging practice for CS students. Fix real bugs, learn the patterns behind
              them.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Practice</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/challenges" className="hover:text-foreground">
                  All challenges
                </Link>
              </li>
              {LANGUAGES.map((language) => (
                <li key={language.value}>
                  <Link
                    href={`/challenges?language=${language.value}`}
                    className="hover:text-foreground"
                  >
                    {language.label} challenges
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/challenges?difficulty=easy" className="hover:text-foreground">
                  Beginner friendly
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Bug patterns</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {BUG_CATEGORIES.slice(0, 6).map((category) => (
                <li key={category.value}>
                  <Link
                    href={`/challenges?bug_category=${category.value}`}
                    className="hover:text-foreground"
                  >
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Account</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/signup" className="hover:text-foreground">
                  Create an account
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground">
                  Your progress
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}
          </p>
          <p>Runs entirely in your browser. Your code never leaves your machine.</p>
        </div>
      </div>
    </footer>
  );
}
