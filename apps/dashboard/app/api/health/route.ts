// Public health endpoint for load balancers + external uptime monitors.
//
// Whitelisted as public in apps/dashboard/proxy.ts (no auth required) so
// uptime checks can probe without a session. The response is intentionally
// minimal — never include schema details, env values, version strings that
// reveal stack info, or anything that could help an attacker fingerprint
// the deployment.
//
// Returns 200 unconditionally if the Next.js runtime is processing
// requests at all. A deeper check (DB roundtrip, Redis ping, etc.) would
// turn this into a dependency-cascade health probe, which we explicitly
// don't want on a load-balancer-facing endpoint — those probes amplify
// outages by removing healthy instances when a downstream blips.

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET() {
  return NextResponse.json(
    { ok: true, ts: new Date().toISOString() },
    {
      status: 200,
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    }
  )
}
