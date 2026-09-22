import { sendEmail, wrapLayout } from './core';
import type { CreatorMeetup } from '@prisma/client';

function formatEventDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/** Meetup logistics are frequently unset when a meetup is first created (spec §16/§17)
 *  — returns each known field as its own line, or null when none of
 *  date/time/venue are set yet, so each email can supply its own "announced
 *  soon" copy around that instead of ever interpolating a blank value. */
function logisticsRows(meetup: CreatorMeetup): string[] | null {
  const eventDate = formatEventDate(meetup.eventDate);
  const rows: string[] = [];
  if (eventDate) rows.push(`📅 <strong>Date:</strong> ${eventDate}`);
  if (meetup.eventStartTime) {
    const time = meetup.eventEndTime ? `${meetup.eventStartTime} – ${meetup.eventEndTime}` : meetup.eventStartTime;
    rows.push(`⏰ <strong>Time:</strong> ${time}`);
  }
  if (meetup.venueName) {
    const venue = meetup.venueAddress ? `${meetup.venueName}, ${meetup.venueAddress}` : meetup.venueName;
    rows.push(`📍 <strong>Venue:</strong> ${venue}`);
  }
  return rows.length > 0 ? rows : null;
}

function rowsToTable(rows: string[]): string {
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
    ${rows.map((r) => `<tr><td style="padding:4px 0;color:#374151;font-size:14px;line-height:1.6;">${r}</td></tr>`).join('')}
  </table>`;
}

function cityLine(meetup: CreatorMeetup): string {
  return meetup.district ? `${meetup.city}, ${meetup.district}` : meetup.city;
}

/** Sent immediately on registration (meetup.service.ts's `register`) — a
 *  courtesy confirmation, not a decision; the creator is PENDING until an
 *  admin accepts/rejects (sendMeetupInvitationEmail below). */
export async function sendMeetupRegistrationConfirmationEmail(
  email: string,
  creatorName: string,
  meetup: CreatorMeetup,
): Promise<void> {
  // Deliberately never shows real logistics here, even if the meetup already
  // has them set — those are only confirmed to creators once they're actually
  // invited (sendMeetupInvitationEmail below). A PENDING registration hasn't
  // been decided yet.
  const logisticsHtml = `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
    Keep an eye on Kolab's official social media pages — we'll be posting the event date, time and venue there shortly.
  </p>`;

  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 4px;">
      You're on the list! 🎉
    </h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 24px;">Hi ${creatorName},</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Thank you so much for registering for the <strong>${meetup.title}!</strong> 🎉
    </p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      We're excited to see your interest in joining us and connecting with other creators from the community.
    </p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      We've successfully received your registration. <strong>We're currently receiving a large number of registrations from creators, and our team will carefully review them before sending invitations to selected creators.</strong>
    </p>

    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
      📍 <strong>City:</strong> ${cityLine(meetup)}
    </p>

    ${logisticsHtml}

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Thank you again for your interest in Kolab. We can't wait to bring creators together, share ideas, have some fun, and connect with the creator community. 💛
    </p>

    <p style="color:#374151;font-size:14px;margin:0;">
      <strong>Team Kolab</strong><br>
      kolab.com.np
    </p>
  `);

  await sendEmail(email, `We've received your registration for the ${meetup.title} 🎉`, html);
}

/** Sent when an admin accepts a PENDING registration (meetup.service.ts's `accept`). */
export async function sendMeetupInvitationEmail(email: string, creatorName: string, meetup: CreatorMeetup): Promise<void> {
  const rows = logisticsRows(meetup);
  const logisticsHtml = `
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 4px;"><strong>Event date, time and venue:</strong></p>
    ${
      rows
        ? rowsToTable(rows)
        : `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
            These details will be announced soon on Kolab's official social media pages.
          </p>`
    }
  `;

  const html = wrapLayout(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 4px;">
      You're Invited to the ${meetup.title} 🎉
    </h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 24px;">Hi ${creatorName},</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Thank you for registering for the <strong>${meetup.title}</strong>.
    </p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      We're excited to let you know that <strong>your registration has been reviewed and you have been invited to join the meetup!</strong> 🎉
    </p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Your registration was your request to attend, and this email confirms that you have now been selected and invited to participate.
    </p>

    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
      📍 <strong>City:</strong> ${cityLine(meetup)}
    </p>

    ${logisticsHtml}

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Please keep an eye on Kolab's official social media pages for event updates and further information.
    </p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
      We look forward to meeting you and connecting with you at the meetup! 🎉
    </p>

    <p style="color:#374151;font-size:14px;margin:0;">
      <strong>Team Kolab</strong><br>
      kolab.com.np
    </p>
  `);

  await sendEmail(email, `You're Invited to the ${meetup.title} 🎉`, html);
}
