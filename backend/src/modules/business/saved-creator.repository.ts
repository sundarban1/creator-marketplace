import prisma from '../../prisma';

export class SavedCreatorRepository {
  async toggle(businessId: string, creatorId: string): Promise<{ isSaved: boolean }> {
    const existing = await prisma.savedCreator.findUnique({
      where: { businessId_creatorId: { businessId, creatorId } },
    });
    if (existing) {
      await prisma.savedCreator.delete({ where: { id: existing.id } });
      return { isSaved: false };
    }
    await prisma.savedCreator.create({ data: { businessId, creatorId } });
    return { isSaved: true };
  }

  async listSaved(businessId: string) {
    return prisma.savedCreator.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            location: true,
            categories: true,
            isVerified: true,
            socialAccounts: { select: { platform: true, followers: true } },
          },
        },
      },
    });
  }

  async getSavedIds(businessId: string): Promise<string[]> {
    const rows = await prisma.savedCreator.findMany({
      where: { businessId },
      select: { creatorId: true },
    });
    return rows.map((r) => r.creatorId);
  }
}
