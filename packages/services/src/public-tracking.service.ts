import type { ServiceLevel, ShipmentSummary, TrackingEvent } from "@workspace/types"

interface PublicTrackingConfig {
  supabaseUrl: string
  anonKey: string
}

/**
 * Public tracking service — read-only access to AWB lookup + event history.
 *
 * Backed by SECURITY DEFINER RPCs (`get_public_shipment`,
 * `get_public_tracking_events`) added in migration 20260530000003. The RPCs
 * return a curated column projection — no receiver_phone, no addresses, no
 * financial totals — so anon callers cannot exfiltrate PII via AWB guessing.
 */
export function createPublicTrackingService({ supabaseUrl, anonKey }: PublicTrackingConfig) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
  }

  return {
    async getShipmentByAwb(awb: string): Promise<ShipmentSummary | null> {
      // A network-level failure (DNS, offline, Supabase unreachable) rejects
      // the fetch. Treat it the same as a non-OK response — return null so the
      // tracking page renders its "not found" state instead of throwing.
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_shipment`, {
          method: "POST",
          headers,
          body: JSON.stringify({ p_awb: awb }),
          next: { revalidate: 60 },
        } as RequestInit)
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
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_tracking_events`, {
          method: "POST",
          headers,
          body: JSON.stringify({ p_awb: awb }),
          next: { revalidate: 30 },
        } as RequestInit)
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
    totalAmount: 0,
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
    metadata: undefined,
    createdAt: row.created_at as string,
  } as TrackingEvent
}
