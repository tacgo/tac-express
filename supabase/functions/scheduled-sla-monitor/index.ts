// Supabase Edge Function: scheduled-sla-monitor
// Runs on a cron schedule. Calls public.detect_sla_breaches() and creates
// in-app notifications + an exception row for each breach not yet flagged.

import { createClient } from "jsr:@supabase/supabase-js@2"
import { reportToSentry } from "../_shared/sentry.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: breaches, error } = await supabase.rpc("detect_sla_breaches", {
    p_lookahead_hours: 0,
  })
  if (error) {
    await reportToSentry(error, "scheduled-sla-monitor")
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let flagged = 0
  for (const breach of breaches ?? []) {
    // Only create exception if there isn't an open one
    const { count } = await supabase
      .from("exceptions")
      .select("*", { count: "exact", head: true })
      .eq("shipment_id", breach.id)
      .eq("type", "delay")
      .in("status", ["open", "investigating"])
    if ((count ?? 0) > 0) continue

    await supabase.from("exceptions").insert({
      shipment_id: breach.id,
      awb_number: breach.awb_number,
      type: "delay",
      severity: breach.hours_overdue > 24 ? "high" : "medium",
      status: "open",
      description: `SLA breached — ${breach.hours_overdue.toFixed(1)} hours past promised delivery`,
      metadata: { source: "sla_monitor", hours_overdue: breach.hours_overdue },
    })
    flagged += 1
  }

  return new Response(JSON.stringify({ checked: breaches?.length ?? 0, flagged }), {
    headers: { "content-type": "application/json" },
  })
})
