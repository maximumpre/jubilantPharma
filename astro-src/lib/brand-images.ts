/**
 * Resolved image URLs for the Astro pages — Jubilant Pharma / Aptia HOLL08 assets.
 */

export const toImageUrl = (asset: string | { src: string }): string =>
  typeof asset === "string" ? asset : encodeURI(asset.src)

/** Client / employer mark (header left). */
export const BRAND_LOGO_SRC = "/images/HOLL08.png"

/** Primary LCP / hero preload — same as brand mark on this login chrome. */
export const HERO_IMAGE_SRC = "/images/HOLL08.png"

/** Aptia 365 partner mark (header right, desktop). */
export const PARTNER_LOGO_SRC = "/images/Aptia-365-RGB-Light-bg.png"

export const FAVICON_SRC = "/images/favicon.png"
