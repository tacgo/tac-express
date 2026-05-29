// Supabase Edge Function: send-notification
// Inserts an in-app notification and dispatches to email (Resend), SMS (Twilio),
// or push (FCM) depending on payload.channel.
//
// Body shape:
//   { user_id?, channel: 'in_app'|'email'|'sms'|'push',
//     title, body, link?, entity_type?, entity_id?,
//     to_email?, to_phone? }

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? ""
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? ""
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") ?? ""
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? ""
const FROM_EMAIL = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "no-reply@tacexpress.in"

interface NotificationPayload {
  user_id?: string
  channel?: string
  title: string
  body: string
  link?: string
  entity_type?: string
  entity_id?: string
  to_email?: string
  to_phone?: string
  fcm_token?: string
}

async function sendEmail(to: string, subject: string, body: string, link?: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — email skipped")
    return
  }
  const html = `
    <div style="font-family:monospace;max-width:600px;margin:0 auto;background:#0a0e1a;color:#e2e8f0;padding:24px;border:1px solid #1e2d4e">
      <p style="color:#4f7cff;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 16px">TAC Express — Notification</p>
      <h1 style="font-size:20px;font-weight:700;margin:0 0 12px">${subject}</h1>
      <p style="color:#94a3b8;margin:0 0 16px">${body}</p>
      ${link ? `<a href="${link}" style="display:inline-block;background:#4f7cff;color:#fff;padding:10px 20px;text-decoration:none;font-size:13px">View Details →</a>` : ""}
      <p style="color:#4a5568;font-size:11px;margin:24px 0 0;border-top:1px solid #1e2d4e;padding-top:12px">
        TAC Express Logistics · You are receiving this because you have an active account.
      </p>
    </div>`

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error ${res.status}: ${err}`)
  }
}

async function sendSMS(to: string, message: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn("Twilio credentials not set — SMS skipped")
    return
  }
  const body = new URLSearchParams({
    From: TWILIO_FROM_NUMBER,
    To: to,
    Body: message,
  })
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Twilio error ${res.status}: ${err}`)
  }
}

async function sendPush(token: string, title: string, body: string, link?: string): Promise<void> {
  if (!FCM_SERVER_KEY) {
    console.warn("FCM_SERVER_KEY not set — push skipped")
    return
  }
  const payload = {
    to: token,
    notification: { title, body },
    data: { link: link ?? "" },
  }
  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${FCM_SERVER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`FCM error ${res.status}: ${err}`)
  }
}

function getJwtRole(req: Request): string | null {
  const auth = req.headers.get("Authorization") ?? ""
  const token = auth.replace(/^Bearer\s+/i, "")
  if (!token) return null
  try {
    const [, payloadB64] = token.split(".")
    const decoded = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof decoded.role === "string" ? decoded.role : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  // Reject anon-key callers. The anon key is bundled in the browser and
  // publicly extractable — without this check any visitor could use this
  // function as a free Resend/Twilio/FCM relay with our credentials.
  // Legitimate callers (contact-lead service) use the service-role client.
  const jwtRole = getJwtRole(req)
  if (jwtRole === "anon") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  }

  let payload: NotificationPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  const { title, body, link, channel = "in_app", to_email, to_phone, fcm_token } = payload

  if (!title || !body) {
    return new Response(JSON.stringify({ error: "title and body are required" }), { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Always persist in-app notification row
  const { error: dbErr } = await supabase.from("notifications").insert({
    user_id: payload.user_id ?? null,
    channel,
    title,
    body,
    link: link ?? null,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
  })
  if (dbErr) {
    return new Response(JSON.stringify({ error: dbErr.message }), { status: 500 })
  }

  // Dispatch to external channel
  const dispatched: string[] = []
  const errors: string[] = []

  try {
    if ((channel === "email" || channel === "all") && to_email) {
      await sendEmail(to_email, title, body, link)
      dispatched.push("email")
    }
  } catch (e) {
    errors.push(`email: ${(e as Error).message}`)
  }

  try {
    if ((channel === "sms" || channel === "all") && to_phone) {
      await sendSMS(to_phone, `${title}: ${body}${link ? ` ${link}` : ""}`)
      dispatched.push("sms")
    }
  } catch (e) {
    errors.push(`sms: ${(e as Error).message}`)
  }

  try {
    if ((channel === "push" || channel === "all") && fcm_token) {
      await sendPush(fcm_token, title, body, link)
      dispatched.push("push")
    }
  } catch (e) {
    errors.push(`push: ${(e as Error).message}`)
  }

  return new Response(
    JSON.stringify({ ok: true, dispatched, errors: errors.length ? errors : undefined }),
    { headers: { "content-type": "application/json" } },
  )
})
