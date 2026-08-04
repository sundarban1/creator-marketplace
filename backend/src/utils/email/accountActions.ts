import { adminRepo, DEFAULT_SUPPORT_EMAIL, escapeHtml, sendEmail, wrapLayout } from './core';

export async function sendAccountSuspendedEmail(email: string, name: string): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:22px;font-weight:700;margin:0 0 8px;">Your account has been suspended</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${name}</strong>, your Kolab account has been temporarily suspended by an administrator.
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
  await sendEmail(email, 'Your Kolab account has been suspended', html);
}

export async function sendAccountReactivatedEmail(email: string, name: string): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#059669;font-size:22px;font-weight:700;margin:0 0 8px;">Your account has been reactivated</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${name}</strong>, great news — your Kolab account has been reactivated. You can now log in and use the platform normally.
    </p>
    <p style="color:#9ca3af;font-size:13px;margin:0;">
      If you have any questions, please contact our support team through the app.
    </p>
  `);
  await sendEmail(email, 'Your Kolab account has been reactivated', html);
}

export async function sendAccountVerifiedEmail(email: string, name: string, kind: 'creator' | 'business'): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#059669;font-size:22px;font-weight:700;margin:0 0 8px;">You're verified! ✅</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${name}</strong>, congratulations — your ${kind === 'creator' ? 'creator' : 'business'} account has been verified by our team. A verified badge now appears next to your name across the app.
    </p>
    <p style="color:#9ca3af;font-size:13px;margin:0;">
      If you have any questions, please contact our support team through the app.
    </p>
  `);
  await sendEmail(email, "You're verified! ✅", html);
}

export async function sendVerificationRejectedEmail(email: string, name: string, reason: string, kind: 'creator' | 'business'): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:22px;font-weight:700;margin:0 0 8px;">Verification not approved</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${escapeHtml(name)}</strong>, your ${kind === 'creator' ? 'creator' : 'business'} verification documents could not be approved.
    </p>
    <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#991B1B;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin:0;">
      You can re-upload your documents from the Verification section of the app at any time.
    </p>
  `);
  await sendEmail(email, 'Verification not approved', html);
}

export async function sendAccountDeletedEmail(email: string, name: string): Promise<void> {
  const supportEmail = (await adminRepo.getSetting('platform.supportEmail')) as string | null;
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:22px;font-weight:700;margin:0 0 8px;">Your account has been deleted</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;line-height:1.6;">
      Hi <strong>${name}</strong>, your Kolab account and all associated data have been permanently deleted by an administrator.
    </p>
    <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#991B1B;font-size:14px;line-height:1.6;">
        This action is permanent and cannot be undone. All your data, campaigns, proposals, and messages have been removed from our system.
      </p>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin:0;">
      If you believe this was done in error, please contact us immediately at ${escapeHtml(supportEmail || DEFAULT_SUPPORT_EMAIL)}.
    </p>
  `);
  await sendEmail(email, 'Your Kolab account has been deleted', html);
}
