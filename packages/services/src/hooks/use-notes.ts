"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { createBrowserClient } from "@workspace/database/client"

import {
  createNoteService,
  type CreateNoteInput,
  type UpdateNoteInput,
  type NoteEntityType,
} from "../note.service"

const db = createBrowserClient()
const noteService = createNoteService(db)

export function useNotes(
  entityType: NoteEntityType | undefined,
  entityId: string | undefined
) {
  return useQuery({
    queryKey: ["notes", entityType, entityId],
    queryFn: () => noteService.listForEntity(entityType!, entityId!),
    enabled: Boolean(entityType && entityId),
    staleTime: 30 * 1000,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateNoteInput) => noteService.createNote(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["notes", vars.entityType, vars.entityId],
      })
    },
  })
}

export function useUpdateNote(
  entityType: NoteEntityType,
  entityId: string
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateNoteInput }) =>
      noteService.updateNote(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", entityType, entityId] })
    },
  })
}

export function useDeleteNote(
  entityType: NoteEntityType,
  entityId: string
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => noteService.deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", entityType, entityId] })
    },
  })
}
