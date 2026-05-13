/** Lightweight skeleton for dashboard metric + panel layout */

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 pb-8">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-border-muted" />
          <div className="h-4 w-96 max-w-full rounded bg-border-muted/70" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-border-muted" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-border-muted bg-bg-light p-4">
            <div className="mb-3 h-3 w-24 rounded bg-border-muted" />
            <div className="h-8 w-20 rounded bg-border-muted/80" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 h-64 rounded-2xl border border-border-muted bg-bg-light p-4">
          <div className="mb-4 h-4 w-40 rounded bg-border-muted" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-border-muted/60" />
            ))}
          </div>
        </div>
        <div className="h-64 rounded-2xl border border-border-muted bg-bg-light p-4">
          <div className="mb-4 h-4 w-48 rounded bg-border-muted" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-border-muted/50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
