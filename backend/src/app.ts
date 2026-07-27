import './config/env'; // load and validate env first
import express from 'express';

import { errorHandler, notFoundHandler } from './middleware/error';
import { timezoneMiddleware } from './middleware/timezone';
import { languageMiddleware } from './middleware/language';
import { applyRateLimits } from './middleware/rateLimit';
import { applySecurityMiddleware } from './middleware/security';
import { requestLogger } from './middleware/requestLogger';
import { registerHealthCheck } from './routes/health';
import { registerApiDocs } from './routes/docs';
import { registerApiRoutes } from './routes';
import { startServer } from './server';

const app = express();

applySecurityMiddleware(app);

// Registered before body parsing so req.log is always set, even if a request
// fails to parse (malformed JSON) — errorHandler relies on req.log existing.
app.use(requestLogger);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(timezoneMiddleware);
app.use(languageMiddleware);

// Rate limits exist to blunt brute-force/abuse in production. In development a single
// dev's dashboard (React StrictMode double-invoking effects, hot reloads, manual retries)
// can burn through the same budget in seconds and lock out their own login — so limits
// are relaxed (not removed) below production thresholds when NODE_ENV isn't 'production'.
// Their `max`/`limit` read live from the admin-configurable rateLimit.* settings where
// applicable (see the Rate Limits page in the admin dashboard).
applyRateLimits(app);

registerHealthCheck(app);
registerApiDocs(app);
registerApiRoutes(app);

// ── 404 & Error handlers ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

startServer(app);

export default app;
