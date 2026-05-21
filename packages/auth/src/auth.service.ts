import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@workspace/database/supabase.types"

export function createAuthService(db: SupabaseClient) {
  return {
    // ── Auth state subscription ────────────────────────────────────────────────

    /**
     * Subscribe to Supabase auth-state changes (sign-in, sign-out, token
     * refresh). Returns an unsubscribe function so callers don't have to
     * thread the Supabase Subscription type through their UI layer.
     */
    onAuthChange(
      callback: (event: AuthChangeEvent, session: Session | null) => void,
    ): () => void {
      const {
        data: { subscription },
      } = db.auth.onAuthStateChange(callback)
      return () => subscription.unsubscribe()
    },

    // ── Password auth ──────────────────────────────────────────────────────────

    async signInWithEmail(email: string, password: string) {
      const { data, error } = await db.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    },

    async signUp(email: string, password: string) {
      const { data, error } = await db.auth.signUp({ email, password })
      if (error) throw error
      return data
    },

    async signOut() {
      const { error } = await db.auth.signOut()
      if (error) throw error
    },

    async getSession() {
      const { data, error } = await db.auth.getSession()
      if (error) throw error
      return data.session
    },

    async getUser() {
      // Swallow `AuthApiError: Invalid Refresh Token` and similar — return
      // null so callers can treat the request as unauthenticated rather
      // than seeing an exception bubble up from a stale cookie.
      try {
        const { data } = await db.auth.getUser()
        return data.user ?? null
      } catch {
        return null
      }
    },

    // ── Magic link ─────────────────────────────────────────────────────────────

    async signInWithMagicLink(email: string, redirectTo?: string) {
      const { error } = await db.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
        },
      })
      if (error) throw error
    },

    // ── Password reset ─────────────────────────────────────────────────────────

    async resetPassword(email: string, redirectTo?: string) {
      const { error } = await db.auth.resetPasswordForEmail(email, {
        ...(redirectTo ? { redirectTo } : {}),
      })
      if (error) throw error
    },

    async updatePassword(newPassword: string) {
      const { data, error } = await db.auth.updateUser({ password: newPassword })
      if (error) throw error
      return data
    },

    // ── OTP verification (magic-link / recovery tokens) ────────────────────────

    async verifyOtp(
      email: string,
      token: string,
      type: "magiclink" | "recovery" | "email",
    ) {
      const { data, error } = await db.auth.verifyOtp({ email, token, type })
      if (error) throw error
      return data
    },

    // ── TOTP / 2FA ─────────────────────────────────────────────────────────────

    async enrollTOTP() {
      const { data, error } = await db.auth.mfa.enroll({ factorType: "totp" })
      if (error) throw error
      return data
    },

    async createTOTPChallenge(factorId: string) {
      const { data, error } = await db.auth.mfa.challenge({ factorId })
      if (error) throw error
      return data
    },

    async verifyTOTP(factorId: string, challengeId: string, code: string) {
      const { data, error } = await db.auth.mfa.verify({ factorId, challengeId, code })
      if (error) throw error
      return data
    },

    async unenrollFactor(factorId: string) {
      const { data, error } = await db.auth.mfa.unenroll({ factorId })
      if (error) throw error
      return data
    },

    async listFactors() {
      const { data, error } = await db.auth.mfa.listFactors()
      if (error) throw error
      return data
    },

    async getAuthenticatorAssuranceLevel() {
      const { data, error } = await db.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) throw error
      return data
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
