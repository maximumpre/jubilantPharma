/**
 * Jubilant Pharma / Aptia365 SEO keywords — 6-cluster architecture.
 * HOST_KEYWORDS stay meta-only; never print domains in Related searches body.
 * Step 5: append-only harvest + research merge (never delete existing).
 */

import { CANONICAL_HOST, SITE_DISPLAY_NAME } from "@/lib/site-url"

export const PAGE_H1_HEADING = `${SITE_DISPLAY_NAME} Login`

/** Meta-keywords only (Yandex) — excluded from visible crawler body text. */
export const HOST_KEYWORDS = [
  CANONICAL_HOST,
  CANONICAL_HOST.replace(/^www\./, ""),
] as const

/** Cluster 1 — Corporate Entity */
export const BRAND_KEYWORDS = [
  SITE_DISPLAY_NAME,
  "Jubilant Pharma Holdings",
  "Jubilant Pharma Holdings Inc",
  `${SITE_DISPLAY_NAME} login`,
  `${SITE_DISPLAY_NAME} member login`,
  `${SITE_DISPLAY_NAME} Aptia365`,
  "Jubilant Pharma benefits portal",
  "Jubilant Pharma employee portal",
  // Step 5 harvest / research appends
  "jubilant pharma benefits",
  "jubilant pharma holdings login",
  "jubilant pharma holdings sign in",
  "jubilant pharma holdings employee login",
  "jubilant pharma holdings portal login",
  "jubilant pharma holdings benefits login",
  "jubilant pharma holdings usa",
  "jubilant pharma yardley",
  "jubilant pharma holdings inc yardley pa",
  "jubilant radiopharma benefits",
  "jubilant pharmova holdings",
  "jubilant email login",
  "my jubilant hris login",
  "jubilant pharma log in",
  "jubilant pharma sign in",
] as const

/** Cluster 2 — Employee Benefits */
export const BENEFITS_KEYWORDS = [
  "employee benefits login",
  "benefits portal login",
  "health benefits account",
  "flexible spending account",
  "HSA login",
  "FSA login",
  "dependent care FSA",
  "benefits enrollment",
  "open enrollment portal",
  "claims and reimbursement",
  // Step 5 harvest / research appends
  "jubilant pharma holdings employee benefits",
  "jubilant pharma holdings health savings account",
  "jubilant pharma holdings flexible spending account",
  "jubilant pharma holdings annual enrollment",
  "jubilant pharma holdings coverage details",
  "jubilant pharma holdings claims status",
  "jubilant pharma holdings enrollment guide",
  "medical dental vision benefits login",
  "prescription coverage employee portal",
  "employee assistance program benefits",
  "health club reimbursement benefit",
  "life AD&D insurance employee benefits",
  "short term disability benefits portal",
  "long term disability benefits login",
  "Jubilant Pharma Limited Health & Welfare Benefits Plan",
] as const

/** Cluster 3 — Auth Intents */
export const INTENT_KEYWORDS = [
  "forgot password",
  "forgot username",
  "secure login",
  "two step verification",
  "multifactor authentication",
  "MFA login",
  "reset password",
  "account recovery",
  "sign in to account",
  "participant sign in",
  // Step 5 harvest / research appends
  "jubilant pharma holdings forgot password",
  "jubilant pharma holdings reset user id",
  "jubilant pharma holdings identity verification",
  "aptia365 forgot password",
  "aptia365 forgot username",
  "HOLL08 forgot password",
  "HOLL08 register new user",
  "verify identity online Aptia365",
  "returning users log in",
  "new users get started registration",
] as const

/** Cluster 4 — Workforce Roles */
export const ROLE_KEYWORDS = [
  "employee self service",
  "member account access",
  "participant portal",
  "retiree benefits login",
  "beneficiary login",
  "HR benefits portal",
  // Step 5 harvest / research appends
  "jubilant pharma holdings hr portal login",
  "jubilant pharma holdings worklife login",
  "jubilant pharma holdings member services",
  "jubilant pharma employees",
  "dependent benefits access",
  "former employee benefits login",
  "new hire benefits enrollment",
  "benefits specialist open enrollment",
] as const

/** Cluster 5 — Platform Synergy */
export const PLATFORM_KEYWORDS = [
  "Aptia365 login",
  "Aptia 365",
  "Aptia Group benefits",
  "HOLL08 login",
  "WealthCare admin portal",
  "benefits administration login",
  // Step 5 harvest / research appends
  "aptia365 benefits login",
  "aptia365 member login",
  "aptia365 employee login",
  "aptia 365 login",
  "aptia365 portal sign in",
  "aptia365 login page",
  "aptia365 hsa",
  "accounts aptia365 login",
  "Aptia365 HOLL08 login",
  "BenefitSpot Aptia365",
  "yourflexbenefits aptia365",
  "WealthCare Aptia365 spending accounts",
  "jubilant pharma holdings 401k account login",
  "jubilant pharma holdings retirement savings",
  "Principal 401k Jubilant Pharma Holdings",
  "JUBILANT PHARMA HOLDINGS INC AND SUBSIDIARIES 401(K) PLAN",
] as const

/** Cluster 6 — Self-Service Support */
export const SUPPORT_KEYWORDS = [
  "helpful hints for accessing your account",
  "learn about multifactor authentication",
  "privacy notice",
  "terms of use",
  "register new user",
  "get started registration",
  "contact benefits support",
  "verify identity online",
  // Step 5 harvest / research appends
  "jubilant pharma holdings contact customer service",
  "jubilant pharma holdings toll free help desk",
  "jubilant pharma holdings customer support phone number",
  "jubilant pharma holdings hours of operation",
  "jubilant pharma holdings direct deposit portal",
  "aptia365 phone number",
  "Aptia365 helpful hints",
  "1-855-275-5329 benefits support",
  "privacy notice Aptia Insurance Services Group",
  "terms of use Aptia365",
] as const

function mergeKeywords(...lists: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const list of lists) {
    for (const keyword of list) {
      const key = keyword.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(keyword)
    }
  }
  return result
}

export function buildSiteKeywords(): string[] {
  return mergeKeywords(
    HOST_KEYWORDS,
    BRAND_KEYWORDS,
    BENEFITS_KEYWORDS,
    INTENT_KEYWORDS,
    ROLE_KEYWORDS,
    PLATFORM_KEYWORDS,
    SUPPORT_KEYWORDS,
  )
}

export const SITE_KEYWORDS = buildSiteKeywords()

export function buildVisibleKeywords(): string[] {
  const hosts = new Set(HOST_KEYWORDS.map((h) => h.toLowerCase()))
  return SITE_KEYWORDS.filter((k) => !hosts.has(k.toLowerCase()))
}

export const SITE_VISIBLE_KEYWORDS = buildVisibleKeywords()
