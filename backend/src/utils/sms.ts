import { env } from '../config/env';
import { logger } from '../config/logger';

// No SMS gateway is wired up yet (same situation as the phone-OTP stub in
// auth.service.ts). This is the single call site every SMS-sending feature
// should go through — once SPARROW_SMS_TOKEN/SPARROW_SMS_FROM are set, it
// starts sending for real with no other code changes required.
export async function sendSms(phone: string, message: string): Promise<void> {
  if (!env.SPARROW_SMS_TOKEN || !env.SPARROW_SMS_FROM) {
    logger.debug({ phone, message }, 'SMS not sent — no SMS gateway configured (Sparrow SMS stub)');
    return;
  }

  const res = await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: env.SPARROW_SMS_TOKEN,
      from: env.SPARROW_SMS_FROM,
      to: phone,
      text: message,
    }),
  });

  if (!res.ok) {
    logger.error({ phone, status: res.status }, 'Sparrow SMS send failed');
  }
}
