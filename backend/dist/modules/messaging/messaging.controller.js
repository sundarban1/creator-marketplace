"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingController = void 0;
const messaging_service_1 = require("./messaging.service");
const response_1 = require("../../utils/response");
const messagingService = new messaging_service_1.MessagingService();
class MessagingController {
    async listConversations(req, res, next) {
        try {
            const conversations = await messagingService.listConversations(req.user.id, req.user.role);
            (0, response_1.success)(res, conversations, 'Conversations retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    async startConversation(req, res, next) {
        try {
            const conversation = await messagingService.startConversation(req.user.id, req.user.role, req.body);
            (0, response_1.success)(res, conversation, 'Conversation started', 201);
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
}
exports.MessagingController = MessagingController;
//# sourceMappingURL=messaging.controller.js.map