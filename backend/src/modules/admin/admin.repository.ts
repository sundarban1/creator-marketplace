import { Role, CampaignStatus } from '@prisma/client';
import prisma from '../../prisma';

// ── Default platform settings ──────────────────────────────────────────────────

const DEFAULTS: Record<string, unknown> = {
  'platform.comingSoon':           false,
  'business.registrationEnabled':  true,
  'creator.registrationEnabled':   true,
  'creator.onboarding':            true,
  'business.onboarding':           true,
  'campaign.autoApproval':         true,
  'payment.escrow':                true,
  'platform.commission':           12,
  'messaging.enabled':             true,
  'messaging.directMessages':      true,
  'messaging.pushNotifications':   true,
  'messaging.typingIndicators':    true,
  'notifications.email':           true,
  'notifications.reportAlerts':    true,
  'notifications.paymentAlerts':   true,
  'notifications.weeklySummary':   false,
  'security.twoFactor':            true,
  'security.ipAllowlist':          false,
  'security.auditLogging':         true,
  'security.sessionTimeout':       true,
  // Master switch for the featured-event paywall. OFF (default) = every
  // business can feature unlimited events for free. ON = each business gets
  // 'featuredEvent.freeQuota' free features, then the mobile toggle locks
  // behind 'featuredEvent.price' (Rs. per feature — informational only, no
  // charge is collected yet). See CampaignService.getFeaturedQuota.
  'featuredEvent.paywallEnabled':  false,
  // Only apply when 'featuredEvent.paywallEnabled' is true.
  'featuredEvent.freeQuota':       3,
  'featuredEvent.price':           1000,
  // Creator manual-withdrawal limits (Rs.). All enforced server-side in
  // WalletService.createWithdrawalRequest and surfaced to the mobile wallet.
  //  - minWithdrawal   : smallest amount allowed per request
  //  - maxWithdrawal   : largest amount allowed in a single request
  //  - dailyLimit      : max total requested per calendar day (resets at local
  //                      midnight in Nepal)
  // A creator may also only ever have one PENDING/PROCESSING request at a time,
  // and every request needs admin approval before it is paid.
  'wallet.minWithdrawal':          500,
  'wallet.maxWithdrawal':          10000,
  'wallet.dailyLimit':             25000,
  // Businesses whose account email appears here bypass the free quota above
  // entirely — always allowed to feature for free, even while the paywall is
  // on. See CampaignService.getFeaturedQuota. Lowercased on comparison.
  'featuredEvent.unlimitedEmails': [] as string[],

  // ── Marketplace ──────────────────────────────────────────────────────────
  // §79 — the current launch-focus city. Recommendations (getRecommendedCreators/
  // getRecommendedBusinesses) rank a same-city match above same-district above
  // nationwide; this is the only place that city is ever named, so expanding
  // beyond it later is an admin setting change, never a code change. Empty
  // string = no priority city (falls back to plain distance-based sorting).
  'marketplace.launchPriorityCity': 'Itahari',

  // ── Public contact info (landing page footer) ──────────────────────────
  // Empty string = not set, so the landing footer hides that item entirely
  // rather than showing a dead link. Contact email reuses
  // 'platform.supportEmail' above rather than duplicating it.
  'platform.address':          '',
  'platform.phone':            '',
  'platform.social.facebook':  '',
  'platform.social.instagram': '',
  'platform.social.tiktok':    '',
  'platform.social.youtube':   '',

  // ── App version enforcement ─────────────────────────────────────────────
  // Empty string = no enforcement (mobile skips the force-update screen).
  // Compared against expo-application's nativeApplicationVersion, semver-style.
  'app.minVersion.ios':     '',
  'app.minVersion.android': '',

  // ── Rate limits ──────────────────────────────────────────────────────────
  // Applies equally to creators and businesses. `max` values are admin-editable
  // live (see utils/settingsCache.ts + middleware/rateLimit.ts); the time
  // windows noted in comments are fixed at server-start (express-rate-limit
  // can't reconfigure windowMs per-request the way it can `limit`/`max`).
  'rateLimit.apiRequests.enabled':        true,
  'rateLimit.apiRequests.max':            120,  // requests per 1 minute, per IP
  'rateLimit.otp.enabled':                true,
  'rateLimit.otp.max':                    5,    // OTP requests per 10 minutes, per IP
  'rateLimit.login.enabled':              true,
  'rateLimit.login.max':                  20,   // login attempts per 15 minutes, per IP
  'rateLimit.campaignCreation.enabled':   true,
  'rateLimit.campaignCreation.maxPerDay': 5,    // events per business per calendar day
  'rateLimit.proposalSubmission.enabled':   true,
  'rateLimit.proposalSubmission.maxPerDay': 10,  // proposals per creator per calendar day
  'rateLimit.messages.enabled':           true,
  'rateLimit.messages.maxPerMinute':      20,   // chat messages per user per minute
  'rateLimit.duplicateMessages.enabled':  true, // blocks sending the exact same message twice in a row
  'rateLimit.newAccountCooldown.enabled': true,
  'rateLimit.newAccountCooldown.hours':   24,   // hours after signup before a business can create an event
  // Off by default — this only flags `captchaRequired` on the login response
  // once the threshold is hit; there's no CAPTCHA challenge UI or provider
  // wired up yet, so enabling it has no user-visible effect until that ships.
  'rateLimit.captcha.enabled':                false,
  'rateLimit.captcha.failedAttemptThreshold': 3,
};

export class AdminRepository {
  async getStats() {
    const [totalUsers, totalCreators, totalBusinesses, activeCampaigns, totalCampaigns, pendingApplications] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: Role.CREATOR } }),
        prisma.user.count({ where: { role: Role.BUSINESS } }),
        prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
        prisma.campaign.count(),
        prisma.application.count({ where: { status: 'PENDING' } }),
      ]);

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        creatorProfile:  { select: { fullName: true } },
        businessProfile: { select: { businessName: true } },
      },
    });

    return {
      totalUsers,
      totalCreators,
      totalBusinesses,
      activeCampaigns,
      totalCampaigns,
      pendingApplications,
      recentUsers,
    };
  }

  async getAllUsers(
    page: number,
    limit: number,
    role?: string,
    search?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (role) where['role'] = role as Role;
    if (search) {
      where['OR'] = [
        { email: { contains: search, mode: 'insensitive' } },
        { creatorProfile:  { fullName:     { contains: search, mode: 'insensitive' } } },
        { businessProfile: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        // `id` is a tie-breaker, not a display order — createdAt alone isn't
        // unique, so without it Postgres can return the same row on two
        // different pages (or skip one) as the result set shifts between
        // paginated queries.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: {
          id:              true,
          email:           true,
          phone:           true,
          role:            true,
          isEmailVerified: true,
          isActive:        true,
          createdAt:       true,
          creatorProfile:  { select: { fullName:     true, avatarUrl: true, isVerified: true } },
          businessProfile: { select: { businessName: true, logoUrl:   true, isVerified: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async getAllCreators(page: number, limit: number, search?: string) {
    const where: Record<string, unknown> = {};
    if (search) {
      where['OR'] = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          user:   { select: { id: true, email: true, phone: true, isEmailVerified: true, isActive: true, createdAt: true } },
          // Provider marketplace additions — services/portfolio are new,
          // small-cardinality relations (a handful of rows per provider), so
          // eagerly including them on the paginated list is cheap and avoids
          // a second per-row fetch when the admin opens the detail modal.
          services: {
            select: { id: true, name: true, pricingModel: true, startingPrice: true, status: true, category: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { applications: true, services: true, portfolioItems: true } },
        },
      }),
      prisma.creatorProfile.count({ where }),
    ]);

    return { creators, total };
  }

  async getAllBusinesses(page: number, limit: number, search?: string) {
    const where: Record<string, unknown> = {};
    if (search) {
      where['OR'] = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.businessProfile.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          user:   { select: { id: true, email: true, phone: true, isEmailVerified: true, isActive: true, createdAt: true } },
          _count: { select: { campaigns: true } },
        },
      }),
      prisma.businessProfile.count({ where }),
    ]);

    return { businesses, total };
  }

  async getAllCampaigns(
    page: number,
    limit: number,
    status?: string,
    search?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (status) where['status'] = status as CampaignStatus;
    if (search) {
      where['OR'] = [
        { title:    { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { business: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          business: { select: { businessName: true, logoUrl: true } },
          _count:   { select: { applications: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  async getCampaignDetail(campaignId: string) {
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        business: {
          select: { id: true, businessName: true, logoUrl: true, website: true, description: true },
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: {
                id: true, fullName: true, avatarUrl: true, location: true, categories: true,
                user: { select: { email: true } },
              },
            },
          },
        },
        // Multi-role campaigns (§ CampaignRequirement) — empty for the simple
        // single-category campaigns every existing campaign uses.
        requirements: {
          include: {
            category: { select: { id: true, name: true, icon: true, color: true } },
            _count: { select: { applications: { where: { status: 'ACCEPTED' } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { applications: true } },
      },
    });
  }

  async updateUserVerification(userId: string, isEmailVerified: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data:  { isEmailVerified },
      select: { id: true, email: true, isEmailVerified: true },
    });
  }

  async updateCreatorVerification(creatorProfileId: string, isVerified: boolean) {
    const data: {
      isVerified: boolean;
      citizenshipStatus?: 'APPROVED'; panDocStatus?: 'APPROVED'; companyRegDocStatus?: 'APPROVED';
    } = { isVerified };
    if (isVerified) {
      const existing = await prisma.creatorProfile.findUnique({
        where:  { id: creatorProfileId },
        select: { citizenshipDocUrl: true, panDocUrl: true, companyRegDocUrl: true },
      });
      if (existing?.citizenshipDocUrl) data.citizenshipStatus = 'APPROVED';
      if (existing?.panDocUrl) data.panDocStatus = 'APPROVED';
      if (existing?.companyRegDocUrl) data.companyRegDocStatus = 'APPROVED';
    }
    return prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data,
      select: {
        id: true, userId: true, fullName: true, isVerified: true,
        citizenshipStatus: true, citizenshipDocUrl: true, panDocStatus: true, panDocUrl: true,
        user: { select: { email: true } },
      },
    });
  }

  async setCreatorDocumentStatus(creatorProfileId: string, doc: 'citizenship' | 'pan' | 'companyReg', approved: boolean) {
    const status: 'APPROVED' | 'REJECTED' = approved ? 'APPROVED' : 'REJECTED';
    const data =
      doc === 'citizenship' ? { citizenshipStatus: status }
      : doc === 'companyReg' ? { companyRegDocStatus: status }
      : { panDocStatus: status };
    return prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data,
      select: {
        id: true, userId: true, fullName: true,
        citizenshipStatus: true, citizenshipDocUrl: true, panDocStatus: true, panDocUrl: true,
        companyRegDocStatus: true, companyRegDocUrl: true,
      },
    });
  }

  // 'identity' is the INDIVIDUAL service taker's citizenship / national ID /
  // personal PAN — without it here an individual could upload a document that
  // no admin could ever act on, leaving them stuck at PENDING forever.
  async setBusinessDocumentStatus(businessProfileId: string, doc: 'pan' | 'companyReg' | 'identity', approved: boolean) {
    const status: 'APPROVED' | 'REJECTED' = approved ? 'APPROVED' : 'REJECTED';
    const data =
      doc === 'pan'      ? { panDocStatus: status }
      : doc === 'identity' ? { identityDocStatus: status }
      : { companyRegDocStatus: status };
    return prisma.businessProfile.update({
      where: { id: businessProfileId },
      data,
      select: {
        id: true, userId: true, businessName: true,
        panDocUrl: true, panDocStatus: true, companyRegDocUrl: true, companyRegDocStatus: true,
        identityDocUrl: true, identityDocStatus: true,
      },
    });
  }

  async updateBusinessVerification(businessProfileId: string, isVerified: boolean) {
    const data: {
      isVerified: boolean;
      panDocStatus?: 'APPROVED'; companyRegDocStatus?: 'APPROVED'; identityDocStatus?: 'APPROVED';
    } = { isVerified };
    if (isVerified) {
      const existing = await prisma.businessProfile.findUnique({
        where:  { id: businessProfileId },
        select: { panDocUrl: true, companyRegDocUrl: true, identityDocUrl: true },
      });
      if (existing?.panDocUrl) data.panDocStatus = 'APPROVED';
      if (existing?.companyRegDocUrl) data.companyRegDocStatus = 'APPROVED';
      if (existing?.identityDocUrl) data.identityDocStatus = 'APPROVED';
    }
    return prisma.businessProfile.update({
      where: { id: businessProfileId },
      data,
      select: {
        id: true, userId: true, businessName: true, isVerified: true,
        panDocUrl: true, panDocStatus: true, companyRegDocUrl: true, companyRegDocStatus: true,
        identityDocUrl: true, identityDocStatus: true,
        user: { select: { email: true } },
      },
    });
  }

  async rejectBusinessVerification(businessProfileId: string, reason: string) {
    const existing = await prisma.businessProfile.findUnique({
      where:  { id: businessProfileId },
      select: { panDocUrl: true, companyRegDocUrl: true, identityDocUrl: true },
    });
    const data: {
      isVerified: boolean; verificationRejectReason: string; verificationRejectedAt: Date;
      panDocStatus?: 'REJECTED'; companyRegDocStatus?: 'REJECTED'; identityDocStatus?: 'REJECTED';
    } = { isVerified: false, verificationRejectReason: reason, verificationRejectedAt: new Date() };
    if (existing?.panDocUrl) data.panDocStatus = 'REJECTED';
    if (existing?.companyRegDocUrl) data.companyRegDocStatus = 'REJECTED';
    if (existing?.identityDocUrl) data.identityDocStatus = 'REJECTED';
    return prisma.businessProfile.update({
      where: { id: businessProfileId },
      data,
      select: {
        id: true, userId: true, businessName: true, isVerified: true,
        panDocUrl: true, panDocStatus: true, companyRegDocUrl: true, companyRegDocStatus: true,
        identityDocUrl: true, identityDocStatus: true,
        verificationRejectReason: true,
        user: { select: { email: true, phone: true } },
      },
    });
  }

  // §74 — the dedicated Verification Dashboard's queues. Separate from
  // getAllCreators/getAllBusinesses (which stay general-purpose/unfiltered)
  // rather than bolting a status filter onto those, so the existing
  // Creators/Businesses admin pages are untouched by this.
  async getProviderVerificationQueue(page: number, limit: number) {
    const where = {
      OR: [
        { citizenshipStatus: 'PENDING' as const },
        { panDocStatus: 'PENDING' as const },
        { companyRegDocStatus: 'PENDING' as const },
      ],
    };
    const [items, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: 'asc' }],
        select: {
          id: true, userId: true, fullName: true, avatarUrl: true, providerType: true,
          citizenshipDocUrl: true, citizenshipStatus: true, panDocUrl: true, panDocStatus: true,
          companyRegDocUrl: true, companyRegDocStatus: true,
          createdAt: true, updatedAt: true,
          user: { select: { email: true, phone: true } },
        },
      }),
      prisma.creatorProfile.count({ where }),
    ]);
    return { items, total };
  }

  async getBusinessVerificationQueue(page: number, limit: number) {
    const where = { OR: [{ panDocStatus: 'PENDING' as const }, { companyRegDocStatus: 'PENDING' as const }] };
    const [items, total] = await Promise.all([
      prisma.businessProfile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: 'asc' }],
        select: {
          id: true, userId: true, businessName: true, logoUrl: true,
          panDocUrl: true, panDocStatus: true, companyRegDocUrl: true, companyRegDocStatus: true,
          createdAt: true, updatedAt: true,
          user: { select: { email: true, phone: true } },
        },
      }),
      prisma.businessProfile.count({ where }),
    ]);
    return { items, total };
  }

  // Mirrors rejectBusinessVerification — providers never had a reason-tracked
  // reject path before (only the per-document approve/reject toggle), even
  // though CreatorProfile.verificationRejectReason/verificationRejectedAt
  // have existed since the Provider marketplace schema pivot and the mobile
  // settings screen already displays whatever ends up in that field.
  async rejectCreatorVerification(creatorProfileId: string, reason: string) {
    const existing = await prisma.creatorProfile.findUnique({
      where:  { id: creatorProfileId },
      select: { citizenshipDocUrl: true, panDocUrl: true, companyRegDocUrl: true },
    });
    const data: {
      isVerified: boolean; verificationRejectReason: string; verificationRejectedAt: Date;
      citizenshipStatus?: 'REJECTED'; panDocStatus?: 'REJECTED'; companyRegDocStatus?: 'REJECTED';
    } = { isVerified: false, verificationRejectReason: reason, verificationRejectedAt: new Date() };
    if (existing?.citizenshipDocUrl) data.citizenshipStatus = 'REJECTED';
    if (existing?.panDocUrl) data.panDocStatus = 'REJECTED';
    if (existing?.companyRegDocUrl) data.companyRegDocStatus = 'REJECTED';
    return prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data,
      select: {
        id: true, userId: true, fullName: true, isVerified: true,
        citizenshipDocUrl: true, citizenshipStatus: true, panDocUrl: true, panDocStatus: true,
        verificationRejectReason: true,
        user: { select: { email: true, phone: true } },
      },
    });
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, email: true, isActive: true },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateUserActiveStatus(userId: string, isActive: boolean) {
    return prisma.user.update({
      where:  { id: userId },
      data:   { isActive, suspendedAt: isActive ? null : new Date() },
      select: { id: true, email: true, isActive: true },
    });
  }

  async updateCampaignStatus(campaignId: string, status: CampaignStatus) {
    return prisma.campaign.update({
      where: { id: campaignId },
      data:  { status },
      select: { id: true, title: true, status: true },
    });
  }

  async findCampaignForClose(campaignId: string) {
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        applications: { select: { status: true, workStatus: true, paymentStatus: true } },
      },
    });
  }

  async findCampaignForApproval(campaignId: string) {
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { business: { select: { id: true, userId: true, businessName: true } } },
    });
  }

  async approveCampaign(campaignId: string) {
    return prisma.campaign.update({
      where: { id: campaignId },
      data:  { status: 'ACTIVE' },
    });
  }

  // Applications with an ACCEPTED status are the only ones worth notifying a
  // creator about before wiping them (see softDeleteCampaignCascade) — a
  // PENDING/SHORTLISTED/REJECTED/WITHDRAWN/EXPIRED proposal never became a
  // real engagement, so silently disappearing it needs no notice.
  async findCampaignForDeletion(campaignId: string) {
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        deletedAt: true,
        applications: {
          where: { status: 'ACCEPTED' },
          select: { creator: { select: { userId: true } } },
        },
      },
    });
  }

  // Admin-only force delete — soft-deletes the Campaign row (kept for audit,
  // see its schema comment) but hard-deletes every Application/
  // CampaignRequirement/CampaignInvitation tied to it, regardless of status
  // (an ACCEPTED/PAID/IN_PROGRESS proposal is removed exactly like a PENDING
  // one — no guard, unlike setCampaignStatus('CLOSED') above). Application's
  // own children (Review/RevisionNote/Contract/PaymentTransaction) already
  // cascade at the DB level via their onDelete: Cascade FK to Application, so
  // deleting Applications alone is enough to clean those up too.
  async softDeleteCampaignCascade(campaignId: string) {
    return prisma.$transaction(async (tx) => {
      const [applications, requirements, invitations] = await Promise.all([
        tx.application.deleteMany({ where: { campaignId } }),
        tx.campaignRequirement.deleteMany({ where: { campaignId } }),
        tx.campaignInvitation.deleteMany({ where: { campaignId } }),
      ]);
      const campaign = await tx.campaign.update({
        where: { id: campaignId },
        data:  { deletedAt: new Date() },
      });
      return {
        campaign,
        applicationsDeleted: applications.count,
        requirementsDeleted: requirements.count,
        invitationsDeleted:  invitations.count,
      };
    });
  }

  async deleteUser(userId: string) {
    return prisma.user.delete({ where: { id: userId } });
  }

  // ── Platform Settings ────────────────────────────────────────────────────────

  async getSettings(): Promise<Record<string, unknown>> {
    const rows = await prisma.platformSetting.findMany();
    const stored: Record<string, unknown> = {};
    for (const row of rows) {
      try { stored[row.key] = JSON.parse(row.value); } catch { stored[row.key] = row.value; }
    }
    return { ...DEFAULTS, ...stored };
  }

  async upsertSettings(settings: Record<string, unknown>): Promise<void> {
    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.platformSetting.upsert({
          where:  { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        })
      )
    );
  }

  async getSetting(key: string): Promise<unknown> {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (!row) return DEFAULTS[key] ?? null;
    try { return JSON.parse(row.value); } catch { return row.value; }
  }

  // ── Admin Conversations ──────────────────────────────────────────────────────

  async getConversationStats() {
    const [total, pending, accepted, declined, closed, totalMessages] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: 'PENDING' } }),
      prisma.conversation.count({ where: { status: 'ACCEPTED' } }),
      prisma.conversation.count({ where: { status: 'DECLINED' } }),
      prisma.conversation.count({ where: { status: 'CLOSED' } }),
      prisma.message.count(),
    ]);
    return { total, pending, accepted, declined, closed, totalMessages };
  }

  async getAllConversations(page: number, limit: number, status?: string, search?: string) {
    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (search) {
      where['OR'] = [
        { creator:  { fullName:     { contains: search, mode: 'insensitive' } } },
        { business: { businessName: { contains: search, mode: 'insensitive' } } },
        { campaign: { title:        { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        // `id` tie-breaker matters even more here since lastMessageAt is
        // nullable — ties (including null vs null) are common.
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'asc' }],
        include: {
          creator:  { select: { fullName: true, avatarUrl: true } },
          // Both nullable — a conversation is either creator↔business (business set,
          // creator2 null) or creator↔creator (creator2 set, business null).
          business: { select: { businessName: true, logoUrl: true } },
          creator2: { select: { fullName: true, avatarUrl: true } },
          campaign: { select: { title: true } },
          _count:   { select: { messages: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return { conversations, total };
  }

  async deleteConversation(id: string) {
    return prisma.conversation.delete({ where: { id } });
  }

  // ── Payments ─────────────────────────────────────────────────────────────────

  async getAllPaymentTransactions(
    page: number,
    limit: number,
    type?: string,
    search?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (type) where['type'] = type;
    if (search) {
      where['OR'] = [
        { business: { businessName: { contains: search, mode: 'insensitive' } } },
        { creator:  { fullName:     { contains: search, mode: 'insensitive' } } },
        { campaign: { title:        { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          campaign: { select: { title: true } },
          business: { select: { businessName: true } },
          creator:  { select: { fullName: true } },
        },
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return { transactions, total };
  }

  // ── Activity / Audit logs ─────────────────────────────────────────────────

  async getAllActivityLogs(
    page: number,
    limit: number,
    filters: { userId?: string; action?: string; from?: Date; to?: Date } = {},
  ) {
    const where: Record<string, unknown> = {};
    if (filters.userId) where['userId'] = filters.userId;
    if (filters.action)  where['action'] = filters.action;
    if (filters.from || filters.to) {
      where['createdAt'] = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to   ? { lte: filters.to }   : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getAllAuditLogs(
    page: number,
    limit: number,
    filters: { userId?: string; action?: string; from?: Date; to?: Date } = {},
  ) {
    const where: Record<string, unknown> = {};
    if (filters.userId) where['userId'] = filters.userId;
    if (filters.action)  where['action'] = filters.action;
    if (filters.from || filters.to) {
      where['createdAt'] = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to   ? { lte: filters.to }   : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  // AuditLog.userId/performedBy are bare strings (no Prisma relation — same
  // "no FK, joined in application code" pattern as CreatorAnalytics), so the
  // web audit log page needs this to turn them into readable emails.
  async getUserEmailsByIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
  }
}
