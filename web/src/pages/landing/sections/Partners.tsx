import { motion } from 'framer-motion';
import { FaInstagram, FaTiktok, FaYoutube, FaFacebook } from 'react-icons/fa6';
import { fadeUp, VP, PILL_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useAutoScroll } from '../hooks/useAutoScroll';

type LogoItem =
  | { type: 'icon'; Icon: typeof FaInstagram; name: string; color: string }
  | { type: 'text'; name: string; color?: string };

// Real platform/payment integrations, plus a few sample placeholder Nepal-
// based brand wordmarks (clearly generic, not real clients) until actual
// partner logos are ready to swap in.
const LOGOS: LogoItem[] = [
  { type: 'icon', Icon: FaInstagram, name: 'Instagram', color: '#E1306C' },
  { type: 'icon', Icon: FaTiktok, name: 'TikTok', color: '#000000' },
  { type: 'text', name: 'Himalaya Traders' },
  { type: 'icon', Icon: FaYoutube, name: 'YouTube', color: '#FF0000' },
  { type: 'text', name: 'eSewa', color: '#60BB46' },
  { type: 'text', name: 'Everest Retail Group' },
  { type: 'icon', Icon: FaFacebook, name: 'Facebook', color: '#1877F2' },
  { type: 'text', name: 'Khalti', color: '#5C2D91' },
  { type: 'text', name: 'Sagarmatha Foods' },
  { type: 'text', name: 'Fonepay', color: '#00A0DC' },
  { type: 'text', name: 'Annapurna Living' },
  { type: 'text', name: 'Bagmati Textiles' },
];

// Same rounded-card-in-a-marquee treatment as the Categories section (colored
// icon badge + label, white card, soft shadow) instead of the old plain
// grayscale-wordmark row — reads as one consistent "chip" language site-wide.
function LogoBadge({ item }: { item: LogoItem }) {
  const color = item.color ?? '#6B6560'; // falls back to ink-soft for uncolored placeholder brands
  return (
    <motion.div
      whileHover={PILL_HOVER}
      className="group flex flex-shrink-0 items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(20,17,16,0.03)] transition-shadow duration-300 hover:shadow-[0_14px_28px_-10px_rgba(20,17,16,0.16)]"
    >
      <span
        style={{ backgroundColor: `${color}1A`, color }}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
      >
        {item.type === 'icon' ? <item.Icon size={16} /> : <span className="text-sm font-bold">{item.name[0]}</span>}
      </span>
      <span className="whitespace-nowrap text-sm font-semibold text-ink">{item.name}</span>
    </motion.div>
  );
}

export function Partners() {
  const { d } = useLandingLanguage();
  const scrollRef = useAutoScroll<HTMLDivElement>(0.35);

  return (
    <section id={SECTION_IDS.partners} className="border-y border-ink/10 bg-paper-dim py-16">
      <motion.p
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={fadeUp}
        className="mb-10 text-center font-serif text-lg italic text-ink-soft"
      >
        {d.partners.heading}
      </motion.p>

      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-3 overflow-x-hidden px-6 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
        {[LOGOS, LOGOS].map((group, gi) => (
          <div key={gi} aria-hidden={gi === 1} className="flex flex-shrink-0 gap-3">
            {group.map((item, i) => (
              <LogoBadge key={i} item={item} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
