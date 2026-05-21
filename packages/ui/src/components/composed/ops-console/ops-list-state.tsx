"use client"

import * as React from "react"

import { OpsFrame } from "./ops-frame"
import { OpsPageHead } from "./ops-page-head"
import { OpsErrorState } from "./ops-error-state"
import { OpsSkeleton } from "./ops-skeleton"

interface OpsListStateProps {
  eyebrow: string
  title: string
  sub?: string
  isPending: boolean
  isError: boolean
  errorMessage?: string | undefined
  onRetry?: () => void
  children: React.ReactNode
}

/**
 * OpsListState — wraps a list-view child with paper-aesthetic loading + error
 * chrome. Use inside live wrappers so the page header is consistent across
 * the three states (pending / error / data).
 *
 *   <OpsListState eyebrow="Operations" title="Shipments" {...query}>
 *     <OpsShipmentsView rows={rows} />
 *   </OpsListState>
 *
 * When `isPending`, renders a generic skeleton table block.
 * When `isError`, renders `<OpsErrorState>` with a retry button.
 * Otherwise, renders `children`.
 */
function OpsListState({
  eyebrow,
  title,
  sub,
  isPending,
  isError,
  errorMessage,
  onRetry,
  children,
}: OpsListStateProps) {
  if (isPending) {
    return (
      <OpsFrame>
        <OpsPageHead eyebrow={eyebrow} title={title} sub={sub} />
        <div
          aria-busy="true"
          aria-live="polite"
          className="bg-paper-card border border-paper-line p-1"
        >
          <div className="bg-paper-bg border border-paper-line p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <OpsSkeleton className="h-3 w-1/5" />
                <OpsSkeleton className="h-3 w-1/4" />
                <OpsSkeleton className="h-3 w-1/6" />
                <OpsSkeleton className="h-3 w-1/3" />
                <OpsSkeleton className="h-3 w-12 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </OpsFrame>
    )
  }
  if (isError) {
    return (
      <OpsFrame>
        <OpsPageHead eyebrow={eyebrow} title={title} sub={sub} />
        <OpsErrorState
          code="FETCH_FAILED"
          headline={`Could not load ${title.toLowerCase()}.`}
          message={errorMessage}
          onRetry={onRetry}
        />
      </OpsFrame>
    )
  }
  return <>{children}</>
}

export { OpsListState }
export type { OpsListStateProps }
