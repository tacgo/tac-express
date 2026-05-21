"use client"

import * as React from "react"
import type { Session, User } from "@workspace/database/supabase.types"
import { createBrowserClient } from "@workspace/database/client"
import { performUserSignOut } from "@workspace/auth/client"

export interface UseSessionReturn {
  session: Session | null
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = React.useState<Session | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const db = createBrowserClient()

    db.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    // performUserSignOut claims the "user" reason marker so SessionGuard
    // yields and lets the caller (e.g. UserMenu) own the post-sign-out
    // redirect — preventing misclassification as session_expired.
    signOut: async () => {
      await performUserSignOut()
    },
  }
}

