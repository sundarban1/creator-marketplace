import { Router } from 'express';
import { CreatorController } from './creator.controller';

const router = Router();
const ctrl = new CreatorController();

// Public — TikTok redirects the user's browser here directly after they approve
// access, with no Authorization header. Identity is carried instead via the signed
// `state` JWT that was minted when the authorize URL was generated.
//
// On web this response lands inside a popup opened by window.open() from the
// main app tab (see oauthPopup.ts); the popup posts its result back via
// window.opener.postMessage and self-closes. Helmet's default
// Cross-Origin-Opener-Policy: same-origin on every other route would sever
// window.opener the instant this cross-origin response loads — even though we
// then 302 onward to our own frontend — leaving the popup stuck showing "You
// can close this window" forever and the opener never finding out the connect
// succeeded. Relaxing COOP on just this route keeps the opener link alive
// through the redirect.
router.get('/callback', (_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
}, ctrl.tiktokCallback.bind(ctrl));

export default router;
