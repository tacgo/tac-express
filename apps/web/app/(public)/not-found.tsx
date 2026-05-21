import Link from "next/link"
import { RiHome2Line } from "@workspace/ui/icons"

export default function NotFound() {
  return (
    <div className="flex min-h-hero-vh items-center justify-center px-6 py-24">
      <div className="tac-fui-panel relative max-w-md p-10 text-center">
        <span aria-hidden className="pointer-events-none absolute top-2 left-2 size-3 border-t-2 border-l-2 border-primary" />
        <span aria-hidden className="pointer-events-none absolute top-2 right-2 size-3 border-t-2 border-r-2 border-primary" />
        <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-primary" />
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-primary" />

        <p className="font-mono text-5xl text-primary">404</p>
        <h1 className="mt-4 text-2xl font-bold">Route not in our manifest.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you requested isn&apos;t on the network. Check the URL or head back to base.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 border-2 border-primary bg-primary px-4 py-2 font-medium text-primary-foreground tac-fui-hover"
        >
          <RiHome2Line className="size-4" aria-hidden="true" />
          Return to landing
        </Link>
      </div>
    </div>
  )
}
