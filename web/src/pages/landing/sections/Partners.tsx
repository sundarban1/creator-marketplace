import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { FaInstagram, FaTiktok, FaYoutube, FaFacebook } from 'react-icons/fa6';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

const PLATFORM_LOGOS = [
  { Icon: FaInstagram, name: 'Instagram', color: '#E1306C' },
  { Icon: FaTiktok, name: 'TikTok', color: '#000000' },
  { Icon: FaYoutube, name: 'YouTube', color: '#FF0000' },
  { Icon: FaFacebook, name: 'Facebook', color: '#1877F2' },
];

const PAYMENT_LOGOS = [
  { name: 'eSewa', color: '#60BB46' },
  { name: 'Khalti', color: '#5C2D91' },
  { name: 'Fonepay', color: '#00A0DC' },
];

export function Partners() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.partners} className="bg-paper-dim py-20">
      <div className="mx-auto max-w-4xl px-6">
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={fadeUp}
          className="mb-10 text-center font-serif text-base italic text-ink-soft"
        >
          {d.partners.heading}
        </motion.p>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {PLATFORM_LOGOS.map(({ Icon, name, color }) => (
            <motion.div
              key={name}
              variants={fadeUp}
              style={{ '--brand': color } as CSSProperties}
              className="flex items-center gap-2 text-ink/40 grayscale transition-all hover:text-[var(--brand)] hover:grayscale-0"
            >
              <Icon size={20} />
              <span className="text-sm font-semibold">{name}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {PAYMENT_LOGOS.map(({ name, color }) => (
            <motion.span
              key={name}
              variants={fadeUp}
              style={{ '--brand': color } as CSSProperties}
              className="text-base font-bold tracking-tight text-ink/40 transition-colors hover:text-[var(--brand)]"
            >
              {name}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
