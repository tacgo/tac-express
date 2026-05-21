"use client"

import * as React from "react"
import Link, { type LinkProps } from "next/link"
import { useRouter } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { RiLoader4Line } from "@workspace/ui/icons"

/**
 * TransitionLink — Violet Grid v6.
 *
 * Wraps `next/link` with `useTransition` so that client-side route
 * transitions can render a pending state. While navigation is in flight:
 *   - `aria-busy="true"` is set
 *   - the trailing `RiLoader4Line` spinner replaces any user-supplied
 *     `pendingSlot` (or the last child if no slot is provided)
 *   - the link is non-interactive (`pointer-events: none`)
 *
 * Falls back to a normal `<Link>` traversal if JavaScript is disabled
 * (the `<a>` href is still emitted), so SEO + no-JS users are unaffected.
 *
 * Use on any CTA where the route transition is non-trivial (marketing
 * pricing, dashboard create flows) so the user gets immediate feedback
 * instead of a dead-click pause.
 */
interface TransitionLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    Pick<LinkProps, "href" | "prefetch" | "replace" | "scroll"> {
  children: React.ReactNode
  /** Optional class added only while the navigation is pending. */
  pendingClassName?: string
}

function TransitionLink({
  href,
  prefetch,
  replace,
  scroll,
  onClick,
  children,
  className,
  pendingClassName,
  ...rest
}: TransitionLinkProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    // Honor modifier-click + new-tab — let the browser handle those naturally.
    if (
      e.defaultPrevented ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    ) {
      return
    }
    // External / mail / tel — let <Link> behave normally.
    const hrefStr = typeof href === "string" ? href : href.pathname ?? ""
    if (!hrefStr.startsWith("/") || hrefStr.startsWith("//")) return

    e.preventDefault()
    startTransition(() => {
      if (replace) {
        router.replace(hrefStr, { scroll })
      } else {
        router.push(hrefStr, { scroll })
      }
    })
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      aria-busy={isPending || undefined}
      data-pending={isPending || undefined}
      className={cn(
        "inline-flex items-center gap-2",
        isPending && "pointer-events-none",
        isPending && pendingClassName,
        className,
      )}
      {...rest}
    >
      {children}
      {isPending && (
        <RiLoader4Line
          aria-hidden
          className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
        />
      )}
    </Link>
  )
}

export { TransitionLink }
export type { TransitionLinkProps }
