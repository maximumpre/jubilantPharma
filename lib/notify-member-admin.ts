import { resolveAdminNotifySecret } from '@/lib/admin-notify-secret'

/** Control app helper: forward admin decision to member site's ops Telegram channel. */

export async function notifyMemberAdminLoginDecision(
  memberOrigin: string | undefined | null,
  body: {
    action: 'approve' | 'deny' | 'redirect'
    userId: string
    method: 'email' | 'text'
    maskedEmail: string
    maskedPhone: string
  },
): Promise<void> {
  const origin = memberOrigin?.trim().replace(/\/+$/, '')
  const secret = resolveAdminNotifySecret()
  if (!origin || !secret) {
    if (!origin) console.warn('[Control] member admin notify skipped — no member_origin on pending row')
    return
  }

  try {
    const res = await fetch(`${origin}/api/internal/admin-login-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-notify-secret': secret,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('[Control] member admin notify failed', origin, res.status, err)
    }
  } catch (err) {
    console.error('[Control] member admin notify failed', origin, err)
  }
}
