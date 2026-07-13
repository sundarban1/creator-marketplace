/** Strips the +977/977 Nepal country code for display — phones are always stored as E.164 (+977XXXXXXXXXX). */
export function formatPhoneDisplay(phone: string): string {
  return phone.trim().replace(/^\+?977/, '');
}
