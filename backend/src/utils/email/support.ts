import { sendEmail, wrapLayout } from './core';

function attachmentsRowHtml(urls: string[] | undefined, accentColor: string): string {
  if (!urls || urls.length === 0) return '';
  const links = urls
    .map((url, i) => `<a href="${url}" style="color:${accentColor};text-decoration:underline;">Image ${i + 1}</a>`)
    .join(' &nbsp;·&nbsp; ');
  return `
      <tr>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;border-top:1px solid #e5e7eb;">Attachments</td>
        <td style="padding:10px 16px;font-size:14px;border-top:1px solid #e5e7eb;">${links}</td>
      </tr>`;
}

export async function sendSupportNotification(opts: {
  adminEmail: string;
  userEmail: string;
  topic: string;
  message: string;
  attachmentUrls?: string[];
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
      </tr>${attachmentsRowHtml(opts.attachmentUrls, '#4F46E5')}
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
  attachmentUrls?: string[];
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
      </tr>${attachmentsRowHtml(opts.attachmentUrls, '#DC2626')}
    </table>

    <p style="color:#9ca3af;font-size:12px;margin:0;">Log in to the admin dashboard to review and manage this report.</p>
  `);

  await sendEmail(opts.adminEmail, `[Report] ${opts.type} — ${opts.userEmail}`, html);
}
