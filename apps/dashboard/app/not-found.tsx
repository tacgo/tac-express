import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="font-mono text-6xl font-bold text-border">404</p>
        <h2 className="text-xl font-mono uppercase tracking-widest font-bold text-primary">
          Page not found
        </h2>
        <p className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
          The route you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="font-mono text-xs uppercase tracking-wider h-8 px-4">
          <Link href="/ops-console">
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
