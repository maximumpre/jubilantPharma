/**
 * Local QA bypass for geo and SteinsGate.
 * Never honored on Vercel production — even if ALLOW_LOCAL_TESTING is set there by mistake.
 *
 * TWO EXPORTS, TWO DIFFERENT CALLERS:
 *   `isLocalhostHost` — a pure, client-safe hostname predicate. The Astro landing
 *     island (astro-src/components/landing-shell.tsx) calls it in the browser,
 *     where there is no `process.env` and no request to read a host header from.
 *     It therefore MUST stay pure: touching `process.env` here would throw in the
 *     island and silently disable the local bypass.
 *
 *   `isLocalTestingUnlocked` — the server-side gate used by middleware, API
 *     routes and `protected-layout`. It strictly reads ALLOW_LOCAL_TESTING from process.env
 *     (which Next.js loads from .env.local) and requires strictly "true" (case-insensitive).
 *     Any other value or missing key evaluates to false.
 */

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

export function isLocalhostHost(host: string | null | undefined): boolean {
  if (!host) return false
  const hostname = host.split(":")[0]?.toLowerCase()
  if (!hostname) return false
  return LOCALHOST_HOSTS.has(hostname) || hostname.endsWith(".localhost")
}

export function isLocalTestingUnlocked(): boolean {
  if (process.env.VERCEL_ENV === "production") {
    return false
  }

  const value = process.env.ALLOW_LOCAL_TESTING?.trim().toLowerCase()
  return value === "true"
}
