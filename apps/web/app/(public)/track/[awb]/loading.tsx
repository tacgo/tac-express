export default function TrackLoading() {
  return (
    <div className="tac-fui-grid min-h-screen py-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-8 space-y-2">
          <div
            className="animate-skeleton-pulse h-3 w-32 bg-muted"
            aria-hidden
          />
          <div
            className="animate-skeleton-pulse mt-6 h-3 w-20 bg-muted"
            aria-hidden
          />
          <div
            className="animate-skeleton-pulse h-12 w-80 max-w-full bg-muted"
            aria-hidden
          />
        </div>

        <div
          aria-busy="true"
          aria-live="polite"
          className="space-y-4 max-w-3xl mx-auto"
        >
          <span className="sr-only">Loading shipment tracking…</span>

          <div className="border border-border bg-surface-elevated p-6 space-y-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="animate-skeleton-pulse h-3 w-24 bg-muted" />
                <div className="animate-skeleton-pulse h-7 w-64 bg-muted" />
              </div>
              <div className="animate-skeleton-pulse h-6 w-20 bg-muted" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
              <div className="space-y-2">
                <div className="animate-skeleton-pulse h-3 w-16 bg-muted" />
                <div className="animate-skeleton-pulse h-4 w-40 bg-muted" />
                <div className="animate-skeleton-pulse h-3 w-24 bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="animate-skeleton-pulse h-3 w-16 bg-muted" />
                <div className="animate-skeleton-pulse h-4 w-40 bg-muted" />
                <div className="animate-skeleton-pulse h-3 w-24 bg-muted" />
              </div>
            </div>
          </div>

          <div className="border border-border bg-surface-elevated shadow-sm">
            <div className="px-6 py-3 border-b border-border">
              <div className="animate-skeleton-pulse h-3 w-40 bg-muted" />
            </div>
            <ol className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="px-6 py-4 flex gap-4">
                  <div className="shrink-0 pt-0.5">
                    <div className="animate-skeleton-pulse h-2 w-2 mt-1.5 bg-muted" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="animate-skeleton-pulse h-5 w-24 bg-muted" />
                    <div className="animate-skeleton-pulse h-4 w-3/4 bg-muted" />
                    <div className="animate-skeleton-pulse h-3 w-32 bg-muted" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
