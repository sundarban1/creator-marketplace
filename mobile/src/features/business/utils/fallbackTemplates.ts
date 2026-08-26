import { translations, getString, type Lang } from '@/i18n';

// Client-side last-resort drafts, used only when the generate request never
// comes back at all (network down, request timeout, backend error unrelated to
// the AI call). The backend's own dummy templates cover OpenAI-specific
// failures and are localized separately — see campaign-ai.dummy.json.

const DEVANAGARI = /[ऀ-ॿ]/;

// Mirrors ROMANIZED_NEPALI_MARKERS in backend/campaign-ai.service.ts. Short
// function words and verb endings that are common in Nepali and vanishingly
// rare in English marketing copy.
const ROMANIZED_NEPALI_MARKERS = [
  'chha', 'chhan', 'cha ', 'chau', 'garna', 'garne', 'garcha', 'garchha', 'gardai',
  'chahan', 'chaiyo', 'chahiyo', 'hamro', 'hamile', 'naya', 'jana ', 'haru', 'lai ',
  'bholi', 'beluka', 'aaune', 'ko lagi', 'parcha', 'parchha',
  'khana', 'pasal', 'ramro', 'sabai', 'tapai',
];

// Which language the fallback draft should be written in. The brand's own words
// win over the app setting — someone who described their event in Nepali should
// not get an English draft just because their UI happens to be in English, and
// this is the only signal available once the AI is out of the picture. Two
// distinct romanized markers rather than one, so an English brief mentioning a
// business called e.g. "Khana House" doesn't flip language.
export function fallbackLang(prompt: string, appLanguage: Lang): Lang {
  if (DEVANAGARI.test(prompt)) return 'ne';
  const lower = ` ${prompt.toLowerCase()} `;
  const hits = new Set(ROMANIZED_NEPALI_MARKERS.filter((m) => lower.includes(m)));
  if (hits.size >= 2) return 'ne';
  return appLanguage;
}

function str(lang: Lang, key: string): string {
  return getString(translations[lang], `aiFallbackTemplates.${key}`);
}

// Numbers and enum values are language-neutral and shared by both languages —
// only the prose is swapped.
export function genericCampaignTemplate(lang: Lang) {
  return {
    title:       str(lang, 'campaignTitle'),
    description: str(lang, 'campaignDescription'),
    suggestedDurationDays: 14,
    creatorsNeeded: 4,
    budgetMin: 6000,
    budgetMax: 15000,
    deliverables: { REEL: 1, STORY: 2 } as Record<string, number>,
    // Hashtags stay Latin in both languages — they're literal social handles.
    hashtags: ['NewBrand', 'MustTry', 'SupportLocal'],
    sampleCaption: str(lang, 'campaignCaption'),
  };
}

export function genericFreeEventTemplate(lang: Lang) {
  return {
    title:       str(lang, 'eventTitle'),
    description: str(lang, 'eventDescription'),
    benefits: ['Free Event Access', 'Free Products / Gifts'],
    capacity: 20,
    exchangeType: ['Just attend & share organically'],
    expectedContent: '',
  };
}
