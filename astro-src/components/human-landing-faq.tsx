/**
 * Below-fold zero-JS FAQ for the human Astro landing (cloaking parity with the twin).
 * Mount INSIDE LandingShell / SteinsGate children so cloaked direct visits never see it.
 * Twin FAQ lives in crawler-seo.astro — keep questions factually aligned.
 */
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

const FAQS = [
  {
    q: `How do I sign in to ${SITE_DISPLAY_NAME}?`,
    a: `Use your employer-issued User ID or username and password on this page. Complete any one-time verification steps your plan requires.`,
  },
  {
    q: "I forgot my User ID or password. What should I do?",
    a: "Use the account recovery links on this page. Recovery options follow your employer’s identity rules and may require email or phone verification.",
  },
  {
    q: "Where can I view benefits, coverage, and plan details?",
    a: "After you sign in, open your account dashboard to review plan summaries, balances, claims, and election options.",
  },
  {
    q: "How do I submit or track a claim?",
    a: "Signed-in members can submit claims and upload documents from the claims area. Status updates appear in the same dashboard.",
  },
  {
    q: "Who do I contact for help?",
    a: `Use the support contacts published for ${SITE_DISPLAY_NAME} after sign-in, or your employer benefits administrator if you cannot access the portal.`,
  },
] as const

export function HumanLandingFaq() {
  return (
    <section
      className="mt-10 max-w-xl mx-auto px-4 pb-12 text-sm text-neutral-600"
      aria-labelledby="human-landing-faq-heading"
    >
      <h2
        id="human-landing-faq-heading"
        className="text-base font-semibold text-neutral-900 mb-3"
      >
        Frequently asked questions
      </h2>
      <div className="space-y-2">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="rounded-md border border-neutral-200 bg-neutral-50/50 p-3"
          >
            <summary className="cursor-pointer font-medium text-neutral-800">
              {item.q}
            </summary>
            <p className="mt-2 text-neutral-600 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
