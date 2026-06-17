"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const notification_controller_1 = require("./notification.controller");
const router = (0, express_1.Router)();
const ctrl = new notification_controller_1.NotificationController();
router.use(auth_1.authenticate);
router.get('/', ctrl.list.bind(ctrl));
router.get('/badge', ctrl.badge.bind(ctrl));
router.patch('/read-all', ctrl.markAllRead.bind(ctrl));
router.patch('/:id/read', ctrl.markRead.bind(ctrl));
exports.default = router;
//# sourceMappingURL=notification.routes.js.map