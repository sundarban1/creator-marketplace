import { z } from 'zod';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from the project root (works regardless of cwd)
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string({
    required_error: 'DATABASE_URL is required',
  }),
  JWT_ACCESS_SECRET: z.string({
    required_error: 'JWT_ACCESS_SECRET is required',
  }),
  JWT_REFRESH_SECRET: z.string({
    required_error: 'JWT_REFRESH_SECRET is required',
  }),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Gmail SMTP (preferred)
  EMAIL_HOST:     z.string().optional(),
  EMAIL_PORT:     z.string().optional(),
  EMAIL_SECURE:   z.string().optional(),
  EMAIL_USERNAME: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  // Resend (HTTP API) — preferred in production, since it isn't blocked by
  // Render's free-tier restriction on outbound SMTP ports.
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL:    z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  // TikTok Login Kit (creator social-account OAuth connect)
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_REDIRECT_URI: z.string().optional(),
  // Instagram API with Instagram Login (direct connect — no Facebook account/Page
  // required, unlike the Facebook Login + Pages flow above). A separate product
  // under the same Meta App, with its own Instagram App ID/Secret.
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_REDIRECT_URI: z.string().optional(),
  // Facebook Login (creator social-account OAuth connect) — the mobile app only
  // needs the App ID (public), but exchanging the client's short-lived user token
  // for a long-lived one (so follower counts can keep auto-refreshing for months
  // instead of ~2 hours) has to happen server-side with the App Secret.
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  // Google OAuth (YouTube connect) — only needed server-side to mint a fresh access
  // token from a stored refresh token once the original one expires; the initial
  // connect itself happens entirely client-side and needs no secret.
  GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Custom URL scheme the TikTok/Instagram callbacks redirect back into on mobile (see app.json "scheme")
  APP_SCHEME: z.string().default('kolab'),
  // Sparrow SMS (Nepal) — not wired up yet; sendSms() logs instead of sending until both are set.
  SPARROW_SMS_TOKEN: z.string().optional(),
  SPARROW_SMS_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
