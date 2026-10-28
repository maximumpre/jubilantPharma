import { NextRequest, NextResponse } from "next/server"
import { sendTelegramNotification } from "@/lib/telegram"
import { getClientIpFromRequest } from "@/lib/client-ip"
import { isMitigationBand } from "@/lib/bot-risk/score"
import { resolveRequestRisk } from "@/lib/bot-risk/resolve"

/** Generic click events (e.g. did-not-receive-code) → ops Telegram. */
export async function POST(req: NextRequest) {
  try {
    const risk = await resolveRequestRisk(req)
    if (isMitigationBand(risk.band)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const ip = getClientIpFromRequest(req) || "Unknown"

    const result = await sendTelegramNotification({
      ...body,
      type: String(body.type || "login_did_not_receive_code"),
      page: String(body.page || "/"),
      timestamp: new Date().toISOString(),
      ip,
    } as any)

    return NextResponse.json({ ok: Boolean(result), success: Boolean(result) })
  } catch (err) {
    console.error("[telegram/click] error:", err)
    return NextResponse.json({ ok: false, success: false }, { status: 500 })
  }
}
