// Shared Sentry helper for Supabase Edge Functions (Deno).
//
// Edge functions previously had zero observability — failures only surfaced
// as 500 responses to callers. This helper sends thrown errors to Sentry
// via the standard envelope endpoint with a minimal payload so we don't pull
// the full @sentry/deno package into every function bundle.
//
// Usage:
//   import { reportToSentry } from "../_shared/sentry.ts"
//   try { ... } catch (e) { await reportToSentry(e, "send-notification"); throw e }

const SENTRY_DSN = Deno.env.get("SENTRY_DSN") ?? ""

interface ParsedDsn {
  envelopeEndpoint: string
  publicKey: string
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn)
    const projectId = url.pathname.replace(/^\//, "")
    const envelopeEndpoint = `${url.protocol}//${url.host}/api/${projectId}/envelope/`
    return { envelopeEndpoint, publicKey: url.username }
  } catch {
    return null
  }
}

export async function reportToSentry(err: unknown, fnName: string): Promise<void> {
  if (!SENTRY_DSN) return
  const parsed = parseDsn(SENTRY_DSN)
  if (!parsed) return

  const eventId = crypto.randomUUID().replace(/-/g, "")
  const timestamp = new Date().toISOString()
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sent_at: timestamp,
    dsn: SENTRY_DSN,
  })
  const itemHeader = JSON.stringify({ type: "event", content_type: "application/json" })
  const payload = JSON.stringify({
    event_id: eventId,
    timestamp,
    platform: "deno",
    environment: Deno.env.get("SENTRY_ENV") ?? "production",
    server_name: `edge-function/${fnName}`,
    level: "error",
    message,
    exception: {
      values: [
        {
          type: err instanceof Error ? err.name : "Error",
          value: message,
          ...(stack ? { stacktrace: { frames: [{ filename: stack.split("\n")[1] ?? "" }] } } : {}),
        },
      ],
    },
    tags: { edge_function: fnName },
  })

  const body = `${envelopeHeader}\n${itemHeader}\n${payload}`

  try {
    await fetch(parsed.envelopeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth":
          `Sentry sentry_version=7, sentry_client=tac-edge/1.0, sentry_key=${parsed.publicKey}`,
      },
      body,
      signal: AbortSignal.timeout(2000),
    })
  } catch {
    // Best-effort: never let Sentry reporting fail the function.
  }
}
