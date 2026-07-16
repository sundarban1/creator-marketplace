import { Router } from 'express';
import { Role } from '@prisma/client';
import { VisitorChatController } from './visitorChat.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendVisitorMessageSchema, updateVisitorChatStatusSchema } from './visitorChat.schema';

const router = Router();
const ctrl = new VisitorChatController();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/', ctrl.listForAdmin.bind(ctrl));
router.get('/:chatId/messages', ctrl.getMessagesForAdmin.bind(ctrl));
router.post('/:chatId/messages', validate(sendVisitorMessageSchema), ctrl.sendAdminMessage.bind(ctrl));
router.put('/:chatId/seen', ctrl.markSeenByAdmin.bind(ctrl));
router.patch('/:chatId/status', validate(updateVisitorChatStatusSchema), ctrl.updateStatus.bind(ctrl));

export default router;
