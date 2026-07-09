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
          <div className="animate-skeleton-pulse h-3 w-24 bg-muted" />
          <div className="animate-skeleton-pulse h-7 w-64 bg-muted" />
          <div className="animate-skeleton-pulse h-4 w-96 max-w-full bg-muted" />
        </div>
        <div className="animate-skeleton-pulse h-9 w-32 shrink-0 bg-muted" />
      </header>

      {/* KPI strip skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 border border-border bg-card p-5 shadow-brutal-sm"
          >
            <div className="animate-skeleton-pulse h-3 w-20 bg-muted" />
            <div className="animate-skeleton-pulse h-8 w-16 bg-muted" />
            <div className="animate-skeleton-pulse h-3 w-24 bg-muted" />
          </div>
        ))}
      </div>

      {/* Table/list body skeleton */}
      <div className="border border-border bg-card shadow-brutal-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="animate-skeleton-pulse h-4 w-32 bg-muted" />
          <div className="animate-skeleton-pulse h-7 w-24 bg-muted" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="animate-skeleton-pulse h-3 w-24 bg-muted" />
              <div className="animate-skeleton-pulse h-3 w-32 flex-1 bg-muted" />
              <div className="animate-skeleton-pulse h-3 w-16 bg-muted" />
              <div className="animate-skeleton-pulse h-3 w-12 bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
