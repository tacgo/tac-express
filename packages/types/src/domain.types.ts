declare const __brand: unique symbol
type Brand<T, TBrand> = T & { [__brand]: TBrand }

export type AWB = Brand<string, "CN Number">
export type UUID = Brand<string, "UUID">
export type ManifestNumber = Brand<string, "ManifestNumber">
export type InvoiceNumber = Brand<string, "InvoiceNumber">

export const isAWB = (value: string): value is AWB =>
  /^TAC\d{8,11}$/i.test(value)

export const isUUID = (value: string): value is UUID =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )

export enum HubCode {
  IMPHAL = "IMPHAL",
  NEW_DELHI = "NEW_DELHI",
}

export enum ShipmentStatus {
  CREATED = "CREATED",
  PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
  PICKED_UP = "PICKED_UP",
  RECEIVED_AT_ORIGIN = "RECEIVED_AT_ORIGIN",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED_AT_DEST = "RECEIVED_AT_DEST",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RTO = "RTO",
  EXCEPTION = "EXCEPTION",
}

export enum ManifestStatus {
  DRAFT = "DRAFT",
  BUILDING = "BUILDING",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  DEPARTED = "DEPARTED",
  ARRIVED = "ARRIVED",
  RECONCILED = "RECONCILED",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  ISSUED = "ISSUED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
  OVERDUE = "OVERDUE",
}

export enum ExceptionType {
  DAMAGED = "DAMAGED",
  LOST = "LOST",
  DELAYED = "DELAYED",
  MISMATCH = "MISMATCH",
  PAYMENT_HOLD = "PAYMENT_HOLD",
  MISROUTED = "MISROUTED",
  ADDRESS_ISSUE = "ADDRESS_ISSUE",
  MISSING_PACKAGE = "MISSING_PACKAGE",
  WRONG_HUB = "WRONG_HUB",
  ROUTE_MISMATCH = "ROUTE_MISMATCH",
  INVOICE_DISPUTE = "INVOICE_DISPUTE",
}

export enum ExceptionSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum ExceptionStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  WAREHOUSE_IMPHAL = "WAREHOUSE_IMPHAL",
  WAREHOUSE_DELHI = "WAREHOUSE_DELHI",
  OPS = "OPS",
  INVOICE = "INVOICE",
  SUPPORT = "SUPPORT",
  WAREHOUSE_STAFF = "WAREHOUSE_STAFF",
  OPS_STAFF = "OPS_STAFF",
  FINANCE_STAFF = "FINANCE_STAFF",
}

export enum TransportMode {
  AIR = "AIR",
  TRUCK = "TRUCK",
  OCEAN = "OCEAN",
}

export enum ServiceLevel {
  STANDARD = "STANDARD",
  EXPRESS = "EXPRESS",
  PRIORITY = "PRIORITY",
}

export enum PaymentMode {
  PAID = "PAID",
  TO_PAY = "TO_PAY",
  TBB = "TBB",
}

export enum ScanSource {
  CAMERA = "CAMERA",
  MANUAL = "MANUAL",
  BARCODE_SCANNER = "BARCODE_SCANNER",
}

export enum TrackingEventSource {
  SCAN = "SCAN",
  MANUAL = "MANUAL",
  SYSTEM = "SYSTEM",
  API = "API",
}

export const SHIPMENT_STATUS_TRANSITIONS: Record<
  ShipmentStatus,
  ShipmentStatus[]
> = {
  [ShipmentStatus.CREATED]: [
    ShipmentStatus.PICKUP_SCHEDULED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.PICKUP_SCHEDULED]: [
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.PICKED_UP]: [
    ShipmentStatus.RECEIVED_AT_ORIGIN,
    ShipmentStatus.EXCEPTION,
  ],
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.EXCEPTION,
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.RECEIVED_AT_DEST,
    ShipmentStatus.EXCEPTION,
  ],
  [ShipmentStatus.RECEIVED_AT_DEST]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.EXCEPTION,
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.RTO,
    ShipmentStatus.EXCEPTION,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
  [ShipmentStatus.RTO]: [ShipmentStatus.RECEIVED_AT_ORIGIN],
  [ShipmentStatus.EXCEPTION]: [
    ShipmentStatus.RECEIVED_AT_ORIGIN,
    ShipmentStatus.RECEIVED_AT_DEST,
    ShipmentStatus.CANCELLED,
  ],
}

export const isValidShipmentTransition = (
  from: ShipmentStatus,
  to: ShipmentStatus
): boolean => SHIPMENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false

export const MANIFEST_STATUS_TRANSITIONS: Record<
  ManifestStatus,
  ManifestStatus[]
> = {
  [ManifestStatus.DRAFT]: [
    ManifestStatus.BUILDING,
    ManifestStatus.OPEN,
    ManifestStatus.CLOSED,
  ],
  [ManifestStatus.BUILDING]: [ManifestStatus.OPEN, ManifestStatus.CLOSED],
  [ManifestStatus.OPEN]: [ManifestStatus.BUILDING, ManifestStatus.CLOSED],
  [ManifestStatus.CLOSED]: [ManifestStatus.DEPARTED],
  [ManifestStatus.DEPARTED]: [ManifestStatus.ARRIVED],
  [ManifestStatus.ARRIVED]: [ManifestStatus.RECONCILED],
  [ManifestStatus.RECONCILED]: [],
}

export const isValidManifestTransition = (
  from: ManifestStatus,
  to: ManifestStatus
): boolean => MANIFEST_STATUS_TRANSITIONS[from]?.includes(to) ?? false

export const ROLE_PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: {
    modules: ["*"] as string[],
    canViewFinance: true,
    canEditManifests: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canResolveExceptions: true,
  },
  [UserRole.ADMIN]: {
    modules: ["*"] as string[],
    canViewFinance: true,
    canEditManifests: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canResolveExceptions: true,
  },
  [UserRole.MANAGER]: {
    modules: ["*"] as string[],
    canViewFinance: true,
    canEditManifests: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canResolveExceptions: true,
  },
  [UserRole.WAREHOUSE_IMPHAL]: {
    modules: ["scanning", "inventory", "shipments", "exceptions"] as string[],
    canViewFinance: false,
    canEditManifests: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canResolveExceptions: false,
    hubRestriction: HubCode.IMPHAL,
  },
  [UserRole.WAREHOUSE_DELHI]: {
    modules: ["scanning", "inventory", "shipments", "exceptions"] as string[],
    canViewFinance: false,
    canEditManifests: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canResolveExceptions: false,
    hubRestriction: HubCode.NEW_DELHI,
  },
  [UserRole.OPS]: {
    modules: [
      "shipments",
      "manifests",
      "tracking",
      "customers",
      "exceptions",
    ] as string[],
    canViewFinance: false,
    canEditManifests: true,
    canManageUsers: false,
    canViewAuditLogs: false,
    canResolveExceptions: true,
  },
  [UserRole.INVOICE]: {
    modules: ["finance", "customers", "shipments"] as string[],
    canViewFinance: true,
    canEditManifests: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canResolveExceptions: false,
  },
  [UserRole.SUPPORT]: {
    modules: ["shipments", "tracking", "customers"] as string[],
    canViewFinance: false,
    canEditManifests: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canResolveExceptions: false,
    readOnly: true,
  },
  [UserRole.WAREHOUSE_STAFF]: {
    modules: ["scanning", "inventory", "shipments"] as string[],
    canViewFinance: false,
    canEditManifests: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canResolveExceptions: false,
  },
  [UserRole.OPS_STAFF]: {
    modules: ["shipments", "manifests", "tracking", "exceptions"] as string[],
    canViewFinance: false,
    canEditManifests: true,
    canManageUsers: false,
    canViewAuditLogs: false,
    canResolveExceptions: false,
  },
  [UserRole.FINANCE_STAFF]: {
    modules: ["finance", "customers", "shipments"] as string[],
    canViewFinance: true,
    canEditManifests: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canResolveExceptions: false,
  },
} as const

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 1000,
  [UserRole.ADMIN]: 100,
  [UserRole.MANAGER]: 90,
  [UserRole.OPS]: 80,
  [UserRole.INVOICE]: 70,
  [UserRole.WAREHOUSE_IMPHAL]: 60,
  [UserRole.WAREHOUSE_DELHI]: 60,
  [UserRole.WAREHOUSE_STAFF]: 50,
  [UserRole.OPS_STAFF]: 40,
  [UserRole.FINANCE_STAFF]: 30,
  [UserRole.SUPPORT]: 20,
}

export const hasPermission = (
  role: UserRole,
  permission: keyof (typeof ROLE_PERMISSIONS)[UserRole.ADMIN]
): boolean => {
  const rolePerms = ROLE_PERMISSIONS[role]
  if (!rolePerms) return false
  return (
    (rolePerms as Record<string, unknown>)[permission] === true ||
    rolePerms.modules?.includes("*")
  )
}

export const canAccessModule = (role: UserRole, module: string): boolean => {
  const rolePerms = ROLE_PERMISSIONS[role]
  if (!rolePerms) return false
  return rolePerms.modules.includes("*") || rolePerms.modules.includes(module)
}

export interface Weight {
  dead: number
  volumetric: number
  chargeable: number
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country?: string
}

export interface ContactInfo {
  name: string
  phone: string
  email?: string
  address: Address
  gstin?: string
}

export interface TaxBreakdown {
  cgst: number
  sgst: number
  igst: number
  total: number
}

export interface Financials {
  ratePerKg: number
  baseFreight: number
  docketCharge: number
  pickupCharge: number
  packingCharge: number
  fuelSurcharge: number
  handlingFee: number
  insurance: number
  tax: TaxBreakdown
  discount: number
  totalAmount: number
  advancePaid: number
  balance: number
}

export interface ScanPayload {
  v: number
  type: "shipment" | "manifest" | "package"
  awb?: AWB
  manifestId?: UUID
  packageId?: UUID
  metadata?: Record<string, unknown>
}

export interface ScanEvent {
  id: string
  type: "shipment" | "manifest"
  code: string
  timestamp: string
  source: ScanSource
  hubCode: HubCode
  staffId: UUID
  synced: boolean
  syncedAt?: string
  error?: string
}

export const parseAWB = (input: string): AWB | null => {
  if (isAWB(input)) return input as AWB
  try {
    const payload: ScanPayload = JSON.parse(input)
    if (payload.awb && isAWB(payload.awb)) return payload.awb
  } catch {
    // not JSON
  }
  return null
}

export const formatAWB = (awb: AWB | string): string =>
  awb.replace(/^TAC/, "TAC-")
