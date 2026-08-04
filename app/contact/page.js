import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { CONTACT_EMAIL, absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Contact",
  description: "How to report a broken challenge, request account deletion, or get in touch.",
  alternates: { canonical: absoluteUrl("/contact") },
};

export default function ContactPage() {
  return (
    <ProsePage title="Contact" intro="One address, read by a person.">
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-base">
          {CONTACT_EMAIL}
        </a>
      </p>

      <h2>A challenge is wrong or confusing</h2>
      <p>
        Use the <strong>Report a problem</strong> button on the challenge itself — it attaches which
        challenge you meant, which saves a round of back-and-forth. Email works too.
      </p>

      <h2>Delete my account</h2>
      <p>
        Email from your registered address and everything goes: attempts, submitted code, progress
        and bookmarks. See the <Link href="/privacy">privacy policy</Link> for exactly what is
        stored.
      </p>

      <h2>I want to suggest a challenge</h2>
      <p>
        Very welcome. The most useful suggestions are bugs you actually hit — the ones that cost you
        an afternoon. Send the buggy code, what you expected, and what happened instead.
      </p>

      <h2>I teach, and want to use this with a class</h2>
      <p>
        Please do; it is free and needs no licence. Get in touch if there is something specific that
        would make it work better for a class.
      </p>
    </ProsePage>
  );
}
