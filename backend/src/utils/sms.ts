import { env } from '../config/env';
import { logger } from '../config/logger';

// SMS is reserved for phone-number OTPs only — signup / account verification and
// forgot-password (both in auth.service.ts). Do not use this for other
// notifications (verification results, alerts, etc.) — use email / in-app
// notifications instead.
//
// Two gateways: SMS Pasal (primary) and Sparrow SMS (fallback). sendSms() sends
// via SMS Pasal when SMSPASAL_API_KEY is set; if that call fails it retries via
// Sparrow when SPARROW_SMS_TOKEN is set. When neither is configured the helpers
// below no-op (the OTP flows fall back to the fixed dev code and just log), so
// nothing breaks without a gateway configured.

const SMSPASAL_URL = 'https://sms.smspasal.com/smsapi/index.php';
const DEFAULT_SENDER = 'Kolab';

const SMSPASAL_SENDER = env.SMSPASAL_SENDER_ID?.trim() || DEFAULT_SENDER;
const SPARROW_SENDER = env.SPARROW_SMS_FROM?.trim() || DEFAULT_SENDER;

function isSmsPasalConfigured(): boolean {
  return Boolean(env.SMSPASAL_API_KEY);
}

function isSparrowConfigured(): boolean {
  return Boolean(env.SPARROW_SMS_TOKEN);
}

/** True when a real SMS gateway is configured and sendSms() will actually send. */
export function isSmsConfigured(): boolean {
  return isSmsPasalConfigured() || isSparrowConfigured();
}

// Returns true when the message was accepted by the gateway.
async function sendViaSmsPasal(phone: string, message: string): Promise<boolean> {
  const params = new URLSearchParams({
    key: env.SMSPASAL_API_KEY!,
    type: 'text',
    responsetype: 'json',
    contacts: phone,
    senderid: SMSPASAL_SENDER,
    msg: message,
  });
  if (env.SMSPASAL_CAMPAIGN_ID) params.set('campaign', env.SMSPASAL_CAMPAIGN_ID);
  if (env.SMSPASAL_ROUTE_ID) params.set('routeid', env.SMSPASAL_ROUTE_ID);

  try {
    const res = await fetch(`${SMSPASAL_URL}?${params.toString()}`);
    const body = await res.text();

    // Success: JSON body with response_code 200, or the plain-text
    // "SMS-SHOOT-ID/..." form. Errors come back as "ERR: {MESSAGE}".
    let ok = res.ok && !body.trimStart().startsWith('ERR:');
    if (ok && body.trimStart().startsWith('{')) {
      try {
        ok = JSON.parse(body).response_code === 200;
      } catch {
        // Non-JSON despite the leading brace — treat as a soft success only if
        // it carries a shoot id.
        ok = body.includes('SMS-SHOOT-ID');
      }
    }

    if (!ok) {
      logger.error({ phone, status: res.status, body: body.slice(0, 200) }, 'SMS Pasal send failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ phone, err }, 'SMS Pasal send threw');
    return false;
  }
}

// Returns true when the message was accepted by the gateway.
async function sendViaSparrow(phone: string, message: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: env.SPARROW_SMS_TOKEN,
        from: SPARROW_SENDER,
        to: phone,
        text: message,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error({ phone, status: res.status, body: body.slice(0, 200) }, 'Sparrow SMS send failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ phone, err }, 'Sparrow SMS send threw');
    return false;
  }
}

export async function sendSms(phone: string, message: string): Promise<void> {
  if (isSmsPasalConfigured()) {
    if (await sendViaSmsPasal(phone, message)) return;
    if (isSparrowConfigured()) {
      logger.warn({ phone }, 'SMS Pasal failed — falling back to Sparrow SMS');
    }
  }

  if (isSparrowConfigured()) {
    if (await sendViaSparrow(phone, message)) return;
    logger.error({ phone }, 'All SMS gateways failed — message not delivered');
    return;
  }

  if (!isSmsPasalConfigured()) {
    logger.debug({ phone, message }, 'SMS not sent — no SMS gateway configured');
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
