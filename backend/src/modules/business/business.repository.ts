import prisma from '../../prisma';

export class BusinessRepository {
  async findByUserId(userId: string) {
    return prisma.businessProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, role: true, isEmailVerified: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.businessProfile.findUnique({
      where: { id },
    });
  }

  async update(
    userId: string,
    data: Partial<{
      businessName: string;
      description: string | null;
      logoUrl: string | null;
      website: string | null;
      categories: string[];
      panNo: string | null;
    }>
  ) {
    return prisma.businessProfile.update({
      where: { userId },
      data,
    });
  }
}
