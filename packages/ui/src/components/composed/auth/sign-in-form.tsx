"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"

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
        <Label
          htmlFor="sign-in-email"
          className="font-mono text-2xs uppercase tracking-wider text-muted-foreground"
        >
          Email
        </Label>
        <Input
          {...register("email")}
          id="sign-in-email"
          type="email"
          autoComplete="email"
          className="h-9 font-sans text-sm"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email) || undefined}
        />
        {errors.email && (
          <p role="alert" className="font-mono text-2xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="sign-in-password"
          className="font-mono text-2xs uppercase tracking-wider text-muted-foreground"
        >
          Password
        </Label>
        <Input
          {...register("password")}
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          className="h-9 font-sans text-sm"
          placeholder="••••••••"
          aria-invalid={Boolean(errors.password) || undefined}
        />
        {errors.password && (
          <p role="alert" className="font-mono text-2xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="font-mono text-2xs text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="h-9 w-full font-mono text-xs uppercase tracking-wider"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  )
}

export { SignInForm }
export type { SignInInput }
