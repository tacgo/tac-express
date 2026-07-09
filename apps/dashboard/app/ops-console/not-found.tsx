import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { RiHomeLine } from "@workspace/ui/icons"

/**
 * Dashboard segment-level 404.
 *
 * Triggered when a Server Component inside the (dashboard) route group
 * calls `notFound()` — e.g. shipment-detail returns notFound() if the AWB
 * doesn't resolve. Renders WITHIN the dashboard chrome (sidebar/header
 * stay visible) so the operator can navigate away without a full reload.
 *
 * The root not-found.tsx remains the catch-all for routes outside this
 * group (auth, marketing, public).
 */

export default function DashboardNotFound() {
  return (
    <div
      data-slot="dashboard-not-found"
      className="flex min-h-hero-vh items-center justify-center p-6"
    >
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
          404 · Resource not found
        </p>
        <h1 className="t-h2 text-foreground">We couldn&apos;t find that</h1>
        <p className="font-sans text-sm text-muted-foreground">
          The record may have been deleted, the URL may be malformed, or you may
          not have access to it. Check the AWB / ID against the source system,
          or head back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button asChild size="sm">
            <Link href="/ops-console">
              <RiHomeLine aria-hidden="true" />
              <span className="ml-1.5 font-mono tracking-wider uppercase">
                Back to dashboard
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
