import type { NextRequest } from "next/server"

/**
 * Client IP resolution — TRUSTED HEADERS ONLY.
 *
 * Every value returned here keys a security control (rate limits, the risk
 * store, the crawler-CIDR verification, the geo gate). An attacker who can
 * choose the "client IP" chooses all of them at once.
 *
 * LOOPHOLE (verified 2026-10-02): this used to walk a list that started with
 * `cf-connecting-ip`, then `x-vercel-forwarded-for`, `x-forwarded-for`,
 * `true-client-ip`, `x-real-ip`, `fastly-client-ip`. None of the first, second,
 * fourth or last are set by Vercel, so a client could set them. Rotating
 * `cf-connecting-ip` produced zero rate limiting on `/api/*` (8/8 requests
 * through a 5-req/10s limiter).
 *
 * Rule: only read a header when the proxy that owns it is provably in front of
 * the app. Anything else is attacker input.
 */

/** True when this process is actually running on Vercel. */
function isOnVercel(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV)
}

/**
 * Cloudflare is trusted when:
 * 1. Running on Cloudflare Pages / Workers (env markers CF_PAGES, CF_ACCOUNT_ID).
 * 2. Explicitly configured via CLOUDFLARE_PROXY=1 / BEHIND_CLOUDFLARE=1.
 * 3. On Vercel when the upstream TCP connection is proven to come from Cloudflare
 *    via Vercel's platform-verified ASN header (AS13335 or AS209242) and cf-ray header.
 *    Because Vercel assigns x-vercel-ip-as-number from the BGP/TCP peer, no external
 *    client can forge AS13335 to Vercel. When Cloudflare connects to Vercel,
 *    cf-connecting-ip is guaranteed to have been set by Cloudflare.
 */
function isBehindCloudflare(headers?: Headers): boolean {
  if (
    Boolean(
      process.env.CF_PAGES ||
      process.env.CF_ACCOUNT_ID ||
      process.env.CLOUDFLARE_PROXY === "1" ||
      process.env.BEHIND_CLOUDFLARE === "1",
    )
  ) {
    return true
  }

  if (headers && isOnVercel()) {
    const vercelAsn = headers.get("x-vercel-ip-as-number")?.trim()
    if (vercelAsn) {
      const clean = vercelAsn.replace(/^AS/i, "")
      if ((clean === "13335" || clean === "209242") && headers.has("cf-ray")) {
        return true
      }
    }
  }

  return false
}

/**
 * `x-forwarded-for` is a comma list appended to by each hop. The FIRST entry is
 * the original client, but only when a trusted proxy actually wrote it — on
 * Vercel the client can prepend arbitrary values, so we take the LAST entry
 * there instead (the one Vercel itself appended).
 */
function forwardedFor(header: string, trustFirst: boolean): string {
  const parts = header
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return ""
  return trustFirst ? parts[0] : parts[parts.length - 1]
}

export function getClientIpFromRequest(request: NextRequest): string {
  const h = request.headers

  if (isBehindCloudflare(h)) {
    // Cloudflare terminates TLS and overwrites these on every request.
    const cfIp = h.get("cf-connecting-ip")?.trim()
    if (cfIp) return cfIp
  }

  if (isOnVercel()) {
    // Vercel overwrites x-real-ip on every request.
    const vercelIp = h.get("x-real-ip")?.trim()
    if (vercelIp) return vercelIp

    // Vercel appends to x-forwarded-for; the last entry is the one it wrote.
    const xff = h.get("x-forwarded-for")
    if (xff) {
      const ip = forwardedFor(xff, false)
      if (ip) return ip
    }
  }

  // Self-hosted / local: there is no provable proxy, so fall back to the
  // platform-supplied values only. If you deploy behind a proxy that is NOT
  // Vercel or Cloudflare, set CF_ACCOUNT_ID (or add that proxy's header here) —
  // otherwise every IP below is client-controlled and the rate limits are
  // decorative.
  const withIp = request as NextRequest & { ip?: string | null }
  if (withIp.ip) return String(withIp.ip)

  const realIp = h.get("x-real-ip")?.trim()
  if (realIp) return realIp

  const xff = h.get("x-forwarded-for")
  if (xff) {
    const ip = forwardedFor(xff, false)
    if (ip) return ip
  }

  return ""
}
