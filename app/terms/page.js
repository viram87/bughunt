import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { CONTACT_EMAIL, SITE_NAME, absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Terms of use",
  description: "The short, plain-English terms for using BugHunt.",
  alternates: { canonical: absoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <ProsePage
      title="Terms of use"
      intro="Short, and in plain English, because nobody reads the other kind."
      showUpdated
    >
      <p>By using {SITE_NAME} you agree to what follows. If you disagree, please don&apos;t use it.</p>

      <h2>What this is</h2>
      <p>
        {SITE_NAME} is a free educational tool for practising debugging. It is provided as-is, with
        no guarantee that it is available, correct, or suitable for any particular purpose. It is not
        a certification, and finishing challenges here does not qualify you for anything.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your login details to yourself. You are responsible for activity on your account.</li>
        <li>One account per person. Don&apos;t impersonate anyone.</li>
        <li>
          If you make your profile public, choose a username that isn&apos;t offensive or misleading.
          We may remove usernames that are.
        </li>
      </ul>

      <h2>Fair use</h2>
      <p>Please don&apos;t:</p>
      <ul>
        <li>Attack, overload, or attempt to break into the site or its infrastructure.</li>
        <li>Scrape the challenge library wholesale or republish it as your own.</li>
        <li>Use automated tools to farm solved counts or manipulate any public ranking.</li>
      </ul>
      <p>
        Reading, learning from, and adapting individual challenges for your own study or teaching is
        actively encouraged — that is what this is for.
      </p>

      <h2>Content</h2>
      <p>
        The challenges, explanations and hints are ours. The code you write is yours; we store your
        submissions only to show you your own attempt history, as described in the{" "}
        <Link href="/privacy">privacy policy</Link>. We claim no ownership of your solutions.
      </p>

      <h2>Code runs on your machine</h2>
      <p>
        Challenge code executes inside your own browser, in WebAssembly or a sandboxed worker. That
        sandbox is a strong boundary but not a guarantee — as with any code you run, use judgement.
        Don&apos;t paste code you don&apos;t trust into the editor and run it.
      </p>

      <h2>Liability</h2>
      <p>
        {SITE_NAME} is free and offered without warranty. To the extent the law allows, we are not
        liable for any loss arising from using it, including lost work or lost progress. We may
        change, suspend or discontinue any part of the site at any time.
      </p>

      <h2>Ending things</h2>
      <p>
        You can stop using {SITE_NAME} whenever you like and ask us to delete your account by
        emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We may suspend accounts
        that break these terms.
      </p>

      <h2>Contact</h2>
      <p>
        Anything unclear: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </ProsePage>
  );
}
