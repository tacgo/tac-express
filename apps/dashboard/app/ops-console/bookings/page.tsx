import type { Metadata } from "next"

import { BookingsClient } from "./bookings-client"

export const metadata: Metadata = {
  title: "Bookings · TAC Express",
  description:
    "Public booking requests. Approve, reject, or convert to shipments.",
}

export default function BookingsPage() {
  return <BookingsClient />
}

export const dynamic = "force-dynamic"
