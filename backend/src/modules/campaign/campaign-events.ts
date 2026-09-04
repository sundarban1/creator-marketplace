import { Prisma, CampaignEventActor } from '@prisma/client';
import prisma from '../../prisma';
import { logger } from '../../config/logger';

// Append-only, structured record of every state transition a campaign
// engagement makes (escrow spec §34). See the CampaignEvent model comment for
// how this differs from ActivityLog and RevisionNote.
//
// Fire-and-forget by design, exactly like logActivity: call sites do
// `recordCampaignEvent(...)`, never `await` it, so a logging outage can never
// fail the money-moving transaction that triggered it. Pass a transaction
// client only when the event genuinely must commit atomically with the state
// change (rare — the human-facing guarantee is ActivityLog + the row itself).

type LedgerClient = Prisma.TransactionClient | typeof prisma;

export type CampaignEventAxis = 'application' | 'escrow' | 'work' | 'campaign' | 'dispute';

export interface RecordCampaignEventInput {
  campaignId: string;
  applicationId?: string | null;
  axis: CampaignEventAxis;
  fromStatus?: string | null;
  toStatus: string;
  actorId?: string | null;
  actorType?: CampaignEventActor;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export function recordCampaignEvent(input: RecordCampaignEventInput): void {
  prisma.campaignEvent
    .create({
      data: {
        campaignId:    input.campaignId,
        applicationId: input.applicationId ?? undefined,
        axis:          input.axis,
        fromStatus:    input.fromStatus ?? undefined,
        toStatus:      input.toStatus,
        actorId:       input.actorId ?? undefined,
        actorType:     input.actorType ?? CampaignEventActor.SYSTEM,
        reason:        input.reason ?? undefined,
        metadata:      input.metadata as Prisma.InputJsonValue | undefined,
      },
    })
    .catch((err) => {
      logger.error({ err, axis: input.axis, toStatus: input.toStatus }, 'Failed to write campaign event');
    });
}

/**
 * Transactional variant — use when the event must roll back with the state
 * change (e.g. inside the escrow-release transaction, so a committed release
 * always has its event and a rolled-back one never does).
 */
export function recordCampaignEventTx(client: LedgerClient, input: RecordCampaignEventInput) {
  return client.campaignEvent.create({
    data: {
      campaignId:    input.campaignId,
      applicationId: input.applicationId ?? undefined,
      axis:          input.axis,
      fromStatus:    input.fromStatus ?? undefined,
      toStatus:      input.toStatus,
      actorId:       input.actorId ?? undefined,
      actorType:     input.actorType ?? CampaignEventActor.SYSTEM,
      reason:        input.reason ?? undefined,
      metadata:      input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export function listCampaignEvents(campaignId: string) {
  return prisma.campaignEvent.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'asc' },
  });
}

export function listEngagementEvents(applicationId: string) {
  return prisma.campaignEvent.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'asc' },
  });
}
