"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("./notification.service");
class NotificationController {
    async list(req, res, next) {
        try {
            const notifications = await notification_service_1.notificationService.getForUser(req.user.id);
            res.json({ success: true, data: notifications });
        }
        catch (err) {
            next(err);
        }
    }
    async badge(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.getBadge(req.user.id);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    async markRead(req, res, next) {
        try {
            await notification_service_1.notificationService.markRead(req.params.id, req.user.id);
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    }
    async markAllRead(req, res, next) {
        try {
            await notification_service_1.notificationService.markAllRead(req.user.id);
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notification.controller.js.map