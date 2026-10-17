# Competitions (V1, web)

Competition is the third event type next to **Paid Event** and **Open Event**. Creators join, submit work for each stage, the organizer (a business) picks who advances, and the competition ends with published winners. **No payments**: prize amounts are advertised text only.

Web is done (creator, business, admin). Mobile is not built yet; see [Deferred to Phase 2](#deferred-to-phase-2).

## Design decision: separate models, not a `CampaignType`

Competitions have their own tables and module (`backend/src/modules/competition/`). They do not reuse `Campaign`:

- `Campaign` requires budget, payment and escrow fields.
- Application, escrow and payment queries all branch on `campaignType`, so adding a third value would risk Paid/Open regressions.

The UI still presents Competition as the third event type: it is in the business "New event" chooser and in creator discovery. Paid and Open Event code paths are unchanged.

## Workflows

**Organizer (business)**: `/business/competitions`
1. **New competition.** Set the basics, rules, documents, schedule, stages (any number, each with its own brief, deadline, advancement limit and allowed methods), prizes, optional scoring rubric and settings. Preview, then save as a draft.
2. **Submit for review**, choosing either "as soon as it's approved" or a scheduled go-live time. A Kolab admin must approve it before creators can see it; see [Admin review](#admin-review). While it's in review the organizer can keep editing or move it back to draft.
3. **Overview** tab: status, stats, next-step hint and per-stage controls:
   - open a stage now
   - close submissions
   - extend a deadline
   - reopen a stage
   - pause / resume
   - close registration or extend it
   - close the competition
   - cancel (reason required)
4. **Participants & review** tab:
   - Choose a stage. Filter by all, submitted, not submitted, awaiting decision, advanced, not selected or finalists. Search by name.
   - Open an entry to watch it or follow its link, see version history, and add private notes and scores.
   - Mark creators **Advance** or **Not selected**, then **Save draft**. Drafts are private.
   - **Publish results** shows a confirmation summary first. It is blocked when the selection is over the stage limit or the draft changed in another tab.
5. **Final results** tab: assign prizes to finalists, save as a draft, preview, then publish. The competition becomes **Completed**. **Reopen results** needs a reason and is audited.
6. **Activity** tab: the full audit trail.

**Creator**: `/creator/competitions` (tabs: Discover / My competitions / Results). Live competitions also appear as a strip on `/creator/events`.
- The detail page shows the overview, rules, judging rubric, documents, key dates, stage timeline and prizes, plus **Join**.
- After joining, **Your progress** shows the creator's status and what to do next. For the current stage, the creator can **upload a video** or **share a link** (Google Drive, YouTube, Vimeo, Dropbox, OneDrive, TikTok, Instagram or Facebook). A creator can replace their entry before the deadline if the organizer allows it.
- Status labels: Joined → Submission required → Submitted → Under review → Advanced / Finalist / Not selected → Completed. There is also "No entry this stage". A creator who misses a deadline is never eliminated automatically; only the organizer's published decision does that.

**Kolab admin**: `/admin/competitions`
- It opens on the **Review queue**: new submissions and proposed edits to live competitions, oldest first. See [Admin review](#admin-review).
- Every admin sees the oversight view only: status, dates, stage statuses, participant count, submission counts per stage, and **published** advanced/not-selected counts. They also see advertised prizes, published winners and reports.
- Moderators (see [Configuration](#configuration)) can also flag a competition, suspend or reinstate it, and view a stage's entries as evidence. Each of these actions needs a reason and writes an audit row.

## Admin review

Every competition is reviewed by a Kolab admin before it goes live. Verified businesses do **not** skip this, unlike events, because competitions advertise prizes to many creators. Any admin can review: the review covers only the organizer's own content and never participant data.

- **Launch review.** The organizer submits and the competition moves `DRAFT → PENDING_REVIEW`. The admin then does one of:
  - **Approve.** The competition becomes `ACTIVE`, or `SCHEDULED` if the organizer asked for a later go-live time. Approval is refused if the registration deadline or first stage deadline passed while it waited in the queue.
  - **Request changes**, with feedback. It moves to `CHANGES_REQUESTED`; the organizer edits and resubmits.
  - **Reject**, with feedback. It moves to `REJECTED`. The admin can optionally block resubmission.
  - A second admin deciding at the same time gets a conflict, not a second decision.
- **Edits after approval.**
  - On a live competition, changes to **rules, eligibility or prizes** are stored as *pending changes*. The approved version stays live; the admin approves (applied, participants notified) or rejects (with feedback). Other edits (cover, description, briefs, contact info, documents) apply immediately.
  - The organizer can discard a pending proposal. Proposed prize changes are re-checked against drafted awards when they're applied.
  - On an approved-but-`SCHEDULED` competition, changing rules, eligibility, prizes, dates or stages sends the whole competition back to `PENDING_REVIEW`. Nobody has joined yet, so nothing is disrupted.
- **Notifications.**
  - Every admin gets a bell notification, and `ADMIN_EMAIL` gets an email, when something enters the queue.
  - The organizer gets a bell, push and email for each decision, including the admin's feedback.
- **Records.** History is stored in `competition_reviews` (append-only) and shown to both sides. The latest decision is mirrored on the competition row (`reviewFeedback`, `reviewedAt`, `pendingChanges`…).

## Lifecycle

Competition statuses:

`DRAFT → PENDING_REVIEW → (admin approves) → SCHEDULED → ACTIVE ⇄ PAUSED → AWAITING_RESULTS → COMPLETED`

`PENDING_REVIEW` can also go to `CHANGES_REQUESTED` or `REJECTED`; both can be resubmitted (`REJECTED` only if allowed). Nothing goes live without an admin approval.

- `CANCELLED` can be reached from any status except Completed.
- `COMPLETED → AWAITING_RESULTS` only through the audited **reopen results** action.
- Allowed transitions are in `competition.rules.ts` (`COMPETITION_TRANSITIONS`). The service enforces them with conditional updates.

Stage statuses:

`UPCOMING → OPEN → UNDER_REVIEW → SELECTION_PENDING (draft saved) → RESULTS_PUBLISHED`

- A stage that never ran becomes `CLOSED` when the competition is closed or cancelled.
- When the final stage closes, the competition moves to `AWAITING_RESULTS`.

Each of these is a separate operation: closing registration, closing a stage's submissions, closing the whole competition, and cancelling.

Suspension (moderation) is separate from `status`. A suspended competition is hidden from discovery, and creator and organizer workflow actions are frozen.

## Scheduling

`jobs/competitionLifecycle.ts` runs every 5 minutes under `withJobLock`. Each run:

- publishes scheduled competitions that are due
- opens stages that are due (only once the previous stage's results are published)
- closes stages whose deadline has passed
- sends 24-hour reminders

Nothing is pre-scheduled. Each transition is an `updateMany` whose `WHERE` re-checks the **current** status and deadline when it writes. If an organizer extends a deadline or reopens a stage, a stale run updates 0 rows. Notification dedupe keys include the deadline, so repeated runs send nothing, and an extension re-arms the reminder. If a stage is due to open but its deadline has already passed, it does not open and the organizer is notified instead.

## Data model

Migration: `backend/prisma/migrations/20261017120000_competitions/` (additive only).

| Table | Purpose |
|---|---|
| `competitions` | Config, status, schedule, settings, rubric (`judgingCriteria` JSON), `attachments` JSON, moderation fields |
| `competition_stages` | `order` (unique per competition), brief, `opensAt`/`deadline`, status, `advanceLimit`, `allowedMethods`, per-stage video limits |
| `competition_participants` | Unique `(competitionId, creatorId)`; `status`, `currentStageOrder`, `eliminatedAtOrder` |
| `competition_submissions` | The **active** entry, unique `(stageId, participantId)`; video (URL + storage ref) or external link; `version` |
| `competition_submission_versions` | Append-only history of replaced entries |
| `competition_stage_decisions` | Unique `(stageId, participantId)`; draft/published decision, private `notes`, `scores` JSON, `totalScore` |
| `competition_prizes` | Advertised prize: `kind` (PLACEMENT / SPECIAL), title, optional NPR `amount`, `recipientCount` |
| `competition_awards` | Prize ↔ finalist, unique `(prizeId, participantId)`; draft until published |
| `competition_reviews` | Append-only admin review history (launch + edit reviews) |

Also changed:
- `ReportTargetType` gains `COMPETITION`, so the existing report flow covers competitions.
- `AuditLog` is reused with `entityType = 'Competition'`. Audit rows are written inside the same transaction as the change.

There are **no** payment, payout or transaction tables.

## API

Organizer routes: `/api/competitions/manage` (BUSINESS role). A non-owner gets **404**.

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/` | List own / create (draft) |
| GET/PATCH/DELETE | `/:id` | Detail + stats / update (full while draft/scheduled, content-only once live) / delete draft |
| POST | `/:id/submit` · `/withdraw` · `/pending-changes/discard` | Submit for admin review (optional `publishAt`), move back to draft, drop a proposed edit |
| POST | `/:id/pause` · `/resume` · `/cancel` · `/close` | Lifecycle |
| POST | `/:id/registration/close` · `/registration/extend` | Registration |
| POST | `/:id/stages/:stageId/open` · `/close` · `/extend` · `/reopen` | Stage controls |
| GET | `/:id/participants?stageId&filter&q&page&limit` | Paginated participants (one query, no N+1) |
| GET | `/:id/stages/:stageId/submissions/:participantId` | Entry + history + private notes/scores |
| GET/PUT/POST | `/:id/stages/:stageId/decisions/summary` · `/decisions` · `/decisions/publish` | Draft + publish (`expectedAdvanceCount` guard) |
| PUT/POST | `/:id/awards` · `/:id/results/publish` · `/:id/results/reopen` | Final results (`expectedAwardCount` guard) |
| GET | `/:id/activity` | Audit trail |

Creator and public routes: `/api/competitions`

| Method | Path | Purpose |
|---|---|---|
| GET | `/?tab=open\|results\|all&q&page` | Discovery. Drafts, scheduled, suspended and deactivated-business competitions are never listed |
| GET | `/:idOrSlug` | Public detail. Drafts are visible to the owner only |
| GET | `/me/joined` | The creator's competitions with status |
| POST | `/:id/join` | Join |
| GET | `/:id/progress` | The creator's own stages, entries and published outcomes. Never drafts, notes or scores |
| POST | `/:id/stages/:stageId/submissions/link` | Link entry |
| POST | `/:id/stages/:stageId/submissions/video/signature` · `/complete` | Direct video upload |

Admin routes: `/api/admin/competitions`

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Oversight list |
| GET | `/:id` | Oversight detail |
| POST | `/:id/review/approve` · `/review/request-changes` · `/review/reject` | Launch review (any admin; feedback required for changes/reject) |
| POST | `/:id/review/changes/approve` · `/review/changes/reject` | Review a proposed edit to rules / eligibility / prizes |
| POST | `/:id/moderation/flag` · `/suspend` · `/unsuspend` · `/stages/:stageId/submissions` | Moderators only, reason required, audited |

## Permissions (enforced in the backend)

- Creators can read only their own entries and **published** outcomes. Another creator's entries are never returned.
- Organizers can reach only their own competitions. Draft decisions, notes and scores exist only on organizer endpoints.
- Admins get aggregate oversight data with published counts only. Entries, draft decisions, notes and non-winner identities are not returned to admins by default.
- Moderators are the only ones who can open entries for an investigation. Each access writes a `competition.sensitive_access` audit row.
- Concurrency:
  - joins: unique constraint
  - entries: participant row lock, plus deadline and stage re-checked inside the transaction
  - publishing: competition and stage row locks, the expected-count guard, and a status re-check

## Notifications

All notifications go through the existing `notify()` dispatcher (bell, socket and push, plus email where marked) and its `NotificationDelivery` dedupe ledger. Each has `refType: 'competition'` and a web deep link (`notificationRoute.ts`).

| Recipient | When |
|---|---|
| Organizer | New participants and new submissions (grouped to 1 per competition/stage per hour); 24 hours before a stage deadline; stage ready for review (also email); a due stage needs a new deadline; competition suspended |
| Creator | Joined; entry received or updated; stage opened; deadline changed, stage closed early or reopened; 24-hour reminder when no entry yet; advanced (also email) or not selected; final results published or reopened; paused, resumed or cancelled; material rule or prize changes |

Nothing is sent for an unpublished decision.

## Video uploads: infrastructure notes

- Uploads reuse the existing deliverable/chat plan from `utils/r2Media.ts`:
  - **R2** presigned PUT (multipart above 100 MB) when R2 is configured
  - otherwise a **Cloudinary** signed upload (chunked at 20 MB on web)
- Limits: MP4/MOV, 500 MB.
- The server verifies size and format with the provider before saving. Duration is checked against stage limits when it is known: Cloudinary reports it, R2 relies on the duration the client reports.
- **R2 browser uploads require bucket CORS.** The bucket must allow `PUT` with a `Content-Type` header from the web origins (`https://kolab.com.np`, plus localhost for dev). Mobile never needed this. Without it, web video upload fails, but link submission still works.
- Uploaded videos sit on the public CDN under unguessable keys, which is the same model as campaign deliverables. They are not signed or private URLs.
- Google Drive links are checked best-effort: a file that isn't shared publicly is rejected with instructions. Other hosts are checked for syntax and provider only.

## Configuration

- `COMPETITION_MODERATOR_EMAILS` (backend env, optional): comma-separated admin emails allowed to use moderation tools. It is kept in env rather than a dashboard setting so an admin can't grant themselves access. If it is empty, nobody can moderate and admins only get the oversight view.
- Deploy steps:
  1. `npx prisma migrate deploy`
  2. Rebuild the API Docker image (new module + new cron job)
  3. Configure R2 CORS (see [Video uploads](#video-uploads-infrastructure-notes))

## Tests

| File | Covers |
|---|---|
| `backend/src/modules/competition/competition.rules.test.ts` | 23 unit tests: schedule/stage validation, prizes, rubric weights, scoring, advancement limits, award conflicts / one-prize rule, creator status, transitions, link validation |
| `backend/test/competition.int.test.ts` | 26 integration tests: admin review (no bypass for verified businesses, changes → resubmit → permanent reject, lapsed dates, live-edit pending changes, scheduled re-review), creation and discovery, ownership, joins (incl. concurrent), deadlines, version history, eligibility, private drafts, publish guards and concurrency, full 3-stage progression, stale-sweep vs extension, idempotent reminders, competition-vs-stage closure, final results with no payment rows, admin restriction + moderator audit |

Run against a throwaway database:

```bash
TEST_DATABASE_URL=… npx vitest run test/competition.int.test.ts src/modules/competition
```

## Deferred to Phase 2

- **Mobile app** screens.
- **Prize payouts.** Not built: no collection, payout, transaction records or paid/unpaid states.
- Multiple judges per competition, and co-organizers or team members (only the owning business account can manage).
- Organizer approval before joining, and creator self-withdrawal.
- A "needs correction" request on an entry.
- A public signed-out competition page with SEO (detail pages are inside the app; the API already supports public reads).
- Private or signed video URLs and server-side duration verification for R2.
- Accessibility checks for link hosts other than Google Drive.
- CSV export of participants and results.
- Per-type notification preferences (the global push and email switches apply).
