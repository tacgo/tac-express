"use client"

import * as React from "react"

import { useManifests } from "@workspace/services/hooks/use-manifests"
import { useRealtimeManifests } from "@workspace/services/hooks/use-realtime"
import type { ManifestSummary } from "@workspace/types"
import { useDesignVersion } from "@workspace/ui/hooks/use-design-version"
import {
  OpsManifestsView,
  type ManifestRow,
} from "@workspace/ui/components/composed/ops-console/pages"
import { V7OpsManifests } from "@workspace/ui/components/composed/manifests/v7-ops-manifests"

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
  const { version } = useDesignVersion()
  const items = (query.data ?? []).map(toRow)

  if (version === "v7") {
    return (
      <V7OpsManifests
        items={items}
        isLoading={query.isPending}
        isError={query.isError}
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <OpsManifestsView
      items={items}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
    />
  )
}
