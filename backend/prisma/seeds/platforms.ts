import { PrismaClient } from '@prisma/client';

// Brand colors match what mobile has hardcoded per-platform today (see
// mobile/src/app/(creator)/settings.tsx CONNECTABLE/ALL_SOCIAL_PLATFORMS) — Platform
// is meant to be admin-owned going forward, but this keeps a fresh/reseed matching
// the existing visual identity everywhere platforms are already shown.
const PLATFORMS: { icon: string; color: string; iconBg: string; name: string; key: string }[] = [
  { icon: 'instagram', color: '#E4405F', iconBg: '#fce7f3', name: 'Instagram',    key: 'instagram' },
  { icon: 'tiktok',    color: '#000000', iconBg: '#f3e8ff', name: 'TikTok',       key: 'tiktok' },
  { icon: 'youtube',   color: '#FF0000', iconBg: '#fee2e2', name: 'YouTube',      key: 'youtube' },
  { icon: 'facebook',  color: '#1877F2', iconBg: '#dbeafe', name: 'Facebook',     key: 'facebook' },
  { icon: 'twitter',   color: '#000000', iconBg: '#e0f2fe', name: 'Twitter / X',  key: 'twitter' },
  { icon: 'linkedin',  color: '#0A66C2', iconBg: '#dbeafe', name: 'LinkedIn',     key: 'linkedin' },
  { icon: 'pinterest', color: '#E60023', iconBg: '#fef3c7', name: 'Pinterest',    key: 'pinterest' },
  { icon: 'snapchat',  color: '#FFFC00', iconBg: '#fef9c3', name: 'Snapchat',     key: 'snapchat' },
  { icon: 'twitch',    color: '#9146FF', iconBg: '#ede9fe', name: 'Twitch',       key: 'twitch' },
];

export async function seedPlatforms(prisma: PrismaClient) {
  await Promise.all(
    PLATFORMS.map((p) =>
      prisma.platform.upsert({
        where: { key: p.key },
        update: { icon: p.icon, color: p.color, iconBg: p.iconBg },
        create: p,
      })
    )
  );
  console.log(`  ✅ Platforms: ${PLATFORMS.length} seeded`);
}
