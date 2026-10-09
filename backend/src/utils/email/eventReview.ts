import { sendEmail, wrapLayout, escapeHtml } from './core';

// Event review (moderation) emails — see modules/campaign/campaign-review.service.ts.
// Admin-written feedback is untrusted text: always escaped, newlines kept.

const SIGN_OFF = `
  <p style="color:#374151;font-size:15px;margin:24px 0 0;line-height:1.6;">
    Kolab Team<br>
    <span style="color:#6b7280;">Create. Connect. Collaborate.</span><br>
    <a href="https://kolab.com.np/" style="color:#4F46E5;">https://kolab.com.np/</a>
  </p>`;

function p(text: string): string {
  return `<p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6;">${text}</p>`;
}

function feedbackBlock(label: string, text: string): string {
  return `
    <p style="color:#111827;font-size:15px;font-weight:700;margin:0 0 8px;">${escapeHtml(label)}</p>
    <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:10px;padding:16px 20px;margin:0 0 20px;color:#111827;font-size:15px;line-height:1.6;">
      ${escapeHtml(text).replace(/\n/g, '<br>')}
    </div>`;
}

// Primary button opens the web dashboard (works everywhere); the optional
// app link deep-links straight into the Kolab mobile app's event screen —
// there are no universal links yet, so it uses the app's custom scheme.
function cta(label: string, url: string, appUrl?: string): string {
  const appLink = appUrl
    ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Using the Kolab app? <a href="${escapeHtml(appUrl)}" style="color:#4F46E5;font-weight:600;">Open in the app</a></p>`
    : '';
  return `<div style="text-align:center;margin:8px 0 4px;">
    <a href="${escapeHtml(url)}" style="display:inline-block;background:#4F46E5;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 28px;border-radius:10px;">${escapeHtml(label)}</a>
    ${appLink}
  </div>`;
}

export interface EventReviewEmail { subject: string; html: string }

export function eventSubmittedAdminEmail(o: {
  eventTitle: string; businessName: string; eventType: string; resubmission: boolean; reviewUrl: string;
}): EventReviewEmail {
  return {
    subject: `New Event Awaiting Review — ${o.eventTitle}`,
    html: wrapLayout(`
      <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 16px;">${o.resubmission ? 'Event resubmitted for review' : 'New event awaiting review'}</h2>
      <div style="background:#EEF2FF;border:1.5px solid #C7D2FE;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
        <p style="margin:0 0 4px;color:#6b7280;font-size:13px;font-weight:600;">Event</p>
        <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:700;">${escapeHtml(o.eventTitle)}</p>
        <p style="margin:0 0 4px;color:#6b7280;font-size:13px;font-weight:600;">Business</p>
        <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:700;">${escapeHtml(o.businessName)}</p>
        <p style="margin:0 0 4px;color:#6b7280;font-size:13px;font-weight:600;">Type</p>
        <p style="margin:0;color:#111827;font-size:15px;font-weight:700;">${escapeHtml(o.eventType)}</p>
      </div>
      ${p('Businesses are told their event will be reviewed within 2–3 hours.')}
      ${cta('Review event', o.reviewUrl)}
    `),
  };
}

export function eventApprovedEmail(o: { businessName: string; eventTitle: string; dashboardUrl: string; appUrl?: string }): EventReviewEmail {
  return {
    subject: 'Your Kolab Event Has Been Approved',
    html: wrapLayout(`
      ${p(`Hello ${escapeHtml(o.businessName)},`)}
      ${p(`Good news! Your event, <strong>${escapeHtml(o.eventTitle)}</strong>, has been approved by the Kolab team and is now published.`)}
      ${p("Eligible creators can discover your event and submit proposals, subject to the event's requirements and application period.")}
      ${p('You can manage your event from your Kolab business dashboard.')}
      ${cta('Open my event', o.dashboardUrl, o.appUrl)}
      ${p('Thank you for being part of Kolab.')}
      ${SIGN_OFF}
    `),
  };
}

export function eventChangesRequestedEmail(o: {
  businessName: string; eventTitle: string; feedback: string; dashboardUrl: string; appUrl?: string;
}): EventReviewEmail {
  return {
    subject: 'Action Required: Please Update Your Kolab Event',
    html: wrapLayout(`
      ${p(`Hello ${escapeHtml(o.businessName)},`)}
      ${p(`Thank you for submitting <strong>${escapeHtml(o.eventTitle)}</strong> to Kolab.`)}
      ${p('Our team has reviewed your event and needs a few changes before it can be approved for publication.')}
      ${feedbackBlock('Feedback from the Kolab team:', o.feedback)}
      <p style="color:#111827;font-size:15px;font-weight:700;margin:0 0 8px;">What to do next:</p>
      ${p('Please open your event in the Kolab business dashboard, make the requested corrections and resubmit it for review.')}
      ${p('Your event will remain unpublished until it has been approved.')}
      ${cta('Edit and resubmit', o.dashboardUrl, o.appUrl)}
      ${p('Thank you for helping us maintain clear, trustworthy opportunities for creators.')}
      ${SIGN_OFF}
    `),
  };
}

export function eventRejectedEmail(o: {
  businessName: string; eventTitle: string; reason: string; resubmissionAllowed: boolean; dashboardUrl: string; appUrl?: string;
}): EventReviewEmail {
  return {
    subject: 'Update Regarding Your Kolab Event',
    html: wrapLayout(`
      ${p(`Hello ${escapeHtml(o.businessName)},`)}
      ${p(`Thank you for submitting <strong>${escapeHtml(o.eventTitle)}</strong> to Kolab.`)}
      ${p('After reviewing your submission, our team has decided not to approve this event.')}
      ${feedbackBlock('Reason:', o.reason)}
      ${o.resubmissionAllowed
        ? p('Corrections are permitted for this event: please review the feedback and use your business dashboard to edit and resubmit it.')
        : p('Resubmission is not available for this event. Please contact the Kolab team through our existing support channel if you need clarification.')}
      ${cta('View my event', o.dashboardUrl, o.appUrl)}
      ${p('We appreciate your interest in collaborating with creators through Kolab.')}
      ${SIGN_OFF}
    `),
  };
}

/**
 * Any other admin action on a business's event (pause, reactivate, close,
 * cancel, expire, remove). Copy per action lives in campaign-review.service.ts
 * (ADMIN_ACTION_COPY) so the bell, push and email always say the same thing.
 */
export function eventAdminActionEmail(o: {
  businessName: string; eventTitle: string; subject: string; heading: string; message: string;
  dashboardUrl: string; ctaLabel: string; appUrl?: string;
}): EventReviewEmail {
  return {
    subject: o.subject,
    html: wrapLayout(`
      ${p(`Hello ${escapeHtml(o.businessName)},`)}
      <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px;">${escapeHtml(o.heading)}</h2>
      ${p(escapeHtml(o.message))}
      ${cta(o.ctaLabel, o.dashboardUrl, o.appUrl)}
      ${p('If you have any questions, please contact the Kolab team through our existing support channel.')}
      ${SIGN_OFF}
    `),
  };
}

export async function sendEventReviewEmail(to: string, e: EventReviewEmail): Promise<void> {
  await sendEmail(to, e.subject, e.html);
}
