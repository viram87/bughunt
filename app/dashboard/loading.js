import { SkeletonLine, SkeletonCardGrid } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8 space-y-2">
        <SkeletonLine className="h-7 w-48" />
        <SkeletonLine className="h-4 w-64" />
      </div>

      {/* The three stat cards. */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLine key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>

      <SkeletonLine className="mb-4 h-6 w-40" />
      <SkeletonCardGrid count={3} />
    </main>
  );
}
