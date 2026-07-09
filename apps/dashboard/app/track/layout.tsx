import Link from "next/link"

import "@workspace/ui/globals.css"

export const metadata = {
  title: "Track · TAC Express",
  description: "Public tracking for TAC Express shipments.",
  robots: { index: false },
}

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/track"
            className="font-heading text-base font-semibold tracking-tight"
          >
            TAC <span className="text-primary">Express</span>
          </Link>
          <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            Public tracking
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
