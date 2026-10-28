import { OTP_RESEND_LOADING_MS } from "@/lib/approval-messages"

/** Shared 2s loading hold used by Resend and Choose another method. */
export async function runOtpSecondaryLoading(
  waitFn: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
  await waitFn(OTP_RESEND_LOADING_MS)
}
