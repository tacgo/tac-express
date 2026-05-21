import { createServerClient } from "@workspace/database/client"
import { createAuthService, type AuthService } from "./auth.service"

type CookieStore = Parameters<typeof createServerClient>[0]

/**
 * Server-side auth service factory. Pass the Next.js `cookies()` store.
 * Use this from server components / route handlers / server actions
 * instead of importing @workspace/database directly (LAW 6/7/8).
 */
function getServerAuth(cookieStore: CookieStore): AuthService {
  return createAuthService(createServerClient(cookieStore))
}

export { getServerAuth }
