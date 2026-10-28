import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"
import { readRiskCookie } from "@/lib/bot-risk/cookie"
import { applyNavProofCookie } from "@/lib/bot-risk/proof-cookies"
import { isMitigationBand } from "@/lib/bot-risk/score"
import { notifyBotCrawlIfNeeded } from "@/lib/bot-verification/bot-crawl-middleware"
import { isDeniedBotUserAgent } from "@/lib/bot-verification/denied-bots"
import { evaluateOriginRequestGate } from "@/lib/bot-verification/origin-request-gate"
import {
  isAppleCrawlerUA,
  isBaiduCrawlerUA,
  isBingCrawlerUA,
  isCrawlerSeoPageUA,
  isDuckDuckCrawlerUA,
  isGoogleCrawlerUA,
  isSearchCrawlerUA,
  isYahooCrawlerUA,
} from "@/lib/bot-detection"
import { isAllowedSearchOrBacklinkReferrer } from "@/lib/allowed-referrer"
import { isCrawlerSeoPreviewUnlocked } from "@/lib/crawler-seo-preview"
import { CRAWLER_PATTERN } from "@/lib/crawler-ua"
import { buildErrorScreenHtml } from "@/lib/error-screen-html"
import { getRequestCountryCode } from "@/lib/edge-geo"
import { GEO_US_ONLY_HEADER } from "@/lib/geo-us-header"
import { LANDING_ACCESS_COOKIE } from "@/lib/landing-access-cookie"
import { isLocalTestingUnlocked } from "@/lib/local-testing"
import { isSeoCrawlerPath } from "@/lib/seo-crawler-paths"
import { isUngatedSeoPath } from "@/lib/seo-public-paths"
import { SITE_HOMEPAGE_CANONICAL, SITE_URL } from "@/lib/site-url"
import { isYandexVerificationPath } from "@/lib/yandex-verification"
import { isTrustedCrawlerUserAgent } from "@/utils/botDetection"

/** `/` is served by Astro. Both variants are pre-built into public/. */
const ASTRO_LANDING_HTML = "/index.html"
const ASTRO_CRAWLER_HTML = "/crawler-seo.html"

/**
 * Marker appended when the incoming pathname already equals the rewrite target
 * (e.g. a direct GET of /index.html). Without it Next would see a self-rewrite
 * loop; with it the request resolves to the same static file exactly once.
 */
const ASTRO_VARIANT_MARKER = "astroVariant"

// IndexNow key files (/{32-hex}.txt) are allowed via isUngatedSeoPath().

/** Public assets — must not be blocked by geo or bot rules. */
const PUBLIC_BRAND_ASSETS = new Set([
  "/error-icon.png",
  "/favicon.ico",
  "/favicon.png",
  "/icon-48x48.png",
  "/icon-32x32.png",
  "/apple-touch-icon.png",
  "/og-image.png",
])

/**
 * Single place that stamps search-crawler request headers.
 * Always pass the returned Headers into nextWithHeaders — never rebuild from request.headers.
 * @see SEO_CRAWLER_RULES.md — HARD RULES: crawler header integrity
 */
function applySearchCrawlerHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers)
  const ua = request.headers.get("user-agent") ?? ""
  const { pathname } = request.nextUrl

  requestHeaders.set("x-pathname", pathname)

  // Denied bots never get crawler SEO stamps (even if UA contains "bot").
  if (isDeniedBotUserAgent(ua)) {
    return requestHeaders
  }

  if (isSearchCrawlerUA(ua)) {
    requestHeaders.set("x-is-search-crawler", "1")
    if (isGoogleCrawlerUA(ua)) requestHeaders.set("x-is-googlebot", "1")
    if (isBingCrawlerUA(ua)) requestHeaders.set("x-is-bingbot", "1")
    if (isDuckDuckCrawlerUA(ua)) requestHeaders.set("x-is-duckduckbot", "1")
    if (isYahooCrawlerUA(ua)) requestHeaders.set("x-is-yahoobot", "1")
    if (isAppleCrawlerUA(ua)) requestHeaders.set("x-is-applebot", "1")
    if (isBaiduCrawlerUA(ua)) requestHeaders.set("x-is-baiduspider", "1")
  }

  // Ranking ∪ social ∪ discovery → CrawlerSeoPage on SEO paths
  if (isCrawlerSeoPageUA(ua) && isSeoCrawlerPath(pathname)) {
    requestHeaders.set("x-crawler-seo-page", "1")
  }

  return requestHeaders
}

/** Only HTML next() helper — preserves crawler headers + RSC cookie bridge + Astro rewrite. */
function nextWithHeaders(requestHeaders: Headers, request?: NextRequest): NextResponse {
  const pathname = requestHeaders.get("x-pathname") ?? ""
  const isCrawlerVariant =
    requestHeaders.get("x-crawler-seo-page") === "1" || isCrawlerSeoPreviewUnlocked()
  // `/` plus the two pre-built files are ONE logical landing entry. All three are
  // gated above (origin → bot → risk → geo) and must resolve through the same
  // variant picker, otherwise `GET /index.html` is an ungated side door to the
  // human landing. See config.matcher — these paths are deliberately NOT excluded.
  const isAstroLandingEntry =
    pathname === "/" || pathname === ASTRO_LANDING_HTML || pathname === ASTRO_CRAWLER_HTML
  // Requesting /crawler-seo.html explicitly IS the crawler intent — never answer
  // it with the human landing. (/index.html is always the human variant.)
  const wantsCrawlerVariant = isCrawlerVariant || pathname === ASTRO_CRAWLER_HTML
  const astroFile = wantsCrawlerVariant ? ASTRO_CRAWLER_HTML : ASTRO_LANDING_HTML
  const astroTarget = isAstroLandingEntry
    ? pathname === astroFile
      ? `${astroFile}?${ASTRO_VARIANT_MARKER}=1`
      : astroFile
    : null

  // SSR human cloak: no allowed Referer + no grant cookie → ErrorScreen (no login flash).
  // Crawlers, local testing, and post-grant funnel reloads skip this.
  if (
    request &&
    isAstroLandingEntry &&
    !wantsCrawlerVariant &&
    !isLocalTestingUnlocked()
  ) {
    const hasGrant = request.cookies.get(LANDING_ACCESS_COOKIE)?.value === "1"
    const referer = request.headers.get("referer") ?? request.headers.get("referrer") ?? ""
    const pageOrigin = request.nextUrl.origin
    if (!hasGrant && !isAllowedSearchOrBacklinkReferrer(referer, pageOrigin)) {
      return deniedBotErrorResponse(request)
    }
  }

  const response =
    astroTarget && request
      ? NextResponse.rewrite(new URL(astroTarget, request.nextUrl))
      : NextResponse.next({ request: { headers: requestHeaders } })

  if (requestHeaders.get("x-crawler-seo-page") === "1" || wantsCrawlerVariant) {
    response.headers.set("x-crawler-seo-page", "1")
    response.headers.set("Link", `<${SITE_HOMEPAGE_CANONICAL}>; rel="canonical"`)
    response.cookies.set("x-crawler-seo-page", "1", {
      httpOnly: true,
      path: "/",
      maxAge: 60,
      sameSite: "lax",
    })
  }

  if (isAstroLandingEntry) {
    // The Astro island cannot read request headers, so mirror the two signals
    // ProtectedLayout used to compute server-side into short-lived cookies.
    // NOT httpOnly: the island reads these through document.cookie.
    const userAgent = requestHeaders.get("user-agent") ?? ""
    response.cookies.set("landing_bot", CRAWLER_PATTERN.test(userAgent) ? "1" : "0", {
      httpOnly: false,
      path: "/",
      maxAge: 60,
      sameSite: "lax",
    })
    response.cookies.set(
      "landing_geo",
      requestHeaders.get(GEO_US_ONLY_HEADER) ?? "unknown",
      { httpOnly: false, path: "/", maxAge: 60, sameSite: "lax" },
    )
    response.cookies.set("landing_local_testing", isLocalTestingUnlocked() ? "1" : "0", {
      httpOnly: false,
      path: "/",
      maxAge: 60,
      sameSite: "lax",
    })
  }

  if (
    request &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/_astro")
  ) {
    applyNavProofCookie(response)
  }
  return response
}

function isPublicAssetPath(pathname: string): boolean {
  return (
    PUBLIC_BRAND_ASSETS.has(pathname) ||
    pathname.startsWith("/styles/") ||
    pathname.startsWith("/scraped/") ||
    pathname.startsWith("/_astro/")
  )
}

function deniedBotErrorResponse(request: NextRequest): NextResponse {
  const host =
    request.headers.get("host")?.split(":")[0] ||
    (() => {
      try {
        return new URL(SITE_URL).hostname
      } catch {
        return "this site"
      }
    })()

  return new NextResponse(buildErrorScreenHtml(host), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

function originRateLimitResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }
  return deniedBotErrorResponse(request)
}

async function handleOriginGateIfNeeded(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const decision = await evaluateOriginRequestGate(request)

  if (decision.action === "allow") return null

  if (decision.action === "rate_limit") {
    return originRateLimitResponse(request)
  }

  // Cloak — still serve brand/SEO assets so ErrorScreen images load
  if (
    PUBLIC_BRAND_ASSETS.has(pathname) ||
    pathname === "/error-icon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    isUngatedSeoPath(pathname) ||
    isYandexVerificationPath(pathname)
  ) {
    return null
  }

  return deniedBotErrorResponse(request)
}

function handleGeoRegionRedirectIfNeeded(
  request: NextRequest,
  requestHeaders: Headers,
): NextResponse | null {
  const { pathname } = request.nextUrl

  if (pathname === "/geo-restricted" || pathname.startsWith("/geo-restricted/")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    const res = NextResponse.redirect(url)
    res.cookies.set("geo_us_block", "1", { path: "/", maxAge: 120, sameSite: "lax" })
    return res
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return null
  }
  if (
    PUBLIC_BRAND_ASSETS.has(pathname) ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    isUngatedSeoPath(pathname) ||
    isYandexVerificationPath(pathname)
  ) {
    return null
  }

  const userAgent = request.headers.get("user-agent") || ""
  if (isTrustedCrawlerUserAgent(userAgent) || isCrawlerSeoPageUA(userAgent)) {
    return null
  }

  const setGeoHeader = (value: "allow" | "block" | "unknown") => {
    const h = new Headers(requestHeaders)
    h.set(GEO_US_ONLY_HEADER, value)
    return nextWithHeaders(h, request)
  }

  if (request.cookies.get("geo_us_block")?.value === "1") {
    const h = new Headers(requestHeaders)
    h.set(GEO_US_ONLY_HEADER, "block")
    const res = nextWithHeaders(h, request)
    res.cookies.delete("geo_us_block")
    return res
  }

  const country = getRequestCountryCode(request)

  if (country && country !== "US") {
    return setGeoHeader("block")
  }

  if (!country) {
    return setGeoHeader("unknown")
  }

  return setGeoHeader("allow")
}

const STRICT_BLOCKED_BOT_PATTERNS = [
  /curl/i,
  /wget/i,
  /httpclient/i,
  /python-requests/i,
  /axios/i,
  /okhttp/i,
  /libwww-perl/i,
  /go-http-client/i,
  /\bjava\b/i,
  /\bphp\b/i,
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /phantomjs/i,
  /selenium/i,
]

const SOFT_BLOCKED_BOT_PATTERNS = [/bot/i, /crawler/i, /spider/i, /scraper/i]

async function handleBotIfNeeded(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get("user-agent") || ""

  if (!userAgent) {
    if (
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml" ||
      PUBLIC_BRAND_ASSETS.has(pathname) ||
      isUngatedSeoPath(pathname) ||
      isYandexVerificationPath(pathname) ||
      pathname.startsWith("/api/bot-fingerprint") ||
      pathname.startsWith("/api/bot-honeypot") ||
      pathname.startsWith("/_next")
    ) {
      return nextWithHeaders(requestHeaders, request)
    }
    if (pathname.startsWith("/api")) {
      return new NextResponse("Forbidden", { status: 403 })
    }
    return deniedBotErrorResponse(request)
  }

  // Competitive SEO + security scanners → SSR ErrorScreen (no JS / no login HTML)
  // Ungated SEO + brand assets stay reachable for any client (incl. denied bots).
  if (isDeniedBotUserAgent(userAgent)) {
    if (
      PUBLIC_BRAND_ASSETS.has(pathname) ||
      pathname === "/error-icon.png" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml" ||
      isUngatedSeoPath(pathname) ||
      isYandexVerificationPath(pathname)
    ) {
      return nextWithHeaders(requestHeaders, request)
    }
    return deniedBotErrorResponse(request)
  }

  const strictMatch = STRICT_BLOCKED_BOT_PATTERNS.some((p) => p.test(userAgent))
  const softMatch = SOFT_BLOCKED_BOT_PATTERNS.some((p) => p.test(userAgent))

  if (!strictMatch && !softMatch) {
    return null
  }

  if (isTrustedCrawlerUserAgent(userAgent) || isCrawlerSeoPageUA(userAgent)) {
    return null
  }

  // robots/sitemap/brand assets must stay reachable for any client (not ErrorScreen HTML)
  if (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_BRAND_ASSETS.has(pathname) ||
    isUngatedSeoPath(pathname) ||
    isYandexVerificationPath(pathname)
  ) {
    return nextWithHeaders(requestHeaders, request)
  }

  // Soft + strict unknown bots on HTML: cloak — no human login HTML
  if (softMatch || strictMatch) {
    return deniedBotErrorResponse(request)
  }

  return null
}

function handleRiskCookieIfNeeded(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  if (pathname.startsWith("/api/bot-fingerprint")) return null
  if (pathname.startsWith("/api/bot-honeypot")) return null
  if (pathname.startsWith("/api/telegram")) return null
  if (pathname.startsWith("/_next") || pathname.startsWith("/_astro")) return null
  if (PUBLIC_BRAND_ASSETS.has(pathname)) return null
  if (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    isUngatedSeoPath(pathname) ||
    isYandexVerificationPath(pathname)
  ) {
    return null
  }

  const userAgent = request.headers.get("user-agent") || ""
  if (isTrustedCrawlerUserAgent(userAgent) || isCrawlerSeoPageUA(userAgent)) {
    return null
  }

  const risk = readRiskCookie(request)
  if (!risk || !isMitigationBand(risk.band)) return null

  if (pathname.startsWith("/api")) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  return deniedBotErrorResponse(request)
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl
  const requestHeaders = applySearchCrawlerHeaders(request)

  if (!isLocalTestingUnlocked()) {
    notifyBotCrawlIfNeeded(request, event)
  }

  // Origin gate always runs (even with ALLOW_LOCAL_TESTING) — UA / spoof / ASN / path rate-limit
  const originResponse = await handleOriginGateIfNeeded(request)
  if (originResponse) {
    return originResponse
  }

  // Soft/strict/denied UA cloaking always runs — ALLOW_LOCAL_TESTING unlocks
  // human SteinsGate/geo only, never scraper HTML delivery.
  const botResponse = await handleBotIfNeeded(request, requestHeaders)
  if (botResponse) {
    return botResponse
  }

  if (isLocalTestingUnlocked()) {
    return nextWithHeaders(requestHeaders, request)
  }

  // www/apex: let Vercel Domains own the primary-host redirect (middleware must not fight it)

  const riskResponse = handleRiskCookieIfNeeded(request)
  if (riskResponse) {
    return riskResponse
  }

  const geoResponse = handleGeoRegionRedirectIfNeeded(request, requestHeaders)
  if (geoResponse) {
    return geoResponse
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    isPublicAssetPath(pathname) ||
    isYandexVerificationPath(pathname)
  ) {
    return nextWithHeaders(requestHeaders, request)
  }

  return nextWithHeaders(requestHeaders, request)
}

export const config = {
  matcher: [
    // If using a custom OG filename (not /og-image.png), add it to SEO_ALLOWED_PATHS,
    // PUBLIC_BRAND_ASSETS, and this negative-lookahead (same basename as in public/).
    // Do NOT exclude index.html / crawler-seo.html — they are gated landing entries.
    "/((?!_next/static|_next/image|error-icon\\.png|favicon\\.ico|favicon\\.png|icon-48x48\\.png|icon-32x32\\.png|apple-touch-icon\\.png|og-image\\.png|styles/|scraped/|_astro/|yandex_[0-9a-f]+\\.html).*)",
  ],
}
