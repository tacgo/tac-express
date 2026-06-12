import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export function createMiddlewareClient(req: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: req })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-ref.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJ..."
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
        )
      },
    },
  })

  return {
    supabase,
    get response() {
      return supabaseResponse
    },
  }
}
