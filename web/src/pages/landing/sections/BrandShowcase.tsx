import { motion } from 'framer-motion';
import { Rocket, Users, ThumbsUp, Wallet, ShieldCheck } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useLandingLanguage } from '../context/LanguageContext';

// Icons/colors only — title/desc come from the translation dictionary
// (brands.cards), matched by array index.
const CARD_META = [
  { icon: Rocket, color: '#4F46E5' },
  { icon: Users, color: '#F97316' },
  { icon: ThumbsUp, color: '#EC4899' },
  { icon: Wallet, color: '#0EA5E9' },
  { icon: ShieldCheck, color: '#16A34A' },
];

export function BrandShowcase() {
  const { d } = useLandingLanguage();
  const scrollRef = useAutoScroll<HTMLDivElement>(0.4);
  const CARDS = CARD_META.map((m, i) => ({ ...m, ...d.brands.cards[i]! }));
  // Rendered twice back-to-back so useAutoScroll can loop seamlessly.
  const LOOPED = [...CARDS, ...CARDS];

  return (
    <section id={SECTION_IDS.brands} className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <motion.span variants={fadeUp} className="text-brand-indigo font-bold text-xs uppercase tracking-widest">{d.brands.eyebrow}</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{d.brands.heading}</motion.h2>
        </motion.div>
        <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-4 px-1 scrollbar-hide">
          {LOOPED.map(({ icon: Icon, title, desc, color }, i) => (
            <div key={`${title}-${i}`} className="flex-shrink-0 w-72 p-6 rounded-3xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${color}18` }}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
