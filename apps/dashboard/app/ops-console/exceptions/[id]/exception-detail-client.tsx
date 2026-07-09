"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  useException,
  useResolveException,
} from "@workspace/services/hooks/use-exceptions"
import { ExceptionDetailCard } from "@workspace/ui/components/composed/exceptions/exception-detail-card"
import { ExceptionResolveForm } from "@workspace/ui/components/composed/exceptions/exception-resolve-form"
import { Button } from "@workspace/ui/components/button"
import { RiArrowLeftLine } from "@workspace/ui/icons"
import { useNotificationStore } from "@workspace/services/stores/notification.store"

interface ExceptionDetailClientProps {
  exceptionId: string
}

export function ExceptionDetailClient({
  exceptionId,
}: ExceptionDetailClientProps) {
  const router = useRouter()
  const addNotification = useNotificationStore((s) => s.addNotification)
  const { data: exception, isLoading } = useException(exceptionId)
  const resolveException = useResolveException()

  async function handleResolve(resolution: string) {
    try {
      await resolveException.mutateAsync({ id: exceptionId, resolution })
      addNotification({
        type: "success",
        title: "Exception resolved",
        message: resolution.slice(0, 50),
      })
    } catch (err) {
      addNotification({
        type: "error",
        title: "Failed to resolve",
        message: String(err),
      })
    }
  }

  if (isLoading) {
    return <div className="h-48 animate-pulse border border-border bg-card" />
  }

  if (!exception) {
    return (
      <div className="border border-dashed border-border p-8 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          Exception not found
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="h-auto px-0 py-0 font-mono text-xs tracking-wider text-muted-foreground uppercase hover:bg-transparent hover:text-foreground"
      >
        <RiArrowLeftLine className="h-3.5 w-3.5" />
        Exceptions
      </Button>
      <ExceptionDetailCard exception={exception} />
      <ExceptionResolveForm
        onSubmit={handleResolve}
        isLoading={resolveException.isPending}
        isResolved={
          exception.status === "RESOLVED" || exception.status === "CLOSED"
        }
      />
    </div>
  )
}
