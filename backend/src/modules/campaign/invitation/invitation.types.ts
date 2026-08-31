// The clean, render-only shape the templates consume. Built server-side from
// authoritative DB rows (never trusted from the client) by
// invitation.service.buildInvitationData().
export interface InvitationData {
  eventTitle: string;
  // Already trimmed/clamped for display; empty string => hide the block.
  description: string;
  // Pre-formatted for Asia/Kathmandu, e.g. "Monday, 15 September 2026".
  dateLabel: string;
  // Pre-formatted, e.g. "5:00 PM" or "5:00 PM – 8:00 PM"; empty => hide.
  timeLabel: string;
  // Physical location, e.g. "Kathmandu"; empty => hide the row (unless isOnline).
  locationLabel: string;
  isOnline: boolean;
  businessName: string;
  // Absolute URL; null => render the host line without a logo.
  businessLogoUrl: string | null;
  // Personalised greeting name; empty => the template omits the name line.
  creatorName: string;
  templateId: string;
  version: number;
}

export interface InvitationResult {
  imageUrl: string;
  format: 'png';
  width: number;
  height: number;
  version: number;
}

export const INVITATION_WIDTH = 1080;
export const INVITATION_HEIGHT = 1350;
