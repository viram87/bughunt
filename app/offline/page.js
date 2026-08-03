import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="mt-3 text-muted-foreground">
        This page hasn&apos;t been visited before, so there&apos;s no cached copy. Challenges
        you&apos;ve already opened still work — code runs in your browser, not on a server.
      </p>
      <div className="mt-6">
        <Button nativeButton={false} render={<Link href="/challenges">Back to challenges</Link>} />
      </div>
    </main>
  );
}
