// Shared skeleton pieces for route-level loading.js files.
//
// Every route is dynamic (the shell renders auth state), so Next can't
// prefetch a rendered page and navigation waits on the server. Without a
// loading.js the browser keeps showing the OLD page and gives no feedback at
// all during that wait, which is what made navigation feel broken even when
// the server answered in 200ms. These render instantly on click.

export function SkeletonLine({ className = "" }) {
  return <div className={`animate-pulse rounded bg-muted/60 ${className}`} />;
}

export function SkeletonCardGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-5">
          <div className="flex gap-2">
            <SkeletonLine className="h-5 w-16" />
            <SkeletonLine className="h-5 w-20" />
          </div>
          <SkeletonLine className="h-5 w-3/4" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
