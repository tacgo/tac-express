"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiUserLine, RiLogoutBoxRLine, RiSettingsLine } from "@workspace/ui/icons"
import { useSession } from "@workspace/ui/hooks/use-session"
import { cn } from "@workspace/ui/lib/utils"

function UserMenu() {
  const { user, isLoading, signOut } = useSession()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    router.push("/sign-in")
    router.refresh()
  }

  if (isLoading) {
    return <div className="h-7 w-7 bg-muted animate-pulse" />
  }

  const initial = user?.email?.[0]?.toUpperCase()

  return (
    <div data-slot="user-menu" ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center bg-primary text-primary-foreground t-mono font-semibold hover:bg-primary/85 transition-colors"
        aria-label="User menu"
        aria-expanded={open}
      >
        {initial ?? <RiUserLine className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-60 bg-card border border-border shadow-md z-50">
          {/* Account info */}
          <div className="px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground t-mono font-semibold">
                {initial ?? <RiUserLine className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="t-body-sm font-medium text-foreground truncate">
                  {user?.email?.split("@")[0] ?? "Operator"}
                </p>
                <p className="t-mono-sm text-muted-foreground truncate">
                  {user?.email ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); router.push("/settings") }}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2",
                "t-body-sm text-muted-foreground",
                "hover:text-foreground hover:bg-muted/60 transition-colors"
              )}
            >
              <RiSettingsLine className="h-4 w-4 shrink-0" aria-hidden="true" />
              Settings
            </button>

            <div className="my-1 border-t border-border" />

            <button
              onClick={handleSignOut}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2",
                "t-body-sm text-accent-danger",
                "hover:bg-accent-danger/10 transition-colors"
              )}
            >
              <RiLogoutBoxRLine className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export { UserMenu }
