/**
 * Canonical layout description — single source for app/layout.tsx and components/seo-head.astro.
 * Must be 120–165 characters to prevent short description warnings in Bing/Google SERPs.
 * Must lead with {SITE_DISPLAY_NAME} (brand-first SERP Layer 5 rule).
 * Must be domain-agnostic (no raw hostnames or URLs) to prevent duplicate domain display.
 *
 * Kit stub uses a placeholder brand token. Member projects: interpolate SITE_DISPLAY_NAME
 * via template or keep the brand string identical to lib/site-url.ts.
 */
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

export const LAYOUT_DESCRIPTION =
  `${SITE_DISPLAY_NAME} secure employee benefits portal. Manage coverage, view claims, enroll in plans, and explore wellbeing resources anytime.` as const

export const HOME_DESCRIPTION =
  `Sign in to your ${SITE_DISPLAY_NAME} employee account with secure identity verification.` as const
