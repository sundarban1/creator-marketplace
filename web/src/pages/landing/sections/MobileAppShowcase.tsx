import { motion } from 'framer-motion';
import { Smartphone, Users, Building2, MessageCircle, BarChart3, Wallet } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';

const SIDES = [
  {
    icon: Users,
    label: 'For Creators',
    color: '#4F46E5',
    bg: '#EEF2FF',
    points: [
      { icon: MessageCircle, text: 'Discover campaigns and chat with brands in real time' },
      { icon: Wallet, text: 'Get paid securely through escrow-protected payments' },
    ],
  },
  {
    icon: Building2,
    label: 'For Brands',
    color: '#F97316',
    bg: '#FFF7ED',
    points: [
      { icon: BarChart3, text: 'Track every campaign and creator in one dashboard' },
      { icon: Wallet, text: 'Manage budgets and approvals without leaving the app' },
    ],
  },
];

export function MobileAppShowcase() {
  return (
    <section id={SECTION_IDS.app} className="py-28 overflow-hidden" style={{ background: 'linear-gradient(150deg, #0B0B1F 0%, #151537 55%, #3730A3 100%)' }}>
      <div className="max-w-5xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-16">
          <motion.span variants={fadeUp} className="text-orange-300 font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2">
            <Smartphone size={13} /> One App, Both Sides
          </motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mt-3">Built for creators and brands alike</motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid sm:grid-cols-2 gap-6">
          {SIDES.map(({ icon: Icon, label, color, bg, points }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="p-8 rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-all"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: bg }}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-extrabold text-white text-xl mb-5">{label}</h3>
              <ul className="space-y-4">
                {points.map(({ icon: PIcon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <PIcon size={18} className="flex-shrink-0 mt-0.5 text-white/50" />
                    <span className="text-white/70 text-sm leading-relaxed">{text}</span>
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
