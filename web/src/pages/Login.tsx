import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Users, Megaphone, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: Users, text: 'Manage creators & businesses in one place' },
  { icon: Megaphone, text: 'Monitor campaigns and proposals in real-time' },
  { icon: CreditCard, text: 'Track payments and resolve disputes instantly' },
];

function FeatureItem({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-indigo-200" />
      </div>
      <p className="text-sm text-indigo-100">{text}</p>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(e: React.MouseEvent, demoEmail: string, demoPass: string) {
    e.preventDefault();
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: branding ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -left-20 w-[500px] h-[500px] bg-white/5 rounded-full" />
          <div className="absolute top-1/2 right-8 w-48 h-48 bg-white/5 rounded-full" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-white rounded-xl px-3 py-2">
              <img src="/logo.png" alt="Collab" className="h-7 w-auto" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Admin</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            The command center for your creator marketplace
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Manage users, campaigns, and payments — all from one powerful dashboard.
          </p>
        </div>

        <div className="relative space-y-4">
          {FEATURES.map((f) => (
            <FeatureItem key={f.text} icon={f.icon} text={f.text} />
          ))}
        </div>

        <div className="relative flex items-center gap-4 pt-4 border-t border-white/20">
          <div className="flex -space-x-2">
            {['SA', 'AM', 'JD'].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-indigo-400 border-2 border-indigo-700 flex items-center justify-center text-white text-xs font-semibold">
                {i}
              </div>
            ))}
          </div>
          <p className="text-indigo-200 text-sm">
            Trusted by <span className="text-white font-semibold">3 admins</span> managing 12,000+ users
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <img src="/logo.png" alt="Collab" className="h-8 w-auto" />
          <span className="text-gray-900 font-bold text-lg">Admin</span>
        </div>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1 text-sm">Sign in to your admin account to continue.</p>
          </div>

          {/* Demo credentials banner */}
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs font-semibold text-indigo-700 mb-2">Demo credentials</p>
            <div className="space-y-1.5">
              <button
                onClick={(e) => fillDemo(e, 'admin@creatormarket.com.np', 'Admin@123456')}
                className="w-full text-left text-xs text-indigo-600 hover:text-indigo-800 font-mono bg-white/70 hover:bg-white px-3 py-1.5 rounded-lg transition-colors"
              >
                admin@creatormarket.com.np / Admin@123456
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
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
                  className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white ${error && !email ? 'border-red-300' : 'border-gray-200'}`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
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
                  className={`w-full pl-10 pr-11 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white ${error && !password ? 'border-red-300' : 'border-gray-200'}`}
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
                className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
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

          <p className="mt-8 text-center text-xs text-gray-400">
            Admin access only. Contact your system administrator to request access.
          </p>
        </div>
      </div>
    </div>
  );
}
