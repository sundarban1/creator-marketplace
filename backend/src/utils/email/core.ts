import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { isPlaceholderEmail } from '../placeholderEmail';
import { AdminRepository } from '../../modules/admin/admin.repository';

export const adminRepo = new AdminRepository();
export const DEFAULT_SUPPORT_EMAIL = 'info@ourkolab.com';

const FROM_NAME    = 'Kolab';
const FROM_ADDRESS = env.EMAIL_USERNAME ?? 'noreply@ourkolab.com';
const FROM         = `${FROM_NAME} <${FROM_ADDRESS}>`;

// Resend requires the from-address to be on a domain verified with Resend, so
// this stays on ourkolab.com rather than following EMAIL_USERNAME (which may
// be a Gmail address for the SMTP path, and would never qualify).
const RESEND_FROM = `${FROM_NAME} <noreply@ourkolab.com>`;

/** The SMTP host `createTransporter()` would pick, for logging — so a sandboxed
 *  relay (e.g. smtp.mailtrap.io, which swallows everything) is visible in the
 *  logs rather than having to be read off the host's dashboard. */
function smtpHostInUse(): string | undefined {
  if (env.EMAIL_HOST && env.EMAIL_USERNAME && env.EMAIL_PASSWORD) return env.EMAIL_HOST;
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return env.SMTP_HOST;
  return undefined;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function createTransporter() {
  // Prefer Gmail config when available
  if (env.EMAIL_HOST && env.EMAIL_USERNAME && env.EMAIL_PASSWORD) {
    const port   = parseInt(env.EMAIL_PORT ?? '465', 10);
    const secure = env.EMAIL_SECURE?.toLowerCase() === 'ssl' || port === 465;
    return nodemailer.createTransport({
      host:   env.EMAIL_HOST,
      port,
      secure,
      auth: { user: env.EMAIL_USERNAME, pass: env.EMAIL_PASSWORD },
    });
  }

  // Fallback to legacy SMTP config
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT ?? '587', 10),
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }

  // Dev fallback: log only
  return null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // A user created via Sign in with Apple without a disclosed email holds a
  // reserved non-routable placeholder address until onboarding collects a real
  // one. Never attempt delivery to it — `.invalid` can't resolve and Resend
  // would just log a hard bounce.
  if (isPlaceholderEmail(to)) {
    logger.info({ to, subject }, 'Email skipped — recipient has a placeholder address (no real email set yet)');
    return;
  }

  // Resend first, SMTP second — deliberately in that order. The SMTP path is the
  // dev/local one, and it's routinely pointed at a capture-only sandbox (Mailtrap),
  // which accepts every message and delivers none. Trying SMTP first meant a
  // sandboxed prod logged a cheerful "Email sent" while no OTP ever reached a real
  // inbox, and the Resend fallback was never reached because nothing had "failed".
  // Resend is also HTTPS-based, so it's unaffected by hosts that block outbound
  // SMTP ports. Note its free tier only delivers to the account owner's own inbox
  // until ourkolab.com is verified at resend.com/domains.
  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: RESEND_FROM, to, subject, html });
    if (!error) {
      logger.info({ to, subject }, 'Email sent (Resend)');
      return;
    }
    logger.warn({ to, subject, err: error }, 'Resend send failed, falling back to SMTP');
  }

  const transporter = createTransporter();
  if (transporter) {
    await transporter.sendMail({ from: FROM, to, subject, html });
    logger.info({ to, subject, host: smtpHostInUse() }, 'Email sent (SMTP)');
    return;
  }

  // Never downgrade this to debug: prod runs at LOG_LEVEL=info, so a debug line
  // here makes a completely unconfigured mailer indistinguishable from a working
  // one — the caller gets a resolved promise and the user gets silence.
  logger.error({ to, subject }, 'Email NOT sent — no email provider configured (set RESEND_API_KEY)');
}

// ── Shared layout ──────────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f4f4f7; margin: 0; padding: 0;
`;

export function wrapLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#4F46E5;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">⚡ Kolab</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px;border-radius:0 0 12px 12px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 0;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              © 2026 Kolab Pvt. Ltd., Kathmandu, Nepal<br>
              You received this email because you have an account on Kolab.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
