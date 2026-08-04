import { env } from '../../config/env';
import { sendEmail, wrapLayout } from './core';

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

  await sendEmail(email, `Welcome to Kolab, ${name}!`, html);
}
