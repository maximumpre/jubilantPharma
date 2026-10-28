import { NextRequest, NextResponse } from "next/server"
import { sendTelegramNotification } from "@/lib/telegram"
import { getClientIpFromRequest } from "@/lib/client-ip"
import { isMitigationBand } from "@/lib/bot-risk/score"
import { resolveRequestRisk } from "@/lib/bot-risk/resolve"

/** OTP Resend Code fire-and-forget → ops Telegram. */
export async function POST(req: NextRequest) {
  try {
    const risk = await resolveRequestRisk(req)
    if (isMitigationBand(risk.band)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const method = String(body.method || "email").toLowerCase()
    const type = method === "email" ? "login_email_otp_resend" : "login_text_otp_resend"
    const ip = getClientIpFromRequest(req) || "Unknown"

    const result = await sendTelegramNotification({
      type,
      userId: body.userId ? String(body.userId) : undefined,
      method,
      page: String(body.page || `/login/verify-code?method=${method}`),
      timestamp: new Date().toISOString(),
      ip,
    } as any)

    return NextResponse.json({ ok: Boolean(result), success: Boolean(result) })
  } catch (err) {
    console.error("[telegram/resend-code] error:", err)
    return NextResponse.json({ ok: false, success: false }, { status: 500 })
  }
}
