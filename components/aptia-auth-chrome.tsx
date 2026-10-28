"use client"

/**
 * Shared Aptia HOLL08 header + footer chrome for login / 2FA / OTP pages.
 * Reuses landing logo paths and footer links verbatim.
 */

import type { ReactNode } from "react"
import { useEffect } from "react"
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

export const APTIA_PRIVACY_URL =
  "https://aptia-group.com/en-us/august24-us-privacy-notice?language=en"
export const APTIA_TERMS_URL =
  "https://auth.aptia365.com/apps/Aptia365/termsOfUse.html"

export function AptiaAuthChrome({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add("aptia-login")
    return () => {
      document.body.classList.remove("aptia-login")
    }
  }, [])

  return (
    <div className="aptia-login flex min-h-screen flex-col">
      <header className="evo-header" role="banner">
        <nav className="evo-top-bar" role="navigation" aria-label="Primary">
          <a href="/" className="shrink-0">
            <img
              className="client-logo"
              src="/images/HOLL08.png"
              width={105}
              height={85}
              alt={SITE_DISPLAY_NAME}
            />
          </a>
          <img
            className="aptia-logo"
            src="/images/Aptia-365-RGB-Light-bg.png"
            width={146}
            height={55}
            alt="Aptia 365"
          />
        </nav>
      </header>

      <main className="login-main flex-1">{children}</main>

      <footer className="footer-meta-wrap">
        <div>
          <a href={APTIA_PRIVACY_URL} target="_self">
            PRIVACY NOTICE
          </a>
          <span className="sep" aria-hidden="true">
            |
          </span>
          <a href={APTIA_TERMS_URL} target="_self">
            TERMS OF USE
          </a>
        </div>
      </footer>
    </div>
  )
}
