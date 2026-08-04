import { LEGAL_LAST_UPDATED } from "@/lib/site";

/**
 * Shared shell for the text-heavy pages (about, privacy, terms, contact).
 *
 * Tailwind's typography plugin isn't installed, so the prose rules live here
 * rather than being repeated on four pages. Narrower than the app's max-w-5xl
 * because long-form text is far easier to read at ~70 characters a line.
 */
export function ProsePage({ title, intro, showUpdated = false, children }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {intro && <p className="mt-3 text-lg text-muted-foreground">{intro}</p>}
      {showUpdated && (
        <p className="mt-2 text-sm text-muted-foreground">Last updated {LEGAL_LAST_UPDATED}</p>
      )}

      <div
        className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground
          [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
          [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground
          [&_li]:mb-1.5
          [&_strong]:font-medium [&_strong]:text-foreground
          [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
      >
        {children}
      </div>
    </main>
  );
}
