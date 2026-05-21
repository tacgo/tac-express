import { create } from "zustand"
import type { HubCode } from "@workspace/types"

export type ScanType = "INBOUND" | "OUTBOUND" | "MANIFEST" | "DELIVERY"

export interface ScanQueueItem {
  id: string
  awb: string
  scanType: ScanType
  location: HubCode
  scannedAt: string
  retryCount: number
  synced: boolean
  error?: string
}

interface ScanQueueStore {
  queue: ScanQueueItem[]
  isOnline: boolean
  isSyncing: boolean
  enqueue: (item: Omit<ScanQueueItem, "id" | "retryCount" | "synced">) => void
  markSynced: (id: string) => void
  markFailed: (id: string, error: string) => void
  setOnline: (online: boolean) => void
  setSyncing: (syncing: boolean) => void
  clearSynced: () => void
  pendingCount: () => number
}

export const useScanQueueStore = create<ScanQueueStore>((set, get) => ({
  queue: [],
  isOnline: true,
  isSyncing: false,

  enqueue: (item) =>
    set((s) => ({
      queue: [
        ...s.queue,
        { ...item, id: crypto.randomUUID(), retryCount: 0, synced: false },
      ],
    })),

  markSynced: (id) =>
    set((s) => ({
      queue: s.queue.map((i) => (i.id === id ? { ...i, synced: true } : i)),
    })),

  markFailed: (id, error) =>
    set((s) => ({
      queue: s.queue.map((i) =>
        i.id === id ? { ...i, retryCount: i.retryCount + 1, error } : i
      ),
    })),

  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),

  clearSynced: () =>
    set((s) => ({ queue: s.queue.filter((i) => !i.synced) })),

  pendingCount: () => get().queue.filter((i) => !i.synced).length,
}))
