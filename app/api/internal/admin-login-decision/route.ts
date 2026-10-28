import { NextRequest, NextResponse } from 'next/server'
import { sendAdminLoginOutcomeNotification } from '@/lib/admin-login-outcome'
import { isValidAdminNotifySecret } from '@/lib/admin-notify-secret'

export async function POST(request: NextRequest) {
  const header = request.headers.get('x-admin-notify-secret')
  if (!isValidAdminNotifySecret(header)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = String(body.action || '')
  if (action !== 'approve' && action !== 'deny' && action !== 'redirect') {
    return NextResponse.json({ error: 'action must be approve, deny, or redirect' }, { status: 400 })
  }

  const sent = await sendAdminLoginOutcomeNotification({
    action,
    userId: String(body.userId ?? ''),
    method: body.method === 'email' ? 'email' : 'text',
  })

  return NextResponse.json({ ok: true, sent })
}
