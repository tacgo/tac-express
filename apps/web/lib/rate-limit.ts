// Edge-compatible rate limiter backed by Upstash Redis.
//
// Mirror of `apps/dashboard/lib/rate-limit.ts`. The two apps are deployed
// independently and run their own middleware proxies, so each ships its
// own rate-limit instance. Both bind against the same Upstash Redis
// (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in env), so
// public-API limits are effectively shared at the Redis layer.
//
// IMPORTANT: When env vars are missing every request is allowed (no-op).
// Local dev stays unblocked; production stays protected.

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

/**
 * Public-API rate limit: sliding window, 60 req / minute / identifier.
 * Used to gate `/track/*` (the public AWB tracking surface) from abuse.
 */
export const publicApiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "ratelimit:public",
    })
  : null

/**
 * Auth-flow rate limit: stricter to deter credential stuffing on `/sign-in`.
 * 10 attempts / minute / identifier.
 */
export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "ratelimit:auth",
    })
  : null

/**
 * Contact-form rate limit: tight bucket to deter bulk-submission spam on
 * /api/contact. 5 submissions / 10 minutes / identifier (IP). Combined with
 * the form's honeypot field and zod validation, this gives three independent
 * lines of defense before a lead row is written.
 */
export const contactFormRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      analytics: true,
      prefix: "ratelimit:contact",
    })
  : null

/**
 * Public AWB lookup rate limit: backs `/api/track/[awb]` (WS-3). More
 * permissive than the contact form because this is a read operation —
 * a legitimate visitor may retry with corrected AWBs a few times before
 * giving up. 30 lookups / minute / identifier covers normal use and still
 * limits abuse.
 */
export const trackLookupRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "ratelimit:track",
    })
  : null

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

const noopResult: RateLimitResult = {
  success: true,
  limit: 0,
  remaining: 0,
  reset: 0,
}

export async function checkPublicApi(identifier: string): Promise<RateLimitResult> {
  if (!publicApiRateLimit) return noopResult
  return publicApiRateLimit.limit(identifier)
}

export async function checkAuth(identifier: string): Promise<RateLimitResult> {
  if (!authRateLimit) return noopResult
  return authRateLimit.limit(identifier)
}

export async function checkContactForm(
  identifier: string,
): Promise<RateLimitResult> {
  if (!contactFormRateLimit) return noopResult
  return contactFormRateLimit.limit(identifier)
}

export async function checkTrackLookup(
  identifier: string,
): Promise<RateLimitResult> {
  if (!trackLookupRateLimit) return noopResult
  return trackLookupRateLimit.limit(identifier)
}
