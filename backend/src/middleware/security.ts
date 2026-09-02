import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Trust proxy, compression, security headers, and CORS — the baseline
// hardening every request goes through before it reaches route handlers.
export function applySecurityMiddleware(app: Express): void {
  // Required when behind nginx / load balancer in production
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(compression());

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    })
  );

  const allowedOrigins = env.FRONTEND_URL
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Always allow the service's own origin — Swagger UI (served by this same app at
  // /api/docs) issues "Try it out" requests with Origin set to Render's auto-injected
  // public URL, which otherwise wouldn't be in FRONTEND_URL's list of client origins.
  if (process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some((o) => origin.startsWith(o))) return callback(null, true);
        // Disallowed origin: respond WITHOUT CORS headers (the browser then
        // blocks it client-side) rather than throwing — passing an Error here
        // makes cors() call next(err), which the error handler turns into a
        // 500 that looks like the server is crashing. `false` = a normal
        // response, no `Access-Control-Allow-Origin`.
        logger.warn({ origin }, 'CORS: origin not in FRONTEND_URL — request blocked');
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      // 'X-Visitor-Token' is the anonymous landing-page chat widget's auth
      // header (see middleware/auth.ts's verifyVisitorChat and
      // pages/landing/lib/visitorChatApi.ts) — without it listed here, the
      // browser's CORS preflight for any visitor-chat GET/POST rejects the
      // request before it ever reaches the server, which is what was
      // breaking both fetching chat history and sending visitor messages.
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Timezone', 'X-Language', 'X-Visitor-Token'],
    })
  );
}
