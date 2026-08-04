import { env } from '../../config/env';
import { sendEmail, wrapLayout } from './core';

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.6;">
      We received a request to reset the password for your Kolab account.
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

  await sendEmail(email, 'Reset your Kolab password', html);
}
