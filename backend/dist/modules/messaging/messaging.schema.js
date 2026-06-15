"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesQuerySchema = exports.sendMessageSchema = exports.startConversationSchema = void 0;
const zod_1 = require("zod");
exports.startConversationSchema = zod_1.z.object({
    otherUserId: zod_1.z.string().min(1, 'Other user ID is required'),
    campaignId: zod_1.z.string().optional(),
});
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Message content is required').max(5000, 'Message too long'),
});
exports.messagesQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
    limit: zod_1.z.string().optional().transform((v) => (v ? parseInt(v) : 30)),
});
//# sourceMappingURL=messaging.schema.js.map