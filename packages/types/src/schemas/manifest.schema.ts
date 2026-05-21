import { z } from "zod"
import { ManifestStatus, TransportMode, HubCode } from "../domain.types"

export const createManifestSchema = z.object({
  transportMode: z.nativeEnum(TransportMode),
  originHub: z.nativeEnum(HubCode),
  destHub: z.nativeEnum(HubCode),
  departureDate: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export const addShipmentToManifestSchema = z.object({
  awbNumber: z.string().regex(/^TAC\d{8,11}$/i, "Invalid AWB number format"),
})

export const updateManifestStatusSchema = z.object({
  status: z.nativeEnum(ManifestStatus),
  notes: z.string().optional(),
})

export type CreateManifestInput = z.infer<typeof createManifestSchema>
export type AddShipmentInput = z.infer<typeof addShipmentToManifestSchema>
export type UpdateManifestStatusInput = z.infer<typeof updateManifestStatusSchema>
