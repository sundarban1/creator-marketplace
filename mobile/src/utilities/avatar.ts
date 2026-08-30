// Some seed/back-fill rows carry an auto-generated "logo" from ui-avatars.com —
// a coloured circle with the initials baked into the PNG. Those should not be
// treated as a real uploaded image; the card renders its own white-background
// initials placeholder instead. Real uploads (Cloudinary) and real headshots
// (pravatar) pass through untouched.
const GENERATED_AVATAR_HOSTS = ['ui-avatars.com'];

export function realImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (GENERATED_AVATAR_HOSTS.some((host) => url.includes(host))) return null;
  return url;
}
