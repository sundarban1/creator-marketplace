import { motion } from 'framer-motion';
import { Star, AtSign } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';

const TESTIMONIALS = [
  { name: 'Priya Sharma', handle: 'priya.creates', role: null, avatar: 'PS', grad: ['#4F46E5', '#3730A3'], quote: 'Kolab replaced three different spreadsheets and a dozen DMs. I find campaigns, chat with brands, and get paid — all without leaving the app.' },
  { name: 'Himalaya Brew', handle: null, role: 'Cafe chain, Kathmandu', avatar: 'HB', grad: ['#F97316', '#C2410C'], quote: 'We ran our first AI-generated campaign in under 10 minutes and had 14 proposals by evening. The escrow payment made trusting new creators easy.' },
  { name: 'Aditya Verma', handle: 'adityaverma.tech', role: null, avatar: 'AV', grad: ['#0EA5E9', '#0369A1'], quote: 'The analytics dashboard alone is worth it — I finally know which content actually drives engagement instead of guessing.' },
  { name: 'Dhaka Threads', handle: null, role: 'Fashion brand, Lalitpur', avatar: 'DT', grad: ['#EC4899', '#BE185D'], quote: "Payment protection changed how we work with new creators. We're no longer nervous about paying upfront." },
];

export function Testimonials() {
  return (
    <section id={SECTION_IDS.stories} className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <motion.span variants={fadeUp} className="text-brand-indigo font-bold text-xs uppercase tracking-widest">Stories</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Loved by creators and brands</motion.h2>
        </motion.div>
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {TESTIMONIALS.map(({ name, handle, role, avatar, grad, quote }) => (
            <motion.div key={name} variants={fadeUp} whileHover={{ y: -5, boxShadow: '0 14px 32px rgba(0,0,0,0.08)' }} className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col">
              <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />)}</div>
              <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-5">"{quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>{avatar}</div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{name}</div>
                  {handle ? (
                    <div className="flex items-center gap-1 text-brand-indigo text-xs font-medium"><AtSign size={11} />{handle}</div>
                  ) : (
                    <div className="text-gray-400 text-xs">{role}</div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
