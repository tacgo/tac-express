"use client"

import * as React from "react"
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
} from "@workspace/services/hooks/use-webhooks"
import { WEBHOOK_EVENTS, type WebhookEvent } from "@workspace/types"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import { SkeletonRows } from "@workspace/ui/components/primitives/skeleton"
import {
  RiPlugLine,
  RiAddLine,
  RiDeleteBinLine,
  RiCheckLine,
} from "@workspace/ui/icons"

export function WebhooksClient() {
  const list = useWebhooks()
  const createMut = useCreateWebhook()
  const deleteMut = useDeleteWebhook()

  const [name, setName] = React.useState("")
  const [url, setUrl] = React.useState("")
  const [events, setEvents] = React.useState<WebhookEvent[]>([])

  function toggleEvent(evt: WebhookEvent) {
    setEvents((prev) =>
      prev.includes(evt) ? prev.filter((x) => x !== evt) : [...prev, evt]
    )
  }

  async function submit() {
    if (!name || !url || events.length === 0) return
    await createMut.mutateAsync({ name, url, events })
    setName("")
    setUrl("")
    setEvents([])
  }

  return (
    <PageShell width="wide">
      <PageHeader
        overline="Settings · Integrations"
        title="Webhooks"
        description="Subscribe external systems to TAC Express business events. Each delivery is signed with HMAC SHA-256."
      />

      <div className="tac-fui-panel space-y-4 p-5">
        <p className="border-b border-border pb-2 font-mono text-xs tracking-wider text-muted-foreground uppercase">
          New endpoint
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production WMS sync"
            />
          </Field>
          <Field label="URL">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-system.example.com/webhooks/tac"
              type="url"
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 font-mono text-2xs tracking-wider text-muted-foreground uppercase">
            Events
          </p>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((evt) => {
              const active = events.includes(evt)
              return (
                <Button
                  key={evt}
                  variant="ghost"
                  aria-pressed={active}
                  onClick={() => toggleEvent(evt)}
                  className={
                    "tac-fui-hover h-auto gap-1 border px-2 py-1 font-mono text-xs tracking-wider uppercase " +
                    (active
                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                      : "border-border text-muted-foreground")
                  }
                >
                  {active ? (
                    <RiCheckLine className="size-3" aria-hidden="true" />
                  ) : null}
                  {evt}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={submit}
            disabled={
              !name || !url || events.length === 0 || createMut.isPending
            }
          >
            <RiAddLine className="mr-1 size-4" aria-hidden="true" />
            Create webhook
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          Active subscriptions
        </p>
        {list.isLoading && <SkeletonRows rows={3} />}
        {!list.isLoading && (list.data?.length ?? 0) === 0 && (
          <EmptyState
            icon={<RiPlugLine className="size-6" aria-hidden="true" />}
            title="No webhooks yet"
            description="Create one above to push events to your stack."
          />
        )}
        {(list.data ?? []).map((wh) => (
          <div
            key={wh.id}
            className="tac-fui-panel flex items-start justify-between gap-3 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium text-foreground">
                  {wh.name}
                </h3>
                {wh.isActive ? (
                  <Badge
                    variant="default"
                    className="border-accent-success bg-accent-success/15 text-accent-success"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline">Disabled</Badge>
                )}
                {wh.failureCount > 0 && (
                  <Badge variant="destructive">
                    {wh.failureCount} failures
                  </Badge>
                )}
              </div>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                {wh.url}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {wh.events.map((e) => (
                  <Badge key={e} variant="outline" className="font-mono">
                    {e}
                  </Badge>
                ))}
              </div>
              {wh.lastSuccessAt && (
                <p className="mt-2 text-2xs text-muted-foreground">
                  Last success {new Date(wh.lastSuccessAt).toLocaleString()}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteMut.mutate(wh.id)}
              aria-label={`Delete webhook ${wh.name}`}
            >
              <RiDeleteBinLine className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-1">
      <span className="block font-mono text-2xs tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}
