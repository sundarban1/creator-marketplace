import { Router } from 'express';
import { VisitorChatController } from './visitorChat.controller';
import { verifyVisitorChat } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { startVisitorChatSchema, sendVisitorMessageSchema } from './visitorChat.schema';

const router = Router();
const ctrl = new VisitorChatController();

// Public — no auth. Anonymous landing-page visitor starting/using a chat.
router.post('/start', validate(startVisitorChatSchema), ctrl.start.bind(ctrl));
router.get('/:chatId/messages', verifyVisitorChat, ctrl.getMessages.bind(ctrl));
router.post('/:chatId/messages', verifyVisitorChat, validate(sendVisitorMessageSchema), ctrl.sendVisitorMessage.bind(ctrl));
router.put('/:chatId/seen', verifyVisitorChat, ctrl.markSeenByVisitor.bind(ctrl));

export default router;
