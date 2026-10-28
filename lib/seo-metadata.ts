/**
 * Single source for layout metadata and CrawlerSeoPage H1/description/keywords.
 * Customize per project — keep in sync with app/layout.tsx metadata export.
 *
 * SITE TITLE (required for SERP branding):
 * Always end with the brand (`SITE_DISPLAY_NAME`) after a delimiter — Google
 * documents site name at the beginning or end of `<title>`, separated by
 * "a delimiter such as a hyphen, colon, or pipe". Never ship a generic or
 * unbranded title: Google/Bing may replace or truncate it.
 *
 * `SITE_KEYWORDS` must feed the layout `<meta name="keywords">`.
 * `SITE_VISIBLE_KEYWORDS` (same list minus HOST_KEYWORDS) feeds the visible
 * CrawlerSeoPage body block (`Related searches: …`) — domain tokens never
 * appear in page copy. Never ship keywords only in meta — crawlers must see
 * them in the page body.
 */

import { LAYOUT_DESCRIPTION } from "@/lib/meta-description"
import { buildSiteKeywords, buildVisibleKeywords } from "@/lib/seo-keywords"
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

export const SITE_TITLE = `${SITE_DISPLAY_NAME} Holdings, Inc. - Aptia365`

export const SITE_DESCRIPTION = LAYOUT_DESCRIPTION

export const SITE_KEYWORDS: string[] = buildSiteKeywords()

export const SITE_VISIBLE_KEYWORDS: string[] = buildVisibleKeywords()
