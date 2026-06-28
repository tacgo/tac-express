import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <p className="font-mono text-6xl font-bold text-border">404</p>
        <h2 className="font-mono text-xl font-bold tracking-widest text-primary uppercase">
          Page not found
        </h2>
        <p className="font-mono text-sm tracking-wider text-muted-foreground uppercase">
          The route you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button
          asChild
          className="h-8 px-4 font-mono text-xs tracking-wider uppercase"
        >
          <Link href="/ops-console">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
