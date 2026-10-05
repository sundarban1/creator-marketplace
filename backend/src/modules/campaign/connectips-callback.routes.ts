import { Router } from 'express';
import { CampaignController } from './campaign.controller';

const router = Router();
const ctrl = new CampaignController();

// Public — the mobile WebBrowser session / web popup opens this directly (no
// Authorization header); it renders an auto-submitting form to connectIPS.
router.get('/checkout/:appId', ctrl.connectIpsCheckoutPage.bind(ctrl));

// Public — NCHL redirects the browser here after payment with `?TXNID=`.
// These two paths are what gets registered with NCHL as the merchant's
// success/failure URLs. POST accepted too, in case the gateway posts back.
router.get('/success', ctrl.connectIpsSuccessCallback.bind(ctrl));
router.post('/success', ctrl.connectIpsSuccessCallback.bind(ctrl));
router.get('/failure', ctrl.connectIpsFailureCallback.bind(ctrl));
router.post('/failure', ctrl.connectIpsFailureCallback.bind(ctrl));

export default router;
