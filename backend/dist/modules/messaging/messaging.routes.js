"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messaging_controller_1 = require("./messaging.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const messaging_schema_1 = require("./messaging.schema");
const router = (0, express_1.Router)();
const ctrl = new messaging_controller_1.MessagingController();
router.use(auth_1.authenticate);
// Conversations list (accepts ?status=PENDING|ACCEPTED|DECLINED)
router.get('/conversations', ctrl.listConversations.bind(ctrl));
// Send a message request (business → creator)
router.post('/conversations', (0, validate_1.validate)(messaging_schema_1.startConversationSchema), ctrl.startConversation.bind(ctrl));
// Check if conversation exists with a specific creator (business only)
router.get('/conversations/check/:creatorProfileId', ctrl.checkConversation.bind(ctrl));
// Badge count
router.get('/badge-count', ctrl.getBadgeCount.bind(ctrl));
// Per-conversation routes
router.post('/conversations/:id/:action(accept|decline)', ctrl.respondToRequest.bind(ctrl));
router.put('/conversations/:id/seen', ctrl.markSeen.bind(ctrl));
router.get('/conversations/:id/messages', ctrl.getMessages.bind(ctrl));
router.post('/conversations/:id/messages', (0, validate_1.validate)(messaging_schema_1.sendMessageSchema), ctrl.sendMessage.bind(ctrl));
exports.default = router;
//# sourceMappingURL=messaging.routes.js.map