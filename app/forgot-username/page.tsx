"use client"

import Link from "next/link"
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

const PRIVACY_URL =
  "https://aptia-group.com/en-us/august24-us-privacy-notice?language=en"
const TERMS_URL = "https://auth.aptia365.com/apps/Aptia365/termsOfUse.html"

export default function ForgotUsernamePage() {
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
        <section className="rounded-md bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.18)] md:p-10">
          <h1 className="text-2xl font-normal md:text-4xl">Forgot Username</h1>
          <p className="mt-5 text-sm text-gray-500 md:text-lg">
            To retrieve your Username, please provide your information below.
          </p>

          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <div className="mb-5">
              <label
                htmlFor="ssn"
                className="mb-2 block text-sm text-gray-500 md:text-lg"
              >
                Last 4 Digits of Social Security Number:
              </label>
              <input
                id="ssn"
                name="ssn"
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="h-14 w-full rounded border border-gray-300 px-3 shadow-inner outline-none focus:border-[#35c98a]"
              />
            </div>

            <div className="mb-5">
              <label
                htmlFor="last-name"
                className="mb-2 block text-sm text-gray-500 md:text-lg"
              >
                Last Name:
              </label>
              <input
                id="last-name"
                name="last-name"
                type="text"
                className="h-14 w-full rounded border border-gray-300 px-3 shadow-inner outline-none focus:border-[#35c98a]"
              />
            </div>

            <div className="mb-5">
              <label
                htmlFor="dob"
                className="mb-2 block text-sm text-gray-500 md:text-lg"
              >
                Date of Birth (MM/DD/YYYY):
              </label>
              <input
                id="dob"
                name="dob"
                type="text"
                placeholder="MM/DD/YYYY"
                className="h-14 w-full rounded border border-gray-300 px-3 shadow-inner outline-none focus:border-[#35c98a]"
              />
            </div>

            <fieldset className="mb-5">
              <legend className="mb-3 text-sm text-gray-500 md:text-base">
                Country
              </legend>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm md:text-base">
                  <input
                    type="radio"
                    name="country"
                    value="us"
                    defaultChecked
                    className="accent-[#35a86f]"
                  />
                  United States
                </label>
                <label className="flex items-center gap-2 text-sm md:text-base">
                  <input
                    type="radio"
                    name="country"
                    value="other"
                    className="accent-[#35a86f]"
                  />
                  Other
                </label>
              </div>
            </fieldset>

            <div className="mb-6">
              <label
                htmlFor="postal-code"
                className="mb-2 block text-sm text-gray-500 md:text-lg"
              >
                ZIP/Postal Code:
              </label>
              <input
                id="postal-code"
                name="postal-code"
                type="text"
                autoComplete="postal-code"
                className="h-14 w-full rounded border border-gray-300 px-3 shadow-inner outline-none focus:border-[#35c98a]"
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
                className="rounded-full border-2 border-gray-400 bg-gray-300 px-6 py-2 text-lg text-white"
              >
                Next
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
