import { sendEmail, wrapLayout, escapeHtml } from './core';

// One generic template for every collaboration reminder/update email (see
// modules/notifications/notify.ts) — what happened, what to do, and a single
// CTA. Per-event copy lives with the event, not here, so adding a reminder
// never needs a new email function.
export interface ActionEmail {
  subject: string;
  heading: string;
  /** Plain text — escaped here. */
  paragraphs: string[];
  /** Optional label/value rows (campaign, deadline, amount …) rendered as a card. */
  details?: Array<{ label: string; value: string }>;
  cta?: { label: string; url: string };
}

export function renderActionEmail(e: ActionEmail): string {
  const paras = e.paragraphs
    .map((p) => `<p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6;">${escapeHtml(p)}</p>`)
    .join('');
  const details = e.details?.length
    ? `<div style="background:#EEF2FF;border:1.5px solid #C7D2FE;border-radius:10px;padding:20px 24px;margin:0 0 24px;">${e.details
        .map((d, i) => `
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px;font-weight:600;">${escapeHtml(d.label)}</p>
          <p style="margin:0 0 ${i === e.details!.length - 1 ? 0 : 12}px;color:#111827;font-size:15px;font-weight:700;">${escapeHtml(d.value)}</p>`)
        .join('')}</div>`
    : '';
  const cta = e.cta
    ? `<div style="text-align:center;margin:8px 0 4px;">
         <a href="${escapeHtml(e.cta.url)}" style="display:inline-block;background:#4F46E5;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 28px;border-radius:10px;">${escapeHtml(e.cta.label)}</a>
       </div>`
    : '';
  return wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 16px;">${escapeHtml(e.heading)}</h2>
    ${paras}
    ${details}
    ${cta}
  `);
}

export async function sendActionEmail(to: string, e: ActionEmail): Promise<void> {
  await sendEmail(to, e.subject, renderActionEmail(e));
}
