import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type Variants, type MotionValue } from 'framer-motion';
import {
  Camera, Briefcase, MessageSquare, BarChart2, Shield, Sparkles,
  Star, ChevronDown, Mail, Globe, AtSign, Rocket, Compass, Handshake,
  ArrowRight, ArrowUpRight, CheckCircle, Users, TrendingUp,
  DollarSign, Search, Bell, Menu, X, Share2, UserPlus, Gift,
} from 'lucide-react';

// ── Animation primitives ─────────────────────────────────────────────────────

const VP = { once: true, amount: 0.25 } as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = (gap = 0.09): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap } },
});

const wordReveal: Variants = {
  hidden: { opacity: 0, y: '110%' },
  show: { opacity: 1, y: '0%', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// ── Content ───────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Why kolab', id: 'value' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Features', id: 'features' },
  { label: 'Referrals', id: 'referrals' },
  { label: 'Stories', id: 'stories' },
  { label: 'FAQ', id: 'faq' },
];

const REFERRAL_STEPS = [
  { icon: Share2, title: 'Share your code', desc: 'Find your unique referral code in Settings and send it to a friend.' },
  { icon: UserPlus, title: 'They join & get active', desc: 'Your friend signs up with your code and completes their first campaign.' },
  { icon: Gift, title: 'You both get paid', desc: 'Rewards are credited automatically once the campaign is confirmed complete.' },
];

const CREATOR_REFERRAL_STEPS = [
  'Share your referral code from your Creator settings',
  'Your friend signs up and links your code',
  'They complete their first campaign within 90 days',
  'You earn NPR 500, they earn a NPR 200 bonus',
];

const BUSINESS_REFERRAL_STEPS = [
  'Share your referral code from your Business settings',
  'The brand signs up and links your code',
  'They fund and run their first campaign within 90 days',
  "You both earn NPR 500 once it's confirmed",
];

const KEYWORDS = [
  'Discovery', 'Trust', 'Momentum', 'Reach', 'Authenticity', 'Community',
  'Partnership', 'Visibility', 'Consistency', 'Opportunity', 'Impact', 'Growth',
];

const VALUE_PROPS = [
  { icon: Compass, title: 'Discover the right match', desc: 'Creators surface campaigns that fit their niche. Brands surface creators whose audience actually matches theirs — no more cold DMs.' },
  { icon: Handshake, title: 'Collaborate with confidence', desc: 'Proposals, negotiation, and messaging happen in one thread. Everyone sees the same terms, the same timeline, the same deliverables.' },
  { icon: Rocket, title: 'Grow with every campaign', desc: 'Every completed collab builds a verified track record — followers for creators, a trusted supplier list for brands.' },
];

const STEPS = [
  { num: '01', title: 'Create your profile', desc: 'Sign up as a creator or a brand in minutes. Add your niche, audience stats, or campaign goals — kolab handles the rest.' },
  { num: '02', title: 'Connect & propose', desc: 'Browse live campaigns or discover creators by category and platform. Send a proposal, negotiate the rate, lock the deliverables.' },
  { num: '03', title: 'Deliver & get paid', desc: 'Ship the content, mark it delivered, and get paid through milestone-based escrow the moment the brand approves.' },
];

const FEATURES = [
  { icon: Search, title: 'Smart discovery', desc: 'Filter campaigns and creators by niche, platform, budget, and location — find a fit in seconds.' },
  { icon: MessageSquare, title: 'Built-in messaging', desc: 'Negotiate and coordinate without leaving the app. Every conversation is tied to its campaign.' },
  { icon: BarChart2, title: 'Campaign analytics', desc: 'Track proposals, views, and progress for every campaign from a single dashboard.' },
  { icon: DollarSign, title: 'Secure escrow payments', desc: 'Funds are held until deliverables are approved — creators get paid, brands get results.' },
  { icon: Bell, title: 'Real-time alerts', desc: 'Never miss a proposal, message, or payment release with instant notifications.' },
  { icon: Shield, title: 'Verified profiles', desc: 'Every creator and business is verified, so both sides collaborate with confidence.' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', handle: 'priya.creates', role: 'Fashion Creator · 120K followers', avatar: 'PS', grad: ['#7C3AED', '#5B21B6'], quote: 'I landed three brand deals in my first week. Proposal to payment — the whole thing was seamless.' },
  { name: 'Himalaya Brew', handle: null, role: 'D2C Brand · Marketing Lead', avatar: 'HB', grad: ['#2563EB', '#1D4ED8'], quote: 'We ran four campaigns in a month and saw 3× our usual engagement. Finding the right creators used to take weeks.' },
  { name: 'Aditya Verma', handle: 'adityaverma.tech', role: 'Tech Creator · 85K subscribers', avatar: 'AV', grad: ['#059669', '#047857'], quote: 'The analytics dashboard alone is worth it — I can finally show brands real numbers.' },
  { name: 'Dhaka Threads', handle: null, role: 'Apparel Brand · Founder', avatar: 'DT', grad: ['#D97706', '#B45309'], quote: 'Escrow payments changed everything. Creators trust us more because the money is already secured.' },
];

const FAQS = [
  { q: 'Is kolab free to join?', a: 'Yes — signing up is completely free for both creators and brands. We only take a small platform fee once a campaign is successfully completed.' },
  { q: 'How do payments work?', a: 'Payments are held in escrow and released in milestones. Once a creator submits deliverables and the brand approves them, funds are released automatically.' },
  { q: 'What creators can join?', a: 'Any content creator — Instagram, YouTube, TikTok, bloggers, podcasters, and more. A minimum audience size applies to keep the marketplace credible.' },
  { q: 'How are creators verified?', a: 'We verify creators by connecting their social accounts directly, so audience size and engagement are pulled live rather than self-reported.' },
  { q: 'Can a brand run multiple campaigns?', a: 'Yes. Brands can create and manage unlimited campaigns at once, each with its own budget, timeline, and creator requirements.' },
  { q: 'Is my data safe?', a: 'All data is encrypted in transit and at rest. We never sell personal data, and we comply with local privacy regulations.' },
];

// ── Floating gradient blob (mouse-parallax) ──────────────────────────────────

function useParallaxBlobs(ref: React.RefObject<HTMLElement | null>) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });
  const blobX = useTransform(sx, [-1, 1], [-40, 40]);
  const blobY = useTransform(sy, [-1, 1], [-40, 40]);
  const blobX2 = useTransform(sx, [-1, 1], [32, -32]);
  const blobY2 = useTransform(sy, [-1, 1], [32, -32]);

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  return { onMove, blobX, blobY, blobX2, blobY2 };
}

// Full-bleed decorative layer — sized to the whole section, not the inner content column,
// so the glow reaches the true edges instead of leaving a hole on wide viewports.
function ParallaxBlobs({ blobX, blobY, blobX2, blobY2 }: {
  blobX: MotionValue<number>; blobY: MotionValue<number>;
  blobX2: MotionValue<number>; blobY2: MotionValue<number>;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div style={{ x: blobX, y: blobY }} className="absolute top-[-120px] right-[-120px] w-[34rem] h-[34rem] rounded-full bg-fuchsia-400/25 blur-3xl" />
      <motion.div style={{ x: blobX2, y: blobY2 }} className="absolute bottom-[-100px] left-[-100px] w-[26rem] h-[26rem] rounded-full bg-indigo-400/25 blur-3xl" />
      <motion.div style={{ x: blobX, y: blobY2 }} className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-violet-300/15 blur-3xl" />
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function go(id: string) {
    setOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), open ? 350 : 0);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 pt-4 md:pt-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => go('hero')} className="flex items-center gap-2 bg-white rounded-full pl-2 pr-4 py-2 shadow-sm ring-1 ring-black/5">
            <img src="/logo.png" alt="kolab" className="h-6 w-6 rounded-full object-cover" />
            <span className="font-extrabold text-gray-900 tracking-tight text-sm">kolab</span>
          </button>

          {/* Desktop pill nav */}
          <motion.nav
            initial={false}
            animate={{ backgroundColor: scrolled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.14)' }}
            className="hidden lg:flex items-center gap-1 rounded-full px-2 py-2 backdrop-blur-md ring-1 ring-white/20 shadow-sm"
          >
            {NAV_LINKS.map(l => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-violet-700 hover:bg-violet-50' : 'text-white/85 hover:text-white hover:bg-white/10'}`}
              >
                {l.label}
              </button>
            ))}
          </motion.nav>

          {/* CTA + burger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => go('download')}
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition-colors ${scrolled ? 'bg-violet-700 text-white hover:bg-violet-800' : 'bg-white text-violet-700 hover:bg-violet-50'}`}
            >
              Get Started <ArrowUpRight size={15} />
            </button>
            <button
              onClick={() => setOpen(v => !v)}
              aria-label="Toggle menu"
              className={`lg:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors ${scrolled || open ? 'bg-violet-700 text-white' : 'bg-white/15 text-white backdrop-blur'}`}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: 'circle(4% at 92% 4%)' }}
            animate={{ clipPath: 'circle(150% at 92% 4%)' }}
            exit={{ clipPath: 'circle(4% at 92% 4%)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-center px-8"
            style={{ background: 'linear-gradient(160deg,#2E1065 0%,#4C1D95 55%,#7C3AED 100%)' }}
          >
            <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="flex flex-col gap-2">
              {NAV_LINKS.map((l, i) => (
                <motion.button
                  key={l.id}
                  variants={fadeUp}
                  onClick={() => go(l.id)}
                  className="text-left text-4xl font-extrabold text-white/90 hover:text-white py-2 tracking-tight"
                >
                  <span className="text-white/30 text-lg align-super mr-3">0{i + 1}</span>{l.label}
                </motion.button>
              ))}
              <motion.button
                variants={fadeUp}
                onClick={() => go('download')}
                className="mt-6 w-fit flex items-center gap-2 bg-white text-violet-700 font-bold px-6 py-3.5 rounded-2xl"
              >
                Get Started <ArrowRight size={18} />
              </motion.button>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="absolute bottom-10 left-8 flex gap-4">
              {[AtSign, Globe, Mail].map((Icon, i) => (
                <div key={i} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <Icon size={16} className="text-white/70" />
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Custom phone screens (original artwork) ──────────────────────────────────

function BusinessDashboardScreen() {
  const row = (n: string, l: string, border: boolean) => (
    <div key={l} style={{ flex: 1, textAlign: 'center', borderRight: border ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{n}</div>
      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{l}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#F1F5F9' }}>
      <div style={{ background: 'linear-gradient(160deg,#2E1065,#4C1D95)', paddingTop: 36, paddingBottom: 14, paddingLeft: 12, paddingRight: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Good Evening</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Paradise Cafe</div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>P</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 14, padding: '8px 0', display: 'flex' }}>
          {row('3', 'Active', true)}{row('3', 'Total', true)}{row('0', 'Complete', false)}
        </div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {[['➕', 'Create'], ['👥', 'Proposals'], ['💬', 'Messages'], ['📅', 'Events']].map(([ic, lb]) => (
            <div key={lb} style={{ background: '#fff', borderRadius: 14, padding: '7px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontSize: 12 }}>{ic}</div>
              <div style={{ fontSize: 6, color: '#374151', fontWeight: 500 }}>{lb}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: 11 }}>⚠️</div>
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#92400E', marginBottom: 1 }}>Needs Your Attention</div>
            <div style={{ fontSize: 6, color: '#B45309' }}>4 proposals waiting for review</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 9, color: '#D97706' }}>›</div>
        </div>
        <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: 11 }}>🎨</div>
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#065F46', marginBottom: 1 }}>Explore Creators</div>
            <div style={{ fontSize: 6, color: '#059669' }}>for your next event</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 9, color: '#059669' }}>›</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#111' }}>Recent Events</div>
          <div style={{ fontSize: 7, color: '#7C3AED', fontWeight: 600 }}>View all</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 10, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👗</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: '#111' }}>Fashion Cr...</div>
              <div style={{ fontSize: 5, background: '#D1FAE5', color: '#065F46', padding: '1px 4px', borderRadius: 99, fontWeight: 700 }}>Free</div>
              <div style={{ fontSize: 5, background: '#D1FAE5', color: '#065F46', padding: '1px 4px', borderRadius: 99, fontWeight: 700 }}>● Active</div>
            </div>
            <div style={{ fontSize: 6, color: '#9CA3AF' }}>Instagram · Free Product Exchange</div>
            <div style={{ fontSize: 6, color: '#374151', marginTop: 1 }}>👥 2 Proposals</div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #E5E7EB', display: 'flex', paddingTop: 5, paddingBottom: 6 }}>
        {[['🏠', 'Home', true], ['📅', 'Events', false], ['📄', 'Proposals', false], ['💬', 'Messages', false], ['🔔', 'Activity', false]].map(([ic, lb, active]) => (
          <div key={String(lb)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 13 }}>{ic}</div>
            <div style={{ fontSize: 5, color: active ? '#7C3AED' : '#9CA3AF', fontWeight: active ? 700 : 400 }}>{lb}</div>
            {active && <div style={{ width: 16, height: 2, background: '#7C3AED', borderRadius: 1 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesScreen() {
  const convos = [
    { init: 'SB', name: 'Sundar Ban', last: "Hi Paradise Cafe team! I'm thrilled…", time: '2d', color: '#7C3AED', statusColor: '#10B981' },
    { init: 'SB', name: 'Sundar Ban', last: 'Looking forward to collaborating!', time: '1d', color: '#2563EB', statusColor: '#F59E0B' },
    { init: 'PL', name: 'Priya Lama', last: 'Thank you for the opportunity…', time: '5h', color: '#059669', statusColor: '#10B981' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#F1F5F9' }}>
      <div style={{ background: 'linear-gradient(160deg,#312E81,#4C1D95)', paddingTop: 36, paddingBottom: 18, paddingLeft: 12, paddingRight: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Proposals</div>
          <div style={{ fontSize: 9, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 8px', borderRadius: 99 }}>2 application(s)</div>
        </div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>Review creator applications by campaign</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[['All', '2', true], ['Paid', '1', false], ['Free', '1', false], ['Accepted', '2', false]].map(([t, c, active]) => (
            <div key={String(t)} style={{ display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 5, borderBottom: active ? '2px solid #fff' : '2px solid transparent' }}>
              <div style={{ fontSize: 7, fontWeight: active ? 700 : 400, color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>{t}</div>
              <div style={{ fontSize: 6, background: active ? '#7C3AED' : 'rgba(255,255,255,0.2)', color: '#fff', padding: '0 4px', borderRadius: 99 }}>{c}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '8px 8px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {convos.map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '9px 10px', border: '2px solid #F3F4F6', borderLeft: `3px solid ${c.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: c.color }}>{c.init}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#111' }}>{c.name}</div>
                <div style={{ fontSize: 6, color: '#9CA3AF' }}>📍 Birtamode, Nepal</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: c.statusColor }}>✅ Accepted</div>
                <div style={{ fontSize: 6, color: '#9CA3AF' }}>{c.time} ago</div>
              </div>
            </div>
            <div style={{ background: '#F8F9FF', borderRadius: 9, padding: '5px 7px', display: 'flex', gap: 5 }}>
              <div style={{ fontSize: 9 }}>💬</div>
              <div style={{ flex: 1, fontSize: 6, color: '#6B7280', lineHeight: 1.4, fontStyle: 'italic' }}>{c.last}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Phone shell ───────────────────────────────────────────────────────────────

function PhoneShell({ children, glow }: { children: React.ReactNode; glow: [string, string] }) {
  return (
    <div className="relative">
      <div className="absolute inset-[-24px] rounded-[3.6rem] blur-3xl opacity-40 pointer-events-none" style={{ background: `linear-gradient(135deg, ${glow[0]}, ${glow[1]})` }} />
      <div className="relative w-[230px] h-[470px] rounded-[3rem] border-[6px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-black rounded-full z-20" />
        {children}
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-violet-50/60 transition-colors">
        <span className="font-semibold text-gray-800 text-sm pr-4">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }} className="flex-shrink-0 text-violet-500">
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            <p className="px-5 pb-4 text-gray-500 text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section heading helper ───────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <motion.span variants={fadeUp} className="inline-flex items-center gap-1.5 text-violet-600 font-bold text-xs uppercase tracking-widest">
      <span className="w-4 h-px bg-violet-400" />{children}
    </motion.span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const HEADLINE_LINES = ['Where Creators', 'Meet Brands.'];

const HERO_SLIDES = [
  { tag: 'For Brands', tagColor: '#FBBF24', title: 'Manage every campaign', desc: 'Track active events and live proposal counts from one dashboard.', Screen: BusinessDashboardScreen, glow: ['#4C1D95', '#DB2777'] as [string, string] },
  { tag: 'Messages', tagColor: '#34D399', title: 'Review proposals in a tap', desc: 'Cover letters, rates, and timelines — accept or decline instantly.', Screen: MessagesScreen, glow: ['#065F46', '#059669'] as [string, string] },
];

export function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const blobs = useParallaxBlobs(heroRef);
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActiveSlide(i => (i + 1) % HERO_SLIDES.length), 4200);
  }

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const slide = HERO_SLIDES[activeSlide]!;

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      <Nav />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        id="hero"
        ref={heroRef}
        onMouseMove={blobs.onMove}
        className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #2E1065 0%, #5B21B6 45%, #7C3AED 100%)' }}
      >
        <ParallaxBlobs {...blobs} />

        <div className="relative max-w-6xl mx-auto px-5 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-6 items-center w-full">
          <div>
            <motion.div initial="hidden" animate="show" variants={stagger()}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white/90 text-xs font-semibold mb-6 ring-1 ring-white/20">
                <Sparkles size={12} className="text-yellow-300" /> Nepal's Creator × Brand Marketplace
              </motion.div>

              <h1 className="text-[2.75rem] leading-[1.05] sm:text-6xl sm:leading-[1.02] font-extrabold text-white mb-6">
                {HEADLINE_LINES.map((line, i) => (
                  <span key={i} className="block overflow-hidden">
                    <motion.span variants={wordReveal} className="block">{line}</motion.span>
                  </span>
                ))}
              </h1>

              <motion.p variants={fadeUp} className="text-white/70 text-lg max-w-md mb-9 leading-relaxed">
                Creators find campaigns worth their audience. Brands find creators worth the budget. kolab makes the whole collab — proposal to payment — happen in one place.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
                <motion.button whileHover={{ y: -2, boxShadow: '0 14px 32px rgba(0,0,0,0.25)' }} className="px-6 py-3.5 rounded-2xl bg-white text-violet-700 font-bold text-sm shadow-lg flex items-center gap-2">
                  Join as a Creator <ArrowRight size={16} />
                </motion.button>
                <motion.button whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.18)' }} className="px-6 py-3.5 rounded-2xl bg-white/10 text-white font-bold text-sm ring-1 ring-white/25 transition-colors">
                  Join as a Brand
                </motion.button>
              </motion.div>

              <motion.div variants={fadeUp} className="flex gap-8">
                {[['2,500+', 'Creators'], ['400+', 'Brands'], ['8,000+', 'Campaigns']].map(([v, l]) => (
                  <div key={l}>
                    <div className="text-white font-extrabold text-2xl">{v}</div>
                    <div className="text-white/55 text-xs">{l}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* ── Hero slider: phone mockup + dynamic caption card ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <PhoneShell glow={slide.glow}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <slide.Screen />
                </motion.div>
              </AnimatePresence>
            </PhoneShell>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="text-center max-w-xs"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2" style={{ backgroundColor: `${slide.tagColor}25`, color: slide.tagColor }}>
                  {slide.tag}
                </div>
                <div className="text-white font-bold text-sm mb-1">{slide.title}</div>
                <p className="text-white/60 text-xs leading-relaxed">{slide.desc}</p>
              </motion.div>
            </AnimatePresence>

            {/* Slider dots */}
            <div className="flex items-center gap-2">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveSlide(i); startTimer(); }}
                  aria-label={`Show slide ${i + 1}`}
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: i === activeSlide ? 26 : 8, backgroundColor: i === activeSlide ? '#fff' : 'rgba(255,255,255,0.3)' }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 48 }}>
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Value props + keyword cloud ──────────────────────────────────── */}
      <section id="value" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
            <Eyebrow>Why kolab</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Built for real collaboration</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid md:grid-cols-3 gap-6 mb-14">
            {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={scaleIn} whileHover={{ y: -6 }} className="rounded-3xl p-7 bg-gradient-to-br from-violet-50 to-white border border-violet-100">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mb-5">
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.04)} className="flex flex-wrap justify-center gap-2.5">
            {KEYWORDS.map(k => (
              <motion.span key={k} variants={scaleIn} className="px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium hover:border-violet-300 hover:text-violet-700 transition-colors">
                {k}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
            <Eyebrow>Simple process</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Three steps to your first collab</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div key={step.num} variants={fadeUp} whileHover={{ y: -5, boxShadow: '0 16px 36px rgba(109,40,217,0.12)' }} className="relative bg-white rounded-2xl p-7 border border-gray-100">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-9 left-full w-8 items-center justify-center z-10">
                    <ArrowRight size={20} className="text-violet-300" />
                  </div>
                )}
                <div className="text-5xl font-extrabold text-violet-100 mb-4 select-none">{step.num}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
            <Eyebrow>Everything you need</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Powerful, purpose-built features</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={fadeUp} whileHover={{ y: -6, borderColor: '#C4B5FD' }} className="p-6 rounded-2xl border border-gray-100 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-violet-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── For Creators / For Brands ────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
            <Eyebrow>Who it's for</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Built for both sides of the deal</motion.h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VP} transition={{ duration: 0.6 }} whileHover={{ y: -4 }} className="bg-white rounded-3xl p-8 border border-violet-100">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center mb-5">
                <Camera size={26} className="text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">For Creators</h3>
              <p className="text-gray-500 text-sm mb-5">Influencers, YouTubers, bloggers, podcasters — turn your audience into income.</p>
              <ul className="space-y-3">
                {['Discover brand deals that match your niche', 'Submit proposals and negotiate your rate', 'Track deliverables and campaign progress', 'Get paid on time through secure escrow'].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-violet-500 mt-0.5 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VP} transition={{ duration: 0.6 }} whileHover={{ y: -4 }} className="bg-white rounded-3xl p-8 border border-blue-100">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center mb-5">
                <Briefcase size={26} className="text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">For Brands</h3>
              <p className="text-gray-500 text-sm mb-5">D2C brands, agencies, startups — amplify reach with the right creators.</p>
              <ul className="space-y-3">
                {['Post campaigns with your goals and budget', 'Browse and filter verified creators', 'Review proposals and pick the best fit', 'Pay only once you approve the results'].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Referral Program ─────────────────────────────────────────────── */}
      <section id="referrals" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
            <Eyebrow>Earn together</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Invite someone in your world, get rewarded</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 mt-4 max-w-xl mx-auto">
              Every creator and every brand gets a personal referral code. Share it with someone like you — when they get their first campaign done, you both earn.
            </motion.p>
          </motion.div>

          {/* Shared 3-step flow */}
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid sm:grid-cols-3 gap-6 mb-16">
            {REFERRAL_STEPS.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={fadeUp} className="text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-4">
                  <Icon size={20} className="text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1.5">{title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Creator-to-creator / Business-to-business breakdown */}
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VP} transition={{ duration: 0.6 }} whileHover={{ y: -4 }} className="bg-gradient-to-br from-violet-50 to-white rounded-3xl p-8 border border-violet-100">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center">
                  <Camera size={24} className="text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-violet-700">NPR 500</div>
                  <div className="text-xs text-gray-400 font-medium">+ NPR 200 for them</div>
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">Creator → Creator</h3>
              <p className="text-gray-500 text-sm mb-5">Refer a fellow creator to kolab. When they complete their first campaign, you both earn.</p>
              <ul className="space-y-3">
                {CREATOR_REFERRAL_STEPS.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-violet-500 mt-0.5 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VP} transition={{ duration: 0.6 }} whileHover={{ y: -4 }} className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 border border-blue-100">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
                  <Briefcase size={24} className="text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-blue-700">NPR 500</div>
                  <div className="text-xs text-gray-400 font-medium">for both sides</div>
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">Business → Business</h3>
              <p className="text-gray-500 text-sm mb-5">Know another brand that could use kolab? Refer them and earn once they're active.</p>
              <ul className="space-y-3">
                {BUSINESS_REFERRAL_STEPS.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── App deep dive ────────────────────────────────────────────────── */}
      <section className="py-24 overflow-hidden" style={{ background: 'linear-gradient(150deg, #1E1B4B 0%, #312E81 55%, #4C1D95 100%)' }}>
        <div className="max-w-6xl mx-auto px-5">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-16">
            <motion.span variants={fadeUp} className="text-violet-300 font-bold text-xs uppercase tracking-widest">See the app</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mt-3">Fast, clean, built for daily use</motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VP} transition={{ duration: 0.6 }} className="space-y-5 order-2 md:order-1">
              <span className="text-emerald-300 font-bold text-xs uppercase tracking-widest">For Brands</span>
              <h3 className="text-2xl font-extrabold text-white">Review proposals in one tap</h3>
              <p className="text-violet-300 text-sm leading-relaxed">See every creator who applied — cover letters, proposed rates, timelines. Expand the pitch, then accept or decline instantly.</p>
              <div className="flex items-center gap-2 text-white/80 text-sm"><TrendingUp size={16} className="text-emerald-300" /> Live proposal counts per campaign</div>
              <div className="flex items-center gap-2 text-white/80 text-sm"><Users size={16} className="text-emerald-300" /> Cover-letter preview with expand toggle</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={VP} transition={{ duration: 0.6 }} className="flex justify-center order-1 md:order-2">
              <PhoneShell glow={['#065F46', '#059669']}>
                <MessagesScreen />
              </PhoneShell>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section id="stories" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
            <Eyebrow>Success stories</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Loved by creators & brands</motion.h2>
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
                      <div className="flex items-center gap-1 text-violet-500 text-xs font-medium"><AtSign size={11} />{handle}</div>
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

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-5">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-12">
            <Eyebrow>Got questions?</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">Frequently asked</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="space-y-3">
            {FAQS.map(faq => (
              <motion.div key={faq.q} variants={fadeUp}><FaqItem {...faq} /></motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────── */}
      <section id="download" className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="relative max-w-3xl mx-auto px-5 text-center">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to start collaborating?</motion.h2>
          <motion.p variants={fadeUp} className="text-white/70 text-lg mb-8">Join thousands of creators and brands already growing on kolab.</motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
            <motion.button whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }} whileTap={{ scale: 0.97 }} className="px-8 py-4 rounded-2xl bg-white text-violet-700 font-bold">
              Download the App
            </motion.button>
            <motion.button
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)' }} whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-2xl border border-white/30 text-white font-bold"
            >
              Contact Us
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-5 grid md:grid-cols-2 gap-12">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
            <Eyebrow>Get in touch</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold text-gray-900 mt-3 mb-4">Contact us</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-sm leading-relaxed mb-6">Have questions, partnership ideas, or want to learn more? Reach out — we typically reply within 24 hours.</motion.p>
            <motion.div variants={stagger()} className="space-y-4">
              {[{ icon: Mail, label: 'Email', value: 'hello@kolab.com.np' }, { icon: AtSign, label: 'Instagram', value: '@kolab.np' }, { icon: Globe, label: 'Website', value: 'kolab.com.np' }].map(({ icon: Icon, label, value }) => (
                <motion.div key={label} variants={fadeUp} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0"><Icon size={16} className="text-violet-600" /></div>
                  <div><div className="text-xs text-gray-400">{label}</div><div className="text-sm font-medium text-gray-800">{value}</div></div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 space-y-4"
            onSubmit={e => { e.preventDefault(); alert("Message sent! We'll get back to you soon."); (e.target as HTMLFormElement).reset(); }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name</label>
                <input required className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input required type="email" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" placeholder="you@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">I am a…</label>
              <select className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 bg-white">
                <option>Content Creator</option>
                <option>Brand / Business</option>
                <option>Press / Media</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
              <textarea required rows={4} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none" placeholder="How can we help?" />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors">Send Message</button>
          </motion.form>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-violet-950 text-white py-12">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 bg-white rounded-full pl-2 pr-4 py-2 mb-3 w-fit">
                <img src="/logo.png" alt="kolab" className="h-5 w-5 rounded-full object-cover" />
                <span className="font-extrabold text-gray-900 text-sm">kolab</span>
              </div>
              <p className="text-violet-300 text-sm leading-relaxed max-w-xs">Nepal's marketplace connecting content creators with brands for authentic, impactful campaigns.</p>
              <div className="flex gap-3 mt-4">
                {[AtSign, Globe, Mail].map((Icon, i) => (
                  <div key={i} className="w-8 h-8 rounded-lg bg-violet-800 hover:bg-violet-700 flex items-center justify-center cursor-pointer transition-colors"><Icon size={15} className="text-violet-300" /></div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Product</div>
              {['Features', 'How it works', 'Pricing', 'Download'].map(l => <div key={l} className="text-violet-400 text-sm mb-2 hover:text-violet-200 cursor-pointer transition-colors">{l}</div>)}
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Legal</div>
              {['Privacy Policy', 'Terms & Conditions', 'Community Guidelines', 'Cookie Policy'].map(l => <div key={l} className="text-violet-400 text-sm mb-2 hover:text-violet-200 cursor-pointer transition-colors">{l}</div>)}
            </div>
          </div>
          <div className="border-t border-violet-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-violet-400 text-xs">© {new Date().getFullYear()} kolab. All rights reserved.</p>
            <p className="text-violet-400 text-xs">Made with ♥ in Nepal</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
