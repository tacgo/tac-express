"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import {
  RiInformationLine,
  RiTimeLine,
  RiBookOpenLine,
  RiArchiveLine,
  RiHistoryLine,
} from "@workspace/ui/icons"

interface ShipmentDetailTabsProps {
  /** Overview tab — header, stepper, sender/receiver, route stats. */
  overview: React.ReactNode
  /** Tracking tab — vertical event timeline + ETA + map (when available). */
  tracking: React.ReactNode
  /** Notes tab — TipTap thread (Phase 5). */
  notes?: React.ReactNode
  /** Attachments tab — POD photos, packing lists, signatures (Phase 3). */
  attachments?: React.ReactNode
  /** Audit tab — actor / action / timestamp feed (Phase 7). */
  audit?: React.ReactNode
  /** Default-active tab id. */
  defaultValue?: string
  className?: string
}

export function ShipmentDetailTabs({
  overview,
  tracking,
  notes,
  attachments,
  audit,
  defaultValue = "overview",
  className,
}: ShipmentDetailTabsProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      data-slot="shipment-detail-tabs"
      className={cn("w-full", className)}
    >
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">
          <RiInformationLine />
          Overview
        </TabsTrigger>
        <TabsTrigger value="tracking">
          <RiTimeLine />
          Tracking
        </TabsTrigger>
        <TabsTrigger value="notes">
          <RiBookOpenLine />
          Notes
        </TabsTrigger>
        <TabsTrigger value="attachments">
          <RiArchiveLine />
          Files
        </TabsTrigger>
        <TabsTrigger value="audit">
          <RiHistoryLine />
          Audit
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="pt-4">
        {overview}
      </TabsContent>
      <TabsContent value="tracking" className="pt-4">
        {tracking}
      </TabsContent>
      <TabsContent value="notes" className="pt-4">
        {notes ?? <ComingSoon label="Notes thread" />}
      </TabsContent>
      <TabsContent value="attachments" className="pt-4">
        {attachments ?? <ComingSoon label="Proof of delivery & attachments" />}
      </TabsContent>
      <TabsContent value="audit" className="pt-4">
        {audit ?? <ComingSoon label="Audit trail" />}
      </TabsContent>
    </Tabs>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <EmptyState
      label="Setup"
      icon={<RiBookOpenLine />}
      title={label}
      description="This panel lights up in a later phase of the rollout."
    />
  )
}
