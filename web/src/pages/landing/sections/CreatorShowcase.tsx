import { motion } from 'framer-motion';
import { CheckCircle, Star } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';

const CREATORS = [
  { name: 'Priya Sharma', initials: 'PS', category: 'Food & Lifestyle', followers: '42K', engagement: '6.4%', campaigns: 31, rating: '4.8', color: '#4F46E5' },
  { name: 'Aditya Verma', initials: 'AV', category: 'Tech Reviews', followers: '68K', engagement: '5.1%', campaigns: 24, rating: '4.9', color: '#F97316' },
  { name: 'Sunita Rai', initials: 'SR', category: 'Travel & Adventure', followers: '35K', engagement: '7.2%', campaigns: 19, rating: '4.7', color: '#EC4899' },
  { name: 'Bikash Thapa', initials: 'BT', category: 'Fitness', followers: '51K', engagement: '5.8%', campaigns: 27, rating: '4.9', color: '#16A34A' },
  { name: 'Kripa Gurung', initials: 'KG', category: 'Fashion', followers: '89K', engagement: '4.6%', campaigns: 42, rating: '4.8', color: '#0EA5E9' },
];

function CreatorCard({ c }: { c: (typeof CREATORS)[number] }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -8, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="flex-shrink-0 w-56 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: c.color }}>{c.initials}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-gray-900 text-sm truncate">{c.name}</span>
            <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
          </div>
          <div className="text-gray-400 text-xs truncate">{c.category}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <div className="font-extrabold text-gray-900 text-sm">{c.followers}</div>
          <div className="text-gray-400 text-[10px]">Followers</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <div className="font-extrabold text-gray-900 text-sm">{c.engagement}</div>
          <div className="text-gray-400 text-[10px]">Engagement</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{c.campaigns} campaigns</span>
        <span className="flex items-center gap-1 font-semibold text-gray-700"><Star size={12} className="text-yellow-400 fill-yellow-400" />{c.rating}</span>
      </div>
    </motion.div>
  );
}

export function CreatorShowcase() {
  return (
    <section id={SECTION_IDS.creators} className="py-24 bg-gray-50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <motion.span variants={fadeUp} className="text-brand-indigo font-bold text-xs uppercase tracking-widest">Discover Creators</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Meet Nepal's top creators</motion.h2>
        </motion.div>
        <motion.div
          initial="hidden" whileInView="show" viewport={VP} variants={stagger()}
          className="flex gap-5 overflow-x-auto pb-4 px-1 snap-x scrollbar-hide"
        >
          {CREATORS.map((c) => <CreatorCard key={c.name} c={c} />)}
        </motion.div>
      </div>
    </section>
  );
}
