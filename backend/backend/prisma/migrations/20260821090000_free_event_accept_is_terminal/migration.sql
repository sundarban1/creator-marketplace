-- Free events (campaigns.campaignType = 'OPEN_EVENT') no longer have a work
-- stage: being accepted IS the end of the flow — no "start working", no
-- deliverables to submit or review (see CampaignService.updateApplicationStatus,
-- which now writes workStatus = 'COMPLETED' in the same statement that accepts
-- a free-event application).
--
-- Applications accepted into a free event BEFORE that rule existed are still
-- parked mid-flow (NONE / IN_PROGRESS / SUBMITTED / APPROVED). They can no
-- longer be advanced — startWork/submitWork now reject OPEN_EVENT outright —
-- so without this backfill their event could never be closed
-- (countUnresolvedApplications requires every accepted application to be
-- COMPLETED). Move them to the same terminal state new accepts get.
--
-- DISPUTED is deliberately left untouched: a reported issue stays parked
-- outside the normal flow until support resolves it. Any deliverable rows
-- these applications already uploaded are kept as-is — only workStatus moves.
UPDATE "applications" a
SET "workStatus" = 'COMPLETED'
FROM "campaigns" c
WHERE a."campaignId" = c."id"
  AND c."campaignType" = 'OPEN_EVENT'
  AND a."status" = 'ACCEPTED'
  AND a."workStatus" NOT IN ('COMPLETED', 'DISPUTED');
