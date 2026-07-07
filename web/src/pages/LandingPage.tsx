import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type Variants, type MotionValue } from 'framer-motion';
import {
  Camera, Briefcase, MessageSquare, BarChart2, Shield, Sparkles,
  Star, ChevronDown, Mail, Globe, AtSign, Rocket, Compass, Handshake,
  ArrowRight, ArrowUpRight, CheckCircle, Users, TrendingUp,
  DollarSign, Search, Bell, Menu, X, Share2, UserPlus, Gift,
} from 'lucide-react';
import { LandingLanguageProvider, useLandingLanguage, type Lang } from '../context/LandingLanguageContext';

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

// ── Language switcher ─────────────────────────────────────────────────────────

function LanguageSwitcher({ scrolled }: { scrolled: boolean }) {
  const { language, setLanguage } = useLandingLanguage();
  const LANGS: { code: Lang; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'ne', label: 'ने' },
  ];
  return (
    <div className={`flex items-center gap-0.5 rounded-full p-1 transition-colors ${scrolled ? 'bg-gray-100' : 'bg-white/15 backdrop-blur'}`}>
      {LANGS.map(({ code, label }) => {
        const active = language === code;
        return (
          <button
            key={code}
            onClick={() => setLanguage(code)}
            aria-label={`Switch to ${code === 'en' ? 'English' : 'Nepali'}`}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
              active
                ? scrolled ? 'bg-violet-700 text-white' : 'bg-white text-violet-700'
                : scrolled ? 'text-gray-500 hover:text-gray-700' : 'text-white/75 hover:text-white'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const { t } = useLandingLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const NAV_LINKS = [
    { label: t.nav.whyKolab, id: 'value' },
    { label: t.nav.howItWorks, id: 'how-it-works' },
    { label: t.nav.features, id: 'features' },
    { label: t.nav.referrals, id: 'referrals' },
    { label: t.nav.stories, id: 'stories' },
    { label: t.nav.faq, id: 'faq' },
  ];

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

          {/* Language switcher + CTA + burger — top-right cluster */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher scrolled={scrolled} />
            <button
              onClick={() => go('download')}
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition-colors ${scrolled ? 'bg-violet-700 text-white hover:bg-violet-800' : 'bg-white text-violet-700 hover:bg-violet-50'}`}
            >
              {t.nav.getStarted} <ArrowUpRight size={15} />
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
                {t.nav.getStarted} <ArrowRight size={18} />
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
  const { t } = useLandingLanguage();
  const m = t.mockup.dash;
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
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{m.goodEvening}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{m.businessName}</div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>P</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 14, padding: '8px 0', display: 'flex' }}>
          {row('3', m.active, true)}{row('3', m.total, true)}{row('0', m.complete, false)}
        </div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {[['➕', m.create], ['👥', m.proposals], ['💬', m.messages], ['📅', m.events]].map(([ic, lb]) => (
            <div key={lb} style={{ background: '#fff', borderRadius: 14, padding: '7px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontSize: 12 }}>{ic}</div>
              <div style={{ fontSize: 6, color: '#374151', fontWeight: 500 }}>{lb}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: 11 }}>⚠️</div>
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#92400E', marginBottom: 1 }}>{m.needsAttention}</div>
            <div style={{ fontSize: 6, color: '#B45309' }}>{m.needsAttentionSub}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 9, color: '#D97706' }}>›</div>
        </div>
        <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: 11 }}>🎨</div>
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#065F46', marginBottom: 1 }}>{m.exploreCreators}</div>
            <div style={{ fontSize: 6, color: '#059669' }}>{m.exploreCreatorsSub}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 9, color: '#059669' }}>›</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#111' }}>{m.recentEvents}</div>
          <div style={{ fontSize: 7, color: '#7C3AED', fontWeight: 600 }}>{m.viewAll}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 10, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👗</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: '#111' }}>{m.campaignName}</div>
              <div style={{ fontSize: 5, background: '#D1FAE5', color: '#065F46', padding: '1px 4px', borderRadius: 99, fontWeight: 700 }}>{m.free}</div>
              <div style={{ fontSize: 5, background: '#D1FAE5', color: '#065F46', padding: '1px 4px', borderRadius: 99, fontWeight: 700 }}>{m.activeStatus}</div>
            </div>
            <div style={{ fontSize: 6, color: '#9CA3AF' }}>{m.platformInfo}</div>
            <div style={{ fontSize: 6, color: '#374151', marginTop: 1 }}>{m.proposalsCount}</div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #E5E7EB', display: 'flex', paddingTop: 5, paddingBottom: 6 }}>
        {[['🏠', m.navHome, true], ['📅', m.navEvents, false], ['📄', m.navProposals, false], ['💬', m.navMessages, false], ['🔔', m.navActivity, false]].map(([ic, lb, active]) => (
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
  const { t } = useLandingLanguage();
  const m = t.mockup.msgs;
  const convos = [
    { init: 'SB', name: 'Sundar Ban', last: m.msg1, time: '2d', color: '#7C3AED', statusColor: '#10B981' },
    { init: 'SB', name: 'Sundar Ban', last: m.msg2, time: '1d', color: '#2563EB', statusColor: '#F59E0B' },
    { init: 'PL', name: 'Priya Lama', last: m.msg3, time: '5h', color: '#059669', statusColor: '#10B981' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#F1F5F9' }}>
      <div style={{ background: 'linear-gradient(160deg,#312E81,#4C1D95)', paddingTop: 36, paddingBottom: 18, paddingLeft: 12, paddingRight: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{m.title}</div>
          <div style={{ fontSize: 9, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 8px', borderRadius: 99 }}>{m.appCount}</div>
        </div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>{m.subtitle}</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[[m.tabAll, '2', true], [m.tabPaid, '1', false], [m.tabFree, '1', false], [m.tabAccepted, '2', false]].map(([tab, c, active]) => (
            <div key={String(tab)} style={{ display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 5, borderBottom: active ? '2px solid #fff' : '2px solid transparent' }}>
              <div style={{ fontSize: 7, fontWeight: active ? 700 : 400, color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>{tab}</div>
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
                <div style={{ fontSize: 6, color: '#9CA3AF' }}>{m.location}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: c.statusColor }}>{m.accepted}</div>
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

export function LandingPage() {
  return (
    <LandingLanguageProvider>
      <LandingPageInner />
    </LandingLanguageProvider>
  );
}

function LandingPageInner() {
  const { t } = useLandingLanguage();
  const heroRef = useRef<HTMLElement>(null);
  const blobs = useParallaxBlobs(heroRef);
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const HEADLINE_LINES = [t.hero.headline1, t.hero.headline2];

  const HERO_SLIDES = [
    { tag: t.hero.slide1Tag, tagColor: '#FBBF24', title: t.hero.slide1Title, desc: t.hero.slide1Desc, Screen: BusinessDashboardScreen, glow: ['#4C1D95', '#DB2777'] as [string, string] },
    { tag: t.hero.slide2Tag, tagColor: '#34D399', title: t.hero.slide2Title, desc: t.hero.slide2Desc, Screen: MessagesScreen, glow: ['#065F46', '#059669'] as [string, string] },
  ];

  const VALUE_PROPS = [
    { icon: Compass, title: t.value.prop1Title, desc: t.value.prop1Desc },
    { icon: Handshake, title: t.value.prop2Title, desc: t.value.prop2Desc },
    { icon: Rocket, title: t.value.prop3Title, desc: t.value.prop3Desc },
  ];

  const STEPS = [
    { num: '01', title: t.how.step1Title, desc: t.how.step1Desc },
    { num: '02', title: t.how.step2Title, desc: t.how.step2Desc },
    { num: '03', title: t.how.step3Title, desc: t.how.step3Desc },
  ];

  const FEATURES = [
    { icon: Search, title: t.features.f1Title, desc: t.features.f1Desc },
    { icon: MessageSquare, title: t.features.f2Title, desc: t.features.f2Desc },
    { icon: BarChart2, title: t.features.f3Title, desc: t.features.f3Desc },
    { icon: DollarSign, title: t.features.f4Title, desc: t.features.f4Desc },
    { icon: Bell, title: t.features.f5Title, desc: t.features.f5Desc },
    { icon: Shield, title: t.features.f6Title, desc: t.features.f6Desc },
  ];

  const REFERRAL_STEPS = [
    { icon: Share2, title: t.referral.step1Title, desc: t.referral.step1Desc },
    { icon: UserPlus, title: t.referral.step2Title, desc: t.referral.step2Desc },
    { icon: Gift, title: t.referral.step3Title, desc: t.referral.step3Desc },
  ];

  const TESTIMONIALS = [
    { name: 'Priya Sharma', handle: 'priya.creates', role: t.stories.t1Role, avatar: 'PS', grad: ['#7C3AED', '#5B21B6'], quote: t.stories.t1Quote },
    { name: 'Himalaya Brew', handle: null, role: t.stories.t2Role, avatar: 'HB', grad: ['#2563EB', '#1D4ED8'], quote: t.stories.t2Quote },
    { name: 'Aditya Verma', handle: 'adityaverma.tech', role: t.stories.t3Role, avatar: 'AV', grad: ['#059669', '#047857'], quote: t.stories.t3Quote },
    { name: 'Dhaka Threads', handle: null, role: t.stories.t4Role, avatar: 'DT', grad: ['#D97706', '#B45309'], quote: t.stories.t4Quote },
  ];

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActiveSlide(i => (i + 1) % HERO_SLIDES.length), 4200);
  }

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <Sparkles size={12} className="text-yellow-300" /> {t.hero.badge}
              </motion.div>

              <h1 className="text-[2.75rem] leading-[1.05] sm:text-6xl sm:leading-[1.02] font-extrabold text-white mb-6">
                {HEADLINE_LINES.map((line, i) => (
                  <span key={i} className="block overflow-hidden">
                    <motion.span variants={wordReveal} className="block">{line}</motion.span>
                  </span>
                ))}
              </h1>

              <motion.p variants={fadeUp} className="text-white/70 text-lg max-w-md mb-9 leading-relaxed">
                {t.hero.subtitle}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
                <motion.button whileHover={{ y: -2, boxShadow: '0 14px 32px rgba(0,0,0,0.25)' }} className="px-6 py-3.5 rounded-2xl bg-white text-violet-700 font-bold text-sm shadow-lg flex items-center gap-2">
                  {t.hero.joinCreator} <ArrowRight size={16} />
                </motion.button>
                <motion.button whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.18)' }} className="px-6 py-3.5 rounded-2xl bg-white/10 text-white font-bold text-sm ring-1 ring-white/25 transition-colors">
                  {t.hero.joinBrand}
                </motion.button>
              </motion.div>

              <motion.div variants={fadeUp} className="flex gap-8">
                {[['2,500+', t.hero.statCreators], ['400+', t.hero.statBrands], ['8,000+', t.hero.statCampaigns]].map(([v, l]) => (
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
            <Eyebrow>{t.value.eyebrow}</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{t.value.heading}</motion.h2>
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
            {t.value.keywords.map(k => (
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
            <Eyebrow>{t.how.eyebrow}</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{t.how.heading}</motion.h2>
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
            <Eyebrow>{t.features.eyebrow}</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{t.features.heading}</motion.h2>
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
            <Eyebrow>{t.whoFor.eyebrow}</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{t.whoFor.heading}</motion.h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VP} transition={{ duration: 0.6 }} whileHover={{ y: -4 }} className="bg-white rounded-3xl p-8 border border-violet-100">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center mb-5">
                <Camera size={26} className="text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">{t.whoFor.creatorTitle}</h3>
              <p className="text-gray-500 text-sm mb-5">{t.whoFor.creatorDesc}</p>
              <ul className="space-y-3">
                {t.whoFor.creatorItems.map(item => (
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
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">{t.whoFor.brandTitle}</h3>
              <p className="text-gray-500 text-sm mb-5">{t.whoFor.brandDesc}</p>
              <ul className="space-y-3">
                {t.whoFor.brandItems.map(item => (
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
            <Eyebrow>{t.referral.eyebrow}</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{t.referral.heading}</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 mt-4 max-w-xl mx-auto">
              {t.referral.subtitle}
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
                  <div className="text-2xl font-extrabold text-violet-700">{t.referral.creatorReward}</div>
                  <div className="text-xs text-gray-400 font-medium">{t.referral.creatorRewardSub}</div>
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">{t.referral.creatorTitle}</h3>
              <p className="text-gray-500 text-sm mb-5">{t.referral.creatorDesc}</p>
              <ul className="space-y-3">
                {t.referral.creatorItems.map(item => (
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
                  <div className="text-2xl font-extrabold text-blue-700">{t.referral.businessReward}</div>
                  <div className="text-xs text-gray-400 font-medium">{t.referral.businessRewardSub}</div>
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">{t.referral.businessTitle}</h3>
              <p className="text-gray-500 text-sm mb-5">{t.referral.businessDesc}</p>
              <ul className="space-y-3">
                {t.referral.businessItems.map(item => (
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
            <motion.span variants={fadeUp} className="text-violet-300 font-bold text-xs uppercase tracking-widest">{t.appDeepDive.eyebrow}</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mt-3">{t.appDeepDive.heading}</motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VP} transition={{ duration: 0.6 }} className="space-y-5 order-2 md:order-1">
              <span className="text-emerald-300 font-bold text-xs uppercase tracking-widest">{t.appDeepDive.badge}</span>
              <h3 className="text-2xl font-extrabold text-white">{t.appDeepDive.title}</h3>
              <p className="text-violet-300 text-sm leading-relaxed">{t.appDeepDive.desc}</p>
              <div className="flex items-center gap-2 text-white/80 text-sm"><TrendingUp size={16} className="text-emerald-300" /> {t.appDeepDive.stat1}</div>
              <div className="flex items-center gap-2 text-white/80 text-sm"><Users size={16} className="text-emerald-300" /> {t.appDeepDive.stat2}</div>
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
            <Eyebrow>{t.stories.eyebrow}</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{t.stories.heading}</motion.h2>
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
            <Eyebrow>{t.faq.eyebrow}</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3">{t.faq.heading}</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="space-y-3">
            {t.faq.items.map(faq => (
              <motion.div key={faq.q} variants={fadeUp}><FaqItem {...faq} /></motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────── */}
      <section id="download" className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="relative max-w-3xl mx-auto px-5 text-center">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mb-4">{t.cta.heading}</motion.h2>
          <motion.p variants={fadeUp} className="text-white/70 text-lg mb-8">{t.cta.subtitle}</motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
            <motion.button whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }} whileTap={{ scale: 0.97 }} className="px-8 py-4 rounded-2xl bg-white text-violet-700 font-bold">
              {t.cta.download}
            </motion.button>
            <motion.button
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)' }} whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-2xl border border-white/30 text-white font-bold"
            >
              {t.cta.contact}
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-5 grid md:grid-cols-2 gap-12">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
            <Eyebrow>{t.contact.eyebrow}</Eyebrow>
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold text-gray-900 mt-3 mb-4">{t.contact.heading}</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-sm leading-relaxed mb-6">{t.contact.desc}</motion.p>
            <motion.div variants={stagger()} className="space-y-4">
              {[{ icon: Mail, label: t.contact.emailLabel, value: 'hello@kolab.com.np' }, { icon: AtSign, label: t.contact.instagramLabel, value: '@kolab.np' }, { icon: Globe, label: t.contact.websiteLabel, value: 'kolab.com.np' }].map(({ icon: Icon, label, value }) => (
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
            onSubmit={e => { e.preventDefault(); alert(t.contact.successAlert); (e.target as HTMLFormElement).reset(); }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.contact.formName}</label>
                <input required className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" placeholder={t.contact.formNamePlaceholder} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.contact.formEmail}</label>
                <input required type="email" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" placeholder={t.contact.formEmailPlaceholder} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.contact.formIAm}</label>
              <select className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 bg-white">
                <option>{t.contact.formOptionCreator}</option>
                <option>{t.contact.formOptionBrand}</option>
                <option>{t.contact.formOptionPress}</option>
                <option>{t.contact.formOptionOther}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.contact.formMessage}</label>
              <textarea required rows={4} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none" placeholder={t.contact.formMessagePlaceholder} />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors">{t.contact.formSubmit}</button>
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
              <p className="text-violet-300 text-sm leading-relaxed max-w-xs">{t.footer.tagline}</p>
              <div className="flex gap-3 mt-4">
                {[AtSign, Globe, Mail].map((Icon, i) => (
                  <div key={i} className="w-8 h-8 rounded-lg bg-violet-800 hover:bg-violet-700 flex items-center justify-center cursor-pointer transition-colors"><Icon size={15} className="text-violet-300" /></div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">{t.footer.product}</div>
              {t.footer.productLinks.map(l => <div key={l} className="text-violet-400 text-sm mb-2 hover:text-violet-200 cursor-pointer transition-colors">{l}</div>)}
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">{t.footer.legal}</div>
              {t.footer.legalLinks.map(l => <div key={l} className="text-violet-400 text-sm mb-2 hover:text-violet-200 cursor-pointer transition-colors">{l}</div>)}
            </div>
          </div>
          <div className="border-t border-violet-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-violet-400 text-xs">© {new Date().getFullYear()} kolab. All rights reserved.</p>
            <p className="text-violet-400 text-xs">{t.footer.madeWith}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
