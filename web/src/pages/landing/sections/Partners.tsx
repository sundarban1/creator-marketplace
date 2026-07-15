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

// No official brand-mark assets available for these, so each is rendered as
// a clean wordmark badge in its real brand color instead of a fabricated logo.
const PAYMENT_LOGOS = [
  { name: 'eSewa', bg: '#60BB46', text: '#FFFFFF' },
  { name: 'Khalti', bg: '#5C2D91', text: '#FFFFFF' },
  { name: 'Fonepay', bg: '#00A0DC', text: '#FFFFFF' },
];

export function Partners() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.partners} className="bg-gray-50/60 py-24">
      <div className="mx-auto mb-14 max-w-2xl px-5 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-widest text-brand-indigo">
            {d.partners.eyebrow}
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-extrabold text-ink md:text-4xl">
            {d.partners.heading}
          </motion.h2>
        </motion.div>
      </div>

      <div className="mx-auto max-w-4xl px-5">
        {/* Platform partners */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-14">
          <motion.p variants={fadeUp} className="mb-6 text-center text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {d.partners.platformLabel}
          </motion.p>
          <motion.div variants={stagger()} className="flex flex-wrap items-center justify-center gap-4">
            {PLATFORM_LOGOS.map(({ Icon, name, color }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                whileHover={{ y: -3, scale: 1.03 }}
                className="flex items-center gap-2.5 rounded-2xl border border-ink/[0.06] bg-white px-5 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-shadow duration-300 hover:shadow-[0_14px_28px_-10px_rgba(15,23,42,0.16)]"
              >
                <Icon size={22} style={{ color }} />
                <span className="text-sm font-bold text-ink">{name}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Payment partners */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.p variants={fadeUp} className="mb-6 text-center text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {d.partners.paymentLabel}
          </motion.p>
          <motion.div variants={stagger()} className="flex flex-wrap items-center justify-center gap-4">
            {PAYMENT_LOGOS.map(({ name, bg, text }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                whileHover={{ y: -3, scale: 1.03 }}
                className="rounded-2xl px-6 py-3.5 text-base font-extrabold tracking-tight shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] transition-shadow duration-300 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.35)]"
                style={{ backgroundColor: bg, color: text }}
              >
                {name}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
