"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = sendOtpEmail;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const FROM_NAME = 'CreatorMarket';
const FROM_ADDRESS = env_1.env.EMAIL_USERNAME ?? 'no-reply@creatormarket.com';
const FROM = `"${FROM_NAME}" <${FROM_ADDRESS}>`;
function createTransporter() {
    // Prefer Gmail config when available
    if (env_1.env.EMAIL_HOST && env_1.env.EMAIL_USERNAME && env_1.env.EMAIL_PASSWORD) {
        const port = parseInt(env_1.env.EMAIL_PORT ?? '465', 10);
        const secure = env_1.env.EMAIL_SECURE?.toLowerCase() === 'ssl' || port === 465;
        return nodemailer_1.default.createTransport({
            host: env_1.env.EMAIL_HOST,
            port,
            secure,
            auth: { user: env_1.env.EMAIL_USERNAME, pass: env_1.env.EMAIL_PASSWORD },
        });
    }
    // Fallback to legacy SMTP config
    if (env_1.env.SMTP_HOST && env_1.env.SMTP_USER && env_1.env.SMTP_PASS) {
        return nodemailer_1.default.createTransport({
            host: env_1.env.SMTP_HOST,
            port: parseInt(env_1.env.SMTP_PORT ?? '587', 10),
            auth: { user: env_1.env.SMTP_USER, pass: env_1.env.SMTP_PASS },
        });
    }
    // Dev fallback: log only
    return null;
}
async function sendEmail(to, subject, html) {
    const transporter = createTransporter();
    if (!transporter) {
        console.log('\n📧 [DEV] Email not sent (no SMTP configured):');
        console.log(`  To:      ${to}`);
        console.log(`  Subject: ${subject}\n`);
        return;
    }
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`📧 Email sent → ${to} | ${subject}`);
}
// ── Templates ─────────────────────────────────────────────────────────────────
const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f4f4f7; margin: 0; padding: 0;
`;
function wrapLayout(content) {
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
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">⚡ CreatorMarket</span>
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
              © 2026 CreatorMarket Pvt. Ltd., Kathmandu, Nepal<br>
              You received this email because you have an account on CreatorMarket.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
// ── OTP / Verification ────────────────────────────────────────────────────────
async function sendOtpEmail(email, code) {
    const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">Verify your email</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 28px;line-height:1.6;">
      Enter the 6-digit code below to complete your sign-up. It expires in <strong>10 minutes</strong>.
    </p>

    <!-- OTP Box -->
    <div style="background:#f5f3ff;border:2px solid #4F46E5;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
      <span style="font-size:42px;font-weight:800;letter-spacing:14px;color:#4F46E5;font-variant-numeric:tabular-nums;">
        ${code}
      </span>
    </div>

    <p style="color:#9ca3af;font-size:13px;margin:0;line-height:1.6;">
      Didn't create an account? You can safely ignore this email.
    </p>
  `);
    await sendEmail(email, 'Your CreatorMarket verification code', html);
    console.log(`🔑 OTP for ${email}: ${code}`);
}
// ── Welcome Email ─────────────────────────────────────────────────────────────
async function sendWelcomeEmail(email, name, role) {
    const isCreator = role === 'CREATOR';
    const steps = isCreator
        ? [
            { icon: '🎯', text: 'Complete your creator profile and link your social accounts' },
            { icon: '🔍', text: 'Browse campaigns that match your niche and audience' },
            { icon: '📝', text: 'Submit compelling proposals to get hired by top brands' },
            { icon: '💰', text: 'Deliver great content and get paid via eSewa, Khalti, or FonePay' },
        ]
        : [
            { icon: '🏢', text: 'Complete your business profile and add your brand details' },
            { icon: '📢', text: 'Create your first campaign with clear goals and budget' },
            { icon: '🤝', text: 'Review proposals from talented creators in your niche' },
            { icon: '🚀', text: 'Collaborate, review results and track campaign performance' },
        ];
    const ctaText = isCreator ? 'Start Exploring Campaigns' : 'Create Your First Campaign';
    const tagline = isCreator
        ? 'Turn your passion into earnings.'
        : 'Connect with creators who bring your brand to life.';
    const stepsHtml = steps.map((s) => `
    <tr>
      <td style="padding:8px 0;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:22px;padding-right:12px;vertical-align:top;">${s.icon}</td>
            <td style="color:#374151;font-size:14px;line-height:1.6;vertical-align:top;">${s.text}</td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');
    const html = wrapLayout(`
    <!-- Greeting -->
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 4px;">
      Welcome aboard, ${name}! 🎉
    </h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 24px;">${tagline}</p>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">

    <p style="color:#374151;font-size:15px;font-weight:600;margin:0 0 16px;">Here's how to get started:</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      ${stepsHtml}
    </table>

    <!-- CTA Button -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${env_1.env.FRONTEND_URL}"
         style="display:inline-block;background:#4F46E5;color:#fff;font-size:15px;font-weight:600;
                padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.2px;">
        ${ctaText}
      </a>
    </div>

    <p style="color:#9ca3af;font-size:13px;margin:0;line-height:1.6;">
      Need help? Reply to this email or visit our Help Center inside the app.
    </p>
  `);
    await sendEmail(email, `Welcome to CreatorMarket, ${name}!`, html);
}
// ── Password Reset ────────────────────────────────────────────────────────────
async function sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${env_1.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.6;">
      We received a request to reset the password for your CreatorMarket account.
      Click the button below — this link expires in <strong>1 hour</strong>.
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:#4F46E5;color:#fff;font-size:15px;font-weight:600;
                padding:14px 32px;border-radius:8px;text-decoration:none;">
        Reset Password
      </a>
    </div>

    <p style="color:#9ca3af;font-size:13px;margin:0;line-height:1.6;">
      If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
      Or copy this link: <a href="${resetUrl}" style="color:#4F46E5;">${resetUrl}</a>
    </p>
  `);
    await sendEmail(email, 'Reset your CreatorMarket password', html);
}
//# sourceMappingURL=email.js.map