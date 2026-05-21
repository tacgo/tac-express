import type { UUID, InvoiceNumber, AWB, InvoiceStatus, PaymentMode, TaxBreakdown } from "./domain.types"

export interface Invoice {
  id: UUID
  invoiceNumber: InvoiceNumber
  status: InvoiceStatus
  awbNumber: AWB
  shipmentId: UUID
  customerId: UUID
  customerName: string
  customerGstin?: string
  paymentMode: PaymentMode
  baseFreight: number
  docketCharge: number
  pickupCharge: number
  packingCharge: number
  fuelSurcharge: number
  handlingFee: number
  insurance: number
  discount: number
  tax: TaxBreakdown
  totalAmount: number
  advancePaid: number
  balance: number
  pdfPath?: string
  issuedAt?: string
  paidAt?: string
  dueDate?: string
  notes?: string
  createdBy: UUID
  createdAt: string
  updatedAt: string
}

export interface InvoiceSummary {
  id: UUID
  invoiceNumber: InvoiceNumber
  status: InvoiceStatus
  awbNumber: AWB
  customerName: string
  totalAmount: number
  balance: number
  paymentMode: PaymentMode
  createdAt: string
  dueDate?: string
}

export interface InvoiceFilters {
  status?: InvoiceStatus[]
  paymentMode?: PaymentMode[]
  customerId?: UUID
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface Customer {
  id: UUID
  name: string
  phone: string
  email?: string
  gstin?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
  totalShipments: number
  totalRevenue: number
  outstandingBalance: number
  createdAt: string
  updatedAt: string
}

export interface CustomerFilters {
  search?: string
  city?: string
  state?: string
  page?: number
  pageSize?: number
}
