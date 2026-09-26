import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Users, Megaphone, CreditCard, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { LandingThemeProvider } from './landing/context/ThemeContext';
import { ThemeToggle } from './landing/components/ThemeToggle';

const DEFAULT_SUPPORT_EMAIL = 'info@kolab.com.np';

const FEATURES = [
  { icon: Users, text: 'Manage creators & businesses in one place' },
  { icon: Megaphone, text: 'Monitor events and proposals in real-time' },
  { icon: CreditCard, text: 'Track payments and resolve disputes instantly' },
];

function FeatureItem({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <li className="flex items-center gap-3.5 text-[15px] text-lp-fg/85">
      <span className="lp-glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lp-accent-ink">
        <Icon size={17} />
      </span>
      <span>{text}</span>
    </li>
  );
}

// Admin sign-in in the landing page's design language — the same two-pane
// layout as the marketplace AuthShell: theme-aware navy/lavender base with
// brand glows, a thin headline with a gradient phrase, and a glass form card.
export function Login() {
  return (
    <LandingThemeProvider>
      <LoginInner />
    </LandingThemeProvider>
  );
}

function LoginInner() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [suspendedModal, setSuspendedModal] = useState(false);
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);

  useEffect(() => {
    api.public.platformFlags()
      .then((res) => { if (res.data.supportEmail) setSupportEmail(res.data.supportEmail); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password) { setError('Password is required.'); return; }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      if (/suspended/i.test(message)) {
        setSuspendedModal(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-scope lp-stars relative isolate flex min-h-screen flex-col overflow-hidden">
      {/* Brand glows — brinjal wash behind the story, saffron ember behind the form. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full bg-lp-brinjal/30 blur-[140px]" />
        <div className="absolute -bottom-40 -right-32 h-[460px] w-[460px] rounded-full bg-lp-orange/15 blur-[130px]" />
      </div>

      <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Kolab" className="h-8 w-auto object-contain" />
          <span className="rounded-full border border-lp-fg/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-lp-accent-ink">
            Admin
          </span>
        </div>
        <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-full border border-lp-fg/15 text-lp-fg/60 transition-colors hover:text-lp-fg" />
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 pb-14 pt-4 sm:px-8 lg:grid-cols-[1fr_440px] lg:gap-16 lg:px-12">
        {/* Brand story — desktop only */}
        <aside className="hidden max-w-lg lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-lp-accent-ink">Kolab control room</p>
          <h1 className="lp-display mt-5 text-balance text-[2.9rem] leading-[1.08] text-lp-fg">
            The command center for your <span className="lp-gradient-text">creator marketplace</span>
          </h1>
          <p className="mt-5 text-[17px] font-light leading-relaxed text-lp-fg/65">
            Manage users, events, and payments — all from one powerful dashboard.
          </p>

          <ul className="mt-9 space-y-3.5">
            {FEATURES.map((f) => (
              <FeatureItem key={f.text} icon={f.icon} text={f.text} />
            ))}
          </ul>
        </aside>

        {/* Form card */}
        <main className="lp-glass mx-auto w-full max-w-[440px] rounded-[28px] p-7 shadow-[0_0_60px_-20px_rgba(99,102,241,0.55)] sm:p-9">
          <h2 className="lp-display text-[2rem] leading-tight text-lp-fg">
            Welcome <span className="lp-gradient-text">back</span>
          </h2>
          <p className="mt-2 text-[15px] font-light text-lp-fg/65">Sign in to your admin account to continue.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@creatorhub.com"
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border rounded-2xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lp-glow/60 focus:border-transparent transition ${error && !email ? 'border-red-300' : 'border-gray-200'}`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="#" className="text-xs text-lp-accent-ink hover:underline font-medium">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border rounded-2xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lp-glow/60 focus:border-transparent transition !pr-11 ${error && !password ? 'border-red-300' : 'border-gray-200'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={rememberMe}
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${rememberMe ? 'bg-lp-brinjal border-lp-brinjal' : 'border-gray-300'}`}
              >
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span
                className="text-sm text-gray-600 cursor-pointer select-none"
                onClick={() => setRememberMe(!rememberMe)}
              >
                Keep me signed in
              </span>
            </div>

            {/* Submit — the landing's gradient pill */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-lp-brinjal via-[#8B5CF6] to-lp-orange px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.7)] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign in to Dashboard'
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-xs text-lp-fg/50">
            Admin access only. Contact your system administrator to request access.
          </p>
        </main>
      </div>

      {/* Suspended-account modal — shown instead of the inline banner when the
          backend blocks login because this account has been suspended. */}
      {suspendedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-lp-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-[28px] border border-gray-200 p-7 text-center shadow-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <ShieldOff size={26} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Account Suspended</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Your account has been suspended by an admin. Please contact support if you believe this is a mistake.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors mb-3"
            >
              <Mail size={16} /> Contact Admin
            </a>
            <button
              type="button"
              onClick={() => setSuspendedModal(false)}
              className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
