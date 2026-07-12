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
  // Custom URL scheme the TikTok callback redirects back into on mobile (see app.json "scheme")
  APP_SCHEME: z.string().default('kolab'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
