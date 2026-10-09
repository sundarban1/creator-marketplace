# Event review workflow

Every new Paid Event and Open Event is reviewed by a Kolab admin before creators can see it.

## Statuses

The workflow reuses the existing `CampaignStatus` enum:

| Workflow name | `CampaignStatus` | Creators see it? |
|---|---|---|
| Pending Review | `PENDING_APPROVAL` | no |
| Published | `ACTIVE` | yes, and can submit proposals |
| Changes Requested | `CHANGES_REQUESTED` (new) | no |
| Rejected | `REJECTED` (new) | no |

`DRAFT` is still used for guided-creator autosave. `PAUSED`, `CLOSED`, `EXPIRED` and `CANCELLED` are unchanged.

## Transitions

| From | Action | To | Where |
|---|---|---|---|
| (new) / `DRAFT` | business submits (`status: ACTIVE` on create, update or publish-draft) | `PENDING_APPROVAL` | `CampaignService.create` / `update` |
| `PENDING_APPROVAL` | admin approves | `ACTIVE` | `CampaignReviewService.decide` |
| `PENDING_APPROVAL` | admin requests changes (feedback required) | `CHANGES_REQUESTED` | same |
| `PENDING_APPROVAL` | admin rejects (reason required, optional "allow resubmission") | `REJECTED` | same |
| `CHANGES_REQUESTED` | business saves an edit, or `POST /:id/resubmit` | `PENDING_APPROVAL` | `update` / `resubmit` |
| `REJECTED` (`resubmissionAllowed`) | same as above | `PENDING_APPROVAL` | same |
| `ACTIVE` / `PAUSED` / `CLOSED` / `EXPIRED` | business changes a material field | `PENDING_APPROVAL` | `update` (`materialChanges()`) |

The client never chooses a review status:

- `status: ACTIVE` from a business is treated as a submission.
- Admins can't set review statuses through `PATCH /api/admin/campaigns/:id/status` or the admin edit form.

## Material fields

Material fields are listed in `MATERIAL_FIELDS` in `campaign-review.rules.ts`:

- title, description, cover image, category, event type
- budget, payment type, creators needed
- deliverables, content type, platforms, minimum followers
- all dates and the event time
- location and venue
- benefits, capacity, target audience, goals, and the brief (eligibility and attachments)

A field only counts if its value actually changes. Clients send the whole form, so a field being present isn't enough.

Pause, close, featured, the "full" flag and hashtags stay live without review.

If a published event goes back to review, its existing proposals and work are kept. Creators who already applied can still open it. New proposals, listings and invites are blocked until it is approved again. Re-approval doesn't notify followers a second time.

## Concurrency and history

- Every decision and every submission is one conditional `UPDATE … WHERE status = <expected>` plus one `campaign_reviews` row, in the same transaction.
- If two admins decide at the same time, the loser gets 409.
- History is append-only: it is never edited or deleted on edits or resubmissions.

## Notifications

All notifications are sent after the transaction commits, and an email failure never touches the status.

| When | Recipient | What they get | Template |
|---|---|---|---|
| Submitted or resubmitted | All `ADMIN` users | In-app notification | — |
| Submitted or resubmitted | `ADMIN_EMAIL` (comma-separated; falls back to info@kolab.com.np) | "New Event Awaiting Review — {title}" | `eventSubmittedAdminEmail` |
| Approved | Business owner | In-app notification and email | `eventApprovedEmail` |
| Changes requested | Business owner | In-app notification and email, including the admin's exact feedback | `eventChangesRequestedEmail` |
| Rejected | Business owner | In-app notification and email, including the admin's exact reason | `eventRejectedEmail` |

All email templates are in `utils/email/eventReview.ts`. Admin text is HTML-escaped and keeps its line breaks.

Before sending, each email claims a `notification_deliveries.dedupeKey` (`campaign-review:<reviewId>:email`), so a retry can't send it twice. A failed send releases the claim so it can be tried again.

### Other admin actions

The business is also notified when an admin pauses, reactivates, closes, cancels, expires or removes its event:

- from the status control (`PATCH /api/admin/campaigns/:id/status`);
- from the admin edit form;
- by deleting it.

Each sends one in-app notification. It appears in the web dashboard bell and the mobile notification list, and it sends a mobile push. An email goes out with the same wording, which lives in `ADMIN_ACTION_COPY` in `campaign-review.service.ts`. The notification type is `campaign_status_changed`, or `campaign_deleted` for a removal.

### Deep links

| Where | Event decision or status change | Removed event |
|---|---|---|
| Web bell | `/business/events/:id` | `/business/events` |
| Mobile push and notification list (`resolveNotificationRoute`) | `campaign-detail` | the business Events tab |
| Email: main button | the web dashboard | the web dashboard |
| Email: "Open in the app" link | `kolab://campaign-detail?campaignId=…` | `kolab://campaigns` |

The app links use the app's custom scheme because there are no universal links yet.

Push notifications respect the user's push setting. Review and admin-action emails are sent regardless of the email-notification preference, because they concern the business's own event.

## API

**Business**

- `POST /api/campaigns`: always lands on `PENDING_APPROVAL`. The response message says the event will be reviewed within 2–3 hours.
- `PUT /api/campaigns/:id`: saving a `CHANGES_REQUESTED` event resubmits it.
- `POST /api/campaigns/:id/resubmit`
- `GET /api/campaigns/:id/review-history`: owner or admin only. Reviewer identity is hidden from businesses.
- `GET /api/campaigns/my?status=REVIEW`: pending, changes-requested and rejected events.

**Admin**

- `POST /api/admin/campaigns/:id/approve`
- `POST /api/admin/campaigns/:id/request-changes` with `{ feedback }`
- `POST /api/admin/campaigns/:id/reject` with `{ reason, allowResubmission }`
- `GET /api/admin/campaigns/:id/review-history`
- `GET /api/admin/campaigns/review-counts`

`feedback` and `reason` must be at least 10 characters after trimming.

**Visibility**

- `GET /api/campaigns/:id` uses optional auth. An unpublished event returns 404 unless the viewer is the owner, an admin, or a creator with a proposal on it.
- The public list ignores non-public `status` filters.
- Shortlists, creator invites and proposals require a creator-visible or `ACTIVE` event.

## Migration

`20261009120000_event_review_workflow` adds the enum values, the review columns on `campaigns`, and the `campaign_reviews` table.

The backfill only stamps events already in `PENDING_APPROVAL` as revision 1. Published and historical events are untouched. Earlier admin rejections were stored as `CANCELLED`; they are left as they are, because they can't be told apart from cancellations by the business.

The `campaign.autoApproval` admin setting has been removed, because review is now mandatory.
