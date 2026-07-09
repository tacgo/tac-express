import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createMiddlewareClient } from "@workspace/database/middleware"

import { checkPublicApi, checkAuth } from "@/lib/rate-limit"

/**
 * Next.js Proxy — single shell era.
 *
 * The file convention was renamed from `middleware.ts` to `proxy.ts` in
 * Next.js 16 (see https://nextjs.org/docs/messages/middleware-to-proxy);
 * the exported function name was also renamed `middleware` → `proxy`.
 * Behavior is unchanged from the prior middleware implementation.
 *
 * Responsibilities:
 *   1. Rate-limit public + auth surfaces (sign-in, /track, /api/public).
 *   2. Refresh Supabase session cookies and read the authenticated user.
 *   3. Redirect unauthenticated requests on protected routes to /sign-in.
 *
 * Legacy `/foo` URL → `/ops-console/foo` rewrites are handled by
 * `next.config.mjs` 308 redirects, not here. This file is auth-only.
 */

const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/track",
  "/api/public",
  "/api/health",
  "/api/webhooks",
  "/print",
  // Sentry browser-SDK tunnel (withSentryConfig `tunnelRoute`). Must bypass
  // auth — telemetry is emitted from public pages (e.g. /sign-in) and before
  // login; without this the envelope POST is redirected to /sign-in and no
  // event ever reaches Sentry.
  "/monitoring",
]

const RATE_LIMITED_PUBLIC = ["/api/public", "/track"]
const RATE_LIMITED_AUTH = ["/sign-in", "/auth/sign-in", "/auth/callback"]

function getIdentifier(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous"
  )
}

function tooManyRequests(reset: number): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please slow down.",
      retryAfterMs: Math.max(0, reset - Date.now()),
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(
          Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
        ),
      },
    },
  )
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl
  const identifier = getIdentifier(req)

  // 1. Rate limit public + auth surfaces (no-op when Upstash env missing).
  if (RATE_LIMITED_PUBLIC.some((p) => pathname.startsWith(p))) {
    const r = await checkPublicApi(identifier)
    if (!r.success) return tooManyRequests(r.reset)
  }
  if (RATE_LIMITED_AUTH.some((p) => pathname.startsWith(p))) {
    const r = await checkAuth(identifier)
    if (!r.success) return tooManyRequests(r.reset)
  }

  // 2. Refresh Supabase session cookies + read user.
  const { supabase, response } = createMiddlewareClient(req)

  // Treat any auth-layer error (most commonly `Invalid Refresh Token:
  // Refresh Token Not Found` when the browser has stale cookies from a
  // prior session) as "no user". Supabase's `getUser()` throws an
  // AuthApiError up the call stack; without this guard the proxy
  // crashes every request and the dev overlay surfaces the trace.
  // Falling through to the unauthenticated branch below redirects the
  // visitor to /sign-in cleanly and lets them re-auth.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    user = null
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // 3. Redirect unauthenticated users on protected routes to /sign-in.
  if (!user && !isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = "/sign-in"
    url.searchParams.set("next", pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and most non-routable
    // extensions. Run on app routes + API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
