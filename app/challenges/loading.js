import { SkeletonLine, SkeletonCardGrid } from "@/components/skeletons";

// Mirrors the real page's layout closely enough that the swap isn't jarring:
// featured banner, heading row with filters, then the card grid.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <SkeletonLine className="mb-8 h-24 w-full rounded-xl" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-40" />
          <SkeletonLine className="h-4 w-56" />
        </div>
        <SkeletonLine className="h-9 w-64" />
      </div>

      <SkeletonCardGrid count={6} />
    </main>
  );
}
