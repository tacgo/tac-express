import { redirect } from "next/navigation"

export default function DashboardPage() {
  const url = process.env.NEXT_PUBLIC_DASHBOARD_URL
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_DASHBOARD_URL must be set in production")
    }
    redirect("http://localhost:3001")
  }
  redirect(url)
}
