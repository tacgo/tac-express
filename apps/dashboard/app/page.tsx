import { redirect } from "next/navigation"

/**
 * Root `/` — the dashboard surface is `/ops-console`. The legacy v6
 * `(dashboard)` route group that owned this path was deleted in the
 * single-shell migration; this top-level page.tsx preserves the
 * familiar "open the dashboard root" UX by sending visitors to the
 * canonical ops-console URL.
 */
export default function RootPage() {
  redirect("/ops-console")
}
export const dynamic = 'force-dynamic'
