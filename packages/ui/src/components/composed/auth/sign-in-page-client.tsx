"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SignInForm } from "@workspace/ui/components/composed/auth/sign-in-form"
import { createBrowserClient } from "@workspace/database/client"

interface SignInPageClientProps {
  redirectTo: string
}

function SignInPageClient({ redirectTo }: SignInPageClientProps) {
  const router = useRouter()
  const [error, setError] = React.useState<string | undefined>()
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleSignIn(email: string, password: string) {
    setIsLoading(true)
    setError(undefined)
    try {
      const db = createBrowserClient()
      const { error: signInError } = await db.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  return <SignInForm onSubmit={handleSignIn} error={error} isLoading={isLoading} />
}

export { SignInPageClient }
export type { SignInPageClientProps }
