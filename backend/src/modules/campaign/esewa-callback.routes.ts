import { Router } from 'express';
import { CampaignController } from './campaign.controller';

const router = Router();
const ctrl = new CampaignController();

// Public — the mobile WebBrowser session opens this directly (no Authorization
// header); it renders an auto-submitting form to eSewa. See
// CampaignController.esewaCheckoutPage.
router.get('/checkout/:appId', ctrl.esewaCheckoutPage.bind(ctrl));

// Public — eSewa redirects the user's browser here directly after payment.
// See CampaignController.esewaSuccessCallback / esewaFailureCallback.
router.get('/success/:appId', ctrl.esewaSuccessCallback.bind(ctrl));
router.get('/failure/:appId', ctrl.esewaFailureCallback.bind(ctrl));

// Web-initiated payment variants — same confirmation logic, but redirect back
// to a page on the web app instead of the mobile app's native deep link.
router.get('/success/:appId/web', ctrl.esewaSuccessCallbackWeb.bind(ctrl));
router.get('/failure/:appId/web', ctrl.esewaFailureCallbackWeb.bind(ctrl));

export default router;
