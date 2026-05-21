"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { FailedWhatsappSendRow, UUID } from "@workspace/types"
import { OpsWhatsAppFailedSendsView } from "@workspace/ui/components/composed/ops-console/pages"
import type {
  FailedSendsTableRetryConfig,
  RetryRowState,
} from "@workspace/ui/components/composed/whatsapp/failed-sends-table"

/**
 * Client wrapper for the WhatsApp failed-sends operator triage page
 * (SB-1 / #153 / W2 PR 2 — the write-half of the read/retry split).
 *
 * Why this file lives in apps/dashboard, not packages/ui (per LAW 5):
 * this is page-specific composition + mutation-state glue, NOT a reusable
 * UI component. The pure UI lives in packages/ui (`<OpsWhatsAppFailedSendsView>`,
 * `<FailedSendsTable>`, `<WhatsAppRetryButton>`). This wrapper owns:
 *
 *   - the per-row in-flight Map (which sends are currently retrying)
 *   - the per-row lastError Map (most-recent retry-error per row)
 *   - the canRetry decision per row (a row is retryable IF the operator is
 *     MANAGER+ AND the row's endpoint is `sendmessage` — V1 scope cut for
 *     template retries per decision § A)
 *   - the fetch to POST /api/whatsapp/retry-send
 *   - the router.refresh() on successful retry (so the leaf-filtering on
 *     the server-side list query drops the now-superseded row off the view)
 *
 * The pure UI receives all state via the `retryConfig` prop and never
 * makes a network call of its own. Per PHASE-0 § A + § C + § D.
 */

interface OpsWhatsAppFailedSendsClientProps {
  initialRows: FailedWhatsappSendRow[]
  windowDays: number
  /**
   * Whether the CURRENT viewer can retry sends. Determined server-side
   * from the viewer's role; the live wrapper passes `true` for MANAGER+.
   * Passed through to per-row state — when false, every row's button is
   * disabled at the UI layer (server is the trust boundary; the route
   * still role-gates).
   */
  canRetry: boolean
}

const TEMPLATE_DISABLED_REASON =
  "Template retries: re-send from the invoice detail page."
const ROLE_DISABLED_REASON = "Retry requires MANAGER role or above."

interface RetryResponseBody {
  ok?: boolean
  error?: string
  newSendId?: string | null
}

export function OpsWhatsAppFailedSendsClient({
  initialRows,
  windowDays,
  canRetry,
}: OpsWhatsAppFailedSendsClientProps) {
  const router = useRouter()
  // Synchronous in-flight lock — checked + mutated WITHOUT awaiting React
  // state. Catches the double-click race the state-based guard cannot:
  // two rapid clicks before React commits state both see the same (empty)
  // `inflightIds` Set, so a Set-state check would let both fire. CodeRabbit
  // #156 / Macroscope #156 finding. The ref-locked Set is the SoT for
  // "may this fire?"; `inflightIds` state mirrors it for the render.
  const inflightLock = React.useRef<Set<UUID>>(new Set())
  const [inflightIds, setInflightIds] = React.useState<Set<UUID>>(
    () => new Set(),
  )
  const [errorsById, setErrorsById] = React.useState<Map<UUID, string>>(
    () => new Map(),
  )

  const rowState = React.useCallback(
    (rowId: UUID): RetryRowState => {
      const row = initialRows.find((r) => r.id === rowId)
      const isTemplate = row?.endpoint === "sendtemplatemessage"
      if (!canRetry) {
        return {
          canRetry: false,
          isInflight: false,
          lastError: null,
          disabledReason: ROLE_DISABLED_REASON,
        }
      }
      if (isTemplate) {
        return {
          canRetry: false,
          isInflight: false,
          lastError: null,
          disabledReason: TEMPLATE_DISABLED_REASON,
        }
      }
      return {
        canRetry: true,
        isInflight: inflightIds.has(rowId),
        lastError: errorsById.get(rowId) ?? null,
      }
    },
    [canRetry, errorsById, inflightIds, initialRows],
  )

  const onRetry = React.useCallback(
    async (row: FailedWhatsappSendRow) => {
      // SYNCHRONOUS guard — checked + mutated before any await. React state
      // updates are async; using the state-based check here would let two
      // rapid clicks both pass (both see the empty Set in the closure).
      if (inflightLock.current.has(row.id)) return
      inflightLock.current.add(row.id)

      setInflightIds((prev) => {
        const next = new Set(prev)
        next.add(row.id)
        return next
      })
      setErrorsById((prev) => {
        if (!prev.has(row.id)) return prev
        const next = new Map(prev)
        next.delete(row.id)
        return next
      })

      let body: RetryResponseBody | null = null
      let httpOk = false
      try {
        const res = await fetch("/api/whatsapp/retry-send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ originalSendId: row.id }),
        })
        httpOk = res.ok
        body = (await res.json().catch(() => null)) as RetryResponseBody | null
      } catch (err) {
        body = {
          ok: false,
          error: err instanceof Error ? err.message : "Network error",
        }
      } finally {
        // Release the lock + clear the in-flight state in lockstep so the
        // button re-enables on response (or error). Symmetric with the
        // synchronous lock acquisition above.
        inflightLock.current.delete(row.id)
        setInflightIds((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }

      if (httpOk && body?.ok === true) {
        // Success — server-side leaf-filtering will drop the now-superseded
        // row when the list refetches.
        router.refresh()
        return
      }

      // Failure path — surface the structured error inline on the row.
      const errorMessage =
        body?.error ??
        (httpOk ? "Retry failed (no error message)." : "Retry failed.")
      setErrorsById((prev) => {
        const next = new Map(prev)
        next.set(row.id, errorMessage)
        return next
      })
    },
    [router],
  )

  const retryConfig: FailedSendsTableRetryConfig = React.useMemo(
    () => ({ rowState, onRetry }),
    [rowState, onRetry],
  )

  return (
    <OpsWhatsAppFailedSendsView
      rows={initialRows}
      windowDays={windowDays}
      retryConfig={retryConfig}
    />
  )
}
