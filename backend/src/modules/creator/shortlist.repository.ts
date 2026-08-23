import prisma from '../../prisma';

// A creator's private shortlist of events. Deliberately a near-copy of
// FavoriteRepository (creator → business) rather than a shared generic:
// the two rows carry different relations and are read by different screens.
export class ShortlistRepository {
  async toggle(creatorId: string, campaignId: string): Promise<{ isShortlisted: boolean }> {
    const existing = await prisma.shortlistedCampaign.findUnique({
      where: { creatorId_campaignId: { creatorId, campaignId } },
    });
    if (existing) {
      await prisma.shortlistedCampaign.delete({ where: { id: existing.id } });
      return { isShortlisted: false };
    }
    await prisma.shortlistedCampaign.create({ data: { creatorId, campaignId } });
    return { isShortlisted: true };
  }

  async getIds(creatorId: string): Promise<string[]> {
    const rows = await prisma.shortlistedCampaign.findMany({
      where: { creatorId },
      select: { campaignId: true },
    });
    return rows.map((r) => r.campaignId);
  }

  // Newest-shortlisted first. Soft-deleted campaigns are filtered out, the way
  // every other creator-facing campaign query does; a campaign that has since
  // closed still shows, so the creator can see what they missed.
  async listCampaigns(creatorId: string) {
    const rows = await prisma.shortlistedCampaign.findMany({
      where: { creatorId, campaign: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          include: {
            business: { select: { businessName: true, logoUrl: true } },
            _count: { select: { applications: true } },
            requirements: {
              include: {
                category: true,
                _count: { select: { applications: { where: { status: 'ACCEPTED' } } } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
    return rows.map((r) => r.campaign);
  }
}
