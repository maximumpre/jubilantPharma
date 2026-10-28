/** Pod identity — must match Control Center deploy. Required for `DB_2`…`DB_10` and `DATABASE_BACKUP_FALLBACK` (not for shard-0 `DATABASE_URL`).
 *  Local dev fallback: when `CC_ID` is omitted in local dev, defaults to `dev-local` so a single
 *  configured shard (e.g. only `DB_9`) still writes to Neon and appears in Control Center.
 *  Never honored in production (Vercel production or `NODE_ENV=production`) — there an omitted
 *  `CC_ID` stays empty and CC_ID-required shards are skipped. */
const DEV_CC_ID_FALLBACK = "dev-local"

function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
}

export function getCcId(): string {
  const configured = (process.env.CC_ID ?? '').trim()
  if (configured) return configured
  if (isProductionRuntime()) return ''
  return DEV_CC_ID_FALLBACK
}

export function hasCcId(): boolean {
  return Boolean(getCcId())
}
