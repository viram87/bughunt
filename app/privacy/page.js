import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { CONTACT_EMAIL, SITE_NAME, absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Privacy policy",
  description:
    "What BugHunt stores, why, and how to delete it. No ads, no tracking cookies, no selling data.",
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy policy"
      intro="What we store, why we store it, and how to get rid of it."
      showUpdated
    >
      <p>
        {SITE_NAME} is a free tool for practising debugging. This policy describes exactly what
        happens to your data. It is written to be read, not to be skimmed past.
      </p>

      <h2>You can use most of it without an account</h2>
      <p>
        Browsing and solving challenges works without signing in. If you never create an account, we
        store nothing that identifies you — no account, no attempt history, no profile.
      </p>

      <h2>What we store if you create an account</h2>
      <ul>
        <li>
          <strong>Your email address</strong>, so you can sign in and recover your account.
        </li>
        <li>
          <strong>Your name and profile picture</strong>, only if you sign in with Google and Google
          provides them. They are used to show who is signed in.
        </li>
        <li>
          <strong>The code you submit</strong> when you check a solution. This is what powers the
          attempt timeline, which lets you compare your attempts and see how your fix evolved.
        </li>
        <li>
          <strong>Your progress</strong>: which challenges you attempted, whether they passed, how
          many hints you used, and how long you took.
        </li>
        <li>
          <strong>Your bookmarks</strong>, and a username if you choose to create a public profile.
        </li>
      </ul>

      <h2>Your code runs in your browser</h2>
      <p>
        Python runs through WebAssembly and JavaScript runs in a sandboxed web worker — both inside
        your own browser tab. <strong>No server ever executes your code.</strong>
      </p>
      <p>
        To be precise about the part people usually assume: when you press{" "}
        <strong>Run &amp; Check</strong> while signed in, the code you submitted <em>is</em> saved to
        your account so your attempt history works. It is never run on our servers, and it is only
        ever visible to you — unless you turn on a public profile, which shows your solved count and
        badges but still never shows your code.
      </p>

      <h2>Analytics</h2>
      <p>
        We use Vercel Web Analytics to count page views and see which challenges people use. It is
        aggregate only: no cookies, no cross-site tracking, no advertising profile, and no attempt to
        identify individual visitors.
      </p>

      <h2>Who else touches your data</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — hosts the database and handles sign-in.
        </li>
        <li>
          <strong>Vercel</strong> — hosts the site and serves the pages.
        </li>
        <li>
          <strong>Google</strong> — only if you choose to sign in with Google, and only to confirm
          who you are.
        </li>
      </ul>
      <p>
        We do not sell your data, share it with advertisers, or send you marketing email. There are
        no advertising or tracking cookies on this site. The only cookie is the one that keeps you
        signed in.
      </p>

      <h2>Deleting your account</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your registered address
        and we will delete your account and everything attached to it — attempts, submitted code,
        progress and bookmarks. Deletion cascades in the database, so nothing is left behind. You can
        also ask for a copy of your data.
      </p>

      <h2>Students and younger users</h2>
      <p>
        {SITE_NAME} is built for students. It is not directed at children under 13, and we do not
        knowingly collect their data. If you believe a child under 13 has created an account, email
        us and we will remove it.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that affects you, the date at the top will change. See also
        the <Link href="/terms">terms of use</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about any of this: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </ProsePage>
  );
}
