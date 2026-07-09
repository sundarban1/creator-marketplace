import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react';
import { PhoneFrame } from '../phone/PhoneFrame';
import { SECTION_IDS } from '../constants';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

interface FloatCard {
  icon: string;
  label: string;
  sub: string;
  top: number;
  left?: number;
  right?: number;
  delay: number;
  duration: number;
}

// Positioned in pixels against the fixed-size canvas below (not percentages
// of the phone itself) so they land predictably outside the phone's bounds
// regardless of how the phone is scaled.
const FLOAT_CARDS: FloatCard[] = [
  { icon: '✅', label: 'Campaign Accepted', sub: 'Himalayan Brew', top: 30, left: 0, delay: 0, duration: 5.5 },
  { icon: '🤝', label: 'New Collaboration', sub: 'Dhaka Threads', top: 130, right: 0, delay: 0.6, duration: 6.2 },
  { icon: '🔒', label: 'Payment Secured', sub: 'Escrow protected', top: 400, left: 0, delay: 1.1, duration: 5.8 },
  { icon: '✨', label: 'AI Campaign Ready', sub: 'Generated in 4s', top: 470, right: 0, delay: 0.3, duration: 6.5 },
];

function FloatingCard({ card }: { card: FloatCard }) {
  return (
    <motion.div
      className="absolute hidden md:block rounded-2xl px-3.5 py-3 backdrop-blur-xl border border-white/15 shadow-2xl z-10"
      style={{
        top: card.top,
        left: card.left,
        right: card.right,
        background: 'rgba(20,18,45,0.55)',
        width: 158,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: [0, -12, 0],
        rotate: [-1.5, 1.5, -1.5],
      }}
      transition={{
        opacity: { duration: 0.8, delay: card.delay + 0.6 },
        y: { duration: card.duration, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
        rotate: { duration: card.duration * 1.3, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none flex-shrink-0">{card.icon}</span>
        <div className="min-w-0">
          <div className="text-white text-[11px] font-bold leading-tight">{card.label}</div>
          <div className="text-white/45 text-[9.5px] leading-tight mt-0.5">{card.sub}</div>
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  const navigate = useNavigate();

  return (
    <section
      id={SECTION_IDS.hero}
      className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #0B0B1F 0%, #151537 45%, #3730A3 100%)' }}
    >
      {/* Animated mesh-gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="mesh-blob absolute top-[-15%] right-[-10%] w-[38rem] h-[38rem] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #4F46E5, transparent 70%)' }} />
        <div className="mesh-blob absolute bottom-[-20%] left-[-10%] w-[32rem] h-[32rem] rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, #F97316, transparent 70%)', animationDelay: '-6s' }} />
        <div className="mesh-blob absolute top-[35%] left-[30%] w-[22rem] h-[22rem] rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #818CF8, transparent 70%)', animationDelay: '-11s' }} />
        {/* Subtle connecting-lines texture, representing the creator network */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" preserveAspectRatio="none">
          <line x1="10%" y1="20%" x2="45%" y2="55%" stroke="white" strokeWidth="1" />
          <line x1="45%" y1="55%" x2="80%" y2="30%" stroke="white" strokeWidth="1" />
          <line x1="20%" y1="80%" x2="45%" y2="55%" stroke="white" strokeWidth="1" />
          <line x1="60%" y1="85%" x2="80%" y2="30%" stroke="white" strokeWidth="1" />
        </svg>
      </div>

      <div className="relative max-w-6xl mx-auto px-5 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-6 items-center w-full">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/85 text-xs font-semibold mb-6 ring-1 ring-white/15">
            <Sparkles size={12} className="text-orange-300" /> Nepal's premium creator marketplace
          </motion.div>

          <h1 className="text-[2.6rem] leading-[1.08] sm:text-6xl sm:leading-[1.04] font-extrabold text-white mb-6">
            Nepal's Creator Marketplace.
            <br />
            <span className="bg-gradient-to-r from-indigo-300 to-orange-300 bg-clip-text text-transparent">Where Brands Meet Creators.</span>
          </h1>

          <motion.p variants={fadeUp} className="text-white/60 text-lg max-w-md mb-9 leading-relaxed">
            Discover, collaborate, and get paid securely — Kolab connects Nepali brands with creators through AI-assisted campaigns and escrow-protected payments.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 14px 32px rgba(79,70,229,0.4)' }}
              onClick={() => navigate('/login')}
              className="px-6 py-3.5 rounded-2xl bg-brand-indigo text-white font-bold text-sm shadow-lg flex items-center gap-2"
            >
              Join as Creator <ArrowRight size={16} />
            </motion.button>
            <motion.button
              whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.14)' }}
              onClick={() => navigate('/login')}
              className="px-6 py-3.5 rounded-2xl bg-white/8 text-white font-bold text-sm ring-1 ring-white/20 transition-colors"
            >
              Find Creators
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              className="px-5 py-3.5 rounded-2xl text-white/70 hover:text-white font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <PlayCircle size={18} /> Watch Demo
            </motion.button>
          </motion.div>

          <motion.div variants={fadeUp} className="flex gap-8">
            {[['1,000+', 'Verified Creators'], ['250+', 'Active Brands'], ['3,200+', 'Campaigns']].map(([v, l]) => (
              <div key={l}>
                <div className="text-white font-extrabold text-2xl">{v}</div>
                <div className="text-white/45 text-xs">{l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Giant floating phone + activity cards — fixed-size canvas so the
            cards' pixel offsets stay predictable regardless of phone scale. */}
        <div className="relative mx-auto" style={{ width: 360, height: 600 }}>
          {FLOAT_CARDS.map((c) => <FloatingCard key={c.label} card={c} />)}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* No continuous idle bob here: animating translateY on a 3D-perspective
                layer keeps the raster texture on a sub-pixel offset most of the time,
                which visibly softens the real device-screenshot's small text (the old
                CSS-drawn mockup's bold shapes tolerated that fine, this doesn't). */}
            <PhoneFrame tilt glow={['#4F46E5', '#F97316']} hideNotch>
              <img
                src="/screenshots/creator_hompage.png"
                alt="Kolab creator home screen"
                className="absolute inset-0 w-full h-full object-cover object-top"
                draggable={false}
              />
            </PhoneFrame>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
