import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { Manifest, ManifestSummary, ManifestFilters } from "@workspace/types"
import { ManifestStatus } from "@workspace/types"

import { captureSupabaseRpcError, withRpc } from "./shared/with-rpc"
import { withAudit } from "./shared/with-audit"

export function createManifestService(db: SupabaseClient) {
  return {
    async getManifests(filters: ManifestFilters = {}): Promise<ManifestSummary[]> {
      let query = db
        .from("manifests")
        .select("id, manifest_number, status, transport_mode, origin_hub, dest_hub, total_shipments, total_pieces, total_weight, departure_date, created_at")
        .order("created_at", { ascending: false })
        .limit(filters.pageSize ?? 50)

      if (filters.status?.length) query = query.in("status", filters.status)
      if (filters.originHub) query = query.eq("origin_hub", filters.originHub)
      if (filters.destHub) query = query.eq("dest_hub", filters.destHub)
      if (filters.search) query = query.ilike("manifest_number", `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(mapManifestSummary)
    },

    async getManifestById(id: string): Promise<Manifest | null> {
      // Accept both UUID and human-readable manifest_number (e.g. "MAN2604300002").
      // Operators paste manifest numbers from print labels or chat; routes like
      // /manifests/MAN... should resolve. UUIDs match the 8-4-4-4-12 pattern;
      // anything else falls back to manifest_number lookup.
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const column = isUuid ? "id" : "manifest_number"
      const { data, error } = await db
        .from("manifests")
        .select("*")
        .eq(column, id)
        .maybeSingle()
      if (error) throw error
      return data ? mapManifest(data) : null
    },

    async getManifestShipments(manifestId: string) {
      const { data, error } = await db
        .from("manifest_shipments")
        .select(`shipment_id, awb_number, added_at, added_by, shipments(status, pieces, chargeable_weight)`)
        .eq("manifest_id", manifestId)
        .order("added_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>
        const shipment = r.shipments as Record<string, unknown> | null
        return {
          id: r.shipment_id as string,
          awb_number: r.awb_number as string,
          added_at: r.added_at as string,
          status: shipment?.status as string ?? "UNKNOWN",
          pieces: shipment?.pieces as number ?? 0,
          chargeable_weight: shipment?.chargeable_weight as number ?? 0,
        }
      })
    },

    async createManifest(input: {
      transportMode: string
      originHub: string
      destHub: string
      notes?: string
    }): Promise<Manifest> {
      const { data, error } = await db
        .from("manifests")
        .insert({
          transport_mode: input.transportMode,
          origin_hub: input.originHub,
          dest_hub: input.destHub,
          notes: input.notes,
          status: ManifestStatus.DRAFT,
        })
        .select()
        .single()
      if (error) throw error
      return mapManifest(data)
    },

    async addShipmentToManifest(manifestId: string, awbNumber: string): Promise<void> {
      // Use the canonical add_shipment_to_manifest RPC instead of a raw INSERT
      // so triggers fire (total_shipments / total_weight cache updates), the
      // AWB → shipment FK is validated, and SECURITY DEFINER bypasses any
      // operator-vs-admin RLS discrepancies. Falls back to a direct INSERT
      // if the RPC isn't deployed yet — preserves the legacy code path so
      // dev environments without the latest migrations keep working.
      const rpc = await db.rpc("add_shipment_to_manifest", {
        p_manifest_id: manifestId,
        p_awb_number: awbNumber,
        p_staff_id: null,
      })
      if (!rpc.error) return
      // Detect "RPC not deployed" via a Postgres function-missing error code
      // (PGRST202 for postgrest, 42883 for raw pg). Fall through to the
      // legacy INSERT path only in that case; any other error (RLS, FK,
      // duplicate) propagates.
      const code = (rpc.error as { code?: string }).code
      const message = (rpc.error as { message?: string }).message ?? ""
      const rpcMissing =
        code === "PGRST202" ||
        code === "42883" ||
        /function .* does not exist|Could not find/i.test(message)
      if (!rpcMissing) {
        // SELECTIVE adoption per audit doc § 3.2: emit only on the real-error
        // branch. The RPC-not-deployed fallback below runs as normal business
        // state during issue #19's migration window; emitting on it would
        // saturate rule 4.
        captureSupabaseRpcError("add_shipment_to_manifest", rpc.error)
        throw rpc.error
      }

      const { error } = await db.from("manifest_shipments").insert({
        manifest_id: manifestId,
        awb_number: awbNumber,
      })
      if (error) throw error
    },

    async removeShipmentFromManifest(manifestId: string, awbNumber: string): Promise<void> {
      // Read the join row first to capture the forensic before_state
      // snapshot. The join row carries the manifest_id + awb_number +
      // added_at + added_by — enough to reconstruct the association
      // and identify the operator who added it. If the join row
      // already doesn't exist (a stale request, double-click), short-
      // circuit: nothing to audit, nothing to delete. Preserves the
      // prior idempotent semantics for the no-op case.
      const { data: row, error: readErr } = await db
        .from("manifest_shipments")
        .select("*")
        .eq("manifest_id", manifestId)
        .eq("awb_number", awbNumber)
        .maybeSingle()
      if (readErr) throw readErr
      if (!row) return

      // AUDIT-WRAPPED: every manifest-shipment removal produces
      // exactly one audit_logs row before the destructive op runs.
      // entityId is the join row's UUID; entityType is "manifest" (the
      // parent record whose composition changed). The before_state
      // payload includes both the join row and the awb_number/
      // manifest_id pair as top-level fields for analyst readability.
      // CHECK-constraint action value: manifest_shipment_remove
      // (renamed from the placeholder 'manifest_revert' by migration
      // 20260516000002 — see the migration header for the rationale).
      await withAudit(
        db,
        {
          action: "manifest_shipment_remove",
          entityType: "manifest",
          entityId: (row as { id: string }).id,
          beforeState: row as Record<string, unknown>,
          description: `Removed AWB ${awbNumber} from manifest ${manifestId}`,
          metadata: { manifest_id: manifestId, awb_number: awbNumber },
        },
        async () => {
          const { error } = await db
            .from("manifest_shipments")
            .delete()
            .eq("manifest_id", manifestId)
            .eq("awb_number", awbNumber)
          if (error) throw error
        },
      )
    },

    async closeManifest(manifestId: string): Promise<void> {
      const { error } = await withRpc("close_manifest_atomic", () =>
        db.rpc("close_manifest_atomic", { p_manifest_id: manifestId }),
      )
      if (error) throw error
    },

    async departManifest(manifestId: string): Promise<void> {
      const { error } = await db
        .from("manifests")
        .update({ status: ManifestStatus.DEPARTED, departed_at: new Date().toISOString() })
        .eq("id", manifestId)
      if (error) throw error
    },

    async arriveManifest(manifestId: string): Promise<void> {
      const { error } = await db
        .from("manifests")
        .update({ status: ManifestStatus.ARRIVED, arrived_at: new Date().toISOString() })
        .eq("id", manifestId)
      if (error) throw error
    },

    async reconcileManifest(manifestId: string): Promise<void> {
      const { error } = await db
        .from("manifests")
        .update({ status: ManifestStatus.RECONCILED })
        .eq("id", manifestId)
      if (error) throw error
    },
  }
}

function mapManifestSummary(row: Record<string, unknown>): ManifestSummary {
  return {
    id: row.id,
    manifestNumber: row.manifest_number,
    status: row.status,
    transportMode: row.transport_mode,
    originHub: row.origin_hub,
    destHub: row.dest_hub,
    totalShipments: (row.total_shipments as number) ?? 0,
    totalPieces: (row.total_pieces as number) ?? 0,
    totalWeight: (row.total_weight as number) ?? 0,
    departureDate: row.departure_date as string | undefined,
    createdAt: row.created_at,
  } as unknown as ManifestSummary
}

function mapManifest(row: Record<string, unknown>): Manifest {
  return {
    id: row.id,
    manifestNumber: row.manifest_number,
    status: row.status,
    transportMode: row.transport_mode,
    originHub: row.origin_hub,
    destHub: row.dest_hub,
    departureDate: row.departure_date,
    arrivalDate: row.arrival_date,
    totalShipments: (row.total_shipments as number) ?? 0,
    totalPieces: (row.total_pieces as number) ?? 0,
    totalWeight: (row.total_weight as number) ?? 0,
    createdBy: row.created_by,
    closedBy: row.closed_by,
    departedBy: row.departed_by,
    arrivedBy: row.arrived_by,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as unknown as Manifest
}

