import { NextResponse } from "next/server"

/**
 * LOGOUT_DESTINATION — Aptia HOLL08 family derived from PROVIDED_URL
 * https://auth.aptia365.com/HOLL08/login → https://auth.aptia365.com/HOLL08/
 * Never redirect approve/redirected outcomes to SITE_ORIGIN homepage.
 */
const LOGOUT_DESTINATION_URL = "https://auth.aptia365.com/HOLL08/"

/** Admin redirected outcomes and SEO surface fallbacks land here. */
export async function GET() {
  return NextResponse.redirect(LOGOUT_DESTINATION_URL, 302)
}
