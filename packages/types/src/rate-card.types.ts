export interface RateCard {
  id: string
  originHub: string
  destHub: string
  serviceLevel: "STANDARD" | "PRIORITY" | "EXPRESS"
  weightSlabMin: number
  weightSlabMax: number
  ratePerKg: number
  docketCharge: number
  fuelSurchargePct: number
  handlingFee: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RateCardFilters {
  originHub?: string
  destHub?: string
  serviceLevel?: string
  isActive?: boolean
}

export interface RateCardInput {
  originHub: string
  destHub: string
  serviceLevel: "STANDARD" | "PRIORITY" | "EXPRESS"
  weightSlabMin: number
  weightSlabMax: number
  ratePerKg: number
  docketCharge: number
  fuelSurchargePct: number
  handlingFee: number
}

export interface RateCardLookupResult {
  id: string
  ratePerKg: number
  docketCharge: number
  fuelSurchargePct: number
  handlingFee: number
}
