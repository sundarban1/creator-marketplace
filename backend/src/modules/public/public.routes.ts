import { Router } from 'express';
import { PublicController } from './public.controller';
import { CreatorController } from '../creator/creator.controller';
import { BusinessController } from '../business/business.controller';
import { CampaignController } from '../campaign/campaign.controller';
import { validate } from '../../middleware/validate';
import { campaignListQuerySchema } from '../campaign/campaign.schema';

const router = Router();
const ctrl = new PublicController();
const creatorCtrl = new CreatorController();
const businessCtrl = new BusinessController();
const campaignCtrl = new CampaignController();

// Public — no auth. Aggregate counts for the marketing landing page.
router.get('/landing-stats', ctrl.landingStats.bind(ctrl));
// Public — no auth. Whether the landing page should show "Coming Soon" instead of download buttons.
router.get('/coming-soon', ctrl.comingSoon.bind(ctrl));
// Public — no auth. Safe subset of admin platform settings consumed by mobile/web at runtime.
router.get('/platform-flags', ctrl.platformFlags.bind(ctrl));
// Public — no auth. Contact details + social links for the landing page footer.
router.get('/site-info', ctrl.siteInfo.bind(ctrl));

// ── Public creator marketplace (ourkolab.com/creators) ─────────────────────────
// Unauthenticated discovery of creators who opted into a public profile. The
// authenticated brand-facing equivalents live at /api/business/creators.
// `/filter-options` before `/:handle` so the literal segment wins.
router.get('/creators/filter-options', creatorCtrl.getCreatorFilterOptions.bind(creatorCtrl));
router.get('/creators', creatorCtrl.listPublicCreators.bind(creatorCtrl));
router.get('/creators/:handle', creatorCtrl.getPublicCreatorByHandle.bind(creatorCtrl));

// ── Public business marketplace (ourkolab.com/businesses) ─────────────────────
// Unauthenticated discovery of businesses who opted into a public profile. The
// authenticated creator-facing equivalents live at /api/creator/businesses.
// Reuses the creator filter-options endpoint for the shared category taxonomy.
router.get('/businesses', businessCtrl.listBusinesses.bind(businessCtrl));
router.get('/businesses/:id', businessCtrl.getBusinessPublic.bind(businessCtrl));

// ── Public event marketplace (ourkolab.com/events) ────────────────────────────
// `campaignService.list` already defaults to status=ACTIVE and needs no auth;
// this is just the public-namespaced alias. Detail 404s non-public statuses.
// Before `/events/:id` so the literal segment wins (same reasoning as
// `/creators/filter-options` above `/creators/:handle`).
router.get('/events/showcase', campaignCtrl.showcase.bind(campaignCtrl));
router.get('/events', validate(campaignListQuerySchema, 'query'), campaignCtrl.list.bind(campaignCtrl));
router.get('/events/:id', campaignCtrl.getPublicById.bind(campaignCtrl));

export default router;
