import type { Metadata } from "next"

import { OpsShell } from "@workspace/ui/components/composed/ops-console"
import { CommandPalette } from "@workspace/ui/components/composed/command-palette"

import { IdleGuard } from "@/components/idle-guard"
import { SessionGuard } from "@/components/session-guard"

export const metadata: Metadata = {
  title: "TAC Express — Ops Console",
  description:
    "Hub operations console — warm-paper terminal aesthetic. Implementation of the Anthropic Design handoff bundle (May 2026).",
}

/**
 * Ops Console layout — the single authenticated shell for the dashboard
 * app. The legacy v6 `(dashboard)` group was deleted in the single-shell
 * migration (May 2026); this layout now owns:
 *
 *   - Visual chrome — OpsShell renders sidebar, topbar, and the
 *     `.ops-console` token scope.
 *   - Session lifecycle — SessionGuard turns Supabase SIGNED_OUT into
 *     an explicit /sign-in redirect.
 *   - Idle-timeout — IdleGuard surfaces the warning + forced logout
 *     dialog after the role-derived idle threshold.
 *   - Command palette — CommandPalette responds to ⌘K from anywhere
 *     inside the shell.
 *
 * Source: .design-bundle (Anthropic Design handoff, May 2026).
 */
export default function OpsConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OpsShell>
      <CommandPalette />
      <SessionGuard />
      <IdleGuard />
      {children}
    </OpsShell>
  )
}
