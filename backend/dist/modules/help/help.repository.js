"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class HelpRepository {
    listPublished() {
        return prisma_1.default.helpArticle.findMany({
            where: { published: true },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
    }
    listAll() {
        return prisma_1.default.helpArticle.findMany({
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
    }
    findById(id) {
        return prisma_1.default.helpArticle.findUnique({ where: { id } });
    }
    create(data) {
        return prisma_1.default.helpArticle.create({
            data: {
                question: data.question,
                answer: data.answer,
                category: data.category ?? 'General',
                order: data.order ?? 0,
                published: data.published ?? true,
            },
        });
    }
    update(id, data) {
        return prisma_1.default.helpArticle.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
    }
    delete(id) {
        return prisma_1.default.helpArticle.delete({ where: { id } });
    }
    togglePublished(id, published) {
        return prisma_1.default.helpArticle.update({ where: { id }, data: { published, updatedAt: new Date() } });
    }
}
exports.HelpRepository = HelpRepository;
//# sourceMappingURL=help.repository.js.map