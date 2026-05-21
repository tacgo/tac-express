"use client"

import * as React from "react"
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "@workspace/services/hooks/use-api-keys"
import type { ApiKeyScope } from "@workspace/types"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import { SkeletonRows } from "@workspace/ui/components/primitives/skeleton"
import { RiKey2Line, RiAddLine, RiCloseCircleLine, RiFileCopyLine } from "@workspace/ui/icons"

const SCOPES: ApiKeyScope[] = ["read_only", "read_write", "admin"]

export function ApiKeysClient() {
  const list = useApiKeys()

  const [name, setName] = React.useState("")
  const [scope, setScope] = React.useState<ApiKeyScope>("read_only")
  const [revealed, setRevealed] = React.useState<{ name: string; key: string } | null>(null)

  const createMut = useCreateApiKey()
  const revokeMut = useRevokeApiKey()

  const handleCreate = () => {
    createMut.mutate(
      { name, scope },
      {
        onSuccess: (created) => {
          setRevealed({ name: created.name, key: created.plainKey })
          setName("")
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Settings · Developers"
        title="API Keys"
        description="Programmatic access to the TAC Express API. Keys are shown exactly once; store them in your secret manager."
      />

      <div className="tac-fui-panel space-y-3 p-5">
        <p className="border-b border-border pb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Generate key
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 md:col-span-2">
            <span className="block font-mono text-2xs uppercase tracking-wider text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="WMS integration" />
          </label>
          <label className="space-y-1">
            <span className="block font-mono text-2xs uppercase tracking-wider text-muted-foreground">Scope</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ApiKeyScope)}
              className="h-9 w-full border border-border bg-card px-2 font-mono text-sm uppercase tracking-wider"
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={!name || createMut.isPending}>
            <RiAddLine className="mr-1 size-4" aria-hidden="true" /> Create key
          </Button>
        </div>
      </div>

      {revealed && (
        <div className="tac-fui-panel border-l-4 border-l-accent-warning bg-card p-4">
          <p className="font-mono text-xs uppercase tracking-wider text-accent-warning">
            Save this key now
          </p>
          <p className="mt-1 text-sm text-foreground">
            <strong>{revealed.name}</strong> — this token will not be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate border border-border bg-code-bg px-3 py-2 font-mono text-sm">
              {revealed.key}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(revealed.key)
              }}
            >
              <RiFileCopyLine className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Active keys</p>
        {list.isLoading && <SkeletonRows rows={3} />}
        {!list.isLoading && (list.data?.length ?? 0) === 0 && (
          <EmptyState
            icon={<RiKey2Line className="size-6" aria-hidden="true" />}
            title="No API keys"
            description="Generate one to start using the public API."
          />
        )}
        {(list.data ?? []).map((k) => (
          <div key={k.id} className="tac-fui-panel flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium text-foreground">{k.name}</h3>
                <Badge variant="outline" className="font-mono">{k.scope}</Badge>
                {k.isActive ? (
                  <Badge variant="default" className="bg-accent-success/15 text-accent-success border-accent-success">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive">Revoked</Badge>
                )}
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {k.keyPrefix}…  ·  Last used {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never"}
              </p>
            </div>
            {k.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeMut.mutate(k.id)}
                aria-label={`Revoke key ${k.name}`}
              >
                <RiCloseCircleLine className="mr-1 size-4" aria-hidden="true" /> Revoke
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
