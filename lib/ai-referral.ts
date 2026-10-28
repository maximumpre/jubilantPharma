/**
 * AI search / chat — human referrers + crawler split:
 * - Reference / search crawlers → CrawlerSeoPage + Allow:/ (they do NOT train;
 *   blocking them removes the site from AI answers/citations)
 * - Training crawlers → Disallow:/ (never on CrawlerSeoPage allowlist)
 * - Content-Signal preference: search=yes, ai-train=no, use=reference
 * - Content-Usage (IETF draft-ietf-aipref-attach): bots=y, search=y, train-ai=n
 *
 * Source of truth for the token matrix + vendor doc links: SEO_AI_CRAWLERS.md.
 * Keep both signals emitted — Content-Signal is the Cloudflare field trial,
 * Content-Usage the IETF standard-track spelling; neither is vendor-supported
 * yet, so real blocking stays on `Disallow: /`.
 */

/** Cloudflare field-trial preference header (not spec-defined; `use=reference` is its own value). */
export const CONTENT_SIGNAL =
  "search=yes, ai-train=no, use=reference" as const

/** IETF standard-track preference header (unknown params are ignored by spec). */
export const CONTENT_USAGE = "bots=y, search=y, train-ai=n" as const

/**
 * Training / model-ingest crawlers — block site-wide in robots.txt.
 * Vendor-documented training UAs first; unverified legacy tokens kept blocked
 * (defensive — a wrong string costs nothing, a missed one feeds a model).
 */
export const AI_TRAINING_CRAWLER_AGENTS = [
  // Vendor-documented training crawlers
  "Google-Extended",
  "Applebot-Extended",
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Amazonbot",
  "CCBot",
  "commoncrawl",
  "cohere-training-data-crawler",
  "Coherebot",
  "Diffbot",
  // Meta: "crawls the web for use cases such as training foundation AI models"
  "meta-externalagent",
  // Widely observed / no current vendor documentation (marked unverified)
  "Bytespider",
  "cohere-ai",
  "omgili",
] as const

export const AI_TRAINING_CRAWLER_UA =
  /google-extended|applebot-extended|gptbot|anthropic-ai|claudebot|amazonbot|ccbot|commoncrawl|cohere-training-data-crawler|coherebot|diffbot|meta-externalagent|bytespider|cohere-ai|omgili/i

/**
 * Search / citation / user-triggered crawlers — CrawlerSeoPage + Allow:/.
 * Per project policy: these may land ONLY on CrawlerSeoPage, never on human UI.
 */
export const AI_REFERENCE_CRAWLER_AGENTS = [
  "ChatGPT-User",
  "OAI-SearchBot",
  "Claude-SearchBot",
  "Claude-User",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
  "DuckAssistBot",
  "YouBot",
  "meta-webindexer",
  "Amzn-SearchBot",
  "Amzn-User",
] as const

export const AI_REFERENCE_CRAWLER_UA =
  /chatgpt-user|oai-searchbot|claude-searchbot|claude-user|claude-web|perplexitybot|perplexity-user|duckassistbot|youbot|meta-webindexer|amzn-searchbot|amzn-user/i

/** @deprecated Use AI_REFERENCE_CRAWLER_AGENTS — kept for older call sites during migrate. */
export const AI_REFERRAL_CRAWLER_AGENTS = AI_REFERENCE_CRAWLER_AGENTS

/** @deprecated Use AI_REFERENCE_CRAWLER_UA */
export const AI_REFERRAL_CRAWLER_UA = AI_REFERENCE_CRAWLER_UA

/** document.referrer hosts for human traffic from AI chat / search UIs. */
export const AI_REFERRAL_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "openai.com",
  "perplexity.ai",
  "claude.ai",
  "anthropic.com",
  "copilot.microsoft.com",
  "copilot.com",
  "gemini.google.com",
  "you.com",
  "poe.com",
  "phind.com",
  "meta.ai",
  "x.ai",
  "grok.com",
] as const
