import { SkeletonLine } from "@/components/skeletons";

// The heaviest navigation in the app: this page pulls the challenge, the
// user's prior attempts and the bookmark state, then boots Monaco on the
// client. Showing the shape of it immediately is what stops the click from
// feeling like nothing happened.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <SkeletonLine className="h-5 w-20" />
          <SkeletonLine className="h-5 w-24" />
          <SkeletonLine className="h-5 w-16" />
        </div>
        <SkeletonLine className="h-8 w-2/3" />
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-4/5" />
      </div>

      {/* Stands in for the editor card. */}
      <SkeletonLine className="mb-6 h-96 w-full rounded-xl" />

      <div className="flex items-center gap-3">
        <SkeletonLine className="h-9 w-32" />
        <SkeletonLine className="h-9 w-24" />
      </div>
    </main>
  );
}
