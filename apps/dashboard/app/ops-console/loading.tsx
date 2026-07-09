/**
 * Generic dashboard route loading skeleton — renders while a (dashboard)
 * segment streams. Specific routes (home, shipments) override this with
 * their own loading.tsx that matches their bespoke layout.
 *
 * Pattern: PageHeader-shaped strip + 4-tile KPI strip + table-body block.
 * Covers the layout shape of most operator surfaces (list views, detail
 * views, dashboards) at the right structural fidelity for an operator
 * to anticipate the page about to land without overpromising specifics.
 */

export default function DashboardLoading() {
  return (
    <div data-slot="dashboard-loading" className="space-y-6">
      {/* PageHeader skeleton */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 bg-muted animate-skeleton-pulse" />
          <div className="h-7 w-64 bg-muted animate-skeleton-pulse" />
          <div className="h-4 w-96 max-w-full bg-muted animate-skeleton-pulse" />
        </div>
        <div className="h-9 w-32 bg-muted animate-skeleton-pulse shrink-0" />
      </header>

      {/* KPI strip skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-border bg-card p-5 space-y-3 shadow-brutal-sm"
          >
            <div className="h-3 w-20 bg-muted animate-skeleton-pulse" />
            <div className="h-8 w-16 bg-muted animate-skeleton-pulse" />
            <div className="h-3 w-24 bg-muted animate-skeleton-pulse" />
          </div>
        ))}
      </div>

      {/* Table/list body skeleton */}
      <div className="border border-border bg-card shadow-brutal-sm">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div className="h-4 w-32 bg-muted animate-skeleton-pulse" />
          <div className="h-7 w-24 bg-muted animate-skeleton-pulse" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-3 w-24 bg-muted animate-skeleton-pulse" />
              <div className="h-3 w-32 bg-muted animate-skeleton-pulse flex-1" />
              <div className="h-3 w-16 bg-muted animate-skeleton-pulse" />
              <div className="h-3 w-12 bg-muted animate-skeleton-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
