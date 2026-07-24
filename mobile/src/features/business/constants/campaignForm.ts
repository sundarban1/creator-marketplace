import type { TFn } from '@/context/LanguageContext';

// Shared between create-campaign.tsx and campaign-detail.tsx so both the
// creation flow and the edit flow render identical chip/tier options.

export const GOAL_OPTIONS = ['Brand Awareness', 'More Customers', 'Sales', 'Followers & Engagement'];

export const CREATOR_TYPES = [
  'Food Creator',
  'Travel Creator',
  'Lifestyle Creator',
  'Fashion Creator',
  'Tech Creator',
  'Fitness Creator',
  'Student Creator',
  'Any Creator',
];

export const DELIVERABLE_TYPES: { key: string; labelKey: string }[] = [
  { key: 'REEL',                  labelKey: 'createEvent.deliverableReel' },
  { key: 'STORY',                 labelKey: 'createEvent.deliverableStory' },
  { key: 'PHOTO_POST',            labelKey: 'createEvent.deliverablePhotoPost' },
  { key: 'CAROUSEL_POST',         labelKey: 'createEvent.deliverableCarouselPost' },
  { key: 'VISIT_STORE',           labelKey: 'createEvent.deliverableVisitStore' },
  { key: 'PRODUCT_REVIEW_VIDEO',  labelKey: 'createEvent.deliverableProductReviewVideo' },
  { key: 'EVENT_COVERAGE_VIDEO',  labelKey: 'createEvent.deliverableEventCoverageVideo' },
  { key: 'MENTION_IN_CAPTION',    labelKey: 'createEvent.deliverableMentionInCaption' },
  { key: 'TAG_BUSINESS',          labelKey: 'createEvent.deliverableTagBusiness' },
  { key: 'GOOGLE_REVIEW',         labelKey: 'createEvent.deliverableGoogleReview' },
];

export const DEFAULT_DELIVERABLES: Record<string, number> = Object.fromEntries(
  DELIVERABLE_TYPES.map((d) => [d.key, 0])
);

export function summarizeDeliverables(deliverables: Record<string, number>, fallback: string[], t: TFn): string {
  const parts = DELIVERABLE_TYPES
    .filter((d) => (deliverables[d.key] ?? 0) > 0)
    .map((d) => `${deliverables[d.key]} ${t(d.labelKey)}`);
  return parts.length > 0 ? parts.join(', ') : fallback.join(', ');
}

export const BUDGET_TIERS = [
  { key: 'SMALL',  min: 5000,  max: 10000 },
  { key: 'MEDIUM', min: 10000, max: 25000 },
  { key: 'LARGE',  min: 25000, max: 50000 },
] as const;
