"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messaging_controller_1 = require("./messaging.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const messaging_schema_1 = require("./messaging.schema");
const router = (0, express_1.Router)();
const ctrl = new messaging_controller_1.MessagingController();
// All messaging routes require authentication
router.use(auth_1.authenticate);
/**
 * @swagger
 * /api/messaging/conversations:
 *   get:
 *     tags: [Messaging]
 *     summary: List own conversations
 *     security:
 *       - bearerAuth: []
 *     description: Returns all conversations for the authenticated user (filtered by role)
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Conversation'
 *                       - type: object
 *                         properties:
 *                           messages:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Message'
 *                             description: Last message in the conversation
 *       401:
 *         description: Not authenticated
 */
router.get('/conversations', ctrl.listConversations.bind(ctrl));
/**
 * @swagger
 * /api/messaging/conversations:
 *   post:
 *     tags: [Messaging]
 *     summary: Start a conversation
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create or retrieve an existing conversation with another user.
 *       - If you are a CREATOR, otherUserId must be a BUSINESS user's ID
 *       - If you are a BUSINESS, otherUserId must be a CREATOR user's ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otherUserId
 *             properties:
 *               otherUserId:
 *                 type: string
 *                 description: User ID of the other party
 *                 example: clxxxxxxxxxxxxxxxx
 *               campaignId:
 *                 type: string
 *                 description: Optional campaign context for the conversation
 *                 example: clxxxxxxxxxxxxxxxx
 *     responses:
 *       201:
 *         description: Conversation started or retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *       404:
 *         description: Other user not found
 */
router.post('/conversations', (0, validate_1.validate)(messaging_schema_1.startConversationSchema), ctrl.startConversation.bind(ctrl));
/**
 * @swagger
 * /api/messaging/conversations/{id}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: Get messages in a conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       403:
 *         description: Not authorized to view this conversation
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:id/messages', ctrl.getMessages.bind(ctrl));
/**
 * @swagger
 * /api/messaging/conversations/{id}/messages:
 *   post:
 *     tags: [Messaging]
 *     summary: Send a message in a conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *                 example: Hello! I am interested in collaborating on your campaign.
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       403:
 *         description: Not authorized to send messages in this conversation
 *       404:
 *         description: Conversation not found
 */
router.post('/conversations/:id/messages', (0, validate_1.validate)(messaging_schema_1.sendMessageSchema), ctrl.sendMessage.bind(ctrl));
exports.default = router;
//# sourceMappingURL=messaging.routes.js.map