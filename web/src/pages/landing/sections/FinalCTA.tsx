import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';

export function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section className="py-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 60%, #F97316 130%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="mesh-blob absolute top-[-20%] left-[10%] w-[30rem] h-[30rem] rounded-full opacity-20 blur-3xl bg-white" />
        <div className="mesh-blob absolute bottom-[-20%] right-[5%] w-[26rem] h-[26rem] rounded-full opacity-15 blur-3xl bg-white" style={{ animationDelay: '-8s' }} />
      </div>
      <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="relative max-w-2xl mx-auto px-5 text-center">
        <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
          Ready to build your next collaboration?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-white/75 text-lg mb-10">
          Join Nepal's premium creator marketplace — free to get started, secure by design.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
          <motion.button
            whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-2xl bg-white text-brand-indigo font-bold"
          >
            Join as Creator
          </motion.button>
          <motion.button
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-2xl border border-white/40 text-white font-bold"
          >
            Hire Creators
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
}
