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
  RiBox3Line,
  RiFileList3Line,
  RiMoneyDollarCircleLine,
  RiBookOpenLine,
  RiArchiveLine,
  RiHistoryLine,
} from "@workspace/ui/icons"

interface CustomerDetailTabsProps {
  /** Overview slot — header card, contact, balance, key metrics. */
  overview: React.ReactNode
  /** Shipments slot — full shipment history table. */
  shipments?: React.ReactNode
  /** Invoices slot — list filtered to this customer (Phase 5.5). */
  invoices?: React.ReactNode
  /** Payments slot — receipts feed (Phase 5.5). */
  payments?: React.ReactNode
  /** Notes slot — TipTap thread. */
  notes?: React.ReactNode
  /** Documents slot — KYC + agreement uploads (Phase 5.5). */
  documents?: React.ReactNode
  /** Audit slot — actor / action / timestamp feed (Phase 7). */
  audit?: React.ReactNode
  defaultValue?: string
  className?: string
}

export function CustomerDetailTabs({
  overview,
  shipments,
  invoices,
  payments,
  notes,
  documents,
  audit,
  defaultValue = "overview",
  className,
}: CustomerDetailTabsProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      data-slot="customer-detail-tabs"
      className={cn("w-full", className)}
    >
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
        <TabsTrigger value="overview">
          <RiInformationLine />
          Overview
        </TabsTrigger>
        <TabsTrigger value="shipments">
          <RiBox3Line />
          Shipments
        </TabsTrigger>
        <TabsTrigger value="invoices">
          <RiFileList3Line />
          Invoices
        </TabsTrigger>
        <TabsTrigger value="payments">
          <RiMoneyDollarCircleLine />
          Payments
        </TabsTrigger>
        <TabsTrigger value="notes">
          <RiBookOpenLine />
          Notes
        </TabsTrigger>
        <TabsTrigger value="documents">
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
      <TabsContent value="shipments" className="pt-4">
        {shipments ?? <ComingSoon label="Customer shipment history" />}
      </TabsContent>
      <TabsContent value="invoices" className="pt-4">
        {invoices ?? <ComingSoon label="Customer invoices" />}
      </TabsContent>
      <TabsContent value="payments" className="pt-4">
        {payments ?? <ComingSoon label="Payment ledger" />}
      </TabsContent>
      <TabsContent value="notes" className="pt-4">
        {notes ?? <ComingSoon label="Notes thread" />}
      </TabsContent>
      <TabsContent value="documents" className="pt-4">
        {documents ?? <ComingSoon label="KYC & contract documents" />}
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
      icon={<RiBookOpenLine />}
      title={label}
      description="This panel lights up in a later phase of the rollout."
    />
  )
}
