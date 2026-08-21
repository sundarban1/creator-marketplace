import type { TFn } from '@/context/LanguageContext';

// The "what are you offering" / "what do you want back" options are stored,
// sent to the backend, fed to the AI as enum values, and compared against by
// exact string — so the English text IS the value and must never change. These
// maps translate that value into a DISPLAY label only, at the point of render.
//
// Keys mirror OFFERING_OPTIONS / EXCHANGE_OPTIONS in create-campaign.tsx and
// BENEFIT_OPTIONS / EXCHANGE_OPTIONS in backend/campaign-ai.schema.ts.
const OFFERING_LABEL_KEYS: Record<string, string> = {
  'Free Event Access':        'eventOptions.offerFreeEventAccess',
  'Food & Drinks':            'eventOptions.offerFoodDrinks',
  'Free Products / Gifts':    'eventOptions.offerFreeProducts',
  'Free Service / Experience':'eventOptions.offerFreeService',
  'Product Launch / Preview': 'eventOptions.offerProductLaunch',
  'Other':                    'eventOptions.offerOther',
};

const EXCHANGE_LABEL_KEYS: Record<string, string> = {
  'Social media post':                'eventOptions.exchangeSocialPost',
  'Reel / short video':               'eventOptions.exchangeReel',
  'Video content':                    'eventOptions.exchangeVideo',
  'Photos':                           'eventOptions.exchangePhotos',
  'Story mention':                    'eventOptions.exchangeStory',
  'Honest review':                    'eventOptions.exchangeReview',
  'Event promotion (pre-event post)': 'eventOptions.exchangePreEvent',
  'Mention / tag the business':       'eventOptions.exchangeMention',
  'Just attend & share organically':  'eventOptions.exchangeOrganic',
  'Other':                            'eventOptions.exchangeOther',
};

// 'Other' exists in both maps with a different translation, so the two are kept
// separate rather than merged — callers say which vocabulary they're rendering.
type Vocabulary = 'offering' | 'exchange';

// Falls back to the raw stored string when there's no mapping. That's the
// common case for campaigns created before this vocabulary existed, whose
// `benefits` are arbitrary free text — showing them as-is is right, and it also
// means an option added to one list but not the other still renders.
export function eventOptionLabel(value: string, vocabulary: Vocabulary, t: TFn): string {
  const key = (vocabulary === 'offering' ? OFFERING_LABEL_KEYS : EXCHANGE_LABEL_KEYS)[value];
  if (!key) return value;
  const label = t(key);
  // t() returns the key itself when a translation is missing — never show that.
  return label === key ? value : label;
}

export function eventOptionLabels(values: string[], vocabulary: Vocabulary, t: TFn): string[] {
  return values.map((v) => eventOptionLabel(v, vocabulary, t));
}
