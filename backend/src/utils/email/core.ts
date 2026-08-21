import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
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
  // Gmail SMTP first — it can send to any recipient with no sandbox restriction.
  // Resend is the fallback: it's HTTPS-based (works even if outbound SMTP ports are
  // blocked wherever this is hosted), but on the free tier it can only deliver to
  // the account owner's own inbox until a domain is verified at resend.com/domains,
  // so it's a safety net for when SMTP is unreachable/misconfigured, not the primary
  // path.
  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({ from: FROM, to, subject, html });
      logger.info({ to, subject }, 'Email sent (SMTP)');
      return;
    } catch (err) {
      logger.warn({ to, subject, err }, 'SMTP send failed, falling back to Resend');
    }
  }

  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: RESEND_FROM, to, subject, html });
    if (error) throw new Error(`Resend: ${error.message}`);
    logger.info({ to, subject }, 'Email sent (Resend)');
    return;
  }

  logger.debug({ to, subject }, 'Email not sent (no email provider configured)');
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
