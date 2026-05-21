export const AWB_PREFIX = "TAC"
export const AWB_PATTERN = /^TAC\d{8,11}$/i

export const HUB_NAMES: Record<string, string> = {
  IMPHAL: "Imphal Hub",
  NEW_DELHI: "New Delhi Hub",
}

export const SCAN_QUEUE_DB_KEY = "tac_scan_queue"
export const SCAN_QUEUE_MAX_SIZE = 500
export const REALTIME_RECONNECT_DELAY_MS = 3000

export const INVOICE_PREFIX = "INV"
export const MANIFEST_PREFIX = "MNF"

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
