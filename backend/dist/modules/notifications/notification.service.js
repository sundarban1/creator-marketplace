"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const notification_repository_1 = require("./notification.repository");
const socket_1 = require("../../socket");
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
    async markReadByRef(userId, refId) {
        await repo.markReadByRef(userId, refId);
    },
    async getBadge(userId) {
        const count = await repo.getUnreadCount(userId);
        return { count };
    },
    async create(data) {
        const notification = await repo.create(data);
        (0, socket_1.emitToUser)(data.userId, 'notification:new', notification);
        return notification;
    },
    async createMany(data) {
        if (data.length === 0)
            return;
        const result = await repo.createMany(data);
        // Emit to each unique user
        const byUser = new Map();
        for (const d of data)
            byUser.set(d.userId, d);
        for (const userId of byUser.keys()) {
            (0, socket_1.emitToUser)(userId, 'notification:new', { userId });
        }
        return result;
    },
};
//# sourceMappingURL=notification.service.js.map