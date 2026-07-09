import { motion } from 'framer-motion';
import {
  LayoutDashboard, Search, ClipboardList, MessageCircle, Send,
  ShieldCheck, Wallet, BarChart3, Sparkles, UserCircle,
} from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useAutoScroll } from '../hooks/useAutoScroll';

const HIGHLIGHTS = [
  { icon: LayoutDashboard, title: 'Your Command Center', desc: 'Browse curated campaigns, track proposals, and manage collaborations — all from one beautifully organized home screen.' },
  { icon: Search, title: 'Discover Campaigns', desc: 'Filter by category, platform, and location to find brand campaigns that actually fit your audience.' },
  { icon: ClipboardList, title: 'Every Detail, Upfront', desc: 'Budget, deliverables, timeline — see exactly what’s expected before you apply. No surprises.' },
  { icon: MessageCircle, title: 'Chat in Real Time', desc: 'Message brands directly, negotiate terms, and build relationships — with live typing indicators and instant delivery.' },
  { icon: Send, title: 'Submit in Minutes', desc: 'Write your pitch, set your rate, and send a professional proposal without leaving the app.' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'Funds move from brand to escrow the moment a proposal is accepted — released to you only once work is approved.' },
  { icon: Wallet, title: 'Get Paid, Instantly', desc: 'Track earnings, withdraw to eSewa or your bank, and see your full payment history in one place.' },
  { icon: BarChart3, title: 'Know Your Impact', desc: 'Reach, engagement, and earnings — visualized so you always know how your content is performing.' },
  { icon: Sparkles, title: 'AI-Assisted Campaigns', desc: 'Brands describe their goal in one sentence — Kolab’s AI generates the objective, budget, deliverables, and timeline instantly.' },
  { icon: UserCircle, title: 'Your Portfolio, Built In', desc: 'A public profile that showcases your work, stats, and verified badge — built to win you more collaborations.' },
];

export function ProductHighlights() {
  const scrollRef = useAutoScroll<HTMLDivElement>(0.4);
  // Rendered twice back-to-back so useAutoScroll can loop seamlessly.
  const LOOPED = [...HIGHLIGHTS, ...HIGHLIGHTS];

  return (
    <section id={SECTION_IDS.story} className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <span className="text-brand-indigo font-bold text-xs uppercase tracking-widest">The Product</span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Everything you need, in your pocket</motion.h2>
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
