import { Router } from 'express';
import { MessagingController } from './messaging.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { startConversationSchema, sendMessageSchema } from './messaging.schema';

const router = Router();
const ctrl   = new MessagingController();

router.use(authenticate);

// Conversations list (accepts ?status=PENDING|ACCEPTED|DECLINED)
router.get('/conversations',                         ctrl.listConversations.bind(ctrl));
// Send a message request (business → creator)
router.post('/conversations',                        validate(startConversationSchema), ctrl.startConversation.bind(ctrl));
// Check if conversation exists with a specific creator (business only)
router.get('/conversations/check/:creatorProfileId', ctrl.checkConversation.bind(ctrl));
// Badge count
router.get('/badge-count',                           ctrl.getBadgeCount.bind(ctrl));

// Per-conversation routes
router.post('/conversations/:id/:action(accept|decline)', ctrl.respondToRequest.bind(ctrl));
router.put('/conversations/:id/seen',                ctrl.markSeen.bind(ctrl));
router.get('/conversations/:id/messages',            ctrl.getMessages.bind(ctrl));
router.post('/conversations/:id/messages',           validate(sendMessageSchema), ctrl.sendMessage.bind(ctrl));

export default router;
