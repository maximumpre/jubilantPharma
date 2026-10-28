import { NextRequest, NextResponse } from "next/server"
import { getClientIpFromRequest } from "@/lib/client-ip"
import { enrichIpGeo } from "@/lib/ip-geolocation"
import { getReferrerLabelForNotification } from "@/lib/referrer-display"
import { getTelegramVisitorSiteName, SITE_ORIGIN } from "@/lib/site-url"
import { sendVisitorNotification, type VisitorTelegramData } from "@/lib/telegram"
import { parseVisitorInfo, type VisitorClientHints } from "@/lib/parse-visitor-os"
import { parseSearchReferrer } from "@/lib/search-referrer"
import { sendSeoVisitNotification } from "@/lib/telegram-seo-admin"
import { formatVisitorLocalTime, formatVisitorUtcTime } from "@/lib/visitor-times"
import { isMitigationBand } from "@/lib/bot-risk/score"
import { resolveRequestRisk } from "@/lib/bot-risk/resolve"
import { isLikelyBotUserAgent } from "@/utils/botDetection"

type ClientBody = {
  userAgent?: string
  /** Client Hints model when available (Chromium `userAgentData.model`) */
  uaModel?: string
  screen?: string
  language?: string
  referrer?: string
  pageUrl?: string
}

const UNKNOWN = "Unknown"

function joinLocation(parts: Array<string | null | undefined>): string {
  const values = parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter((part) => part.length > 0)

  return values.length > 0 ? values.join(", ") : UNKNOWN
}

function getCountryName(countryCode: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || countryCode
  } catch {
    return countryCode
  }
}

function getHeaderGeoData(request: NextRequest) {
  const countryCode = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() || null
  const countryName = countryCode ? getCountryName(countryCode) : null
  const region = request.headers.get("x-vercel-ip-country-region")?.trim() || null
  const city = request.headers.get("x-vercel-ip-city")?.trim() || null
  const timezone = request.headers.get("x-vercel-ip-timezone")?.trim() || null

  return {
    location: joinLocation([city, region, countryName]),
    timezone: timezone || UNKNOWN,
    countryCode,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClientBody
    const ua = body.userAgent ?? ""
    const uaModel =
      body.uaModel?.trim() ||
      request.headers.get("sec-ch-ua-model")?.replace(/^"|"$/g, "").trim() ||
      undefined

    if (isLikelyBotUserAgent(ua)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "bot" })
    }

    const risk = await resolveRequestRisk(request)
    if (isMitigationBand(risk.band)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "risk" })
    }

    const clientIp = getClientIpFromRequest(request)
    const headerGeo = getHeaderGeoData(request)
    // Enrich before ops Telegram so ISP / location / ASN are real when available.
    const geo = await enrichIpGeo(clientIp)

    const mergedCountryCode = headerGeo.countryCode || geo.countryCode
    const mergedLocation =
      headerGeo.location !== UNKNOWN ? headerGeo.location : geo.location
    const mergedTimezone =
      headerGeo.timezone !== UNKNOWN ? headerGeo.timezone : geo.timezone

    const rawReferrer = body.referrer?.trim() || "Direct"
    const referrerLabel = getReferrerLabelForNotification(rawReferrer)
    const pageUrlRaw = body.pageUrl?.trim()
    const pageUrl =
      pageUrlRaw && /^https?:\/\//i.test(pageUrlRaw) ? pageUrlRaw : SITE_ORIGIN

    const now = new Date()
    const tz = (mergedTimezone || "UTC").trim() || "UTC"
    const localTime = formatVisitorLocalTime(now, tz)
    const utcTime = formatVisitorUtcTime(now)

    const siteName = getTelegramVisitorSiteName()

    const secChUaMobile = request.headers.get("sec-ch-ua-mobile")
    const secChUaPlatform = request.headers.get("sec-ch-ua-platform")
    const secChUaPlatformVersion = request.headers.get("sec-ch-ua-platform-version")
    const secChUaModel = request.headers.get("sec-ch-ua-model")

    const clientHints: VisitorClientHints = {
      mobile: secChUaMobile ? secChUaMobile.includes("?1") : undefined,
      platform: secChUaPlatform ? secChUaPlatform.replace(/["']/g, "").trim() : undefined,
      platformVersion: secChUaPlatformVersion ? secChUaPlatformVersion.replace(/["']/g, "").trim() : undefined,
      model: uaModel || (secChUaModel ? secChUaModel.replace(/["']/g, "").trim() : undefined),
      screen: body.screen,
    }

    const detected = parseVisitorInfo(ua, clientHints)
    const payload: VisitorTelegramData = {
      siteName,
      location:
        mergedLocation !== UNKNOWN
          ? mergedLocation
          : mergedCountryCode
            ? getCountryName(mergedCountryCode)
            : UNKNOWN,
      ip: clientIp || geo.ip || UNKNOWN,
      timezone: mergedTimezone || UNKNOWN,
      isp: geo.isp || UNKNOWN,
      asn: geo.asn ?? null,
      org: geo.org ?? null,
      platformLabel: detected.platformLabel,
      browserLabel: detected.browserLabel,
      deviceLabel: detected.deviceLabel,
      osLabel: detected.platformLabel,
      userAgent: ua || UNKNOWN,
      screen: body.screen ?? UNKNOWN,
      language: body.language ?? UNKNOWN,
      referrer: referrerLabel,
      pageUrl,
      localTime,
      utcTime,
    }

    const telegramSent = await sendVisitorNotification(payload)

    const parsedReferrer = parseSearchReferrer(rawReferrer)
    const siteUrlForSeo = SITE_ORIGIN

    let seoTelegramSent = false
    if (parsedReferrer.isSearchEngine) {
      try {
        seoTelegramSent = await sendSeoVisitNotification({
          siteName,
          siteUrl: siteUrlForSeo,
          searchEngineLabel: parsedReferrer.searchEngineLabel,
          referrerRaw: rawReferrer,
          pageUrl,
          location: payload.location,
          localTime: payload.localTime,
          ip: payload.ip,
          isp: payload.isp,
          asn: payload.asn,
          org: payload.org,
        })
      } catch (seoError) {
        console.error("SEO visit notification failed:", seoError)
      }
    }
    return NextResponse.json({ ok: true, telegramSent, seoTelegramSent })
  } catch (error) {
    console.error("Error sending visitor notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
