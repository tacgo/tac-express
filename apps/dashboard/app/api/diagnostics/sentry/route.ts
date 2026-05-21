// Sentry wiring diagnostic — Sentry-free mock keeping RBAC boundaries for sentinel tests.
//
// GET  /api/diagnostics/sentry        — Reports Sentry configured status (always disabled now)
//
// POST /api/diagnostics/sentry        — Returns disabled status

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

export async function GET() {
  const gate = await requireManager()
  if (!gate.allowed) return gate.response

  return NextResponse.json({
    enabled: false,
    dsnConfigured: false,
    dsnHost: null,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? null,
    release: null,
    runtime: "nodejs",
    notes: "Sentry integration has been deactivated and removed.",
  })
}

export async function POST() {
  const gate = await requireManager()
  if (!gate.allowed) return gate.response

  return NextResponse.json(
    {
      ok: false,
      reason: "Sentry not initialized — Sentry is deactivated.",
    },
    { status: 503 },
  )
}
