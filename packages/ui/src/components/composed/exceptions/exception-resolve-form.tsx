"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@workspace/ui/lib/utils"

const resolveSchema = z.object({
  resolution: z.string().min(10, "Please provide at least 10 characters describing the resolution"),
})

type ResolveValues = z.infer<typeof resolveSchema>

interface ExceptionResolveFormProps {
  onSubmit: (resolution: string) => Promise<void>
  isLoading?: boolean
  isResolved?: boolean
}

export function ExceptionResolveForm({ onSubmit, isLoading, isResolved }: ExceptionResolveFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ResolveValues>({
    resolver: zodResolver(resolveSchema),
  })

  if (isResolved) {
    return (
      <div className="border border-primary/30 bg-primary/5 p-4">
        <p className="font-mono text-xs text-primary uppercase tracking-wider">Exception Resolved</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v.resolution))} className="border border-border bg-card p-4 space-y-3">
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Resolve Exception</p>
      <div className="space-y-1">
        <label className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          Resolution Notes
        </label>
        <textarea
          {...register("resolution")}
          rows={4}
          placeholder="Describe how the exception was resolved, corrective actions taken..."
          className={cn(
            "w-full border border-border bg-background px-3 py-2 font-sans text-sm text-foreground resize-none",
            "placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring",
            errors.resolution && "border-destructive"
          )}
        />
        {errors.resolution && (
          <p className="font-mono text-2xs text-destructive">{errors.resolution.message}</p>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="h-9 px-6 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Resolving..." : "Mark Resolved"}
        </button>
      </div>
    </form>
  )
}
