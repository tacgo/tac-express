"use client"



import * as React from "react"
import { formatDistanceToNow, parseISO } from "date-fns"
import DOMPurify from "isomorphic-dompurify"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import { Switch } from "@workspace/ui/components/primitives/switch"
import { Label } from "@workspace/ui/components/primitives/label"
import { RichTextEditor } from "@workspace/ui/components/primitives/rich-text-editor"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import {
  RiBookOpenLine,
  RiSendPlaneLine,
  RiDeleteBinLine,
  RiEyeLine,
} from "@workspace/ui/icons"

export interface NotePanelItem {
  id: string
  bodyJson: object
  bodyHtml: string
  bodyText: string
  isInternal: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByName?: string
}

interface NotesPanelProps {
  notes: NotePanelItem[]
  /** Submit a brand-new note. */
  onCreate: (input: {
    bodyJson: object
    bodyHtml: string
    bodyText: string
    isInternal: boolean
  }) => void | Promise<void>
  /** Optional delete handler (gated by RBAC at the consumer level). */
  onDelete?: (id: string) => void
  /** When false, hides the composer entirely (read-only mode). */
  canCreate?: boolean
  /** Loading state while fetching the list. */
  loading?: boolean
  /** Empty-state title override. */
  emptyTitle?: string
  className?: string
}

export function NotesPanel({
  notes,
  onCreate,
  onDelete,
  canCreate = true,
  loading = false,
  emptyTitle = "No notes yet",
  className,
}: NotesPanelProps) {
  const [draftJson, setDraftJson] = React.useState<object>({})
  const [draftHtml, setDraftHtml] = React.useState("")
  const [draftText, setDraftText] = React.useState("")
  const [isInternal, setIsInternal] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [editorKey, setEditorKey] = React.useState(0)

  const canSubmit = draftText.trim().length > 0 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onCreate({
        bodyJson: draftJson,
        bodyHtml: draftHtml,
        bodyText: draftText,
        isInternal,
      })
      // Reset draft + force-remount editor so it clears its content.
      setDraftJson({})
      setDraftHtml("")
      setDraftText("")
      setEditorKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      data-slot="notes-panel"
      className={cn("flex flex-col gap-4", className)}
    >
      {canCreate && (
        <div className="grid gap-2 border border-border bg-card p-3">
          <Label htmlFor="note-editor">
            <RiBookOpenLine className="size-3.5" />
            Add a note
          </Label>
          <RichTextEditor
            key={editorKey}
            placeholder="Type a note. Use Ctrl/Cmd+Enter to send."
            characterLimit={10_000}
            minHeight="6rem"
            toolbar="minimal"
            ariaLabel="Note composer"
            onChange={({ json, html, text }) => {
              setDraftJson(json)
              setDraftHtml(html)
              setDraftText(text)
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
              <Switch
                checked={isInternal}
                onCheckedChange={setIsInternal}
                aria-label="Internal note"
              />
              <span>{isInternal ? "Internal · staff-only" : "Customer-visible"}</span>
            </label>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
            >
              <RiSendPlaneLine />
              {submitting ? "Saving…" : "Post note"}
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border bg-background">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            Thread · {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
        </header>
        {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
        <ScrollArea className="max-h-[28rem]">
          {loading ? (
            <div className="flex items-center justify-center py-12 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
              Loading…
            </div>
          ) : notes.length === 0 ? (
            <EmptyState
              icon={<RiBookOpenLine />}
              title={emptyTitle}
              description={
                canCreate
                  ? "Drop the first note above to start the thread."
                  : "Notes for this entity will show up here once added."
              }
            />
          ) : (
            <ol className="divide-y divide-border/60">
              {notes.map((n) => (
                <NoteRow key={n.id} note={n} onDelete={onDelete} />
              ))}
            </ol>
          )}
        </ScrollArea>
      </div>
    </section>
  )
}

function NoteRow({
  note,
  onDelete,
}: {
  note: NotePanelItem
  onDelete?: (id: string) => void
}) {
  const when = (() => {
    try {
      return formatDistanceToNow(parseISO(note.createdAt), { addSuffix: true })
    } catch {
      return note.createdAt
    }
  })()

  return (
    <li className="grid gap-2 px-4 py-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-semibold">
            {note.createdByName ?? "Staff"}
          </span>
          {note.isInternal ? (
            <Badge variant="secondary" className="gap-1 font-mono">
              <RiEyeLine className="size-3" />
              Internal
            </Badge>
          ) : (
            <Badge variant="outline" className="font-mono">
              Customer-visible
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            {when}
          </span>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDelete(note.id)}
              aria-label="Delete note"
              className="size-6"
            >
              <RiDeleteBinLine className="size-3" />
            </Button>
          )}
        </div>
      </header>
      <div
        className="prose prose-sm max-w-none text-foreground dark:prose-invert"
        // [SECURITY] Sanitizing HTML client-side to prevent XSS. Even though
        // rich-text output should be sanitized server-side, we must never trust
        // server data directly in dangerouslySetInnerHTML.
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.bodyHtml) }}
      />
    </li>
  )
}
