import { motion } from 'framer-motion';
import { Wallet, Gift, Check } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';

const TYPES = [
  {
    icon: Wallet,
    tag: 'Paid Campaign',
    color: '#4F46E5',
    bg: '#EEF2FF',
    title: 'Creators get paid for content',
    desc: 'Set a budget and deliverables — creators apply, you approve, and payment sits in secure escrow until the content is delivered and accepted.',
    points: ['Escrow-protected payout', 'Deliverables & timeline defined upfront', 'Released only once you approve the work'],
  },
  {
    icon: Gift,
    tag: 'Free / Open Event',
    color: '#F97316',
    bg: '#FFF7ED',
    title: 'Creators visit — no cash payout',
    desc: "Invite creators to experience your place or event in person. There's no direct payment, but you can offer free food, drinks, and hampers in exchange for their visit and coverage.",
    points: ['No budget required to get started', 'Great for launches, tastings & pop-ups', 'Reward with food, drinks & hampers instead of cash'],
  },
];

export function CampaignTypes() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <motion.span variants={fadeUp} className="text-brand-indigo font-bold text-xs uppercase tracking-widest">Two Ways to Collaborate</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Choose the campaign that fits your goal</motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 text-base max-w-lg mx-auto mt-4">
            Every campaign you create on Kolab is either a paid collaboration or a free, open event — pick whichever fits your budget and goal.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid md:grid-cols-2 gap-6">
          {TYPES.map(({ icon: Icon, tag, color, bg, title, desc, points }) => (
            <motion.div
              key={tag}
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
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-gray-600">
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
