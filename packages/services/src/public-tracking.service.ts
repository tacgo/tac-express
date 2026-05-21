import type { ServiceLevel, ShipmentSummary, TrackingEvent } from "@workspace/types"

interface PublicTrackingConfig {
  supabaseUrl: string
  anonKey: string
}

export function createPublicTrackingService({ supabaseUrl, anonKey }: PublicTrackingConfig) {
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }

  return {
    async getShipmentByAwb(awb: string): Promise<ShipmentSummary | null> {
      // A network-level failure (DNS, offline, Supabase unreachable) rejects
      // the fetch. Treat it the same as a non-OK response — return null so the
      // tracking page renders its "not found" state instead of throwing an
      // unhandled error that crashes the route.
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/shipments?awb_number=eq.${encodeURIComponent(awb)}&select=id,awb_number,status,sender_name,receiver_name,origin_hub,dest_hub,chargeable_weight,total_amount,pieces,manifest_number,service_level,created_at,updated_at`,
          { headers, next: { revalidate: 60 } } as RequestInit
        )
        if (!res.ok) return null
        const data = (await res.json()) as Record<string, unknown>[]
        const row = data[0]
        if (!row) return null
        return mapPublicShipment(row)
      } catch {
        return null
      }
    },

    async getTrackingEvents(awb: string): Promise<TrackingEvent[]> {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/tracking_events?awb_number=eq.${encodeURIComponent(awb)}&order=created_at.desc&select=*`,
          { headers, next: { revalidate: 30 } } as RequestInit
        )
        if (!res.ok) return []
        const data = (await res.json()) as Record<string, unknown>[]
        return data.map(mapPublicTrackingEvent)
      } catch {
        return []
      }
    },
  }
}

function mapPublicShipment(row: Record<string, unknown>): ShipmentSummary {
  return {
    id: row.id,
    awbNumber: row.awb_number,
    status: row.status,
    senderName: row.sender_name,
    receiverName: row.receiver_name,
    originHub: row.origin_hub,
    destHub: row.dest_hub,
    chargeableWeight: (row.chargeable_weight as number) ?? 0,
    totalAmount: (row.total_amount as number) ?? 0,
    pieces: (row.pieces as number) ?? 1,
    manifestNumber: row.manifest_number as string | undefined,
    serviceLevel: row.service_level as ServiceLevel | undefined,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at ?? row.created_at) as string,
  } as ShipmentSummary
}

function mapPublicTrackingEvent(row: Record<string, unknown>): TrackingEvent {
  return {
    id: row.id,
    awbNumber: row.awb_number,
    status: row.status,
    description: (row.description as string) ?? "",
    location: (row.location as string) ?? "",
    hubCode: row.hub_code as string | undefined,
    source: row.source,
    staffId: row.staff_id as string | undefined,
    staffName: row.staff_name as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
  } as TrackingEvent
}
