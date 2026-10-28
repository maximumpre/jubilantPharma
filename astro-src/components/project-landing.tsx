/**
 * Single React island root: SteinsGate shell + Aptia login UI in one hydrate tree.
 * Avoids Astro SSR'ing the login form as inert slot HTML outside React.
 */
"use client"

import LandingShell from "./landing-shell"
import JubilantLoginLanding from "@/components/jubilant-login-landing"

export default function ProjectLanding({
  allowLocalTestingEnv = false,
}: {
  allowLocalTestingEnv?: boolean
}) {
  return (
    <LandingShell allowLocalTestingEnv={allowLocalTestingEnv}>
      <JubilantLoginLanding />
    </LandingShell>
  )
}
