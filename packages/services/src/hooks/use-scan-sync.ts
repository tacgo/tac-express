"use client"

import { useMutation } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import type { ScanEvent } from "@workspace/types"
import { createScanSyncService } from "../scan-sync.service"

const db = createBrowserClient()
const scanSyncService = createScanSyncService(db)

export function useSyncScanEvent() {
  return useMutation({
    mutationFn: (event: ScanEvent) => scanSyncService.syncScanEvent(event),
  })
}
