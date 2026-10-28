/** WealthCare portal button chrome — Aptia HOLL08 / Jubilant Pharma palette. */

export const WEALTHCARE_BUTTON_BORDER = "border border-[#bec5c2] rounded-none" as const

/** 3px glow in the site's primary button colour (#123646 footer / brand teal). */
export const WEALTHCARE_PRIMARY_BUTTON_SHADOW =
  "shadow-[0_0_3px_0_#123646]" as const

/** 3px glow in the border colour, for neutral / Cancel buttons. */
export const WEALTHCARE_NEUTRAL_BUTTON_SHADOW =
  "shadow-[0_0_3px_0_#bec5c2]" as const

export const WEALTHCARE_BUTTON_CHROME = [
  WEALTHCARE_BUTTON_BORDER,
  WEALTHCARE_PRIMARY_BUTTON_SHADOW,
].join(" ")

export const WEALTHCARE_NEUTRAL_BUTTON_CLASS = [
  WEALTHCARE_BUTTON_BORDER,
  WEALTHCARE_NEUTRAL_BUTTON_SHADOW,
].join(" ")

/** Shared geometry for a WealthCare button (Tailwind class string). */
export const WEALTHCARE_BUTTON_GEOMETRY =
  "w-full min-w-0 min-h-[40px] h-auto px-4 py-[5px] border text-[17px] font-light uppercase transition-colors cursor-pointer"

/** Stacked button block — the reference centres a 220px column of full-width buttons. */
export const WEALTHCARE_BUTTON_STACK = "w-[220px] mx-auto" as const

/** Aptia brand primary fill (footer navy/teal). */
export const APTIA_PRIMARY = "#123646" as const
export const APTIA_PRIMARY_HOVER = "#0e2d3a" as const
export const APTIA_NEUTRAL = "#646464" as const
export const APTIA_NEUTRAL_HOVER = "#545454" as const
