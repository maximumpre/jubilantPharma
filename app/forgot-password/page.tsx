"use client"

import Link from "next/link"
import { useState } from "react"
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

const PRIVACY_URL =
  "https://aptia-group.com/en-us/august24-us-privacy-notice?language=en"
const TERMS_URL = "https://auth.aptia365.com/apps/Aptia365/termsOfUse.html"

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("")
  const ready = username.trim().length > 0

  return (
    <div className="aptia-login min-h-screen flex flex-col">
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

      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16 mt-14 flex-1">
        <section className="rounded-md bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:p-14">
          <h1 className="text-2xl font-normal md:text-4xl">
            Provide the following information
          </h1>

          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <div className="mb-6">
              <label
                htmlFor="username"
                className="mb-2 block text-sm text-gray-500 md:text-lg"
              >
                Enter Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-16 w-full rounded border border-gray-300 px-3 shadow-inner outline-none focus:border-[#35c98a]"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-900 md:text-lg">
                reCaptcha Security Check
              </p>
              <p className="mb-3 text-md text-gray-500">
                Check the box next to &quot;I&apos;m not a robot&quot;. If a
                pop-up window appears, simply follow the instructions at the top
                and select the Verify button.
              </p>

              <div className="flex min-h-[82px] max-w-[300px] items-center justify-between border border-gray-300 bg-white px-4 shadow-sm">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input type="checkbox" className="h-5 w-5 accent-[#35a86f]" />
                  I&apos;m not a robot
                </label>
                <div className="flex flex-col items-center text-gray-500">
                  <span className="text-[10px]">reCAPTCHA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-5">
              <Link
                href="/"
                className="rounded-full border border-[#d9e2e7] px-6 py-2 text-lg text-[#47718a] transition-colors hover:border-[#35a86f] hover:text-[#35a86f]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!ready}
                className="rounded-full border-2 border-gray-400 bg-gray-300 px-6 py-2 text-lg text-white disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </form>
        </section>
      </main>

      <footer className="footer-meta-wrap">
        <div>
          <a href={PRIVACY_URL}>PRIVACY NOTICE</a>
          <span className="sep" aria-hidden="true">
            |
          </span>
          <a href={TERMS_URL}>TERMS OF USE</a>
        </div>
      </footer>
    </div>
  )
}
