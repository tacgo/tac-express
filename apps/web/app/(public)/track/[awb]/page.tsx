import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { TrackingResultView } from "@workspace/ui/components/composed/tracking-result-view"
import { createPublicTrackingService } from "@workspace/services/public-tracking.service"

interface TrackPageProps {
  params: Promise<{ awb: string }>
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { awb } = await params
  return {
    title: `Track ${decodeURIComponent(awb)} — TAC Express`,
    description: `Real-time tracking for shipment ${decodeURIComponent(awb)}`,
  }
}

function getTrackingService() {
  return createPublicTrackingService({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  })
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { awb: rawAwb } = await params
  const awb = decodeURIComponent(rawAwb).toUpperCase()
  const tracking = getTrackingService()

  const [shipment, events] = await Promise.all([
    tracking.getShipmentByAwb(awb),
    tracking.getTrackingEvents(awb),
  ])

  return (
    <div className="tac-fui-grid min-h-screen py-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-base">
          <Link
            href="/#tracking"
            className="tac-mono-label text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:tac-focus-premium"
          >
            ← Back to tracking
          </Link>
          <p className="tac-mono-label text-muted-foreground mt-6">SHIPMENT</p>
          <h1 className="t-display font-mono tabular-nums tracking-widest text-foreground mt-1 dark:text-glow-primary">
            {awb}
          </h1>
        </div>

        <TrackingResultView awb={awb} shipment={shipment} events={events} />
      </div>
    </div>
  )
}
