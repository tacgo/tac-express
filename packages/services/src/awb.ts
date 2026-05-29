import { AWB_PATTERN } from "@workspace/types"

/**
 * AWB parse/validate helper.
 *
 * The single source of truth for the AWB format is `AWB_PATTERN`
 * (/^TAC\d{8,11}$/i) in `@workspace/types`. This module wraps that constant
 * in named functions so callers (the arrival-audit reconcile path, future
 * scan surfaces) never re-derive the regex inline — there must be exactly one
 * definition of "what a valid AWB looks like". See `awb.test.ts`.
 *
 * Lives in `packages/services` (not in a component) per LAW 7: AWB knowledge
 * is business logic. The HID capture hook stays format-agnostic and routes
 * raw decoded strings here.
 */

/** Trim and uppercase a raw scanned/typed value. Nullish → "". */
export function normalizeAwb(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase()
}

/** True when `value` is a well-formed AWB after normalization. */
export function isValidAwb(value: string | null | undefined): boolean {
  return AWB_PATTERN.test(normalizeAwb(value))
}

/**
 * Return the canonical (normalized) AWB when `raw` is valid, else `null`.
 * Callers use the null branch to surface a "barcode not matching" error
 * without creating any record.
 */
export function parseAwb(raw: string | null | undefined): string | null {
  const normalized = normalizeAwb(raw)
  return AWB_PATTERN.test(normalized) ? normalized : null
}
