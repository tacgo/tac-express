"use client"

import * as React from "react"

import {
  useNotes,
  useCreateNote,
  useDeleteNote,
} from "@workspace/services/hooks/use-notes"
import { NotesPanel } from "@workspace/ui/components/composed/notes/notes-panel"

interface ShipmentNotesTabProps {
  shipmentId: string
}

export function ShipmentNotesTab({ shipmentId }: ShipmentNotesTabProps) {
  const { data: rawNotes, isLoading } = useNotes("SHIPMENT", shipmentId)
  const notes = React.useMemo(() => rawNotes ?? [], [rawNotes])
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote("SHIPMENT", shipmentId)

  return (
    <NotesPanel
      notes={notes}
      loading={isLoading}
      onCreate={async (input) => {
        await createNote.mutateAsync({
          entityType: "SHIPMENT",
          entityId: shipmentId,
          ...input,
        })
      }}
      onDelete={(id) => deleteNote.mutate(id)}
      emptyTitle="No notes on this shipment yet"
    />
  )
}
