"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const notification_repository_1 = require("./notification.repository");
const notification_dto_1 = require("./notification.dto");
const socket_1 = require("../../socket");
const translation_1 = require("../../utils/translation");
const NOTIFICATION_FIELDS = ['title', 'body'];
const repo = new notification_repository_1.NotificationRepository();
exports.notificationService = {
    async getForUser(userId, lang = 'en') {
        const notifications = await repo.findByUser(userId);
        const dtos = notifications.map(notification_dto_1.toNotificationDto);
        return (0, translation_1.translateMany)(dtos, [...NOTIFICATION_FIELDS], lang);
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
        const raw = await repo.create(data);
        const notification = (0, notification_dto_1.toNotificationDto)(raw);
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