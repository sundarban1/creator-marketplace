"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
class NotificationRepository {
    async create(data) {
        return prisma_1.default.notification.create({ data });
    }
    async createMany(data) {
        return prisma_1.default.notification.createMany({ data });
    }
    async findByUser(userId) {
        return prisma_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async markRead(id, userId) {
        return prisma_1.default.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
    }
    async markAllRead(userId) {
        return prisma_1.default.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
    async getUnreadCount(userId) {
        return prisma_1.default.notification.count({ where: { userId, isRead: false } });
    }
}
exports.NotificationRepository = NotificationRepository;
//# sourceMappingURL=notification.repository.js.map