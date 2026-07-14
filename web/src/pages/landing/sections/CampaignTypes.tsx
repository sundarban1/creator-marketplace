import { motion } from 'framer-motion';
import { Wallet, Gift, Check } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { useLandingLanguage } from '../context/LanguageContext';

// Icons/colors only — copy comes from the translation dictionary
// (campaignTypes.types), matched by array index.
const TYPE_META = [
  { icon: Wallet, color: '#4F46E5', bg: '#EEF2FF' },
  { icon: Gift, color: '#F97316', bg: '#FFF7ED' },
];

export function CampaignTypes() {
  const { d } = useLandingLanguage();
  const TYPES = TYPE_META.map((m, i) => ({ ...m, ...d.campaignTypes.types[i]! }));

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <motion.span variants={fadeUp} className="text-brand-indigo font-bold text-xs uppercase tracking-widest">{d.campaignTypes.eyebrow}</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{d.campaignTypes.heading}</motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 text-base max-w-lg mx-auto mt-4">{d.campaignTypes.sub}</motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid md:grid-cols-2 gap-6">
          {TYPES.map(({ icon: Icon, tag, color, bg, title, desc, points }, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: bg }}>
                <Icon size={22} style={{ color }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{tag}</span>
              <h3 className="font-extrabold text-gray-900 text-xl mt-2 mb-3">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">{desc}</p>
              <ul className="space-y-2.5">
                {points.map((p, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check size={16} className="flex-shrink-0 mt-0.5" style={{ color }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
