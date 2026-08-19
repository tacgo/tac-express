"use client"

import * as React from "react"

import { useManifests } from "@workspace/services/hooks/use-manifests"
import { useRealtimeManifests } from "@workspace/services/hooks/use-realtime"
import type { ManifestSummary } from "@workspace/types"
import {
  V7OpsManifests,
  type ManifestRow,
} from "@workspace/ui/components/composed/manifests/v7-ops-manifests"

const STATUS_MAP: Record<string, ManifestRow["status"]> = {
  DRAFT: "Draft",
  BUILDING: "Building",
  OPEN: "Open",
  CLOSED: "Closed",
  DEPARTED: "Departed",
  ARRIVED: "Arrived",
}

function toRow(m: ManifestSummary): ManifestRow {
  return {
    id: m.manifestNumber,
    from: m.originHub,
    to: m.destHub,
    shipments: m.totalShipments,
    weight: m.totalWeight.toFixed(1),
    date: new Date(m.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
    status: STATUS_MAP[m.status] ?? "Draft",
    detailHref: `/ops-console/manifests/${m.id}`,
  }
}

export function OpsManifestsLive() {
  useRealtimeManifests()
  const query = useManifests({})
  // Memoize items to prevent deep re-renders in DataTable when the query reference changes
  const items = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])

  // Canonical v7 — v6 paper view retired in Phase 5 composition unification.
  return (
    <V7OpsManifests
      items={items}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
    />
  )
}
