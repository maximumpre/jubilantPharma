/**
 * Jubilant Pharma member site — production identity (Step 6).
 *
 * SITE_ORIGIN matches Vercel Domains primary host (www → HTTP 200).
 * Operator paste: jubilantpharmabenefits.com → normalized https + www primary.
 */

/** Display name for notifications and metadata. */
export const SITE_DISPLAY_NAME = "Jubilant Pharma" as const

/**
 * Canonical origin (no trailing slash).
 * Must be the www primary host — not a 308-redirecting apex.
 */
export const SITE_ORIGIN = "https://www.jubilantpharmabenefits.com" as const

/** @deprecated Use SITE_ORIGIN — kept for middleware host redirect imports. */
export const SITE_URL = SITE_ORIGIN

/** Homepage canonical + sitemap entry (trailing slash). */
export const SITE_HOMEPAGE_CANONICAL = `${SITE_ORIGIN}/` as const

export const SITE_SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml` as const

export const CANONICAL_HOST = new URL(SITE_ORIGIN).hostname

/**
 * Bump when homepage SEO copy changes materially.
 * Feeds `app/sitemap.ts` lastmod.
 */
export const SITE_CONTENT_UPDATED_AT = "2026-10-27T00:00:00.000Z" as const

/** IndexNow verification key (hosted at /{INDEXNOW_KEY}.txt). */
export const INDEXNOW_KEY =
  (typeof process !== "undefined" ? process.env.INDEXNOW_KEY?.trim() : undefined) ??
  "9a4c549d0ac04b0a99aab0fac49e3d9e"

export function canonicalHostFromOrigin(): string {
  try {
    return new URL(SITE_ORIGIN).hostname
  } catch {
    return "localhost"
  }
}

export function canonicalUrlForPath(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`
  if (path === "/") return SITE_HOMEPAGE_CANONICAL
  return `${SITE_ORIGIN}${path}`
}

export type SitePlatform = "alight" | "wealthcare" | "other"

/** Aptia365 / WealthCare family. */
export const SITE_PLATFORM: SitePlatform | undefined = "wealthcare"

export function detectSitePlatform(): SitePlatform {
  if (SITE_PLATFORM) return SITE_PLATFORM
  const host = new URL(SITE_ORIGIN).hostname.toLowerCase()
  const label = SITE_DISPLAY_NAME.toLowerCase()
  if (/wealthcare|aptia365|flores247|flores/i.test(host + label)) return "wealthcare"
  if (/alight|worklife|work-life|workife/i.test(host + label)) return "alight"
  return "other"
}

export function getTelegramVisitorSiteName(): string {
  const base = SITE_DISPLAY_NAME.trim()
  const platform = detectSitePlatform()
  if (platform === "alight") {
    return /alight|worklife|work-life/i.test(base) ? base : `${base} Alight`
  }
  if (platform === "wealthcare") {
    return /wealthcare/i.test(base) ? base : `${base} Wealthcare`
  }
  return base
}

/** Social preview image — header/login logo composite (generate-og-image.py). */
export const SOCIAL_PREVIEW_IMAGE = "/og-image.png" as const

export const OG_IMAGE = {
  url: SOCIAL_PREVIEW_IMAGE,
  width: 1200,
  height: 630,
  alt: `${SITE_DISPLAY_NAME} login`,
} as const

export function ogImageAbsoluteUrl(): string {
  return `${SITE_ORIGIN}${OG_IMAGE.url}`
}
