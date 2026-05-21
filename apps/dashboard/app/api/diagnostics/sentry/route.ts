// Sentry wiring diagnostic — manager-gated, rate-limited verification route.
//
// GET  /api/diagnostics/sentry        — Reports live Sentry-configured status (DSN host, env)
//
// POST /api/diagnostics/sentry        — Emits a tagged synthetic test event and returns its id
//
// This is the project's verification mechanism for the dashboard Sentry
// wiring (see docs/launch SB-2). It stays manager-gated + rate-limited so
// it is safe to leave reachable in production — no NODE_ENV example page.

import * as Sentry from "@sentry/nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getServerAuth } from "@workspace/auth/server"
import { captureRbacDenial } from "@workspace/auth"
import { isManagerOrAbove } from "@workspace/auth/rbac"
import { UserRole } from "@workspace/types"
import { createAdminServerService } from "@workspace/services/server"
import { logger } from "@/lib/logger"
import { checkAuth } from "@/lib/rate-limit"

const log = logger.child({ route: "/api/diagnostics/sentry" })

export const dynamic = "force-dynamic"

type GateResult =
  | { allowed: false; response: NextResponse }
  | { allowed: true; userId: string }

async function requireManager(): Promise<GateResult> {
  const cookieStore = await cookies()
  const auth = getServerAuth(cookieStore)

  const user = await auth.getUser().catch((err: unknown) => {
    log.warn(
      { err: err instanceof Error ? { message: err.message, name: err.name } : { value: String(err) } },
      "auth.getUser failed",
    )
    return null
  })
  if (!user) {
    return { allowed: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const adminService = createAdminServerService(cookieStore)
  const profile = await adminService.getProfileById(user.id).catch((err: unknown) => {
    log.warn(
      { err: err instanceof Error ? { message: err.message, name: err.name } : { value: String(err) } },
      "adminService.getProfileById failed",
    )
    return null
  })

  const rawRole = profile?.role
  const role = Object.values(UserRole).includes(rawRole as UserRole)
    ? (rawRole as UserRole)
    : undefined
  if (!role || !isManagerOrAbove(role)) {
    captureRbacDenial({
      requiredRole: UserRole.MANAGER,
      actualRole: role ?? UserRole.OPS_STAFF,
      surface: "/api/diagnostics/sentry",
    })
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Insufficient permissions. Sentry diagnostics require MANAGER or above." },
        { status: 403 },
      ),
    }
  }

  const rl = await checkAuth(`sentry-diag:${user.id}`)
  if (!rl.success) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Too many requests. Try again in a minute.",
          limit: rl.limit,
          remaining: rl.remaining,
          reset: rl.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-RateLimit-Reset": String(rl.reset),
          },
        },
      ),
    }
  }

  return { allowed: true, userId: user.id }
}

function resolveDsn(): string | undefined {
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
}

function dsnHostOf(dsn: string): string | null {
  try {
    return new URL(dsn).host
  } catch {
    return null
  }
}

export async function GET() {
  const gate = await requireManager()
  if (!gate.allowed) return gate.response

  const dsn = resolveDsn()
  const dsnConfigured = Boolean(dsn)

  return NextResponse.json({
    enabled: dsnConfigured,
    dsnConfigured,
    dsnHost: dsn ? dsnHostOf(dsn) : null,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? null,
    release: process.env.SENTRY_RELEASE ?? null,
    runtime: "nodejs",
    notes: dsnConfigured
      ? "Sentry initialized for the dashboard (server runtime)."
      : "No DSN configured — Sentry is fail-quiet.",
  })
}

export async function POST() {
  const gate = await requireManager()
  if (!gate.allowed) return gate.response

  const dsn = resolveDsn()
  if (!dsn) {
    return NextResponse.json(
      { ok: false, reason: "No DSN configured — Sentry is fail-quiet." },
      { status: 503 },
    )
  }

  // Emit a tagged synthetic exception to verify the end-to-end pipeline.
  // No PII in tags (deterministic strings only) per the tagger contract.
  const eventId = Sentry.captureException(
    new Error("Sentry wiring diagnostic — synthetic verification event"),
    { tags: { diagnostic: "sentry-wiring", surface: "/api/diagnostics/sentry" } },
  )
  await Sentry.flush(2000)

  return NextResponse.json({ ok: true, eventId })
}
