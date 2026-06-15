import prisma from '../../prisma';
import type { CreateHelpArticleInput, UpdateHelpArticleInput } from './help.schema';

export class HelpRepository {
  listPublished() {
    return prisma.helpArticle.findMany({
      where:   { published: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listAll() {
    return prisma.helpArticle.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string) {
    return prisma.helpArticle.findUnique({ where: { id } });
  }

  create(data: CreateHelpArticleInput) {
    return prisma.helpArticle.create({
      data: {
        question:  data.question,
        answer:    data.answer,
        category:  data.category ?? 'General',
        order:     data.order ?? 0,
        published: data.published ?? true,
      },
    });
  }

  update(id: string, data: UpdateHelpArticleInput) {
    return prisma.helpArticle.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  }

  delete(id: string) {
    return prisma.helpArticle.delete({ where: { id } });
  }

  togglePublished(id: string, published: boolean) {
    return prisma.helpArticle.update({ where: { id }, data: { published, updatedAt: new Date() } });
  }
}
