"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  useCustomer,
  useCustomerShipments,
  useUpdateCustomer,
} from "@workspace/services/hooks/use-customers"
import {
  useNotes,
  useCreateNote,
  useDeleteNote,
} from "@workspace/services/hooks/use-notes"
import { useNotificationStore } from "@workspace/services/stores/notification.store"

import { CustomerDetailCard } from "@workspace/ui/components/composed/customers/customer-detail-card"
import { CustomerShipmentHistory } from "@workspace/ui/components/composed/customers/customer-shipment-history"
import { CustomerForm } from "@workspace/ui/components/composed/customers/customer-form"
import { CustomerDetailTabs } from "@workspace/ui/components/composed/customers/customer-detail-tabs"
import { NotesPanel } from "@workspace/ui/components/composed/notes/notes-panel"
import type { CustomerFormValues } from "@workspace/ui/components/composed/customers/customer-form"
import { Button } from "@workspace/ui/components/button"
import { RiArrowLeftLine, RiEditLine } from "@workspace/ui/icons"

interface CustomerDetailClientProps {
  customerId: string
}

export function CustomerDetailClient({ customerId }: CustomerDetailClientProps) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const addNotification = useNotificationStore((s) => s.addNotification)

  const { data: customer, isLoading } = useCustomer(customerId)
  const { data: shipments, isLoading: loadingShipments } =
    useCustomerShipments(customerId)
  const updateCustomer = useUpdateCustomer()

  // Notes thread
  const { data: rawNotes, isLoading: notesLoading } = useNotes(
    "CUSTOMER",
    customerId
  )
  const notes = React.useMemo(() => rawNotes ?? [], [rawNotes])
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote("CUSTOMER", customerId)

  async function handleUpdate(values: CustomerFormValues) {
    try {
      await updateCustomer.mutateAsync({
        id: customerId,
        payload: {
          name: values.name,
          phone: values.phone,
          email: values.email || undefined,
          gstin: values.gstin || undefined,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2 || undefined,
          city: values.city,
          state: values.state,
          zip: values.zip,
        },
      })
      addNotification({
        type: "success",
        title: "Customer updated",
        message: "Profile saved",
      })
      setEditing(false)
    } catch (err) {
      addNotification({
        type: "error",
        title: "Update failed",
        message: String(err),
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-36 animate-pulse border border-border bg-card" />
        <div className="h-48 animate-pulse border border-border bg-card" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="border border-dashed border-border p-8 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          Customer not found
        </p>
      </div>
    )
  }

  const overview = (
    <div className="space-y-4">
      {editing ? (
        <div className="space-y-3 border border-border bg-card p-4">
          <p className="border-b border-border pb-2 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            Edit Customer
          </p>
          <CustomerForm
            defaultValues={{
              name: customer.name,
              phone: customer.phone,
              email: customer.email ?? "",
              gstin: customer.gstin ?? "",
              addressLine1: customer.addressLine1,
              addressLine2: customer.addressLine2 ?? "",
              city: customer.city,
              state: customer.state,
              zip: customer.zip,
            }}
            onSubmit={handleUpdate}
            isLoading={updateCustomer.isPending}
          />
        </div>
      ) : (
        <CustomerDetailCard customer={customer} />
      )}
    </div>
  )

  const shipmentsTab = (
    <div className="space-y-2">
      <h2 className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
        Customer shipments
      </h2>
      <CustomerShipmentHistory
        shipments={shipments ?? []}
        isLoading={loadingShipments}
      />
    </div>
  )

  const notesTab = (
    <NotesPanel
      notes={notes}
      loading={notesLoading}
      onCreate={async (input) => {
        await createNote.mutateAsync({
          entityType: "CUSTOMER",
          entityId: customerId,
          ...input,
        })
      }}
      onDelete={(id) => deleteNote.mutate(id)}
      emptyTitle="No notes for this customer yet"
    />
  )

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Toolbar — light hairline below, no heavy border-block. Matches the
          rhythm of the other v6 detail pages (manifests, shipments). */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="h-auto px-0 py-0 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <RiArrowLeftLine className="h-3.5 w-3.5" />
          Back
        </Button>
        <Button
          variant="ghost"
          onClick={() => setEditing((v) => !v)}
          className="h-8 border border-border px-3 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:border-foreground hover:bg-transparent hover:text-foreground"
        >
          <RiEditLine className="h-3.5 w-3.5" />
          {editing ? "Cancel" : "Edit"}
        </Button>
      </div>

      <CustomerDetailTabs
        overview={overview}
        shipments={shipmentsTab}
        notes={notesTab}
      />
    </div>
  )
}
