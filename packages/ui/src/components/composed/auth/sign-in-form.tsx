"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { RiArrowRightLine, RiEyeLine, RiEyeOffLine, RiLoader4Line } from "@workspace/ui/icons"

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
  const [showPassword, setShowPassword] = React.useState(false)
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
          className="tac-mono-label-base text-muted-foreground"
        >
          Email address
        </Label>
        <Input
          {...register("email")}
          id="sign-in-email"
          type="email"
          autoComplete="email"
          className="h-9 font-sans text-sm"
          placeholder="operator@tacexpress.in"
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "sign-in-email-error" : undefined}
        />
        {errors.email && (
          <p id="sign-in-email-error" role="alert" className="font-mono text-2xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="sign-in-password"
          className="tac-mono-label-base text-muted-foreground"
        >
          Password
        </Label>
        <div className="relative">
          <Input
            {...register("password")}
            id="sign-in-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-9 pr-10 font-sans text-sm"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={errors.password ? "sign-in-password-error" : undefined}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
          >
            {showPassword ? (
              <RiEyeOffLine className="size-4" aria-hidden="true" />
            ) : (
              <RiEyeLine className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p id="sign-in-password-error" role="alert" className="font-mono text-2xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-2xs text-destructive"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="h-9 w-full font-mono text-xs uppercase tracking-widest"
      >
        {isLoading ? (
          <>
            <RiLoader4Line className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <RiArrowRightLine className="ml-2 size-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  )
}

export { SignInForm }
export type { SignInInput }
