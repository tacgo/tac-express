import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { ScanEvent } from "@workspace/types"

export function createScanSyncService(db: SupabaseClient) {
  return {
    async syncScanEvent(event: ScanEvent): Promise<void> {
      const { error } = await db.from("tracking_events").insert({
        awb_number: event.code,
        status: event.type === "shipment" ? "RECEIVED_AT_ORIGIN" : "IN_TRANSIT",
        description: `Scanned at ${event.hubCode} via ${event.source}`,
        location: event.hubCode,
        hub_code: event.hubCode,
        source: event.source === "CAMERA" ? "SCAN" : event.source === "BARCODE_SCANNER" ? "SCAN" : "MANUAL",
        staff_id: event.staffId as unknown as string,
        metadata: { scanEventId: event.id, scanSource: event.source },
      })
      if (error) throw error
    },

    async bulkSync(events: ScanEvent[]): Promise<{ synced: string[]; failed: string[] }> {
      const synced: string[] = []
      const failed: string[] = []
      // OPTIMIZATION: Process scan syncs concurrently instead of sequentially
      const results = await Promise.allSettled(events.map(event => this.syncScanEvent(event)))

      events.forEach((event, index) => {
        if (results[index]?.status === "fulfilled") {
          synced.push(event.id)
        } else {
          failed.push(event.id)
        }
      })
      return { synced, failed }
    },
  }
}

export type ScanSyncService = ReturnType<typeof createScanSyncService>

