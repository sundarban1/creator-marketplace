import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  auditLog: { create: vi.fn() },
}));
vi.mock('../../prisma', () => ({ default: prismaMock, prisma: prismaMock }));

const ctx = vi.hoisted(() => ({ value: undefined as Record<string, unknown> | undefined }));
vi.mock('../../middleware/requestContext', () => ({ getRequestContext: () => ctx.value }));

const log = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('../../config/logger', () => ({ logger: log }));

import { logAudit } from './audit.service';

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
  ctx.value = { ip: '10.0.0.1', userAgent: 'test-agent', requestId: 'req_1', deviceId: undefined };
});

describe('logAudit', () => {
  it('persists the new audit fields alongside the legacy oldValue/newValue shape', async () => {
    logAudit({
      userId: 'user_1',
      actorType: 'ADMIN',
      action: 'withdrawal.paid' as any,
      entityType: 'Application' as any,
      entityId: 'app_1',
      campaignId: 'campaign_1',
      metadata: { amount: 2000, currency: 'NPR' },
      performedBy: 'admin_1',
    });

    // Fire-and-forget — flush the microtask queue before asserting.
    await Promise.resolve();
    await Promise.resolve();

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        actorType: 'ADMIN',
        action: 'withdrawal.paid',
        entityType: 'Application',
        entityId: 'app_1',
        campaignId: 'campaign_1',
        metadata: { amount: 2000, currency: 'NPR' },
        performedBy: 'admin_1',
        ipAddress: '10.0.0.1',
        userAgent: 'test-agent',
        requestId: 'req_1',
      }),
    });
  });

  it('never throws when the write fails, and logs the failure instead', async () => {
    prismaMock.auditLog.create.mockRejectedValueOnce(new Error('db down'));

    expect(() => logAudit({ action: 'password.reset' as any, userId: 'user_1' })).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();

    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'password.reset' }),
      'Failed to write audit log',
    );
  });
});
