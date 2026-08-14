import { motion } from 'framer-motion';
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa6';
import { PILL_HOVER } from '../lib/motion';
import { useSiteInfo } from '../hooks/useSiteInfo';

// Same brand colors as the platform badges in Partners.tsx — kept in sync
// with that palette rather than inventing a second one. Order is fixed (not
// admin-configurable); only which icons actually show is, via whether each
// URL is set in the dashboard's Contact page.
const SOCIAL_ICONS = [
  { key: 'facebook' as const,  Icon: FaFacebook,  label: 'Facebook',  color: '#1877F2' },
  { key: 'instagram' as const, Icon: FaInstagram, label: 'Instagram', color: '#E1306C' },
  { key: 'tiktok' as const,    Icon: FaTiktok,    label: 'TikTok',    color: '#000000' },
  { key: 'youtube' as const,   Icon: FaYoutube,   label: 'YouTube',   color: '#FF0000' },
];

// Fixed vertical rail pinned to the right edge, centered in the viewport —
// stays put while the page scrolls (unlike the footer's old inline social
// row, which only appeared once you'd scrolled all the way down). Hidden on
// small screens: at that width it would sit on top of body copy rather than
// in the page's own right margin. Sits above ChatWidget's bottom-right
// bubble rather than on top of it since this one's vertically centered.
export function SocialRail() {
  const siteInfo = useSiteInfo();
  const activeSocials = SOCIAL_ICONS.filter(({ key }) => siteInfo?.social[key]);

  if (activeSocials.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex"
    >
      {activeSocials.map(({ key, Icon, label, color }) => (
        <motion.a
          key={key}
          href={siteInfo!.social[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          whileHover={PILL_HOVER}
          style={{ color, boxShadow: `0 6px 16px -6px ${color}66` }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white transition-shadow duration-300 dark:border-white/10 dark:bg-ink-elevated"
        >
          <Icon size={16} />
        </motion.a>
      ))}
      {/* A thin vertical line trailing below the icons — same "this is a rail,
          not a random stack" cue a lot of sites use for this exact pattern. */}
      <span aria-hidden className="mt-1 h-10 w-px bg-ink/10 dark:bg-white/15" />
    </motion.div>
  );
}
