import type { Metadata } from "next"

import { TrackTabsClient } from "./track-tabs-client"

export const metadata: Metadata = {
  title: "Track or book · TAC Express",
  description: "Track your TAC Express shipment or submit a new booking.",
}

export default function TrackIndexPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Track or book
        </h1>
        <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          Enter a CN number to track, or submit a new booking request
        </p>
      </div>
      <TrackTabsClient />
    </div>
  )
}
