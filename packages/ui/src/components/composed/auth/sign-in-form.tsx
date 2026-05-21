"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@workspace/ui/lib/utils"

const signInSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
})

type SignInInput = z.infer<typeof signInSchema>

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>
  error?: string
  isLoading?: boolean
  className?: string
}

const inputClass =
  "w-full h-9 border border-border bg-background px-3 text-sm font-sans placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"

function SignInForm({ onSubmit, error, isLoading, className }: SignInFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) })

  return (
    <form
      data-slot="sign-in-form"
      className={cn("space-y-4", className)}
      onSubmit={handleSubmit(({ email, password }) => onSubmit(email, password))}
    >
      <div className="space-y-1">
        <label
          htmlFor="sign-in-email"
          className="font-mono text-2xs uppercase tracking-wider text-muted-foreground"
        >
          Email
        </label>
        <input
          {...register("email")}
          id="sign-in-email"
          type="email"
          autoComplete="email"
          className={inputClass}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="font-mono text-2xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="sign-in-password"
          className="font-mono text-2xs uppercase tracking-wider text-muted-foreground"
        >
          Password
        </label>
        <input
          {...register("password")}
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="font-mono text-2xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <p className="font-mono text-2xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-9 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  )
}

export { SignInForm }
export type { SignInInput }
