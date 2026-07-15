import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { FaInstagram, FaTiktok, FaYoutube, FaFacebook } from 'react-icons/fa6';
import { fadeUp, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useAutoScroll } from '../hooks/useAutoScroll';

type LogoItem =
  | { type: 'icon'; Icon: typeof FaInstagram; name: string; color: string }
  | { type: 'text'; name: string; color?: string };

// Real platform/payment integrations, plus a few sample placeholder brand
// wordmarks (clearly generic, not real clients) until actual partner logos
// are ready to swap in.
const LOGOS: LogoItem[] = [
  { type: 'icon', Icon: FaInstagram, name: 'Instagram', color: '#E1306C' },
  { type: 'icon', Icon: FaTiktok, name: 'TikTok', color: '#000000' },
  { type: 'text', name: 'Northfield Co.' },
  { type: 'icon', Icon: FaYoutube, name: 'YouTube', color: '#FF0000' },
  { type: 'text', name: 'eSewa', color: '#60BB46' },
  { type: 'text', name: 'Cedarly' },
  { type: 'icon', Icon: FaFacebook, name: 'Facebook', color: '#1877F2' },
  { type: 'text', name: 'Khalti', color: '#5C2D91' },
  { type: 'text', name: 'Bluepeak Retail' },
  { type: 'text', name: 'Fonepay', color: '#00A0DC' },
  { type: 'text', name: 'Aurelia Studio' },
  { type: 'text', name: 'Solstice Living' },
];

function LogoBadge({ item }: { item: LogoItem }) {
  if (item.type === 'icon') {
    const { Icon, name, color } = item;
    return (
      <div
        style={{ '--brand': color } as CSSProperties}
        className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap text-ink/35 grayscale transition-all duration-300 hover:text-[var(--brand)] hover:grayscale-0"
      >
        <Icon size={20} />
        <span className="text-sm font-semibold">{name}</span>
      </div>
    );
  }
  return (
    <span
      style={item.color ? ({ '--brand': item.color } as CSSProperties) : undefined}
      className={`flex-shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-ink/35 transition-colors duration-300 ${
        item.color ? 'hover:text-[var(--brand)]' : 'hover:text-ink'
      }`}
    >
      {item.name}
    </span>
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
        className="scrollbar-hide flex gap-14 overflow-x-hidden px-6 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        {[LOGOS, LOGOS].map((group, gi) => (
          <div key={gi} aria-hidden={gi === 1} className="flex flex-shrink-0 items-center gap-14">
            {group.map((item, i) => (
              <LogoBadge key={i} item={item} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
