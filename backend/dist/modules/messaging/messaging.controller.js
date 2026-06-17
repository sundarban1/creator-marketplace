"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingController = void 0;
const messaging_service_1 = require("./messaging.service");
const response_1 = require("../../utils/response");
const messagingService = new messaging_service_1.MessagingService();
class MessagingController {
    async listConversations(req, res, next) {
        try {
            const status = req.query.status;
            const conversations = await messagingService.listConversations(req.user.id, req.user.role, status);
            (0, response_1.success)(res, conversations);
        }
        catch (err) {
            next(err);
        }
    }
    async startConversation(req, res, next) {
        try {
            const conversation = await messagingService.startConversation(req.user.id, req.user.role, req.body);
            (0, response_1.success)(res, conversation, 'Message request sent', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async checkConversation(req, res, next) {
        try {
            const result = await messagingService.checkConversation(req.user.id, req.params.creatorProfileId);
            (0, response_1.success)(res, result ?? null);
        }
        catch (err) {
            next(err);
        }
    }
    async respondToRequest(req, res, next) {
        try {
            const action = req.params.action;
            if (action !== 'accept' && action !== 'decline') {
                res.status(400).json({ success: false, message: 'Invalid action' });
                return;
            }
            const result = await messagingService.respondToRequest(req.params.id, req.user.id, action);
            (0, response_1.success)(res, result, `Request ${action}ed`);
        }
        catch (err) {
            next(err);
        }
    }
    async getMessages(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 30;
            const { messages, total } = await messagingService.getMessages(req.params.id, req.user.id, req.user.role, page, limit);
            (0, response_1.paginated)(res, messages, total, page, limit);
        }
        catch (err) {
            next(err);
        }
    }
    async sendMessage(req, res, next) {
        try {
            const message = await messagingService.sendMessage(req.params.id, req.user.id, req.user.role, req.body);
            (0, response_1.success)(res, message, 'Message sent', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async markSeen(req, res, next) {
        try {
            await messagingService.markSeen(req.params.id, req.user.id, req.user.role);
            (0, response_1.success)(res, null, 'Marked as seen');
        }
        catch (err) {
            next(err);
        }
    }
    async getBadgeCount(req, res, next) {
        try {
            const result = await messagingService.getBadgeCount(req.user.id, req.user.role);
            (0, response_1.success)(res, result);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.MessagingController = MessagingController;
//# sourceMappingURL=messaging.controller.js.map