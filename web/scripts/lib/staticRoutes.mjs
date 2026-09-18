// Single source of truth for the static marketing/SEO routes, shared by
// scripts/prerender.mjs (needs a route list to snapshot) and
// scripts/generate-sitemap.mjs (needs the same list to publish) — previously
// each one hand-maintained its own copy alongside public/sitemap.xml's own
// hand-maintained list, three places that had to be kept in sync by hand.
// This is now the one place that changes when a public route is added.
//
// Admin dashboard routes (/dashboard, /login, /users, ...) are intentionally
// excluded — they're behind auth and disallowed in robots.txt. `/events`,
// `/creators`, `/businesses` (the bare listing pages) are excluded too, on
// purpose — see AppRoutes.tsx's RequireAuth wrapping them: signed-out
// visitors (including crawlers) can't reach them, so neither a static
// snapshot nor a sitemap entry would do anything but waste crawl budget.
// Keep this in sync with the public <Route> entries in src/App.tsx.
export const STATIC_ROUTES = [
  '/',
  '/creator-marketplace-nepal',
  '/content-creators',
  '/brands',
  '/influencers',
  '/find-campaigns',
  '/ugc-creators-nepal',
  '/influencer-marketing-nepal',
  '/brand-collaboration-nepal',
  '/tiktok-creators',
  '/instagram-creators',
  '/youtube-creators',
  '/facebook-creators',
  '/paid-collaborations-nepal',
  '/industries-nepal',
  '/cities-nepal',
  '/food-influencers-nepal',
  '/travel-influencers-nepal',
  '/fashion-influencers-nepal',
  '/beauty-influencers-nepal',
  '/fitness-influencers-nepal',
  '/tech-influencers-nepal',
  '/finance-influencers-nepal',
  '/education-influencers-nepal',
  '/gaming-influencers-nepal',
  '/automobile-influencers-nepal',
  '/hotel-influencers-nepal',
  '/restaurant-influencers-nepal',
  '/healthcare-influencers-nepal',
  '/real-estate-influencers-nepal',
  '/influencers-kathmandu',
  '/influencers-pokhara',
  '/influencers-lalitpur',
  '/influencers-bhaktapur',
  '/influencers-chitwan',
  '/influencers-butwal',
  '/influencers-biratnagar',
  '/influencers-dharan',
  '/support',
  '/privacy',
  '/terms',
];
