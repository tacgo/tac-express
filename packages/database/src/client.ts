import { createBrowserClient as supabaseCreateBrowserClient, createServerClient as supabaseCreateServerClient } from "@supabase/ssr"
import { createClient as supabaseCreateClient } from "@supabase/supabase-js"
import type { CookieOptions } from "@supabase/ssr"

interface CookieStore {
  getAll(): Array<{ name: string; value: string }>
  set(name: string, value: string, options?: CookieOptions): void
}

function getEnv() {
  // Graceful fallback for CI environments building without credentials
  if (process.env.CI && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co",
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  }
  return { url, key }
}

export function createBrowserClient() {
  const { url, key } = getEnv()
  return supabaseCreateBrowserClient(url, key)
}

export function createServerClient(cookieStore: CookieStore) {
  const { url, key } = getEnv()
  return supabaseCreateServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server component — cookies are read-only
        }
      },
    },
  })
}

/**
 * Service-role Supabase client. RLS-bypassing; SERVER-ONLY.
 *
 * Use this from route handlers that perform writes on behalf of an
 * UNAUTHENTICATED visitor (today: the public /api/contact route, which
 * writes the lead row + the WhatsApp tracker row). Both target tables
 * (contact_leads + whatsapp_sends) have INSERT policies that require a
 * session, so the route MUST use this client.
 *
 * DO NOT import this from a client component or any file that ends up in
 * the browser bundle — the service-role key bypasses ALL RLS.
 *
 * The client is session-less and does not refresh / persist tokens; it is
 * meant for one-shot request-scoped use inside server handlers.
 */
export function createServiceRoleClient() {
  if (process.env.CI && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return supabaseCreateClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    )
  }
  return supabaseCreateClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
