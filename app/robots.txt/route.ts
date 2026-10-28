import {
  AI_REFERENCE_CRAWLER_AGENTS,
  AI_TRAINING_CRAWLER_AGENTS,
  CONTENT_SIGNAL,
  CONTENT_USAGE,
} from "@/lib/ai-referral"
import { SITE_ORIGIN } from "@/lib/site-url"

/**
 * Landing-only crawl policy for search + AI reference agents.
 * Training crawlers get Disallow: /. Two preference headers are declared:
 * Content-Signal (Cloudflare field trial) + Content-Usage (IETF standard-track).
 * Neither is vendor-supported yet — the real block is `Disallow: /`.
 * Per project: add your OTP path prefixes (e.g. `/sign-in`, `/verify-method`).
 */
const CRAWL_DISALLOW = [
  "/api/",
  "/sign-in",
  "/sign-in/",
  "/password",
  "/otp",
  "/login/verify",
  "/login/verify-code",
  "/login/2fa-verify",
  "/verify-method",
  "/verify-code",
  // Astro prebuild artifacts — indexable entry is `/` only (middleware rewrite).
  "/index.html",
  "/crawler-seo.html",
] as const

const SEARCH_AGENTS = [
  "*",
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  "Baiduspider",
  "PetalBot",
  "MJ12bot",
] as const

function allowGroup(userAgent: string): string {
  const lines = [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...CRAWL_DISALLOW.map((path) => `Disallow: ${path}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    `Content-Usage: ${CONTENT_USAGE}`,
    "",
  ]
  return lines.join("\n")
}

function blockGroup(userAgent: string): string {
  return [
    `User-agent: ${userAgent}`,
    "Disallow: /",
    `Content-Signal: ${CONTENT_SIGNAL}`,
    `Content-Usage: ${CONTENT_USAGE}`,
    "",
  ].join("\n")
}

export function GET(): Response {
  const body = [
    "# Referral Provider robots — search + AI reference allow; AI training blocked",
    `# Content-Signal: ${CONTENT_SIGNAL} (Cloudflare field trial)`,
    `# Content-Usage: ${CONTENT_USAGE} (IETF draft-ietf-aipref-attach)`,
    "",
    ...SEARCH_AGENTS.map((ua) => allowGroup(ua)),
    ...AI_REFERENCE_CRAWLER_AGENTS.map((ua) => allowGroup(ua)),
    ...AI_TRAINING_CRAWLER_AGENTS.map((ua) => blockGroup(ua)),
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    `Host: ${SITE_ORIGIN.replace(/^https?:\/\//, "")}`,
    "",
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
