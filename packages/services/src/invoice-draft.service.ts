/**
 * Invoice draft normalization — pure data-shape utilities used by the
 * invoice wizard's autosave/restore flow. Lives in the services package
 * so the legacy-billing handling logic isn't duplicated across the
 * dashboard app and the (eventual) mobile / API consumers.
 *
 * Trade-off: this module deliberately uses STRUCTURAL types (the
 * `BillingDraftFields` interface) rather than importing the wizard's
 * full state shape from `@workspace/ui` — that would create a circular
 * dependency (ui → services → ui). The structural interface declares
 * exactly the fields the normalizer touches, and any caller whose
 * state extends those fields gets the normalized result back unchanged
 * everywhere else.
 */

/**
 * The minimum set of billing fields the normalizer reads/writes.
 * Real callers pass an `InvoiceWizardState` (or similar) whose shape
 * extends this; TypeScript widens the return type to preserve all the
 * caller's other fields.
 */
export interface BillingDraftFields {
  billingLine1?: string
  billingLine2?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  /** Pre-structured legacy field — single joined address string. */
  billingAddress?: string
}

/**
 * Hydrate `billingLine1` from the legacy `billingAddress` string when
 * a draft has only the joined-string form (older drafts pre-dated the
 * structured fields).
 *
 * Without this, the moment the wizard's user touches any structured
 * field the auto-rejoin logic in SmartAddressFields fires with the
 * mostly-empty values and silently overwrites the original
 * `billingAddress` — that's the data-loss path.
 *
 * The original `billingAddress` is preserved alongside the hydrated
 * line so the print view still has the full historical record.
 *
 * Idempotent: when structured fields are already populated (or when
 * neither is present), the input is returned unchanged.
 */
export function normalizeBillingDraft<T extends BillingDraftFields>(draft: T): T {
  const hasStructured = Boolean(
    draft.billingLine1 ||
      draft.billingLine2 ||
      draft.billingCity ||
      draft.billingState ||
      draft.billingZip,
  )
  const hasLegacyOnly = !hasStructured && Boolean(draft.billingAddress)
  if (!hasLegacyOnly) return draft

  const firstLine = draft.billingAddress
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  return {
    ...draft,
    billingLine1: draft.billingLine1 || firstLine || draft.billingAddress || "",
  }
}
