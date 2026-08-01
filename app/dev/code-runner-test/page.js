import { notFound } from "next/navigation";
import { CodeRunnerTestClient } from "./code-runner-test-client";

// Local-only harness for the client-side execution engine. Gated on the
// server so production returns a real 404 and never ships the page at all.
export default function CodeRunnerTestPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <CodeRunnerTestClient />;
}
