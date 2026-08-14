"use client"

import * as React from "react"

import {
  useContactLeads,
  useUpdateContactLeadStatus,
} from "@workspace/services/hooks/use-contact-leads"
import type { ContactLeadStatus } from "@workspace/types"
import { V7ContactLeads } from "@workspace/ui/components/composed/support/v7-contact-leads"

export function SupportInboxLive() {
  // Fetch the full set (RLS gates to MANAGER+; a lower-role session gets zero
  // rows). Search + status-tab filtering happen client-side in the view —
  // lead volume is low for a launching product.
  const { data, isLoading, isError } = useContactLeads({})
  const update = useUpdateContactLeadStatus()

  const onStatusChange = React.useCallback(
    (id: string, status: ContactLeadStatus) => {
      update.mutate({ id, status })
    },
    [update],
  )

  // Performance: Memoize default empty array to provide a stable reference to V7ContactLeads.
  // Prevents deep unnecessary re-renders of the data table during polling/loading.
  const leads = React.useMemo(() => data ?? [], [data])

  return (
    <V7ContactLeads
      leads={leads}
      isLoading={isLoading}
      isError={isError}
      onStatusChange={onStatusChange}
      updatingId={update.isPending ? update.variables?.id ?? null : null}
    />
  )
}
