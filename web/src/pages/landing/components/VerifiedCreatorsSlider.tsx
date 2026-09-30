import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';
import { fetchPublicCreators, type CreatorCard } from '../../../app/api/publicMarketplace';
import { useReducedMotion } from '../hooks/useReducedMotion';

const SLIDE_MS = 3500;

/**
 * Photo slot of the Security section's "Verified Profiles" card: cross-fades
 * through real verified creators' avatars (verified badge + public profile +
 * a photo, filtered server-side). Until the fetch resolves — or if it fails
 * or returns nobody — the card's static photo stays in place.
 */
export function VerifiedCreatorsSlider({ fallbackSrc, alt, className }: { fallbackSrc: string; alt: string; className: string }) {
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCreators({ verified: true, hasAvatar: true, limit: 20 }, controller.signal)
      .then((res) => setCreators(res.creators.filter((c) => c.fullyVerified && c.avatarUrl)))
      .catch(() => { /* keep the static photo */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (creators.length < 2 || reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % creators.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [creators.length, reduced]);

  if (!creators.length) {
    return <img src={fallbackSrc} alt={alt} width={800} height={800} loading="eager" className={`${className} object-cover`} />;
  }

  const current = creators[index % creators.length]!;
  const name = current.fullName || current.username || '';

  return (
    <div className={`${className} relative overflow-hidden bg-black/20`}>
      <AnimatePresence initial={false}>
        <motion.img
          key={current.id}
          src={current.avatarUrl!}
          alt={name}
          width={800}
          height={800}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
        />
      </AnimatePresence>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-white">
          <span className="truncate">{name}</span>
          <BadgeCheck size={16} className="flex-shrink-0 text-white" aria-label="Verified" />
        </span>
        {creators.length > 1 && (
          <span className="flex flex-shrink-0 gap-1">
            {creators.map((c, i) => (
              <span
                key={c.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === index % creators.length ? 'w-4 bg-white' : 'w-1.5 bg-white/45'}`}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
