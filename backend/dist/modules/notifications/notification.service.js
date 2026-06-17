"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const notification_repository_1 = require("./notification.repository");
const repo = new notification_repository_1.NotificationRepository();
exports.notificationService = {
    async getForUser(userId) {
        return repo.findByUser(userId);
    },
    async markRead(id, userId) {
        await repo.markRead(id, userId);
    },
    async markAllRead(userId) {
        await repo.markAllRead(userId);
    },
    async getBadge(userId) {
        const count = await repo.getUnreadCount(userId);
        return { count };
    },
    async create(data) {
        return repo.create(data);
    },
    async createMany(data) {
        if (data.length === 0)
            return;
        return repo.createMany(data);
    },
};
//# sourceMappingURL=notification.service.js.map