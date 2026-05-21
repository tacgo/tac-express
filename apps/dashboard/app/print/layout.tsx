// Borderless print layout — no sidebar, no header, no chrome.
// Each print route renders a `<PrintButton>` to hand off to the browser print
// dialog with a tightly-scoped @page size. The print iframe captures only
// `[data-print-target]`, so anything outside it is ignored.

import "@workspace/ui/globals.css"

export const metadata = {
  title: "TAC Express — Print",
  robots: { index: false, follow: false },
}

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      {children}
    </div>
  )
}
