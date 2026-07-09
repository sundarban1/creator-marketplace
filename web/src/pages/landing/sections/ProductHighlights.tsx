import { motion } from 'framer-motion';
import {
  LayoutDashboard, Search, ClipboardList, MessageCircle, Send,
  ShieldCheck, Wallet, BarChart3, Sparkles, UserCircle,
} from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useLandingLanguage } from '../context/LanguageContext';

// Icons only — title/desc come from the translation dictionary (story.items),
// matched by array index.
const ICONS = [LayoutDashboard, Search, ClipboardList, MessageCircle, Send, ShieldCheck, Wallet, BarChart3, Sparkles, UserCircle];

export function ProductHighlights() {
  const { d } = useLandingLanguage();
  const scrollRef = useAutoScroll<HTMLDivElement>(0.4);
  const HIGHLIGHTS = ICONS.map((icon, i) => ({ icon, ...d.story.items[i]! }));
  // Rendered twice back-to-back so useAutoScroll can loop seamlessly.
  const LOOPED = [...HIGHLIGHTS, ...HIGHLIGHTS];

  return (
    <section id={SECTION_IDS.story} className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <span className="text-brand-indigo font-bold text-xs uppercase tracking-widest">{d.story.eyebrow}</span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{d.story.heading}</motion.h2>
        </motion.div>

        <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-4 px-1 scrollbar-hide">
          {LOOPED.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={`${title}-${i}`}
              className="flex-shrink-0 w-72 p-6 rounded-3xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-brand-indigo/10 flex-shrink-0">
                  <Icon size={22} className="text-brand-indigo" />
                </div>
                <span className="text-gray-300 font-extrabold text-sm">{String((i % HIGHLIGHTS.length) + 1).padStart(2, '0')}</span>
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
