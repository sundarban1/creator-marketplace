import { motion } from 'framer-motion';
import { Star, AtSign } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

// Names/handles/avatars/gradients stay fixed — role/quote come from the
// translation dictionary (testimonials.items), matched by array index.
const PEOPLE = [
  { name: 'Priya Sharma', handle: 'priya.creates', avatar: 'PS', grad: ['#4F46E5', '#3730A3'] },
  { name: 'Himalaya Brew', handle: null, avatar: 'HB', grad: ['#F97316', '#C2410C'] },
  { name: 'Aditya Verma', handle: 'adityaverma.tech', avatar: 'AV', grad: ['#0EA5E9', '#0369A1'] },
  { name: 'Dhaka Threads', handle: null, avatar: 'DT', grad: ['#EC4899', '#BE185D'] },
];

export function Testimonials() {
  const { d } = useLandingLanguage();
  const TESTIMONIALS = PEOPLE.map((p, i) => ({ ...p, ...d.testimonials.items[i]! }));

  return (
    <section id={SECTION_IDS.stories} className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <motion.span variants={fadeUp} className="text-brand-indigo font-bold text-xs uppercase tracking-widest">{d.testimonials.eyebrow}</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{d.testimonials.heading}</motion.h2>
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
