import { Router } from 'express';
import { PublicController } from './public.controller';
import { CreatorController } from '../creator/creator.controller';
import { BusinessController } from '../business/business.controller';
import { CampaignController } from '../campaign/campaign.controller';
import { validate } from '../../middleware/validate';
import { campaignListQuerySchema } from '../campaign/campaign.schema';
import { publicCreatorSearchQuerySchema } from '../creator/creator.schema';
import { publicSearchLimiter } from '../../middleware/rateLimit';

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
// Public — no auth. Landing page's events/creators/businesses preview rows in one call.
router.get('/showcase', ctrl.showcase.bind(ctrl));

// ── Public creator marketplace (kolab.com.np/creators) ──────────────────────────
// Fully public, like the event detail route below — a signed-out visitor can
// browse a creator's profile; the web app gates the *actions* on it (messaging,
// hiring) behind a signup/login prompt instead of the route itself.
// Literal segments (`/filter-options`, `/search`, `/popular-searches`) before
// `/:handle` so they win.
router.get('/creators/filter-options', creatorCtrl.getCreatorFilterOptions.bind(creatorCtrl));
// Natural-language search from the landing hero ("I need 3 food creators in
// Kathmandu") — parsed server-side into filters; only public profiles returned.
router.get(
  '/creators/search',
  publicSearchLimiter,
  validate(publicCreatorSearchQuerySchema, 'query'),
  creatorCtrl.searchPublicCreators.bind(creatorCtrl),
);
router.get('/creators/popular-searches', creatorCtrl.getPopularSearches.bind(creatorCtrl));
router.get('/creators', creatorCtrl.listPublicCreators.bind(creatorCtrl));
router.get('/creators/:handle', creatorCtrl.getPublicCreatorByHandle.bind(creatorCtrl));

// ── Public business marketplace (kolab.com.np/businesses) ───────────────────────
// Same as creators above: fully public, actions gated in the UI instead.
router.get('/businesses', businessCtrl.listBusinesses.bind(businessCtrl));
router.get('/businesses/:id', businessCtrl.getBusinessPublic.bind(businessCtrl));

// ── Public event marketplace (kolab.com.np/events) ──────────────────────────────
// `campaignService.list` already defaults to status=ACTIVE and needs no auth;
// this is just the public-namespaced alias. Detail 404s non-public statuses.
// (The landing page's events preview used to have its own `/events/showcase`
// route here — folded into `/showcase` above, alongside creators/businesses.)
router.get('/events', validate(campaignListQuerySchema, 'query'), campaignCtrl.list.bind(campaignCtrl));
router.get('/events/:id', campaignCtrl.getPublicById.bind(campaignCtrl));

export default router;
