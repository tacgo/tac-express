"use client"

import { useRouter } from "next/navigation"
import { RiUserLine, RiLogoutBoxRLine, RiSettingsLine } from "@workspace/ui/icons"
import { useSession } from "@workspace/ui/hooks/use-session"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/primitives/dropdown-menu"

function UserMenu() {
  const { user, isLoading, signOut } = useSession()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
    router.refresh()
  }

  if (isLoading) {
    return <div className="h-7 w-7 bg-muted animate-pulse" />
  }

  const initial = user?.email?.[0]?.toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot="user-menu"
          aria-label="User menu"
          className="size-7 rounded-none bg-primary p-0 t-mono font-semibold text-primary-foreground hover:bg-primary/85"
        >
          {initial ?? <RiUserLine className="h-3.5 w-3.5" aria-hidden="true" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground t-mono font-semibold">
              {initial ?? <RiUserLine className="h-4 w-4" aria-hidden="true" />}
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
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <RiSettingsLine className="h-4 w-4 shrink-0" aria-hidden="true" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-accent-danger focus:bg-accent-danger/10 focus:text-accent-danger"
        >
          <RiLogoutBoxRLine className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { UserMenu }
