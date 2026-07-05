import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

const FROM_NAME    = 'CreatorMarket';
const FROM_ADDRESS = env.EMAIL_USERNAME ?? 'no-reply@creatormarket.com';
const FROM         = `"${FROM_NAME}" <${FROM_ADDRESS}>`;

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

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    logger.debug({ to, subject }, 'Email not sent (no SMTP configured)');
    return;
  }

  await transporter.sendMail({ from: FROM, to, subject, html });
  logger.info({ to, subject }, 'Email sent');
}

// ── Templates ─────────────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f4f4f7; margin: 0; padding: 0;
`;

function wrapLayout(content: string): string {
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

export async function sendOtpEmail(email: string, code: string): Promise<void> {
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
  if (env.NODE_ENV !== 'production') logger.debug({ email, code }, 'OTP email issued');
}

// ── Welcome Email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: 'CREATOR' | 'BUSINESS'
): Promise<void> {
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

  const ctaText  = isCreator ? 'Start Exploring Campaigns' : 'Create Your First Campaign';
  const tagline  = isCreator
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
      <a href="${env.FRONTEND_URL}"
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

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

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

// ── Support / Report Notifications ───────────────────────────────────────────

export async function sendSupportNotification(opts: {
  adminEmail: string;
  userEmail: string;
  topic: string;
  message: string;
}): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 6px;">📬 New Support Request</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">A user has submitted a contact support request.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr style="background:#f9fafb;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;width:90px;">From</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;">${opts.userEmail}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;border-top:1px solid #e5e7eb;">Topic</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${opts.topic}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;border-top:1px solid #e5e7eb;vertical-align:top;">Message</td>
        <td style="padding:10px 16px;font-size:14px;color:#374151;border-top:1px solid #e5e7eb;line-height:1.6;">${opts.message.replace(/\n/g, '<br>')}</td>
      </tr>
    </table>

    <p style="color:#9ca3af;font-size:12px;margin:0;">Log in to the admin dashboard to respond to this request.</p>
  `);

  await sendEmail(opts.adminEmail, `[Support] ${opts.topic} — ${opts.userEmail}`, html);
}

export async function sendReportNotification(opts: {
  adminEmail: string;
  userEmail: string;
  type: string;
  description: string;
}): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:20px;font-weight:700;margin:0 0 6px;">🚨 New Issue Report</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">A user has submitted an issue report that requires your attention.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;border:1px solid #fecaca;border-radius:10px;overflow:hidden;">
      <tr style="background:#fef2f2;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;width:90px;">From</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;">${opts.userEmail}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;border-top:1px solid #fecaca;">Type</td>
        <td style="padding:10px 16px;font-size:14px;color:#DC2626;font-weight:600;border-top:1px solid #fecaca;">${opts.type}</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;border-top:1px solid #fecaca;vertical-align:top;">Description</td>
        <td style="padding:10px 16px;font-size:14px;color:#374151;border-top:1px solid #fecaca;line-height:1.6;">${opts.description.replace(/\n/g, '<br>')}</td>
      </tr>
    </table>

    <p style="color:#9ca3af;font-size:12px;margin:0;">Log in to the admin dashboard to review and manage this report.</p>
  `);

  await sendEmail(opts.adminEmail, `[Report] ${opts.type} — ${opts.userEmail}`, html);
}

// ── Campaign Workspace Emails ──────────────────────────────────────────────────

export async function sendPaymentSecuredEmail(
  creatorEmail: string,
  creatorName: string,
  campaignTitle: string,
  businessName: string,
  amount: number,
): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">💰 Payment Secured!</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${creatorName}</strong>, great news! <strong>${businessName}</strong> has secured payment for your campaign.
    </p>
    <div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 6px;color:#374151;font-size:14px;font-weight:600;">Campaign</p>
      <p style="margin:0 0 14px;color:#111827;font-size:16px;font-weight:700;">${campaignTitle}</p>
      <p style="margin:0 0 6px;color:#374151;font-size:14px;font-weight:600;">Amount Secured</p>
      <p style="margin:0;color:#16A34A;font-size:22px;font-weight:800;">NPR ${amount.toLocaleString()}</p>
    </div>
    <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Your payment is safely held on the platform. Open the CreatorMarket app, click <strong>"Let's Create Content"</strong> to officially start working, and deliver your best work!
    </p>
    <div style="background:#FFF7ED;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;color:#92400E;font-size:13px;">⏰ Please start work within <strong>48 hours</strong> to keep the campaign on track.</p>
    </div>
  `);
  await sendEmail(creatorEmail, `💰 Payment secured for "${campaignTitle}"`, html);
}

export async function sendWorkStartedEmail(
  businessEmail: string,
  businessName: string,
  campaignTitle: string,
  creatorName: string,
): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">🚀 Creator Started Working!</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${businessName}</strong>, <strong>${creatorName}</strong> has officially started working on your campaign.
    </p>
    <div style="background:#EEF2FF;border:1.5px solid #C7D2FE;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 6px;color:#374151;font-size:14px;font-weight:600;">Campaign</p>
      <p style="margin:0;color:#111827;font-size:16px;font-weight:700;">${campaignTitle}</p>
    </div>
    <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.6;">
      You'll receive a notification when the creator submits their deliverables for your review. Track the progress in the CreatorMarket app.
    </p>
  `);
  await sendEmail(businessEmail, `🚀 ${creatorName} started on "${campaignTitle}"`, html);
}

export async function sendWorkSubmittedEmail(
  businessEmail: string,
  businessName: string,
  campaignTitle: string,
  creatorName: string,
  deliverableUrls?: string | null,
): Promise<void> {
  const urlSection = deliverableUrls
    ? `<div style="background:#F3F4F6;border-radius:8px;padding:14px 18px;margin-bottom:20px;word-break:break-all;">
         <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;">Deliverable Links</p>
         <p style="margin:0;color:#4F46E5;font-size:14px;">${deliverableUrls.replace(/\n/g, '<br>')}</p>
       </div>`
    : '';
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">📤 Deliverables Submitted!</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${businessName}</strong>, <strong>${creatorName}</strong> has submitted their work for <strong>${campaignTitle}</strong>. Please review within 5 days.
    </p>
    ${urlSection}
    <div style="background:#FFF7ED;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;color:#92400E;font-size:13px;">⏰ If no action is taken within <strong>5 days</strong>, the work will be auto-approved.</p>
    </div>
    <p style="color:#374151;font-size:14px;margin:0;">Open the CreatorMarket app to <strong>Approve</strong> the work or <strong>Request Revisions</strong>.</p>
  `);
  await sendEmail(businessEmail, `📤 ${creatorName} submitted work for "${campaignTitle}"`, html);
}

export async function sendWorkApprovedEmail(
  creatorEmail: string,
  creatorName: string,
  campaignTitle: string,
  amount: number,
): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">🎉 Work Approved!</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Congratulations <strong>${creatorName}</strong>! Your work on <strong>${campaignTitle}</strong> has been approved.
    </p>
    <div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Payment Released</p>
      <p style="margin:0;color:#16A34A;font-size:28px;font-weight:800;">NPR ${amount.toLocaleString()}</p>
    </div>
    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6;">
      Your earnings have been added to your wallet. Open the app to withdraw anytime via eSewa, Khalti, or Bank Transfer.
    </p>
  `);
  await sendEmail(creatorEmail, `🎉 Payment released for "${campaignTitle}"`, html);
}

export async function sendRevisionRequestEmail(
  creatorEmail: string,
  creatorName: string,
  campaignTitle: string,
  note: string,
): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">✏️ Revision Requested</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${creatorName}</strong>, the brand has requested some changes to your submission for <strong>${campaignTitle}</strong>.
    </p>
    <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#92400E;font-size:13px;font-weight:700;text-transform:uppercase;">Revision Notes</p>
      <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">${note.replace(/\n/g, '<br>')}</p>
    </div>
    <p style="color:#374151;font-size:14px;margin:0;">Please address the feedback and resubmit via the CreatorMarket app.</p>
  `);
  await sendEmail(creatorEmail, `✏️ Revision needed for "${campaignTitle}"`, html);
}

export async function sendEventAcceptedEmail(
  creatorEmail: string,
  creatorName: string,
  eventTitle: string,
  businessName: string,
  eventDate?: Date | null,
  venue?: string | null,
  benefits?: string[],
): Promise<void> {
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const eventDateHtml = eventDate
    ? `<tr><td style="padding:8px 0;border-top:1px solid #e5e7eb;">
         <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Event Date</span><br>
         <span style="font-size:15px;color:#111827;font-weight:600;">📅 ${fmtDate(eventDate)}</span>
       </td></tr>`
    : '';

  const venueHtml = venue
    ? `<tr><td style="padding:8px 0;border-top:1px solid #e5e7eb;">
         <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Venue</span><br>
         <span style="font-size:15px;color:#111827;font-weight:600;">📍 ${venue}</span>
       </td></tr>`
    : '';

  const benefitsList = benefits && benefits.length > 0
    ? benefits.map(b => `<li style="color:#374151;font-size:14px;margin:4px 0;">${b}</li>`).join('')
    : null;

  const benefitsHtml = benefitsList
    ? `<div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;padding:16px 20px;margin-top:16px;">
         <p style="margin:0 0 10px;color:#166534;font-size:13px;font-weight:700;text-transform:uppercase;">What You Get</p>
         <ul style="margin:0;padding-left:18px;">${benefitsList}</ul>
       </div>`
    : '';

  const html = wrapLayout(`
    <h2 style="color:#059669;font-size:22px;font-weight:700;margin:0 0 8px;">🎉 You're In! Event Accepted</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${creatorName}</strong>! <strong>${businessName}</strong> has accepted your proposal for the following event.
    </p>

    <div style="background:#ECFDF5;border:1.5px solid #A7F3D0;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#065F46;font-size:12px;font-weight:700;text-transform:uppercase;">Free Event</p>
      <p style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:800;">${eventTitle}</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:8px 0;">
          <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Hosted By</span><br>
          <span style="font-size:15px;color:#111827;font-weight:600;">🏢 ${businessName}</span>
        </td></tr>
        ${eventDateHtml}
        ${venueHtml}
      </table>
      ${benefitsHtml}
    </div>

    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6;">
      Open the CreatorMarket app to view the full event details and connect with the brand.
    </p>
    <div style="background:#FFF7ED;border-radius:8px;padding:14px 18px;">
      <p style="margin:0;color:#92400E;font-size:13px;">
        📱 Tap the notification in your app to go directly to the event details page.
      </p>
    </div>
  `);

  await sendEmail(creatorEmail, `🎉 You're accepted for "${eventTitle}"!`, html);
}

// ── Admin Account Actions ─────────────────────────────────────────────────────

export async function sendAccountSuspendedEmail(email: string, name: string): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:22px;font-weight:700;margin:0 0 8px;">Your account has been suspended</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${name}</strong>, your CreatorMarket account has been temporarily suspended by an administrator.
    </p>
    <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#991B1B;font-size:14px;line-height:1.6;">
        You will not be able to log in while your account is suspended. If you believe this is a mistake,
        please contact our support team.
      </p>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin:0;">
      This action was taken in accordance with our Terms of Service. Your data remains intact and may be reinstated upon review.
    </p>
  `);
  await sendEmail(email, 'Your CreatorMarket account has been suspended', html);
}

export async function sendAccountReactivatedEmail(email: string, name: string): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#059669;font-size:22px;font-weight:700;margin:0 0 8px;">Your account has been reactivated</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${name}</strong>, great news — your CreatorMarket account has been reactivated. You can now log in and use the platform normally.
    </p>
    <p style="color:#9ca3af;font-size:13px;margin:0;">
      If you have any questions, please contact our support team through the app.
    </p>
  `);
  await sendEmail(email, 'Your CreatorMarket account has been reactivated', html);
}

export async function sendAccountDeletedEmail(email: string, name: string): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:22px;font-weight:700;margin:0 0 8px;">Your account has been deleted</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${name}</strong>, your CreatorMarket account and all associated data have been permanently deleted by an administrator.
    </p>
    <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#991B1B;font-size:14px;line-height:1.6;">
        This action is permanent and cannot be undone. All your data, campaigns, proposals, and messages have been removed from our system.
      </p>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin:0;">
      If you believe this was done in error, please contact us immediately at support@creatormarket.com.np.
    </p>
  `);
  await sendEmail(email, 'Your CreatorMarket account has been deleted', html);
}

export async function sendCampaignCancelledEmail(
  recipientEmail: string,
  recipientName: string,
  campaignTitle: string,
  isCreator: boolean,
  refundNote?: string,
): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:22px;font-weight:700;margin:0 0 8px;">Campaign Cancelled</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${recipientName}</strong>, the campaign <strong>${campaignTitle}</strong> has been cancelled.
    </p>
    ${isCreator && refundNote ? `
    <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;color:#DC2626;font-size:14px;">${refundNote}</p>
    </div>` : ''}
    <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">
      If you have any questions, please contact our support team through the app.
    </p>
  `);
  await sendEmail(
    recipientEmail,
    `Campaign cancelled: "${campaignTitle}"`,
    html,
  );
}
