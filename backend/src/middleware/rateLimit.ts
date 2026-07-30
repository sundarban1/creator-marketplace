import rateLimit from 'express-rate-limit';
import type { Express, Request } from 'express';
import { env } from '../config/env';
import { getCachedSettings } from '../utils/settingsCache';

// Same dev-vs-prod relaxation rationale as the other static limiters in
// app.ts: a single dev's dashboard (React StrictMode double-invoking effects,
// hot reloads, manual retries) can burn through a production-sized budget in
// seconds and lock out their own login.
const isProd = env.NODE_ENV === 'production';

async function settingNumber(key: string, fallback: number): Promise<number> {
  const settings = await getCachedSettings();
  const value = Number(settings[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function settingEnabled(key: string): Promise<boolean> {
  const settings = await getCachedSettings();
  return settings[key] !== false;
}

// These three mirror the previous static authLimiter/otpLimiter/apiLimiter in
// app.ts, except `limit` is now a function reading the admin-configurable
// rateLimit.* settings (see AdminRepository DEFAULTS) instead of a fixed
// number. `windowMs` stays fixed — express-rate-limit only supports a
// per-request function for `limit`/`max`, not `windowMs`, so the window
// itself can't be changed without recreating the limiter instance.

// Strict limiter for authentication endpoints (brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: () => settingNumber('rateLimit.login.max', isProd ? 20 : 200),
  skip: () => settingEnabled('rateLimit.login.enabled').then((enabled) => !enabled),
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Tighter OTP limiter
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: () => settingNumber('rateLimit.otp.max', isProd ? 5 : 50),
  skip: () => settingEnabled('rateLimit.otp.enabled').then((enabled) => !enabled),
  message: { success: false, message: 'Too many OTP requests. Please wait 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter (prevents abuse but allows normal traffic)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: () => settingNumber('rateLimit.apiRequests.max', isProd ? 120 : 1000),
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip health checks and messaging routes (chat needs high-frequency polling),
  // or the whole limiter if the admin has turned it off.
  skip: async (req: Request) => {
    if (req.path === '/health' || req.path.startsWith('/api/messaging/')) return true;
    return !(await settingEnabled('rateLimit.apiRequests.enabled'));
  },
});

// Per-user (not per-IP) limiter for sending chat messages — applies equally
// to creators and businesses. Placed after `authenticate` on its route so
// `req.user` is populated for the key.
export const perUserMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: () => settingNumber('rateLimit.messages.maxPerMinute', 20),
  skip: () => settingEnabled('rateLimit.messages.enabled').then((enabled) => !enabled),
  keyGenerator: (req: Request) => req.user!.id,
  message: { success: false, message: 'You are sending messages too quickly. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Messaging routes need a much higher ceiling for real-time chat
const messagingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  message: { success: false, message: 'Too many requests. Please slow down in chat.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload endpoints need a higher limit (multipart payloads)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many upload requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI generation is slow/costly — keep this tight
const aiGenerateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many AI generation requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public, unauthenticated contact form — tight limit to deter spam
const publicContactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 50,
  message: { success: false, message: 'Too many messages sent. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mounts every path-specific limiter above onto the app. Order matters only
// in that the general /api/ limiter is applied first and more specific paths
// layer additional limiters on top of it.
export function applyRateLimits(app: Express): void {
  // General limiter for all /api/* routes (messaging gets its own instead, below)
  app.use('/api/', apiLimiter);
  app.use('/api/messaging/', messagingLimiter);

  // Auth-specific limiters
  app.use('/api/auth/login',           authLimiter);
  app.use('/api/auth/register',        authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/verify-otp',      otpLimiter);
  app.use('/api/auth/resend-otp',      otpLimiter);

  // Upload endpoints
  app.use('/api/creator/avatar',          uploadLimiter);
  app.use('/api/business/logo',           uploadLimiter);
  app.use('/api/campaigns/feature-image', uploadLimiter);

  // AI generation
  app.use('/api/campaigns/ai/generate',              aiGenerateLimiter);
  app.use('/api/campaigns/ai/generate-event',        aiGenerateLimiter);
  app.use('/api/campaigns/ai/suggest-description',   aiGenerateLimiter);
  app.use('/api/ai-assistant/transcribe',            aiGenerateLimiter);

  // Public contact form
  app.use('/api/support/contact-public', publicContactLimiter);
}
