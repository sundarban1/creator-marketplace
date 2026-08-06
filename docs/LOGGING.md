# Logging, Monitoring & Error Tracking (V1)

What's built, what's already working, and what you still need to do in each
service's dashboard (things I can't do from inside this repo).

## What's already working, no setup needed

- **Structured backend logs** — Pino (`backend/src/config/logger.ts` + `middleware/requestLogger.ts`), JSON in production / pretty-printed in dev, every request gets a request ID (`X-Request-Id`), method, endpoint, status, response time, and `userId` when authenticated. Sensitive fields (`password`, `token`, `accessToken`, `refreshToken`, auth headers, cookies) are redacted automatically.
- **`GET /health`** — `{ status, uptime, timestamp, environment, database }`. Already deployed, already correct — just needs an UptimeRobot monitor pointed at it (below).
- **Business activity log** — every `logActivity(...)` call (see `backend/src/modules/logging/activity.service.ts` and the action vocabulary in `logging.constants.ts`) writes to the Postgres `activity_logs` table. Covers registration, login, profile updates, campaign creation, applications, hiring, work submission/approval, payments, voice messages, conversation deletes, and verification.
- **Security audit log** — same pattern via `logAudit(...)` (`audit.service.ts`) into `audit_logs`. Covers password resets, phone/email changes, verification approve/reject, account suspend/reactivate/delete. **Immutable by design** — no update or delete method exists anywhere in the codebase for this table.
- **Admin read access** — `GET /api/admin/activity-logs` and `GET /api/admin/audit-logs` (paginated, filterable by `userId`/`action`/`from`/`to`). No web UI yet — that's a natural follow-up once this is verified in production.
- **Error capture code** — Sentry is wired into backend (`instrument.ts` + `middleware/error.ts`), web (`src/main.tsx` + an `ErrorBoundary`), and mobile (`src/utilities/sentry.ts` + `_layout.tsx`'s `ErrorBoundary`). Firebase Crashlytics is wired into mobile for native crashes. **All of it silently no-ops right now** because there's no DSN/config yet — see below.

## What you need to do

### 1. Sentry (backend errors, web errors, mobile JS errors + crashes)

Create one free Sentry organization with **3 projects** — Node, React, React Native — then set:

| Where | Variable | Value |
|---|---|---|
| `backend/.env` | `SENTRY_DSN` | Node project's DSN |
| `backend/.env` | `SENTRY_ENVIRONMENT` | optional, defaults to `NODE_ENV` |
| Render dashboard (web static site — not in `render.yaml`, set directly there) | `VITE_SENTRY_DSN` | React project's DSN |
| `mobile/eas.json` (all 3 `env` blocks) | `EXPO_PUBLIC_SENTRY_DSN` | React Native project's DSN |

Optional, for readable stack traces (sourcemap upload at build time, both web and mobile skip this cleanly if unset): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

### 2. Firebase Crashlytics (mobile native crashes)

1. Create a free Firebase project, enable Crashlytics.
2. Android already has `mobile/google-services.json` wired up (reused from the existing push/sign-in setup) — nothing to do.
3. iOS has no config file yet. Download `GoogleService-Info.plist` from the Firebase console and place it at `mobile/GoogleService-Info.plist` (mirrors the Android file's location). Without this, an iOS `expo prebuild`/EAS build will fail with a clear error from Firebase's config plugin — Android builds are unaffected.
4. Native crash capture can only be confirmed with a real EAS build on a device/simulator — not something verifiable in this environment.

### 3. UptimeRobot (uptime monitoring + email alerts)

No code involved — entirely a dashboard setup:

1. Create a free UptimeRobot account.
2. Add an HTTP(s) monitor for `https://<your-backend-domain>/health`.
3. Add a second monitor for the website root (`https://<your-web-domain>/`).
4. Set an email alert contact so downtime notifies you.

## Reference

- **Action vocabulary**: `backend/src/modules/logging/logging.constants.ts` — `ActivityAction`, `AuditAction`, `EntityType`. Add new entries here rather than hand-typing new action strings at call sites.
- **Writing a new log entry**: `logActivity({ userId, action, entityType?, entityId?, metadata? })` / `logAudit({ userId, action, oldValue?, newValue?, performedBy })` — both are fire-and-forget (don't `await`), and both swallow their own failures (logged via `logger.error`, never thrown) so a logging outage can never fail the request that triggered it.
- **Per-request context** (IP, user agent, device, request ID) is captured automatically via `backend/src/middleware/requestContext.ts` (`AsyncLocalStorage`) — no need to thread it through service call signatures.
