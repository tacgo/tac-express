"use client"

import * as React from "react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"
import {
  PublicBookingForm,
  type PublicBookingFormValues,
} from "@workspace/ui/components/composed/bookings/public-booking-form"
import { useCreateBooking } from "@workspace/services/hooks/use-bookings"
import { RiSearchLine, RiSendPlaneLine } from "@workspace/ui/icons"

import { TrackSearchClient } from "./track-search-client"

export function TrackTabsClient() {
  const createBooking = useCreateBooking()
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = async (values: PublicBookingFormValues) => {
    // Strip the FileDropzone wrapper — just keep filenames for the booking
    // metadata. Real file upload to Supabase Storage `shipment-docs/public/`
    // ships in Phase 8.5 alongside the booking storage bucket.
    await createBooking.mutateAsync({
      whatsappNumber: values.whatsappNumber,
      consignor: values.consignor,
      consignee: values.consignee,
      volumeMatrix: values.volumeMatrix.map((r) => ({
        length: Number(r.length),
        width: Number(r.width),
        height: Number(r.height),
        weight: Number(r.weight),
        count: Number(r.count),
      })),
      images: values.images.map((f) => f.file.name),
      notes: values.notes,
    })
    setSubmitted(true)
  }

  return (
    <Tabs defaultValue="track">
      <TabsList className="grid w-full max-w-sm grid-cols-2">
        <TabsTrigger value="track">
          <RiSearchLine />
          Track
        </TabsTrigger>
        <TabsTrigger value="book">
          <RiSendPlaneLine />
          Book
        </TabsTrigger>
      </TabsList>

      <TabsContent value="track" className="mt-4">
        <TrackSearchClient />
      </TabsContent>

      <TabsContent value="book" className="mt-4">
        {submitted ? (
          <div className="border border-border bg-card p-6 text-center">
            <p className="font-mono text-ui-10 tracking-widest text-muted-foreground uppercase">
              Booking submitted
            </p>
            <h2 className="mt-2 font-heading text-lg font-semibold">
              We&apos;ll be in touch on WhatsApp
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Our operations team will contact you shortly to confirm pickup.
            </p>
          </div>
        ) : (
          <PublicBookingForm onSubmit={handleSubmit} />
        )}
      </TabsContent>
    </Tabs>
  )
}
