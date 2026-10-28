import type { Metadata } from "next"

/**
 * Gated routes are not search landing pages — avoid duplicate canonical vs homepage.
 * `canonical: null` clears the root-layout homepage canonical (Next replaces
 * `alternates` wholesale per segment), so /login/* never claims `/`.
 * Rule: any new gated segment layout must do the same; any new indexable route
 * must set its own self-referencing canonical.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
