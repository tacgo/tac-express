// Supabase Edge Function: dispatch-webhook
// Triggered by Postgres NOTIFY or invoked from server-side after emit_event.
// Loops through public.webhooks subscribed to the event_type and POSTs the payload
// with an HMAC SHA256 signature header.

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

interface DispatchPayload {
  event_id: string
  event_type: string
  entity_type: string
  entity_id: string
  payload: Record<string, unknown>
}

async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }
  const body = (await req.json()) as DispatchPayload
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: webhooks, error } = await supabase
    .from("webhooks")
    .select("id, url, secret, events")
    .eq("is_active", true)
    .contains("events", [body.event_type])

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const requestBody = JSON.stringify(body)

  await Promise.all(
    (webhooks ?? []).map(async (wh) => {
      const signature = await sign(wh.secret, requestBody)
      let succeeded = false
      let status: number | null = null
      let respText: string | null = null
      try {
        const res = await fetch(wh.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-tac-event": body.event_type,
            "x-tac-event-id": body.event_id,
            "x-tac-signature": signature,
          },
          body: requestBody,
        })
        status = res.status
        respText = (await res.text()).slice(0, 1024)
        succeeded = res.ok
      } catch (e) {
        respText = e instanceof Error ? e.message : "fetch error"
      }
      await supabase.from("webhook_deliveries").insert({
        webhook_id: wh.id,
        event_id: body.event_id,
        event_type: body.event_type,
        request_body: body,
        response_status: status,
        response_body: respText,
        attempt: 1,
        succeeded,
        delivered_at: new Date().toISOString(),
      })
      if (succeeded) {
        await supabase
          .from("webhooks")
          .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", wh.id)
      } else {
        await supabase.rpc("increment_webhook_failure", { p_webhook_id: wh.id }).catch(() => {})
        await supabase
          .from("webhooks")
          .update({ last_failure_at: new Date().toISOString() })
          .eq("id", wh.id)
      }
    }),
  )

  return new Response(JSON.stringify({ dispatched: webhooks?.length ?? 0 }), {
    headers: { "content-type": "application/json" },
  })
})
