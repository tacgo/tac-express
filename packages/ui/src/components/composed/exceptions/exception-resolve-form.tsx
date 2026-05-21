"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/primitives/label"
import { Textarea } from "@workspace/ui/components/primitives/textarea"

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
        <Label
          htmlFor="exception-resolution"
          className="font-mono text-2xs uppercase tracking-wider text-muted-foreground"
        >
          Resolution Notes
        </Label>
        <Textarea
          id="exception-resolution"
          {...register("resolution")}
          rows={4}
          placeholder="Describe how the exception was resolved, corrective actions taken..."
          aria-invalid={Boolean(errors.resolution) || undefined}
          className={cn("resize-none font-sans text-sm", errors.resolution && "border-destructive")}
        />
        {errors.resolution && (
          <p role="alert" className="font-mono text-2xs text-destructive">{errors.resolution.message}</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="px-6 font-mono text-xs uppercase tracking-wider"
        >
          {isLoading ? "Resolving..." : "Mark Resolved"}
        </Button>
      </div>
    </form>
  )
}
