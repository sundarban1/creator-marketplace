import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { sendEmail, wrapLayout } from './core';

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

  await sendEmail(email, 'Your Kolab verification code', html);
  if (env.NODE_ENV !== 'production') logger.debug({ email, code }, 'OTP email issued');
}

export async function sendPasswordResetOtpEmail(email: string, code: string): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 28px;line-height:1.6;">
      Enter the 6-digit code below to reset your Kolab password. It expires in <strong>10 minutes</strong>.
    </p>

    <div style="background:#f5f3ff;border:2px solid #4F46E5;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
      <span style="font-size:42px;font-weight:800;letter-spacing:14px;color:#4F46E5;font-variant-numeric:tabular-nums;">
        ${code}
      </span>
    </div>

    <p style="color:#9ca3af;font-size:13px;margin:0;line-height:1.6;">
      Didn't request this? You can safely ignore this email — your password won't change.
    </p>
  `);

  await sendEmail(email, 'Your Kolab password reset code', html);
  if (env.NODE_ENV !== 'production') logger.debug({ email, code }, 'Password reset OTP email issued');
}
