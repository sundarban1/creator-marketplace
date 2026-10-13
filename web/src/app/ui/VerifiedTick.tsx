import { BadgeCheck } from 'lucide-react';

// Instagram-style blue tick rendered next to a name — mirrors mobile's
// VerifiedBadge: shown when fully verified (docs approved) OR admin-verified.
export function VerifiedTick({
  entity,
  size = 16,
  label = 'Verified',
}: {
  entity: { fullyVerified?: boolean | null; isVerified?: boolean | null };
  size?: number;
  label?: string;
}) {
  if (!entity.fullyVerified && !entity.isVerified) return null;
  return <BadgeCheck size={size} className="flex-shrink-0 text-[#3B82F6]" aria-label={label} role="img" />;
}
