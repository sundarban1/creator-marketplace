import { env } from '../config/env';
import { logger } from '../config/logger';

// SMS is reserved for phone-number OTPs only — signup / account verification and
// forgot-password (both in auth.service.ts). Do not use this for other
// notifications (verification results, alerts, etc.) — use email / in-app
// notifications instead.
//
// Sending is gated on SPARROW_SMS_TOKEN: when it is not set the helpers below
// no-op (the OTP flows fall back to the fixed dev code), so nothing breaks
// without a gateway configured. The sender name is SPARROW_SMS_FROM, or "Kolab"
// when that is unset.

const SMS_SENDER = env.SPARROW_SMS_FROM?.trim() || 'Kolab';

/** True when a real SMS gateway is configured and sendSms() will actually send. */
export function isSmsConfigured(): boolean {
  return Boolean(env.SPARROW_SMS_TOKEN);
}

export async function sendSms(phone: string, message: string): Promise<void> {
  if (!isSmsConfigured()) {
    logger.debug({ phone, message }, 'SMS not sent — no SMS gateway configured (Sparrow SMS)');
    return;
  }

  const res = await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: env.SPARROW_SMS_TOKEN,
      from: SMS_SENDER,
      to: phone,
      text: message,
    }),
  });

  if (!res.ok) {
    logger.error({ phone, status: res.status }, 'Sparrow SMS send failed');
  }
}

/** Signup / account-verification OTP. */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  await sendSms(phone, `Account verification code - ${code}`);
}

/** Forgot-password OTP. */
export async function sendPasswordResetOtpSms(phone: string, code: string): Promise<void> {
  await sendSms(phone, `Forgot Password Code - ${code}`);
}
