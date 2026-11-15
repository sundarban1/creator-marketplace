import { DEFAULT_SUPPORT_EMAIL, escapeHtml, sendEmail, wrapLayout } from './core';

// Out-of-app alert for URGENT reports. Deliberately carries no reporter
// identity and no content — moderators open the dashboard for that.
export async function sendUrgentReportAlert(to: string[], p: { reportId: string; reason: string; targetLabel: string; dashboardUrl: string }): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:20px;font-weight:700;margin:0 0 8px;">Urgent safety report</h2>
    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6;">
      A report marked <strong>urgent</strong> (${escapeHtml(p.reason.replace(/_/g, ' ').toLowerCase())}) was submitted against
      <strong>${escapeHtml(p.targetLabel)}</strong> and needs review.
    </p>
    <p style="margin:0 0 20px;"><a href="${escapeHtml(p.dashboardUrl)}" style="background:#4F46E5;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;">Open report ${escapeHtml(p.reportId.slice(-8))}</a></p>
    <p style="color:#9ca3af;font-size:12px;margin:0;">Sent because this inbox is listed in MODERATION_ALERT_EMAILS.</p>
  `);
  await Promise.all(to.map((addr) => sendEmail(addr, 'Kolab: urgent safety report needs review', html)));
}

// Sent to the account owner when a moderator acts on their content/account.
export async function sendModerationNoticeEmail(to: string, p: { title: string; body: string; reason: string }): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">${escapeHtml(p.title)}</h2>
    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6;">${escapeHtml(p.body)}</p>
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Reason:</strong> ${escapeHtml(p.reason)}</p>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
      Please review the Kolab Community Guidelines. If you believe this was a mistake, you can appeal by replying to
      <a href="mailto:${DEFAULT_SUPPORT_EMAIL}">${DEFAULT_SUPPORT_EMAIL}</a> with the details.
    </p>
  `);
  await sendEmail(to, `Kolab: ${p.title}`, html);
}
