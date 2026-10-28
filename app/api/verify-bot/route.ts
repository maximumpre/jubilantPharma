import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getClientIpFromRequest } from "@/lib/client-ip"

import { getBotRegistryEntry, matchBotForAlert } from "@/lib/bot-verification/bot-registry"
import { verifyBotRequest } from "@/lib/bot-verification/verify-bot"

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? ""
  const botId = request.nextUrl.searchParams.get("botId")?.trim()

  let entry = botId ? getBotRegistryEntry(botId) : matchBotForAlert(userAgent)?.entry ?? null

  if (!entry && userAgent) {
    entry = matchBotForAlert(userAgent)?.entry ?? null
  }

  if (!entry) {
    return NextResponse.json(
      { verified: false, botId: null, status: "UNVERIFIED" },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const ip = getClientIpFromRequest(request)
  const result = await verifyBotRequest(ip, entry)

  return NextResponse.json(
    {
      verified: result.status === "VERIFIED",
      botId: entry.id,
      status: result.status,
      method: result.method,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
