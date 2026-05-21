import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { RateCard, RateCardFilters, RateCardInput, RateCardLookupResult } from "@workspace/types"

import { withRpc } from "./shared/with-rpc"

function mapRateCard(row: Record<string, unknown>): RateCard {
  return {
    id: row.id as string,
    originHub: row.origin_hub as string,
    destHub: row.dest_hub as string,
    serviceLevel: row.service_level as RateCard["serviceLevel"],
    weightSlabMin: row.weight_slab_min as number,
    weightSlabMax: row.weight_slab_max as number,
    ratePerKg: row.rate_per_kg as number,
    docketCharge: row.docket_charge as number,
    fuelSurchargePct: row.fuel_surcharge_pct as number,
    handlingFee: row.handling_fee as number,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function createRateCardService(db: SupabaseClient) {
  return {
    async getRateCards(filters: RateCardFilters = {}): Promise<RateCard[]> {
      let query = db
        .from("rate_cards")
        .select("*")
        .order("origin_hub")
        .order("dest_hub")
        .order("service_level")
        .order("weight_slab_min")

      if (filters.originHub) query = query.eq("origin_hub", filters.originHub)
      if (filters.destHub) query = query.eq("dest_hub", filters.destHub)
      if (filters.serviceLevel) query = query.eq("service_level", filters.serviceLevel)
      if (filters.isActive !== undefined) query = query.eq("is_active", filters.isActive)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map((r) => mapRateCard(r as Record<string, unknown>))
    },

    async createRateCard(input: RateCardInput): Promise<RateCard> {
      const { data, error } = await db
        .from("rate_cards")
        .insert({
          origin_hub: input.originHub,
          dest_hub: input.destHub,
          service_level: input.serviceLevel,
          weight_slab_min: input.weightSlabMin,
          weight_slab_max: input.weightSlabMax,
          rate_per_kg: input.ratePerKg,
          docket_charge: input.docketCharge,
          fuel_surcharge_pct: input.fuelSurchargePct,
          handling_fee: input.handlingFee,
        })
        .select()
        .single()
      if (error) throw error
      return mapRateCard(data as Record<string, unknown>)
    },

    async updateRateCard(id: string, input: Partial<RateCardInput>): Promise<RateCard> {
      const patch: Record<string, unknown> = {}
      if (input.ratePerKg !== undefined) patch.rate_per_kg = input.ratePerKg
      if (input.docketCharge !== undefined) patch.docket_charge = input.docketCharge
      if (input.fuelSurchargePct !== undefined) patch.fuel_surcharge_pct = input.fuelSurchargePct
      if (input.handlingFee !== undefined) patch.handling_fee = input.handlingFee
      if (input.weightSlabMin !== undefined) patch.weight_slab_min = input.weightSlabMin
      if (input.weightSlabMax !== undefined) patch.weight_slab_max = input.weightSlabMax

      const { data, error } = await db
        .from("rate_cards")
        .update(patch)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return mapRateCard(data as Record<string, unknown>)
    },

    async deactivateRateCard(id: string): Promise<void> {
      const { error } = await db
        .from("rate_cards")
        .update({ is_active: false })
        .eq("id", id)
      if (error) throw error
    },

    async lookupRate(
      originHub: string,
      destHub: string,
      serviceLevel: string,
      weight: number,
    ): Promise<RateCardLookupResult | null> {
      const { data, error } = await withRpc("get_rate_card", () =>
        db.rpc("get_rate_card", {
          p_origin: originHub,
          p_dest: destHub,
          p_service_level: serviceLevel,
          p_weight: weight,
        }),
      )
      if (error) throw error
      const row = (data ?? [])[0] as Record<string, unknown> | undefined
      if (!row) return null
      return {
        id: row.id as string,
        ratePerKg: row.rate_per_kg as number,
        docketCharge: row.docket_charge as number,
        fuelSurchargePct: row.fuel_surcharge_pct as number,
        handlingFee: row.handling_fee as number,
      }
    },
  }
}

export type RateCardService = ReturnType<typeof createRateCardService>

