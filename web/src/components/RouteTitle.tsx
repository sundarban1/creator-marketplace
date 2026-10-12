import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { SITE_NAME } from '../lib/seo/config';

// Browser-tab titles for every route that doesn't render <SEO> — the admin
// dashboard, the authenticated creator/business app, and the auth screens.
// Only public marketing pages render <SEO>, and it sets document.title
// imperatively, so without this a client-side navigation into the app kept
// whatever title the previous page left behind (e.g. "Page Not Found" after
// passing a 404, or a landing-page title on the business dashboard).
//
// Public SEO routes are intentionally absent: an unmatched path is a no-op,
// so <SEO> stays the single owner of those titles. First match wins — keep
// literal segments (`events/create`) above their `:param` siblings.
const ROUTE_TITLES: [pattern: string, title: string][] = [
  // ── Auth / onboarding ────────────────────────────────────────────────────
  ['/login',                 'Log In'],
  ['/signup',                'Sign Up'],
  ['/verify',                'Verify Your Account'],
  ['/forgot-password',       'Reset Password'],
  ['/onboarding',            'Set Up Your Profile'],
  ['/auth/google/callback',  'Signing In…'],
  ['/oauth/callback/:platform', 'Connecting Account…'],
  ['/payment-result',        'Payment Status'],

  // ── Creator app ──────────────────────────────────────────────────────────
  ['/creator',                     'Dashboard'],
  ['/creator/events',              'Events'],
  ['/creator/events/:id',          'Event Details'],
  ['/creator/creators',            'Discover Creators'],
  ['/creator/creators/:handle',    'Creator Profile'],
  ['/creator/businesses',          'Discover Businesses'],
  ['/creator/businesses/:id',      'Business Profile'],
  ['/creator/applications',        'My Applications'],
  ['/creator/applications/:id',    'Application Details'],
  ['/creator/work',                'My Work'],
  ['/creator/work/:id',            'Work Details'],
  ['/creator/meetups',             'Creator Meetups'],
  ['/creator/meetups/:meetupId',   'Meetup Registration'],
  ['/creator/messages',            'Messages'],
  ['/creator/messages/:id',        'Messages'],
  ['/creator/notifications',       'Notifications'],
  ['/creator/wallet',              'Wallet'],
  ['/creator/profile',             'My Profile'],
  ['/creator/settings',            'Settings'],
  ['/creator/verification',        'Verification'],
  ['/creator/referrals',           'Referrals'],
  ['/creator/support',             'Help & Support'],
  ['/creator/about',               'About Kolab'],

  // ── Business app ─────────────────────────────────────────────────────────
  ['/business',                    'Dashboard'],
  ['/business/creators',           'Find Creators'],
  ['/business/creators/:id',       'Creator Profile'],
  ['/business/events',             'My Events'],
  ['/business/events/create',      'Create Event'],
  ['/business/events/:id',         'Event Details'],
  ['/business/events/:id/edit',    'Edit Event'],
  ['/business/promotions',         'Promotions'],
  ['/business/promotions/create',  'Create Promotion'],
  ['/business/promotions/:id/edit','Edit Promotion'],
  ['/business/applications',       'Applications'],
  ['/business/messages',           'Messages'],
  ['/business/messages/:id',       'Messages'],
  ['/business/notifications',      'Notifications'],
  ['/business/deliverables',       'Deliverables'],
  ['/business/payments',           'Payments'],
  ['/business/profile',            'Business Profile'],
  ['/business/settings',           'Settings'],
  ['/business/referrals',          'Referrals'],
  ['/business/verification',       'Verification'],
  ['/business/support',            'Help & Support'],
  ['/business/about',              'About Kolab'],

  // ── Admin dashboard ──────────────────────────────────────────────────────
  ['/admin/login',                      'Admin Login'],
  ['/admin/dashboard',                  'Admin Dashboard'],
  ['/admin/users',                      'Users'],
  ['/admin/creators',                   'Creators'],
  ['/admin/businesses',                 'Businesses'],
  ['/admin/campaigns',                  'Events'],
  ['/admin/event-reviews',              'Event Reviews'],
  ['/admin/campaigns/:id',              'Event Details'],
  ['/admin/creator-meetups',            'Creator Meetups'],
  ['/admin/creator-meetups/:meetupId',  'Meetup Details'],
  ['/admin/events',                     'Community Events'],
  ['/admin/events/new',                 'New Community Event'],
  ['/admin/events/:id/edit',            'Edit Community Event'],
  ['/admin/analytics/:userId',          'User Analytics'],
  ['/admin/categories',                 'Categories'],
  ['/admin/categories/new',             'New Category'],
  ['/admin/categories/edit/:id',        'Edit Category'],
  ['/admin/platforms',                  'Platforms'],
  ['/admin/platforms/new',              'New Platform'],
  ['/admin/platforms/edit/:id',         'Edit Platform'],
  ['/admin/success-stories',            'Success Stories'],
  ['/admin/success-stories/new',        'New Success Story'],
  ['/admin/success-stories/edit/:id',   'Edit Success Story'],
  ['/admin/partners',                   'Partners'],
  ['/admin/payments',                   'Payments'],
  ['/admin/referrals',                  'Referrals'],
  ['/admin/reports',                    'Reports'],
  ['/admin/help-center',                'Help Center'],
  ['/admin/faqs',                       'FAQs'],
  ['/admin/support-inbox',              'Support Inbox'],
  ['/admin/get-in-touch',               'Get in Touch'],
  ['/admin/legal',                      'Legal Pages'],
  ['/admin/contracts',                  'Contract Template'],
  ['/admin/conversations',              'Conversations'],
  ['/admin/notifications',              'Notifications'],
  ['/admin/settings',                   'Settings'],
  ['/admin/contact-info',               'Company'],
  ['/admin/rate-limits',                'Rate Limits'],
  ['/admin/audit-logs',                 'Audit Logs'],
  ['/admin/verification',               'Verification'],
  ['/admin/activity-logs',              'Activity Logs'],
];

/** Admin tabs get an "Admin" marker so they're distinguishable from the
 *  marketplace app when both are open. */
function formatTitle(pathname: string, title: string) {
  const suffix = pathname.startsWith('/admin') && !title.startsWith('Admin') ? `Admin | ${SITE_NAME}` : SITE_NAME;
  return `${title} | ${suffix}`;
}

export function RouteTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const hit = ROUTE_TITLES.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname));
    if (hit) document.title = formatTitle(pathname, hit[1]);
  }, [pathname]);

  return null;
}
