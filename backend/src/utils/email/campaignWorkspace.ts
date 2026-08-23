import { sendEmail, wrapLayout } from './core';

export async function sendPaymentSecuredEmail(
  creatorEmail: string,
  creatorName: string,
  campaignTitle: string,
  businessName: string,
  amount: number,
): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">Payment Secured!</h2>
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
      Your payment is safely held on the platform. Open the Kolab app, click <strong>"Let's Start Work"</strong> to officially start working, and deliver your best work!
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
      You'll receive a notification when the creator submits their deliverables for your review. Track the progress in the Kolab app.
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
    <p style="color:#374151;font-size:14px;margin:0;">Open the Kolab app to <strong>Approve</strong> the work or <strong>Request Revisions</strong>.</p>
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
    <p style="color:#374151;font-size:14px;margin:0;">Please address the feedback and resubmit via the Kolab app.</p>
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
      Open the Kolab app to view the full event details and connect with the brand.
    </p>
    <div style="background:#FFF7ED;border-radius:8px;padding:14px 18px;">
      <p style="margin:0;color:#92400E;font-size:13px;">
        📱 Tap the notification in your app to go directly to the event details page.
      </p>
    </div>
  `);

  await sendEmail(creatorEmail, `🎉 You're accepted for "${eventTitle}"!`, html);
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
