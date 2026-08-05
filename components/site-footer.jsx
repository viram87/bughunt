import Link from "next/link";
import { BugIcon } from "lucide-react";
import { LANGUAGES } from "@/lib/constants";
import { BUG_PATTERNS } from "@/lib/bug-patterns";
import { SITE_NAME } from "@/lib/site";

// Site-wide footer. Also does real SEO work: the category and language
// links give crawlers a path to every filtered view from any page.
//
// Takes `user` so the account column matches reality — it previously showed
// "Create an account" and "Log in" to people who were already signed in.
export function SiteFooter({ user }) {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30">
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            {/* The wordmark is one flex item, not two: as bare text nodes,
                "Bug" and "Hunt" each became flex children and gap-2 pushed
                them apart. */}
            <Link
              href="/"
              aria-label="BugHunt"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BugIcon className="size-3.5" />
              </span>
              <span>
                Bug<span className="text-primary">Hunt</span>
              </span>
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
              <li>
                <Link href="/visualize" className="hover:text-foreground">
                  Python visualizer
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Bug patterns</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {/* Four keeps this column level with the others; the rest are
                  reachable from the landing page and the filters. */}
              {/* These point at the /bugs landing pages, not the filtered
                  list. The filter URLs all canonical back to /challenges, so
                  linking them sitewide spent internal link equity on a page
                  that then disclaims it. The landing pages are the organic
                  entry points and are where it should go. */}
              {BUG_PATTERNS.slice(0, 4).map((pattern) => (
                <li key={pattern.slug}>
                  <Link href={`/bugs/${pattern.slug}`} className="hover:text-foreground">
                    {pattern.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/bugs" className="hover:text-foreground">
                  All bug patterns
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Account</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {user ? (
                <>
                  <li>
                    <Link href="/dashboard" className="hover:text-foreground">
                      Your progress
                    </Link>
                  </li>
                  <li>
                    <Link href="/challenges" className="hover:text-foreground">
                      Keep practising
                    </Link>
                  </li>
                </>
              ) : (
                <>
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
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 space-y-4 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          {/* Legal links belong in the footer on every page — it's where people
              look for them, and Google's OAuth review expects a reachable
              privacy policy. */}
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
          </nav>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {SITE_NAME}
            </p>
            <p>Your code runs in your browser, never on our servers.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
