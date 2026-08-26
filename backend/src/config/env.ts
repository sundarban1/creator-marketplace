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
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Cloudflare R2 (S3-compatible) — primary storage for chat/deliverable video
  // and chat voice recordings only (see utils/r2Media.ts). All optional: when
  // unset, those two flows transparently fall back to the Cloudinary signed-
  // upload path above instead of failing.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  // Public base URL the `R2_BUCKET_NAME` bucket is reachable at (R2.dev
  // subdomain or a custom domain, with public access enabled) — required for
  // uploaded video/voice to actually be viewable; without it, uploads still
  // succeed but stored URLs won't resolve.
  R2_PUBLIC_URL: z.string().optional(),
  R2_PRESIGNED_URL_EXPIRY: z.string().default('900'),
  OPENAI_API_KEY: z.string().optional(),
  // Stock-photo search for AI-generated campaign/event drafts (see utils/imageSearch.ts).
  // Optional: without it drafts simply carry no featureImageUrl and the mobile client
  // falls back to its local category photo map. A free Demo app at
  // https://unsplash.com/developers is capped at 50 requests/hour.
  UNSPLASH_ACCESS_KEY: z.string().optional(),
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
  // On native (Android/iOS), the refresh token is minted under the platform-specific
  // client ID (a public client, no secret) rather than the Web client — refreshing it
  // later has to use that SAME client ID or Google rejects it with invalid_client. Web
  // client ID/secret are only relevant for the implicit-flow web connect, which never
  // actually receives a refresh token in the first place (see useGoogleAccessToken.ts).
  GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  // Custom URL scheme the TikTok/Instagram callbacks redirect back into on mobile (see app.json "scheme")
  APP_SCHEME: z.string().default('kolab'),
  // Khalti ePayment (KPG-2) — business pays to start a paid application (see
  // utils/khalti.ts). Optional: without KHALTI_SECRET_KEY, selecting Khalti at
  // pay time fails with a clear error instead of the app crashing.
  KHALTI_SECRET_KEY: z.string().optional(),
  KHALTI_BASE_URL: z.string().default('https://dev.khalti.com/api/v2'),
  // Full absolute URL to CampaignController.khaltiCallback (Khalti redirects the
  // user's browser here directly after payment, no Authorization header — same
  // pattern as TIKTOK_REDIRECT_URI/INSTAGRAM_REDIRECT_URI above).
  KHALTI_RETURN_URL: z.string().optional(),
  // eSewa ePay v2 — business pays to start a paid application (see utils/esewa.ts),
  // same role as the Khalti block above. Optional: without ESEWA_SECRET_KEY /
  // ESEWA_RETURN_BASE_URL, selecting eSewa at pay time fails with a clear error.
  ESEWA_SECRET_KEY: z.string().optional(),
  ESEWA_MERCHANT_CODE: z.string().default('EPAYTEST'),
  ESEWA_BASE_URL: z.string().default('https://rc-epay.esewa.com.np/api/epay/main/v2/form'),
  ESEWA_STATUS_URL: z.string().default('https://rc.esewa.com.np/api/epay/transaction/status/'),
  // Absolute origin of this backend — used to build the checkout/success/failure
  // URLs eSewa's browser flow needs (unlike Khalti, eSewa gives no single
  // "initiate" API call that returns a hosted URL for us).
  ESEWA_RETURN_BASE_URL: z.string().optional(),
  // Sparrow SMS (Nepal) — not wired up yet; sendSms() logs instead of sending until both are set.
  SPARROW_SMS_TOKEN: z.string().optional(),
  SPARROW_SMS_FROM: z.string().optional(),
  // Socket.IO cross-instance broadcast — required whenever the backend runs as more
  // than one process/instance (e.g. Render autoscaling). Without it, each instance
  // only knows about the sockets connected to itself, so a message/typing event from
  // a user on instance A silently never reaches a user on instance B. Optional because
  // local dev and any single-instance deployment work fine with Socket.IO's default
  // in-memory adapter.
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
