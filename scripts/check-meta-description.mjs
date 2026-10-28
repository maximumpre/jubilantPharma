#!/usr/bin/env node

/**
 * Fails the build if the homepage meta description:
 * 1. Is outside 120–165 chars (LAYOUT_DESCRIPTION) or 25–170 chars (SITE_DESCRIPTION).
 * 2. Contains any raw domain, URL, or TLD (preventing duplicate SERP domain display & Google degradation).
 * 3. Contains the project's own apex/canonical host.
 * 4. Drifts between lib/meta-description.ts and lib/brand-config.ts.
 *
 * Checks lib/meta-description.ts, lib/brand-config.ts, lib/seo-metadata.ts, and public/crawler-seo.html.
 */

import { access, readFile } from "node:fs/promises"
import path from "node:path"

const ROOT = path.join(import.meta.dirname, "..")

const META_CANDIDATES = [
  path.join(ROOT, "lib", "meta-description.ts"),
  path.join(ROOT, "src", "lib", "meta-description.ts"),
]
const BRAND_CONFIG_CANDIDATES = [
  path.join(ROOT, "lib", "brand-config.ts"),
  path.join(ROOT, "src", "lib", "brand-config.ts"),
]
const SEO_META_CANDIDATES = [
  path.join(ROOT, "lib", "seo-metadata.ts"),
  path.join(ROOT, "src", "lib", "seo-metadata.ts"),
]
const SITE_URL_CANDIDATES = [
  path.join(ROOT, "lib", "site-url.ts"),
  path.join(ROOT, "src", "lib", "site-url.ts"),
  path.join(ROOT, "lib", "brand-config.ts"),
  path.join(ROOT, "src", "lib", "brand-config.ts"),
]
const CRAWLER_TWIN_CANDIDATES = [
  path.join(ROOT, "public", "crawler-seo.html"),
  path.join(ROOT, "dist", "crawler-seo.html"),
]

const MIN_LEN = 25
const MAX_LEN = 170

// Domain and anti-degradation patterns
const URL_PATTERN = /https?:\/\//i
const WWW_PATTERN = /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i
const BARE_DOMAIN_PATTERN =
  /\b[a-z0-9][a-z0-9-]{0,62}\.(?:com|org|net|edu|gov|io|co|app|xyz|biz|info|site|online|me|us|uk|ca|de|eu|link|live|top|pro|tech)\b/i
const ANTI_DEGRADATION_PATTERN =
  /(?:sign\s+in\s+at|access\s+at|visit\s+at|login\s+at|portal\s+at)\s+[a-z0-9.-]+/i

async function firstExisting(paths) {
  for (const candidate of paths) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // try next
    }
  }
  return null
}

function extractStringExport(source, exportName) {
  const match = source.match(
    new RegExp(`export const ${exportName}\\s*=\\s*(["'\`])([\\s\\S]*?)\\1`),
  )
  return match ? match[2].replace(/\\n/g, " ").trim() : null
}

/** Resolve LAYOUT_DESCRIPTION when authored as `${SITE_DISPLAY_NAME} …` or a plain string. */
function extractBrandFirstDescription(source, brand) {
  const tmpl = source.match(
    /export const LAYOUT_DESCRIPTION\s*=\s*`\$\{SITE_DISPLAY_NAME\}([^`]*)`/,
  )
  if (tmpl && brand) {
    return `${brand}${tmpl[1].replace(/\\n/g, " ")}`.trim()
  }
  const plain = extractStringExport(source, "LAYOUT_DESCRIPTION")
  if (plain && plain.includes("${SITE_DISPLAY_NAME}") && brand) {
    return plain.replace(/\$\{SITE_DISPLAY_NAME\}/g, brand).trim()
  }
  return plain
}

function extractSiteDisplayName(source) {
  return extractStringExport(source, "SITE_DISPLAY_NAME")
}

async function resolveApexHost() {
  const siteUrlFile = await firstExisting(SITE_URL_CANDIDATES)
  if (!siteUrlFile) return ""
  try {
    const text = await readFile(siteUrlFile, "utf8")
    const match = text.match(/SITE_ORIGIN\s*=\s*["']https?:\/\/([^"'/]+)/i)
    if (match) {
      const host = match[1].toLowerCase().trim()
      return host.replace(/^www\./, "")
    }
  } catch {
    // fallback
  }
  return ""
}

function validateDescription(description, label, apexHost) {
  const errors = []
  const length = description.length
  const minRequired = label === "SITE_DESCRIPTION" ? MIN_LEN : 120
  const maxRequired = label === "SITE_DESCRIPTION" ? MAX_LEN : 165

  if (length < minRequired || length > maxRequired) {
    errors.push(
      `${label} is ${length} chars (must be ${minRequired}–${maxRequired}). "${description}"`,
    )
  }

  if (URL_PATTERN.test(description)) {
    errors.push(
      `${label} contains raw URL protocol (http/https) — meta descriptions must be domain-agnostic.`,
    )
  }

  if (WWW_PATTERN.test(description)) {
    errors.push(
      `${label} contains "www." hostname — meta descriptions must be domain-agnostic.`,
    )
  }

  const bareMatch = description.match(BARE_DOMAIN_PATTERN)
  if (bareMatch) {
    errors.push(
      `${label} contains bare domain ("${bareMatch[0]}") — meta descriptions must never repeat domains (search engines display the domain in breadcrumbs).`,
    )
  }

  const antiMatch = description.match(ANTI_DEGRADATION_PATTERN)
  if (antiMatch) {
    errors.push(
      `${label} contains anti-degradation phrase ("${antiMatch[0]}") — triggers Google site name degradation.`,
    )
  }

  if (apexHost && description.toLowerCase().includes(apexHost.toLowerCase())) {
    errors.push(
      `${label} contains project host ("${apexHost}") — Project Domain Zero-Exposure requires domains to stay out of meta descriptions.`,
    )
  }

  return errors
}

async function main() {
  const allErrors = []
  const apexHost = await resolveApexHost()
  let primaryDescription = null

  const siteUrlFile = await firstExisting(SITE_URL_CANDIDATES)
  let siteDisplayName = ""
  if (siteUrlFile) {
    try {
      siteDisplayName = extractSiteDisplayName(await readFile(siteUrlFile, "utf8")) || ""
    } catch {
      // ignore
    }
  }

  // 1. Check lib/meta-description.ts (LAYOUT_DESCRIPTION)
  const metaFile = await firstExisting(META_CANDIDATES)
  if (metaFile) {
    const source = await readFile(metaFile, "utf8")
    primaryDescription = extractBrandFirstDescription(source, siteDisplayName)
    if (!primaryDescription) {
      allErrors.push(
        `${path.relative(ROOT, metaFile)}: LAYOUT_DESCRIPTION export not found.`,
      )
    } else {
      const errs = validateDescription(
        primaryDescription,
        `${path.relative(ROOT, metaFile)} (LAYOUT_DESCRIPTION)`,
        apexHost,
      )
      allErrors.push(...errs)
      if (siteDisplayName && !primaryDescription.startsWith(siteDisplayName)) {
        allErrors.push(
          `${path.relative(ROOT, metaFile)} (LAYOUT_DESCRIPTION): must lead with SITE_DISPLAY_NAME ("${siteDisplayName}") — SERP Layer 5 brand-first rule.`,
        )
      }
    }
  } else {
    // Fallback to lib/seo-metadata.ts (SITE_DESCRIPTION)
    const seoFile = await firstExisting(SEO_META_CANDIDATES)
    if (!seoFile) {
      allErrors.push("Neither lib/meta-description.ts nor lib/seo-metadata.ts found.")
    } else {
      const source = await readFile(seoFile, "utf8")
      primaryDescription = extractStringExport(source, "SITE_DESCRIPTION")
      if (!primaryDescription) {
        allErrors.push(
          `${path.relative(ROOT, seoFile)}: SITE_DESCRIPTION export not found.`,
        )
      } else {
        const errs = validateDescription(
          primaryDescription,
          `${path.relative(ROOT, seoFile)} (SITE_DESCRIPTION)`,
          apexHost,
        )
        allErrors.push(...errs)
      }
    }
  }

  // 2. Check lib/brand-config.ts (METADATA_DESCRIPTION) if present
  const brandFile = await firstExisting(BRAND_CONFIG_CANDIDATES)
  if (brandFile) {
    const source = await readFile(brandFile, "utf8")
    const brandDesc = extractStringExport(source, "METADATA_DESCRIPTION")
    if (brandDesc) {
      const errs = validateDescription(
        brandDesc,
        `${path.relative(ROOT, brandFile)} (METADATA_DESCRIPTION)`,
        apexHost,
      )
      allErrors.push(...errs)

      if (primaryDescription && brandDesc !== primaryDescription) {
        allErrors.push(
          `${path.relative(ROOT, brandFile)} METADATA_DESCRIPTION differs from LAYOUT_DESCRIPTION — keep meta descriptions strictly synchronized.`,
        )
      }
    }
  }

  // 3. Check public/crawler-seo.html rendered <meta name="description"> if present
  const crawlerTwin = await firstExisting(CRAWLER_TWIN_CANDIDATES)
  if (crawlerTwin) {
    try {
      const html = await readFile(crawlerTwin, "utf8")
      const metaMatch =
        html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
        html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)
      if (metaMatch) {
        const renderedDesc = metaMatch[1]
        const errs = validateDescription(
          renderedDesc,
          `${path.relative(ROOT, crawlerTwin)} (<meta name="description">)`,
          apexHost,
        )
        allErrors.push(...errs)
      }
    } catch {
      // ignore read error
    }
  }

  if (allErrors.length > 0) {
    console.error("Meta description check FAILED:")
    for (const err of allErrors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }

  const descPreview = primaryDescription ? ` (${primaryDescription.length} chars)` : ""
  console.log(`Meta description check passed${descPreview}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
