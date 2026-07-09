import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

export function MarketplaceWorkflow() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.workflow} className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-16">
          <motion.span variants={fadeUp} className="text-brand-indigo font-bold text-xs uppercase tracking-widest">{d.workflow.eyebrow}</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{d.workflow.heading}</motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.08)} className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-indigo via-brand-indigo/40 to-orange-400" />
          <div className="flex flex-col gap-7">
            {d.workflow.steps.map((step, i) => (
              <motion.div key={step} variants={fadeUp} className="flex items-center gap-5">
                <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-brand-indigo flex items-center justify-center font-bold text-brand-indigo text-sm">
                  {i + 1}
                </div>
                <div className="bg-white rounded-2xl px-5 py-3.5 border border-gray-100 shadow-sm flex-1">
                  <span className="font-semibold text-gray-800 text-sm">{step}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
