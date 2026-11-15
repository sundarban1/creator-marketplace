# UGC Safety, Reporting, Blocking & Moderation

Kolab's response to App Store Review Guideline 1.2 (Safety – User-Generated
Content) and 1.2.1(a) (Creator Content). One backend serves mobile, the web
app (`/creator`, `/business`) and the admin dashboard (`/admin/moderation`).

## How it works

| Requirement | Where |
|---|---|
| Terms + Community Guidelines before sign-in | Mobile: `(auth)/_layout.tsx` shows `AgreementScreen` (pre-auth) before any login/sign-up screen. Signed-in gate in `_layout.tsx` (`useTermsGate`) for existing users / social sign-in / policy updates. Web: `TermsGate` in `AppShell`. Server: `GET/POST /api/legal/acceptance`, immutable `terms_acceptances` rows. |
| Re-acceptance on new versions | Admin bumps `legal.version.terms` / `legal.version.guidelines` (platform settings). Every user sees the agreement again on next open. |
| Age gate (1.2.1a) | Neutral date-of-birth entry on the agreement screen, minimum age `legal.minimumAge` (default **18**). Birth date stored privately on `users.birthDate`, never in any profile DTO. Report reason "Content inappropriate for the app's age rating" (`AGE_INAPPROPRIATE`, priority URGENT). |
| Report content | ⋯ menu on creator/business profiles, events, competitions; flag on portfolio items; long-press → Report on chat messages; Report in chat header; organizers report competition entries. 10 reasons, "Other" requires text. `POST /api/reports` (rate-limited, duplicate-guarded, self-report blocked, evidence snapshotted). |
| Every report reaches admin | Report row is committed first (status `NEW`), then admin bell + push (`createForAdmins`) and, for URGENT, email to `MODERATION_ALERT_EMAILS`. Alert failure never loses a report — the dashboard reads the `reports` table. |
| Admin verification | `/admin/moderation`: queue (open first, urgent first), filters, search, assign, start review, verify VALID / INVALID / NEEDS_MORE_INFORMATION, actions, dismiss, resolve. Server rules (`moderation.rules.ts`): no action without VALID, no dismissal without INVALID, no RESOLVED without an outcome. Row lock + assignment lock against concurrent moderators. Every step → `audit_logs` (entityType `Report`); every enforcement → `moderation_actions`. |
| Admin actions | Remove / hide-pending / restore content (events, competitions, competition entries, portfolio items, chat messages, services, business listing); official warning; restrict messaging (N days); temporary suspension (N days, auto-lifts at login); permanent suspension (confirm + notes); lift restrictions. Account owner gets an in-app + email notice with the reason and the appeal address. Reporter gets a generic outcome notice. Financial records are never deleted. |
| Block users | ⋯ → Block user on profiles, events (organizer) and chats. Server-side and symmetric: feeds (events, nearby, recommended, creators, businesses, competitions, invitations, recommended creators), profile/event detail (404), messaging (send, start, accept), applications and invitations. Existing contracts/payments untouched. |
| Immediate removal | Mobile `BlockContext`: server first, then invalidates every React Query cache and waits (≤1.5 s) for on-screen lists to refetch before returning; socket `block:changed` syncs other devices. Web: `publishLive('campaigns','conversations')`. |
| Developer notified on block | Each block writes a `USER_BLOCKED` `moderation_events` row in the same transaction + admin alert; "Safety signals" tab in the dashboard. A block is a signal, never automatic punishment. |
| Blocked users management | Mobile `Settings → Help & Safety → Blocked users` (`/blocked-users`); web `/creator/safety`, `/business/safety`. |
| Filtering before publication | `src/moderation/contentScreening.ts`: local multilingual dictionary (English, Nepali, romanized Nepali, Hindi, obfuscation-aware) on every path; OpenAI `omni-moderation-latest` (text + images, free endpoint) on publish/edit paths only. Wired into: bios, business descriptions, events (flagged → forced into admin review even for verified businesses), competitions + entry captions, portfolio, chat (dictionary only, severe content), image uploads (avatar, cover, logo, portfolio, event image/attachments) *before* they are stored. |
| Support contact | `info@kolab.com.np`, `https://kolab.com.np/` on Help & Safety (mobile drawer + Settings, web nav). |

## Deploy checklist

1. `npx prisma migrate deploy` (migration `20261115082454_ugc_safety_moderation` — additive only).
2. Rebuild/redeploy the API (Docker / Render).
3. `npm run db:seed:safety-guidelines` — creates 5 **unpublished draft** Community Guidelines sections. **Kolab must review and publish them** in Admin → Legal.
4. Optional env: `MODERATION_ALERT_EMAILS=a@kolab.com.np,b@kolab.com.np` (urgent-report emails). `OPENAI_API_KEY` must be set in production for AI text + image screening.
5. Mobile: JS-only change (no new native modules) — an OTA/EAS update or the next build works.

## Known limits (be honest in review notes)

- Video content is not machine-screened (images and text are); videos are covered by report → moderation.
- If the AI screening provider is down, events/competitions are held for admin review; other content publishes on the dictionary check alone and a `MODERATION_SERVICE_ERROR` signal is logged for follow-up.
- The age gate is a declared date of birth, not ID verification.
- Terms say "18+ or parental/guardian consent" while the gate enforces 18+ — legal should align the Terms text.

## App Review notes (draft for App Store Connect)

> Kolab includes the following safeguards for user-generated content:
> - Users must accept the Terms of Use and Community Guidelines (with a date-of-birth age check, 18+) before registering or logging in.
> - Any profile, event, competition, competition entry, portfolio item or chat message can be reported from the ⋯ menu (or long-press on a message). Reasons include content inappropriate for the app's age rating.
> - Users can block any account from its profile or chat. Blocked users' content is removed from the blocker's feeds immediately and messaging is disabled both ways. Each block notifies our moderation team.
> - Text and images are screened automatically before publication; flagged events are held for human review.
> - Every report is reviewed by our moderation team, who can remove content, warn, restrict or suspend accounts.
> - Contact: info@kolab.com.np · https://kolab.com.np/ (in-app: Menu → Help & Safety).
> Demo accounts: <creator email/password>, <business email/password>.

## Screen recording script (physical iPhone)

1. Fresh install → Log In → "Welcome to Kolab" agreement: open Terms + Community Guidelines, enter date of birth, tick the checkbox, Continue.
2. Open a business profile or event → ⋯ → Report → choose a reason → Submit → confirmation.
3. ⋯ → Block user → confirm → back on the feed the business's events are gone → Menu → Help & Safety → Blocked users shows the account.
4. (Optional) Web admin `/admin/moderation`: the report in the queue → open → Verify → action → Resolve; Safety signals tab shows the block.
