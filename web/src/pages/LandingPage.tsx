import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  Camera, Briefcase, MessageSquare, BarChart2, Shield, Zap,
  Star, ChevronDown, ChevronUp, Mail, Globe, AtSign,
  Play, ArrowRight, CheckCircle, Users, TrendingUp,
  DollarSign, Search, Bell, Menu, X,
} from 'lucide-react';

// ── Animation helpers ────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.5 } },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12 } },
};

const VP = { once: true, amount: 0.2 } as const;

// ── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Search,        title: 'Smart Discovery',      desc: 'Creators find brand deals; brands discover the right creators by niche, reach, and audience.' },
  { icon: MessageSquare, title: 'Real-time Chat',        desc: 'Negotiate, collaborate, and stay in sync with direct messaging built for campaigns.' },
  { icon: BarChart2,     title: 'Campaign Analytics',   desc: 'Track performance, impressions, and ROI for every campaign in one dashboard.' },
  { icon: DollarSign,    title: 'Secure Payments',      desc: 'Milestone-based payments held in escrow — creators get paid, brands get results.' },
  { icon: Bell,          title: 'Smart Notifications',  desc: 'Never miss a proposal, message, or payment with intelligent real-time alerts.' },
  { icon: Shield,        title: 'Verified Profiles',    desc: 'Every creator and brand is verified to ensure a trusted, professional marketplace.' },
];

const STEPS = [
  { num: '01', title: 'Create your profile',   desc: 'Sign up as a creator or brand in minutes. Add your niche, audience stats, or campaign goals.' },
  { num: '02', title: 'Connect & collaborate', desc: 'Browse campaigns or discover creators. Send proposals, negotiate terms, and align on deliverables.' },
  { num: '03', title: 'Execute & get paid',    desc: 'Deliver content, track results in real time, and receive secure milestone payments automatically.' },
];

const FAQS = [
  { q: 'Is CreatorMarket free to join?',               a: 'Yes — signing up is completely free for both creators and brands. We only charge a small platform fee when a campaign is successfully completed.' },
  { q: 'How do payments work?',                         a: 'Payments are held in escrow and released in milestones. Once a creator submits deliverables and the brand approves, funds are released automatically.' },
  { q: 'What types of creators can join?',              a: 'Any content creator — Instagram influencers, YouTubers, TikTokers, bloggers, podcasters, and more. You need at least 1,000 followers to apply.' },
  { q: 'How does the platform verify creators?',        a: 'We verify creators by connecting their social accounts directly. Audience stats, follower counts, and engagement rates are pulled live from platform APIs.' },
  { q: 'Can a brand run multiple campaigns at once?',   a: 'Absolutely. Brands can create and manage unlimited campaigns simultaneously, each with its own budget, timeline, and creator requirements.' },
  { q: 'Is my data safe?',                              a: 'All data is encrypted in transit and at rest. We never sell your personal data to third parties and comply with GDPR and local privacy regulations.' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma', role: 'Fashion Creator · 120K followers', avatar: 'PS',
    quote: 'I landed three brand deals in my first week. The whole process — from proposal to payment — was seamless. This is exactly what creators needed.',
    grad: ['#7C3AED', '#5B21B6'],
  },
  {
    name: 'Rohan Enterprises', role: 'D2C Brand · Marketing Manager', avatar: 'RE',
    quote: 'We ran four campaigns in a month and saw 3× our usual engagement. Finding the right creators used to take weeks — now it takes hours.',
    grad: ['#2563EB', '#1D4ED8'],
  },
  {
    name: 'Aditya Verma', role: 'Tech Creator · 85K subscribers', avatar: 'AV',
    quote: 'The analytics dashboard alone is worth it. I can finally show brands real data, and I get paid on time every time. Highly recommend.',
    grad: ['#059669', '#047857'],
  },
];

const MOCK_SCREENS = [
  { label: 'Creator Dashboard', icon: BarChart2,  grad: ['#4C1D95', '#7C3AED'] },
  { label: 'Browse Campaigns',  icon: Search,     grad: ['#1E3A8A', '#2563EB'] },
  { label: 'Secure Chat',       icon: MessageSquare, grad: ['#065F46', '#059669'] },
];

const STATS = [
  { label: 'Creators',     value: '2,500+', icon: Camera },
  { label: 'Brands',       value: '400+',   icon: Briefcase },
  { label: 'Campaigns',    value: '8,000+', icon: TrendingUp },
  { label: 'Paid Out',     value: '₹2Cr+',  icon: DollarSign },
];

// ── Nav ─────────────────────────────────────────────────────────────────────

function Nav({ onAdminClick }: { onAdminClick: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = ['Features', 'How it works', 'For Creators', 'For Brands', 'FAQ', 'Contact'];

  function scrollTo(id: string) {
    document.getElementById(id.toLowerCase().replace(/ /g, '-'))?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <span className={`font-bold text-lg ${scrolled ? 'text-violet-900' : 'text-white'}`}>CreatorMarket</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <button key={l} onClick={() => scrollTo(l)} className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-violet-700' : 'text-white/80 hover:text-white'}`}>
              {l}
            </button>
          ))}
          <button onClick={onAdminClick} className="ml-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
            Admin
          </button>
        </div>

        {/* Mobile menu button */}
        <button className={`md:hidden ${scrolled ? 'text-gray-700' : 'text-white'}`} onClick={() => setOpen(v => !v)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 flex flex-col gap-3">
          {links.map(l => (
            <button key={l} onClick={() => scrollTo(l)} className="text-sm font-medium text-gray-700 text-left hover:text-violet-700">
              {l}
            </button>
          ))}
          <button onClick={onAdminClick} className="mt-1 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold text-center">
            Admin Dashboard
          </button>
        </div>
      )}
    </nav>
  );
}

// ── Phone Mockup ─────────────────────────────────────────────────────────────

const APP_SCREENS = [
  { src: '/screenshots/screen-home.jpg',   label: 'Browse Campaigns',  grad: ['#4C1D95', '#7C3AED'] },
  { src: '/screenshots/screen-detail.jpg', label: 'Event Details',     grad: ['#1E3A8A', '#2563EB'] },
  { src: '/screenshots/screen-login.jpg',  label: 'Sign In',           grad: ['#6D28D9', '#8B5CF6'] },
];

function PhoneMockup({
  src, label, grad, icon: Icon, size = 'md',
}: {
  src?: string; label: string; grad: string[]; icon?: React.ElementType; size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'lg'
    ? 'w-52 h-[420px]'
    : size === 'sm'
    ? 'w-36 h-64'
    : 'w-44 h-[340px]';

  return (
    <div className="relative flex-shrink-0 drop-shadow-2xl">
      {/* Outer shell */}
      <div className={`${dims} rounded-[2.8rem] border-[5px] border-gray-800 bg-gray-900 shadow-2xl overflow-hidden relative`}>
        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
        {/* Screen content */}
        {src ? (
          <img src={src} alt={label} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
            style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
          >
            {Icon && (
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Icon size={26} className="text-white" />
              </div>
            )}
            <div className="text-white text-xs font-semibold text-center opacity-90">{label}</div>
            {[80, 60, 70, 50].map((w, i) => (
              <div key={i} className="h-2 rounded-full bg-white/25" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {/* Reflection sheen */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none z-10" />
      </div>
      {/* Label below */}
      <div className="mt-3 text-center text-white/70 text-xs font-medium">{label}</div>
    </div>
  );
}

// ── FAQ Item ──────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      className="w-full text-left border border-gray-200 rounded-xl overflow-hidden"
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-center justify-between px-5 py-4 bg-white hover:bg-violet-50 transition-colors">
        <span className="font-semibold text-gray-800 text-sm pr-4">{q}</span>
        {open ? <ChevronUp size={18} className="text-violet-600 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
      </div>
      {open && (
        <div className="px-5 py-4 bg-violet-50 border-t border-gray-100">
          <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const contactRef = useRef<HTMLFormElement>(null);

  return (
    <div className="min-h-screen bg-white font-sans">
      <Nav onAdminClick={() => navigate('/admin')} />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full bg-purple-300/10 blur-2xl" />

        <div className="relative max-w-6xl mx-auto px-5 pt-24 pb-16 grid md:grid-cols-2 gap-12 items-center w-full">
          {/* Left: text */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white/90 text-xs font-semibold mb-6">
              <Zap size={12} className="text-yellow-300" />
              Nepal's #1 Creator Marketplace
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
              Where Creators<br />Meet Brands
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/75 text-lg leading-relaxed mb-8 max-w-md">
              The all-in-one platform for content creators and brands to discover each other, run campaigns, and grow together.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
              <motion.button whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-violet-700 font-bold text-sm shadow-lg transition-shadow">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Download for iOS
              </motion.button>
              <motion.button whileHover={{ y: -2 }} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-violet-800/60 text-white font-bold text-sm border border-white/20 hover:bg-violet-800/80 transition-colors">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3.18 23.76c.31.17.67.19 1.01.07l12.44-7.02-2.68-2.68-10.77 9.63zm16.11-9.93L5.54 6.28 3.18.24C2.84.06 2.48.08 2.17.25L14.61 12l4.68-2.17zm2.64-1.48c-.37-.37-.99-.59-1.75-.59-.42 0-.87.07-1.34.22l-2.4 1.11 2.4 2.4 2.4-1.11c1.15-.53 1.15-1.56.69-2.03zM4.19.17C3.85.05 3.49.07 3.18.24L15.62 12l2.68-2.68L4.19.17z"/></svg>
                Get on Android
              </motion.button>
            </motion.div>
            {/* Mini stats */}
            <motion.div variants={fadeUp} className="flex gap-6">
              {[['2,500+', 'Creators'], ['400+', 'Brands'], ['8,000+', 'Campaigns']].map(([v, l]) => (
                <div key={l}>
                  <div className="text-white font-extrabold text-xl">{v}</div>
                  <div className="text-white/60 text-xs">{l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: real app screenshots */}
          <motion.div
            className="hidden md:flex justify-center items-end gap-3 relative h-[420px]"
            variants={staggerContainer} initial="hidden" animate="show"
          >
            {APP_SCREENS.map((screen, i) => (
              <motion.div
                key={screen.label}
                variants={fadeUp}
                style={{ translateY: i === 1 ? -28 : 0 }}
                whileHover={{ y: i === 1 ? -40 : -10, transition: { type: 'spring', stiffness: 280 } }}
              >
                <PhoneMockup
                  src={screen.src}
                  label={screen.label}
                  grad={screen.grad}
                  size={i === 1 ? 'lg' : 'md'}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block' }}>
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="py-14 bg-white">
        <motion.div
          className="max-w-4xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8"
          variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
        >
          {STATS.map(({ label, value, icon: Icon }) => (
            <motion.div key={label} variants={fadeUp} className="flex flex-col items-center text-center gap-2">
              <motion.div
                className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mb-1"
                whileHover={{ scale: 1.12, backgroundColor: '#7C3AED' }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Icon size={22} className="text-violet-600" />
              </motion.div>
              <div className="text-3xl font-extrabold text-violet-900">{value}</div>
              <div className="text-sm text-gray-500 font-medium">{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-violet-600 font-semibold text-sm uppercase tracking-wider">Simple process</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">How it works</h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto">From sign-up to payment in three straightforward steps.</p>
          </div>
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
          >
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(109,40,217,0.1)' }}
                className="relative bg-white rounded-2xl p-7 shadow-sm border border-gray-100 transition-shadow"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-8 z-10">
                    <ArrowRight size={20} className="text-violet-300" />
                  </div>
                )}
                <div className="text-4xl font-extrabold text-violet-100 mb-4 select-none">{step.num}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-violet-600 font-semibold text-sm uppercase tracking-wider">Everything you need</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Powerful features</h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto">Built for real creators and serious brands who want results.</p>
          </div>
          <motion.div
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-6"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
          >
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                whileHover={{ y: -6, borderColor: '#C4B5FD', boxShadow: '0 12px 32px rgba(109,40,217,0.1)' }}
                className="group p-6 rounded-2xl border border-gray-100 bg-white transition-colors"
              >
                <motion.div
                  className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center mb-4"
                  whileHover={{ backgroundColor: '#7C3AED', scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Icon size={20} className="text-violet-600" />
                </motion.div>
                <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── User types ──────────────────────────────────────────────────── */}
      <section id="for-creators" className="py-20 bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-violet-600 font-semibold text-sm uppercase tracking-wider">Who it's for</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Built for both sides</h2>
          </div>
          <div id="for-brands" className="grid md:grid-cols-2 gap-8">
            {/* Creator card */}
            <motion.div
              variants={slideLeft} initial="hidden" whileInView="show" viewport={VP}
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(109,40,217,0.12)' }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-violet-100"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center mb-5">
                <Camera size={26} className="text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">For Creators</h3>
              <p className="text-gray-500 text-sm mb-5">Influencers, YouTubers, bloggers, podcasters — turn your audience into income.</p>
              <ul className="space-y-3">
                {[
                  'Discover brand deals that match your niche',
                  'Submit proposals and negotiate your rate',
                  'Track campaign progress and deliverables',
                  'Receive secure, on-time milestone payments',
                  'Build a verified portfolio of past collabs',
                  'Grow your audience with brand exposure',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-violet-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-7 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors">
                Join as a Creator →
              </motion.button>
            </motion.div>

            {/* Brand card */}
            <motion.div
              variants={slideRight} initial="hidden" whileInView="show" viewport={VP}
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(37,99,235,0.12)' }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center mb-5">
                <Briefcase size={26} className="text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">For Brands</h3>
              <p className="text-gray-500 text-sm mb-5">D2C brands, agencies, startups — amplify your reach with the right creators.</p>
              <ul className="space-y-3">
                {[
                  'Post campaigns with your goals and budget',
                  'Browse and filter thousands of verified creators',
                  'Review proposals and pick the best fit',
                  'Manage all campaigns from one dashboard',
                  'Measure performance with built-in analytics',
                  'Pay securely only when you approve results',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-7 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors">
                Join as a Brand →
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── App screenshots ──────────────────────────────────────────────── */}
      <section className="py-20 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)' }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <span className="text-violet-300 font-semibold text-sm uppercase tracking-wider">See the app</span>
            <h2 className="text-3xl font-extrabold text-white mt-2">Beautiful & intuitive</h2>
            <p className="text-violet-300 mt-3 max-w-md mx-auto">Designed to be fast, clean, and enjoyable to use every day.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: feature callouts */}
            <motion.div
              className="space-y-6"
              variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
            >
              {[
                { icon: Search,        title: 'Discover campaigns',     desc: 'Browse hundreds of live brand campaigns filtered by category, platform, and budget.' },
                { icon: BarChart2,     title: 'Track every detail',     desc: 'Full campaign specs, deadlines, goals, and requirements in one clean view.' },
                { icon: DollarSign,   title: 'Apply in seconds',       desc: 'Submit your proposal with one tap and track its status in real time.' },
              ].map(({ icon: Icon, title, desc }) => (
                <motion.div key={title} variants={slideLeft} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-violet-200" />
                  </div>
                  <div>
                    <div className="font-bold text-white mb-1">{title}</div>
                    <div className="text-violet-300 text-sm leading-relaxed">{desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Right: phones */}
            <motion.div
              className="flex justify-center items-end gap-4"
              variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
            >
              {[
                { ...APP_SCREENS[0]!, size: 'md' as const, shift: 0 },
                { ...APP_SCREENS[1]!, size: 'lg' as const, shift: -24 },
              ].map((screen) => (
                <motion.div
                  key={screen.label}
                  variants={fadeUp}
                  style={{ translateY: screen.shift }}
                  whileHover={{ y: screen.shift - 10, transition: { type: 'spring', stiffness: 250 } }}
                >
                  <PhoneMockup src={screen.src} label={screen.label} grad={screen.grad} size={screen.size} />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Login screen highlight */}
          <motion.div
            className="mt-20 grid md:grid-cols-2 gap-12 items-center"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
          >
            <motion.div
              className="flex justify-center"
              variants={fadeUp}
              whileHover={{ y: -8, transition: { type: 'spring', stiffness: 250 } }}
            >
              <PhoneMockup src={APP_SCREENS[2]!.src} label={APP_SCREENS[2]!.label} grad={APP_SCREENS[2]!.grad} size="lg" />
            </motion.div>
            <motion.div className="space-y-6" variants={staggerContainer}>
              <motion.div variants={slideRight}>
                <span className="text-violet-300 font-semibold text-sm uppercase tracking-wider">Onboarding</span>
                <h3 className="text-2xl font-extrabold text-white mt-2 mb-3">Sign up in under a minute</h3>
                <p className="text-violet-300 leading-relaxed">
                  Create your account with email or Google. Choose whether you're a creator or a brand — and you're in.
                </p>
              </motion.div>
              {['Email or Google sign-in', 'Choose Creator or Brand role', 'Start exploring campaigns immediately'].map(item => (
                <motion.div key={item} variants={slideRight} className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                  <span className="text-white/80 text-sm">{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-violet-600 font-semibold text-sm uppercase tracking-wider">Success stories</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Loved by creators & brands</h2>
          </div>
          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
          >
            {TESTIMONIALS.map(({ name, role, avatar, quote, grad }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                whileHover={{ y: -5, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-5">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{name}</div>
                    <div className="text-gray-400 text-xs">{role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <span className="text-violet-600 font-semibold text-sm uppercase tracking-wider">Got questions?</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Frequently asked</h2>
          </div>
          <motion.div
            className="space-y-3"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
          >
            {FAQS.map(faq => (
              <motion.div key={faq.q} variants={fadeUp}>
                <FaqItem {...faq} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────────────── */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <motion.div
          className="relative max-w-3xl mx-auto px-5 text-center"
          variants={staggerContainer} initial="hidden" whileInView="show" viewport={VP}
        >
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to grow together?</motion.h2>
          <motion.p variants={fadeUp} className="text-white/70 text-lg mb-8">Join thousands of creators and brands already using CreatorMarket.</motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
            <motion.button whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }} whileTap={{ scale: 0.97 }} className="px-8 py-4 rounded-2xl bg-white text-violet-700 font-bold">
              Download the App
            </motion.button>
            <motion.button
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-2xl border border-white/30 text-white font-bold"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Contact Us
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-5 grid md:grid-cols-2 gap-12">
          <div>
            <span className="text-violet-600 font-semibold text-sm uppercase tracking-wider">Get in touch</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2 mb-4">Contact us</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Have questions, partnership ideas, or want to learn more? Reach out — we typically reply within 24 hours.
            </p>
            <div className="space-y-4">
              {[
                { icon: Mail,    label: 'Email',       value: 'hello@creatormarket.io' },
                { icon: AtSign,  label: 'Instagram',   value: '@creatormarket' },
                { icon: Globe,   label: 'X / Twitter', value: '@creatormarket' },
                { icon: Play,    label: 'YouTube',     value: 'CreatorMarket Channel' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-violet-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="text-sm font-medium text-gray-800">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact form */}
          <form
            ref={contactRef}
            className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 space-y-4"
            onSubmit={e => { e.preventDefault(); alert('Message sent! We\'ll get back to you soon.'); (e.target as HTMLFormElement).reset(); }}
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
            <button type="submit" className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors">
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-violet-950 text-white py-12">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                  <Users size={14} className="text-white" />
                </div>
                <span className="font-bold text-lg">CreatorMarket</span>
              </div>
              <p className="text-violet-300 text-sm leading-relaxed max-w-xs">
                Nepal's leading marketplace connecting content creators with brands for authentic, impactful campaigns.
              </p>
              <div className="flex gap-3 mt-4">
                {[AtSign, Globe, Play].map((Icon, i) => (
                  <div key={i} className="w-8 h-8 rounded-lg bg-violet-800 hover:bg-violet-700 flex items-center justify-center cursor-pointer transition-colors">
                    <Icon size={15} className="text-violet-300" />
                  </div>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <div className="font-semibold text-sm mb-3">Product</div>
              {['Features', 'How it works', 'Pricing', 'Download'].map(l => (
                <div key={l} className="text-violet-400 text-sm mb-2 hover:text-violet-200 cursor-pointer transition-colors">{l}</div>
              ))}
            </div>

            {/* Legal */}
            <div>
              <div className="font-semibold text-sm mb-3">Legal</div>
              {['Privacy Policy', 'Terms & Conditions', 'Community Guidelines', 'Cookie Policy'].map(l => (
                <div key={l} className="text-violet-400 text-sm mb-2 hover:text-violet-200 cursor-pointer transition-colors">{l}</div>
              ))}
            </div>
          </div>

          <div className="border-t border-violet-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-violet-400 text-xs">© {new Date().getFullYear()} CreatorMarket. All rights reserved.</p>
            <p className="text-violet-400 text-xs">Made with ♥ in Nepal</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
