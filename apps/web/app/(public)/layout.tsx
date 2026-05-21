import * as React from "react"
import { PublicNav } from "@workspace/ui/components/composed/public-nav"
import { Footer } from "@workspace/ui/components/composed/footer"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
