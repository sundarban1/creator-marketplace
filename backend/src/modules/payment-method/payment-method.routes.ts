import { Router } from 'express';
import { PaymentMethodController } from './payment-method.controller';

const router = Router();
const ctrl = new PaymentMethodController();

// Public — no auth. Payment methods aren't sensitive, and event payment,
// withdrawal, and settings screens all need to read the active list.
router.get('/', ctrl.listPublic.bind(ctrl));

export default router;
