"use client"

import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/icons"
import { cn } from "@workspace/ui/lib/utils"
import type { FailedWhatsappSendRow } from "@workspace/types"

/**
 * WhatsAppRetryButton — pure operator action for retrying a failed
 * WhatsApp send (SB-1 / #153 / W2 PR 2).
 *
 * Strictly PURE per LAW 5/6/7 (PHASE-0 § A in
 * `docs/decisions/2026-05-17-whatsapp-retry-action.md`):
 *
 *   - No `fetch` / no API call inside this component.
 *   - No business logic — the parent decides what "retry" means and
 *     handles the mutation.
 *   - No DB access (transitively or otherwise).
 *   - Props in, callback out. State (in-flight, last error) is owned by
 *     the parent and prop-drilled in.
 *
 * The parent (`apps/dashboard/.../ops-whatsapp-failed-sends-client.tsx`)
 * owns the per-row in-flight Map + the fetch to `/api/whatsapp/retry-send`
 * and prop-drills `isInflight` / `lastError` / `canRetry` to each row's
 * button. `onRetry(row)` is the upward intent emit.
 *
 * Design-system attestation (TAC Express v5.0 Violet Grid):
 *   - Wraps the existing shadcn `<Button>` primitive (LAW 14 — never
 *     rebuild). Variant: `outline` for the default state (functional
 *     mission-control), `ghost` when `canRetry === false`.
 *   - Size: `sm` — table-cell density.
 *   - Icon: `@remixicon/react` via `@workspace/ui/icons` only (LAW 2).
 *     `refresh` for default + success-stub, `loader` for in-flight.
 *   - Zero Tailwind color classes (LAW 10) — only semantic tokens
 *     (`text-destructive` for the error indicator).
 *   - Zero arbitrary values (LAW 11) — pure scale utilities + tokens.
 *   - Accessibility: `aria-busy={isInflight}`, `aria-disabled` set when
 *     unavailable OR in-flight; status not conveyed by color alone (the
 *     button label + icon always reflect state).
 */

interface WhatsAppRetryButtonProps {
  /** The failed-send row this button acts on. Emitted back via `onRetry`. */
  row: FailedWhatsappSendRow
  /**
   * Whether the row is in principle retryable. False for non-MANAGER
   * users (the live wrapper passes false in that case) and for template
   * rows in V1 (template retries are scope-cut — see decision § A).
   * When false, the button renders disabled with an explanatory title.
   */
  canRetry: boolean
  /**
   * Whether THIS row has a retry currently in-flight. The parent owns
   * the per-row Map; only one in-flight retry per row at a time.
   */
  isInflight: boolean
  /**
   * Last error message from the most-recent retry attempt for THIS row.
   * Cleared by the parent when the operator clicks retry again. When
   * present, the button displays in a destructive variant + the message
   * appears below as inline text.
   */
  lastError?: string | null
  /** Upward intent emit — parent handles the mutation. */
  onRetry: (row: FailedWhatsappSendRow) => void
  /**
   * Optional reason text shown in the disabled-state tooltip. Defaults
   * to "Retry not available" — the parent supplies a more specific
   * reason for the V1 template-row case ("Template retries: re-send
   * from the invoice detail page.").
   */
  disabledReason?: string
  className?: string
}

const DEFAULT_DISABLED_REASON = "Retry not available"

function WhatsAppRetryButton({
  row,
  canRetry,
  isInflight,
  lastError,
  onRetry,
  disabledReason,
  className,
}: WhatsAppRetryButtonProps) {
  const disabled = !canRetry || isInflight
  const titleText = !canRetry
    ? (disabledReason ?? DEFAULT_DISABLED_REASON)
    : isInflight
      ? "Retry in progress"
      : lastError
        ? `Last error: ${lastError}. Click to try again.`
        : "Retry this send"

  const label = isInflight ? "Retrying…" : lastError ? "Retry again" : "Retry"
  // Icon: `refresh` by default; `loader` while in-flight (animates via the
  // global tac-blink/spinner classes if present, otherwise the still icon
  // is fine — feedback is via text, not motion alone).
  const iconName = isInflight ? "loader" : "refresh"

  // Defense-in-depth: short-circuit the upward emit on disabled OR in-flight
  // even though Button's `disabled` already blocks the native click — some
  // assistive paths bypass `disabled` semantics.
  const handleClick = React.useCallback(() => {
    if (disabled) return
    onRetry(row)
  }, [disabled, onRetry, row])

  return (
    <div
      data-slot="whatsapp-retry-button-wrapper"
      className={cn("flex flex-col items-start gap-1", className)}
    >
      <Button
        type="button"
        variant={lastError ? "outline" : canRetry ? "outline" : "ghost"}
        size="sm"
        disabled={disabled}
        aria-busy={isInflight}
        aria-disabled={disabled}
        aria-label={label}
        title={titleText}
        onClick={handleClick}
        data-slot="whatsapp-retry-button"
        data-state={
          isInflight
            ? "inflight"
            : lastError
              ? "error"
              : canRetry
                ? "idle"
                : "disabled"
        }
        className={cn(
          "gap-1.5",
          // Error-state border uses the semantic destructive token only —
          // LAW 10 negative-asserted in the test.
          lastError && "border-destructive/50 text-destructive",
        )}
      >
        <Icon
          name={iconName}
          className={cn("size-3.5", isInflight && "animate-spin")}
          aria-hidden
        />
        <span>{label}</span>
      </Button>
      {lastError ? (
        <p
          data-slot="whatsapp-retry-error"
          className="t-data-sm text-destructive max-w-xs"
          title={lastError}
        >
          {truncateError(lastError)}
        </p>
      ) : null}
    </div>
  )
}

function truncateError(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export { WhatsAppRetryButton }
export type { WhatsAppRetryButtonProps }
