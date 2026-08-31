import OpenAI from 'openai';
import { CategoryScope } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';
import { CategoryRepository } from '../category/category.repository';
import { PlatformRepository } from '../platform/platform.repository';
import { BusinessRepository } from '../business/business.repository';
import {
  aiCampaignDraftSchema, aiEventDraftSchema, BENEFIT_OPTIONS, BENEFIT_DESCRIPTIONS,
  EXCHANGE_OPTIONS, EXCHANGE_DESCRIPTIONS, NEEDS_INPUT_FIELDS, EVENT_NEEDS_INPUT_FIELDS,
  type AiCampaignDraft, type AiEventDraft, type AiRequirementDraft, type SuggestDescriptionInput,
} from './campaign-ai.schema';
import { searchStockPhoto } from '../../utils/imageSearch';
import dummyData from './campaign-ai.dummy.json';

// Thrown when the model determines the brand's prompt doesn't express any
// intent to promote/host something (e.g. "hello", "what's the weather") —
// distinct from an infra failure, so callers must NOT fall back to a dummy
// draft for this case, only re-surface it to the brand. The `code` lets the
// mobile client distinguish this from any other 422 (e.g. plain request
// validation) without string-matching the message.
class CampaignIntentError extends AppError {
  constructor(message: string) {
    super(message, 422, true, { code: 'NO_CAMPAIGN_INTENT' });
  }
}

// Each template carries an optional `ne` overlay holding Nepali versions of
// just its free-text fields — enums, counts and keywords are language-neutral
// and stay shared. Without it a brand who described their event in Nepali and
// happened to hit this fallback (no API key, billing failure, timeout) got a
// wholly English draft, which reads as the app ignoring their language rather
// than as a degraded path.
type DummyCampaignTemplate = AiCampaignDraft & { keywords: string[]; ne?: Partial<AiCampaignDraft> };
type DummyEventTemplate = AiEventDraft & { keywords: string[]; ne?: Partial<AiEventDraft> };
type DummyDescriptionTemplate = { keywords: string[]; text: string; ne?: { text: string } };

const dummy = dummyData as unknown as {
  campaignTemplates: DummyCampaignTemplate[];
  eventTemplates: DummyEventTemplate[];
  descriptionTemplates: DummyDescriptionTemplate[];
};

// Picks the first template whose keywords appear in `haystack`; the entry with an
// empty `keywords` array is the generic catch-all and always sorts last.
function matchByKeywords<T extends { keywords: string[] }>(templates: T[], haystack: string): T {
  const lower = haystack.toLowerCase();
  const matched = templates.find((t) => t.keywords.length > 0 && t.keywords.some((k) => lower.includes(k)));
  const fallback = templates.find((t) => t.keywords.length === 0);
  return matched ?? fallback ?? templates[0];
}

// Romanized-Nepali markers — short function words and verb endings that are
// common in Nepali and vanishingly rare in English marketing copy. Only ever
// consulted for the fallback templates, where the cost of guessing wrong is one
// template in the wrong language on an already-degraded path; the real AI route
// decides language from the prompt itself and never uses this.
const ROMANIZED_NEPALI_MARKERS = [
  'chha', 'chhan', 'cha ', 'chau', 'garna', 'garne', 'garcha', 'garchha', 'gardai',
  'chahan', 'chaiyo', 'chahiyo', 'hamro', 'hamile', 'naya', 'jana ', 'haru', 'lai ',
  'bholi', 'beluka', 'aaune', 'ko lagi', 'parcha', 'parchha',
  'khana', 'pasal', 'ramro', 'sabai', 'tapai',
];

// Whether the FALLBACK draft should be written in Nepali. Devanagari in the
// prompt is conclusive; otherwise two or more distinct romanized markers, or an
// app already set to Nepali, is taken as intent. Two markers rather than one so
// an English brief mentioning e.g. a "Khana" brand name doesn't flip language.
function wantsNepaliFallback(prompt: string, language: string): boolean {
  if (/[\u0900-\u097F]/.test(prompt)) return true;
  const lower = ` ${prompt.toLowerCase()} `;
  const hits = new Set(ROMANIZED_NEPALI_MARKERS.filter((m) => lower.includes(m)));
  if (hits.size >= 2) return true;
  return language === 'ne';
}

// Used when the OpenAI API is unavailable (no key, auth/billing failure, timeout,
// or a malformed response) so campaign creation still works end-to-end for demos/dev.
function pickDummyDraft(prompt: string, language: string): AiCampaignDraft {
  const { keywords, ne, ...draft } = matchByKeywords(dummy.campaignTemplates, prompt);
  const localized = wantsNepaliFallback(prompt, language) && ne ? { ...draft, ...ne } : draft;
  return aiCampaignDraftSchema.parse(localized);
}

function pickDummyEventDraft(prompt: string, language: string): AiEventDraft {
  const { keywords, ne, ...draft } = matchByKeywords(dummy.eventTemplates, prompt);
  const localized = wantsNepaliFallback(prompt, language) && ne ? { ...draft, ...ne } : draft;
  return aiEventDraftSchema.parse(localized);
}

function pickDummyDescription(input: SuggestDescriptionInput, language: string): string {
  const haystack = [input.title, input.category, input.platform, input.deliverables].filter(Boolean).join(' ');
  const matched = matchByKeywords(dummy.descriptionTemplates, haystack);
  return wantsNepaliFallback(haystack, language) && matched.ne ? matched.ne.text : matched.text;
}

const MODEL = 'gpt-5-mini';
// The whole server-side budget has to finish INSIDE the mobile client's own
// abort deadline for this route (80s, see mobile/src/services/campaign.ts) —
// otherwise a transient OpenAI hiccup makes the SDK retry past the phone's
// deadline, the client gives up first, and the brand sees the mobile generic
// template instead of the dummy draft this service would have returned.
// The SDK applies `timeout` PER ATTEMPT, so this is a per-attempt figure:
// 35s x 2 attempts + ~0.5s backoff lands at ~71s worst case, under 80s.
// Sized for DRAFT_REASONING_EFFORT below rather than for 'minimal' — a draft
// that arrives a few seconds later but names the right date and venue beats a
// fast one the brand has to correct field by field.
const REQUEST_TIMEOUT_MS = 35_000;
const MAX_RETRIES = 1;

// 'minimal' was leaving the model no room to actually reason over a brief that
// carries several interacting constraints at once — resolving spoken timing
// against today's date, splitting a single stated budget across roles, picking
// benefits/exchange options from fixed enums — and it showed up as drafts that
// were fluent but wrong on exactly those fields. 'low' is the cheapest tier
// that reliably handles them; the extra latency is covered by the budget above.
const DRAFT_REASONING_EFFORT = 'low' as const;

// The description rewrite is a single short paragraph with no constraints to
// reason over, and it runs against the mobile client's DEFAULT 30s deadline
// (campaignService.suggestDescription passes no override) — so it keeps the
// old minimal/fast settings and a budget that fits inside 30s.
const DESCRIPTION_TIMEOUT_MS = 12_000;

// The straggler-localization repair (see localizeStragglers) runs AFTER the
// draft call has already spent from the same client-side deadline, so it gets a
// deliberately small slice and no retries — worst case 35s draft + 8s repair is
// still inside the phone's 80s budget. It never blocks a result: on timeout the
// original draft is returned as-is.
const REPAIR_TIMEOUT_MS = 8_000;

// The free-text fields of an EVENT draft — every field the brand actually
// reads as prose. Kept as an explicit per-draft-type list because the language
// rule below is shared by both prompts, and a single campaign-shaped list was
// naming a field that doesn't exist on an event draft (sampleCaption) while
// never mentioning three that do. Those three were left unconstrained, so a
// brand who spoke Nepali got a Nepali title and description alongside an
// English venue, expectedContent and completionReason.
const EVENT_LOCALIZED_FIELDS = ['title', 'description', 'expectedContent', 'venue', 'location'];

// The same event fields as real object keys, for the post-generation
// consistency sweep (see localizeStragglers). Kept next to the prose list
// above so the two can't drift apart.
const EVENT_LOCALIZED_KEYS = ['title', 'description', 'expectedContent', 'venue', 'location'] as const;

// Campaign equivalent.
const CAMPAIGN_LOCALIZED_KEYS = [
  'title', 'description', 'sampleCaption', 'location',
] as const;

const DEVANAGARI = /[\u0900-\u097F]/;

function hasDevanagari(value: unknown): boolean {
  if (typeof value === 'string') return DEVANAGARI.test(value);
  if (Array.isArray(value)) return value.some((v) => typeof v === 'string' && DEVANAGARI.test(v));
  return false;
}

function isPopulatedText(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((v) => typeof v === 'string' && v.trim().length > 0);
  return false;
}

// Same idea for a paid-campaign draft.
const CAMPAIGN_LOCALIZED_FIELDS = [
  'title', 'description', 'sampleCaption', 'location',
];

// Enum-valued fields are matched against fixed taxonomy/option lists after the
// model responds and are rendered as chips keyed on the exact English string —
// translating one silently drops it on the floor.
const NEVER_TRANSLATE = 'category, secondaryCategories, platform, goal, benefits, exchangeType, needsInput, paymentType, imageQuery';

function buildLanguageInstruction(language: string, localizedFields: string[], inputSource?: 'voice' | 'text'): string {
  const fieldList = localizedFields.join(', ');
  // Spelled out once and shared by both branches so the two can't drift — this
  // is the part that decides whether the brand gets a usable Nepali draft.
  const nepaliRules = `  - Write EVERY ONE of these fields in Nepali, not just the first few: ${fieldList}. Leave none of them in English. A field being short (like title, venue or location) does NOT exempt it — "Thamel, Kathmandu" must be written "ठमेल, काठमाडौं", and a Nepali brief gets a Nepali TITLE, never an English one.
  - This holds just as strongly when the brand's own words arrived in Latin letters (romanized Nepali) as when they arrived in Devanagari. The script the prompt happens to be typed in is not the language it is in — do not let Latin input pull the output into English. Worked example: the prompt "Hamro naya cafe ko opening ma 10 jana creator lai bolauna chahanchhau" must produce a title like "नयाँ क्याफे उद्घाटन — क्रिएटर भेटघाट", NOT "New Cafe Opening — Creator Meetup".
  - Use proper Devanagari script throughout. Never leave romanized Nepali in Latin letters, and never mix scripts inside a single word (write "भोलि", never "बHolि").
  - Proper nouns that are genuinely written in Latin by their owner — the business's own name, social handles, platform names like Instagram — may stay in Latin inside a Nepali sentence. Everything else in these fields is Devanagari, including the Nepali words around them.
  - Write simple, everyday conversational Nepali that an ordinary person in Nepal can easily read — the way Nepali is actually written in casual social-media/marketing posts. Avoid stiff, overly formal, literary, or heavily Sanskritized words.`;

  // Voice input: the prompt is a Whisper transcription, which auto-detects and
  // transcribes whatever language the brand actually spoke — that already-detected
  // language is the only signal that matters here. The app's UI language setting
  // must NOT override it (a Nepali-UI brand who spoke English should get an
  // English draft, not a Nepali one, and vice versa).
  if (inputSource === 'voice') {
    return `LANGUAGE: The prompt below is a transcription of the brand's own voice recording — it may be a mix of English and Nepali, but write based on whichever language the transcription is actually in.
- Treat the transcription as NEPALI if it is in Devanagari script, OR if it is romanized Nepali (Nepali words spelled out with Latin letters, e.g. "pasal", "khana ko lagi", "creator haru chaiyeko", "bholi beluka", "chahanchhau"). Romanized Nepali is Nepali — the brand spoke Nepali and the Latin letters are only how the transcription wrote it down. A few stray English words mixed into otherwise-Nepali speech are normal and do not make it English.
- If the transcription is Nepali by that test:
${nepaliRules}
- Otherwise (the transcription is genuinely English) write those same fields in English.
- Regardless of language, ${NEVER_TRANSLATE} must always use the exact values from the lists provided — never translate or alter them.
- hashtags must always use Latin letters/numbers only (no Devanagari) since they are literal social-media hashtags.`;
  }

  return `LANGUAGE: The brand's app is currently set to "${language === 'ne' ? 'Nepali' : 'English'}".
- Treat this as NEPALI if the app language is Nepali, OR if the brand's prompt below is written in Devanagari script, OR if it is romanized Nepali (Nepali words spelled out with Latin letters, e.g. "pasal", "khana ko lagi", "creator haru chaiyeko"). Romanized Nepali is Nepali.
- If Nepali by that test:
${nepaliRules}
- Otherwise write those same fields in English.
- Regardless of language, ${NEVER_TRANSLATE} must always use the exact values from the lists provided — never translate or alter them.
- hashtags must always use Latin letters/numbers only (no Devanagari) since they are literal social-media hashtags.`;
}

// Validates intent, not completeness (Kolab V1 audio-input requirement) — a
// brand only needs to express SOME intent to promote/host something; missing
// specifics (budget, platform, creator type...) are filled in from the
// business profile and sensible defaults instead of being grounds to reject.
function buildIntentInstruction(): string {
  return `INTENT CHECK (do this first): Decide whether the brand's prompt actually expresses a request to promote/advertise their business or host a creator event — even a very short or vague one (e.g. "need promotion", "want more customers", "launch our new menu") counts as valid intent. It does NOT need to mention budget, platform, creator type, or any other detail — infer those yourself from the business profile above and sensible defaults.

Reject ONLY prompts with no promotional/event intent at all — greetings ("hello", "how are you"), small talk, unrelated questions ("what's the weather"), test/filler speech ("testing", "one two three", "..."), or a transcription that's essentially meaningless.

Add these two extra top-level keys to your JSON response, in addition to all the fields below:
- campaignIntentDetected: boolean — false ONLY for the reject cases above; true otherwise, including short/vague-but-real requests.
- clarifyingMessage: string — if campaignIntentDetected is false, a short friendly message (in the brand's language per the LANGUAGE rule below) asking what they'd like to promote; empty string "" otherwise.

If campaignIntentDetected is false, the other fields below are discarded — fill them with any placeholder, it doesn't matter.`;
}

function buildBusinessContextBlock(business: { businessName: string | null; categories: string[]; location: string | null } | null): string {
  const lines = [
    business?.businessName ? `Business name: ${business.businessName}` : null,
    business && business.categories.length > 0 ? `Business industry/categories: ${business.categories.join(', ')}` : null,
    business?.location ? `Business location: ${business.location}` : null,
  ].filter((l): l is string => l !== null);
  if (lines.length === 0) return '';
  return `\nBUSINESS PROFILE (use this to fill gaps the brand's prompt doesn't cover — never ask the brand to repeat something already listed here):\n${lines.join('\n')}\n`;
}

function buildSystemPrompt(categoryNames: string[], platformNames: string[], language: string, businessContext: string, inputSource?: 'voice' | 'text'): string {
  return `You are a campaign-brief generator for a creator-marketplace app in Nepal, connecting businesses with content creators for paid opportunities.

Given a brand's short description of what they want to promote, generate a complete campaign brief as a single JSON object — no prose, no markdown code fences, just the raw JSON object.

Existing categories in the app (prefer one of these for "category" if it fits; otherwise suggest the closest real-world category name):
${categoryNames.map((c) => `- ${c}`).join('\n')}

Known platforms: ${platformNames.join(', ')} (prefer one of these for "platform").
${businessContext}
Respond with a JSON object with EXACTLY these keys:
- title: string, a punchy campaign title
- description: string, 2-4 sentences describing what creators should do
- category: string, best-fit category
- secondaryCategories: string[] (0-3), other categories that could also fit
- platform: string, the single best platform for this campaign
- goal: string, EXACTLY ONE of: "Brand Awareness", "More Customers", "Sales", "Followers & Engagement" — whichever best matches the campaign's main aim
- suggestedDurationDays: number, how many days the campaign should run (typically 7-30)
- creatorsNeeded: number, how many creators to recruit (typically 1-10)
- budgetMin: number, suggested minimum budget in NPR (Nepali Rupees) for the whole campaign
- budgetMax: number, suggested maximum budget in NPR
- paymentType: string, e.g. "Fixed Fee"
- deliverables: object with EXACTLY these integer keys, each 0-10: "REEL", "STORY", "PHOTO_POST", "VISIT_STORE", "PRODUCT_REVIEW_VIDEO", "EVENT_COVERAGE_VIDEO", "MENTION_IN_CAPTION", "TAG_BUSINESS", "GOOGLE_REVIEW". Each number is how many pieces of that content type EACH INDIVIDUAL creator should produce (not multiplied by creatorsNeeded, not a campaign-wide total) — keep these small and realistic, typically 1-3 for the 2-3 content types that best fit the brief, 0 for everything else. At least one key must be > 0.
- hashtags: string[] (3-8 relevant hashtags, no # needed but allowed)
- sampleCaption: string, a ready-to-use example caption a creator could post
- location: string or null, a city/area if inferable, otherwise null
- imageQuery: string, 2-5 words in ENGLISH naming the single best stock photo for this campaign, describing the photo's SUBJECT only — e.g. "momo dumplings on table", "holi festival colour powder", "himalaya trekking trail", "barista pouring latte", "jewellery display case". Concrete and photographable: no brand names, no person's name, no business or street names (a well-known natural landmark like "himalaya" is fine when it genuinely IS the subject), no words like "photo"/"image"/"banner"/"poster", no adjectives about mood. Base it on what the campaign is actually ABOUT, not on the category name — a Holi party at a cafe is "holi festival colour powder", not "cafe interior". ALWAYS English even when every other field is Nepali, because it is used verbatim as a stock-photo search query.
- needsInput: string[] (0-2), keys from this exact list you were NOT confident about and think the brand should double check: ["location","budgetMin","budgetMax","creatorsNeeded","deadline","platform","category"]. Only include a key here if you genuinely had to guess — always still fill in your best-guess value for it regardless.

${buildLanguageInstruction(language, CAMPAIGN_LOCALIZED_FIELDS, inputSource)}

${buildIntentInstruction()}

Whenever campaignIntentDetected is true, fill in every field above with your best sensible guess using the business profile and sensible defaults, even for a very short or vague prompt — never leave a field empty. Respond with ONLY the JSON object.`;
}

// Today's date as the brand experiences it, so relative timing in a prompt
// ("this Saturday") resolves against Kathmandu's calendar day and not the
// server's UTC one — Nepal is UTC+05:45, so for the whole Nepali evening the
// two disagree, and "tomorrow" would land a day early.
function todayInNepal(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// The model has no clock, so without an explicit anchor it cannot resolve the
// relative dates brands overwhelmingly speak in ("this Saturday", "next week",
// "on the 14th"). Before this, every AI draft — voice or typed — silently
// landed on "seven days from now" no matter what the brand actually said,
// which is the most visible way a generated event comes out wrong.
function buildEventDateInstruction(today: string): string {
  return `- eventDate: string "YYYY-MM-DD" or null — TODAY'S DATE IS ${today}. Resolve whatever the brand said about timing against that date: "this Saturday"/"next Friday"/"in two weeks"/"on the 14th"/"Dashain week" all become a concrete calendar date. A bare month-day with no year that has already passed this year means NEXT year. Return null ONLY if the brand gave no timing signal at all — never invent a date, and never default to "a week from now".
- eventTime: string "HH:MM" in 24-hour form, or null — the start time if the brand said one ("5pm" -> "17:00", "साँझ ६ बजे" -> "18:00"). Null if they didn't say. Do not infer a time from the event type alone.`;
}

function buildEventSystemPrompt(categoryNames: string[], platformNames: string[], language: string, businessContext: string, today: string, inputSource?: 'voice' | 'text'): string {
  return `You are an event-brief generator for a creator-marketplace app in Nepal, connecting brands with content creators for FREE (non-monetary) in-person events. Creators attend in exchange for perks — not cash — and may be asked to post content about the experience, though some events are simply organic/no-content-ask invites where attending and enjoying the experience is enough.

Given a brand's short description of the event they want to host, generate a complete event brief as a single JSON object — no prose, no markdown code fences, just the raw JSON object.

Existing categories in the app (prefer one of these for "category" if it fits; otherwise suggest the closest real-world category name):
${categoryNames.map((c) => `- ${c}`).join('\n')}

Known platforms: ${platformNames.join(', ')} (prefer one of these for "platform").
${businessContext}
Respond with a JSON object with EXACTLY these keys:
- title: string, a punchy event title
- description: string, 2-4 sentences describing the event and what creators will experience
- category: string, best-fit category
- secondaryCategories: string[] (0-3), other categories that could also fit
- platform: string, the single best platform for creators to post about this event
- benefits: string[] (1-4 items) — what the brand is offering creators in return for attending, EXACTLY from this list only:
${BENEFIT_OPTIONS.map((b) => `  - "${b}": ${BENEFIT_DESCRIPTIONS[b]}`).join('\n')}
- exchangeType: string[] (1-6 items) — what the business wants attendees/creators to do in return for the free experience, EXACTLY from this list only:
${EXCHANGE_OPTIONS.map((e) => `  - "${e}": ${EXCHANGE_DESCRIPTIONS[e]}`).join('\n')}
- expectedContent: string (0-300 chars) — a short free-text description of the specific content ask, e.g. "1 Instagram Reel + 2 Stories within 3 days of the event". Populate this ONLY when exchangeType includes anything other than "Just attend & share organically". Leave it as an empty string "" when "Just attend & share organically" is the only or dominant selection.
- capacity: number, how many creators the venue can realistically host (typically 5-50)
- location: string or null, the broader city/area if inferable, otherwise null
- venue: string or null, the SPECIFIC place the brand named ("our Durbarmarg outlet", "Hotel Yak & Yeti", "the Jhamsikhel branch"), otherwise null. This is narrower than location — if they only named a city, put it in location and leave venue null.
${buildEventDateInstruction(today)}
- imageQuery: string, 2-5 words in ENGLISH naming the single best stock photo for this event, describing the photo's SUBJECT only — e.g. "momo dumplings on table", "holi festival colour powder", "himalaya trekking trail", "barista pouring latte", "jewellery display case". Concrete and photographable: no brand names, no person's name, no business or street names (a well-known natural landmark like "himalaya" is fine when it genuinely IS the subject), no words like "photo"/"image"/"banner"/"poster", no adjectives about mood. Base it on what the event is actually ABOUT, not on the category name — a Holi party at a cafe is "holi festival colour powder", not "cafe interior". ALWAYS English even when every other field is Nepali, because it is used verbatim as a stock-photo search query.
- needsInput: string[] (0-2), keys from this exact list you were NOT confident about and think the brand should double check: ["location","capacity","platform","category","eventDate"]. Only include a key here if you genuinely had to guess — always still fill in your best-guess value for it regardless. Include "eventDate" whenever you returned eventDate as null, so the brand is prompted to pick a date.

${buildLanguageInstruction(language, EVENT_LOCALIZED_FIELDS, inputSource)}

${buildIntentInstruction()}

Whenever campaignIntentDetected is true, fill in every field above with your best sensible guess using the business profile and sensible defaults, even for a very short or vague prompt — never leave a field empty. Respond with ONLY the JSON object.`;
}

function buildDescriptionSystemPrompt(language: string): string {
  return `You are a campaign-brief copywriter for a creator-marketplace app in Nepal, connecting brands with content creators for promotional campaigns.

Given a few details about a brand's event/campaign, write a single description of 2-4 sentences describing what the campaign is about and what creators should do. Respond with ONLY the description text — no labels, no quotes, no markdown, no preamble.

${buildLanguageInstruction(language, ['the description text'])}
(For this task only the description text itself is being written, so the language rule above applies to that text.)`;
}

export class CampaignAiService {
  private categoryRepo = new CategoryRepository();
  private platformRepo = new PlatformRepository();
  private businessRepo = new BusinessRepository();

  async suggestDescription(input: SuggestDescriptionInput, language: string = 'en'): Promise<string> {
    try {
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

      const parts: string[] = [];
      if (input.title) parts.push(`Title: ${input.title}`);
      if (input.category) parts.push(`Category: ${input.category}`);
      if (input.platform) parts.push(`Platform: ${input.platform}`);
      if (input.deliverables) parts.push(`Deliverables: ${input.deliverables}`);

      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: DESCRIPTION_TIMEOUT_MS, maxRetries: MAX_RETRIES });
      const response = await client.chat.completions.create({
        model: MODEL,
        max_completion_tokens: 300,
        reasoning_effort: 'minimal',
        verbosity: 'low',
        messages: [
          { role: 'system', content: buildDescriptionSystemPrompt(language) },
          { role: 'user', content: parts.join('\n') },
        ],
      });
      const text = response.choices[0]?.message?.content ?? '';
      const description = text.trim().replace(/^["']|["']$/g, '');
      if (description.length < 10) throw new Error('AI description was too short');
      return description;
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'OpenAI unavailable — falling back to dummy description');
      return pickDummyDescription(input, language);
    }
  }

  async generateDraft(prompt: string, language: string = 'en', userId?: string, inputSource?: 'voice' | 'text'): Promise<AiCampaignDraft & { aiSuggestedCategories: string[]; platforms: string[]; aiFallback: boolean; featureImageUrl: string | null; featureImageCredit: { name: string; profileUrl: string } | null; requirements: (AiRequirementDraft & { categoryId: string })[] }> {
    const [realCategories, realPlatforms, businessContext] = await Promise.all([
      this.categoryRepo.findManyPublic(CategoryScope.BUSINESS),
      this.platformRepo.findManyPublic(),
      this.loadBusinessContext(userId),
    ]);
    const categoryNames = realCategories.map((c) => c.name);
    const platformNames = realPlatforms.map((p) => p.name);

    let draft: AiCampaignDraft;
    // Surfaced to the client so a dummy draft is visibly distinguishable from a
    // real AI one — without it, this fallback and the mobile-side network
    // fallback look identical in the UI and neither is diagnosable from a
    // screenshot. See the aiFallback note on generateEventDraft.
    let aiFallback = false;
    try {
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
      const raw = await this.callModel(buildSystemPrompt(categoryNames, platformNames, language, businessContext, inputSource), prompt);
      this.assertCampaignIntent(raw);
      draft = this.parseAndValidate(raw, aiCampaignDraftSchema, 'AI campaign response', NEEDS_INPUT_FIELDS);
      draft = await this.localizeStragglers(draft, CAMPAIGN_LOCALIZED_KEYS);
    } catch (err) {
      if (err instanceof CampaignIntentError) throw err;
      logger.warn({ err: err instanceof Error ? err.message : err }, 'OpenAI unavailable — falling back to dummy campaign draft');
      draft = pickDummyDraft(prompt, language);
      aiFallback = true;
    }
    const matched = this.matchToRealTaxonomy(draft, categoryNames, platformNames);
    return {
      ...matched,
      ...(await this.resolveFeatureImage(draft)),
      aiFallback,
      // The app connects content creators only — campaigns are never multi-role
      // now, so requirements is always empty. Kept in the response shape so
      // clients that still read the field get a stable [].
      requirements: [],
    };
  }

  // Turns the model's `imageQuery` subject phrase into a real photo URL. Falls
  // back to the draft's title as the query, which is what carries a dummy-JSON
  // fallback draft (it has no imageQuery) and any model response that omitted
  // the field. Returns nulls rather than throwing on every failure path — the
  // mobile client has its own local category photo map to fall back to, so a
  // missing photo must never cost the brand their draft.
  // imageQuery is typed non-optional but declared optional here on purpose: a
  // dummy-JSON draft is cast to AiCampaignDraft/AiEventDraft without ever going
  // through zod, so the key is genuinely absent at runtime on that path and a
  // bare .trim() would throw.
  private async resolveFeatureImage(
    draft: { imageQuery?: string; title: string },
  ): Promise<{ featureImageUrl: string | null; featureImageCredit: { name: string; profileUrl: string } | null }> {
    const photo = await searchStockPhoto(draft.imageQuery?.trim() || draft.title);
    return { featureImageUrl: photo?.url ?? null, featureImageCredit: photo?.credit ?? null };
  }

  async generateEventDraft(prompt: string, language: string = 'en', userId?: string, inputSource?: 'voice' | 'text'): Promise<AiEventDraft & { aiSuggestedCategories: string[]; platforms: string[]; aiFallback: boolean; featureImageUrl: string | null; featureImageCredit: { name: string; profileUrl: string } | null }> {
    const [realCategories, realPlatforms, businessContext] = await Promise.all([
      this.categoryRepo.findManyPublic(CategoryScope.BUSINESS),
      this.platformRepo.findManyPublic(),
      this.loadBusinessContext(userId),
    ]);
    const categoryNames = realCategories.map((c) => c.name);
    const platformNames = realPlatforms.map((p) => p.name);

    let draft: AiEventDraft;
    // true = this draft came from campaign-ai.dummy.json, not the model. The
    // mobile client has its OWN fallback template for when the request never
    // comes back at all, and the two used to be indistinguishable on screen;
    // this flag lets the client say which one the brand is actually looking at.
    let aiFallback = false;
    try {
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
      const raw = await this.callModel(buildEventSystemPrompt(categoryNames, platformNames, language, businessContext, todayInNepal(), inputSource), prompt);
      this.assertCampaignIntent(raw);
      draft = this.parseAndValidate(raw, aiEventDraftSchema, 'AI event response', EVENT_NEEDS_INPUT_FIELDS);
      draft = await this.localizeStragglers(draft, EVENT_LOCALIZED_KEYS);
    } catch (err) {
      if (err instanceof CampaignIntentError) throw err;
      logger.warn({ err: err instanceof Error ? err.message : err }, 'OpenAI unavailable — falling back to dummy event draft');
      draft = pickDummyEventDraft(prompt, language);
      aiFallback = true;
    }
    return {
      ...this.matchToRealTaxonomy(draft, categoryNames, platformNames),
      ...(await this.resolveFeatureImage(draft)),
      aiFallback,
    };
  }

  // Fed into the system prompt so the AI can infer industry/location the
  // brand's prompt didn't mention, instead of asking them to repeat it.
  private async loadBusinessContext(userId?: string): Promise<string> {
    if (!userId) return '';
    const business = await this.businessRepo.findByUserId(userId).catch(() => null);
    if (!business) return '';
    return buildBusinessContextBlock({
      businessName: business.businessName,
      categories:   business.categories,
      location:     business.location,
    });
  }

  // Kolab V1: validate intent, not completeness — reject only prompts/transcripts
  // with no promotional intent at all (see buildIntentInstruction), never a
  // merely short or vague-but-real one. Thrown BEFORE schema validation so a
  // rejection is never swallowed into the dummy-draft fallback below.
  private assertCampaignIntent(raw: string): void {
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return; // Not valid JSON at all — parseAndValidate will raise its own error for this.
    }
    if (!parsed || typeof parsed !== 'object') return;
    const obj = parsed as Record<string, unknown>;
    if (obj.campaignIntentDetected !== false) return;
    const clarifying = typeof obj.clarifyingMessage === 'string' ? obj.clarifyingMessage.trim() : '';
    throw new CampaignIntentError(clarifying || "It sounds like you're not creating a campaign. Tell me what you'd like to promote.");
  }

  // Catches the last few fields that slip back into English on an otherwise
  // Nepali draft — typically the spec-shaped ones like expectedContent ("1
  // Instagram Reel within 3 days"), which read as technical strings the model
  // doesn't think of as prose. The signal is the draft's own internal
  // inconsistency, not language detection: if SOME localized fields came back
  // in Devanagari, the brand is getting a Nepali draft, and any sibling field
  // with no Devanagari in it at all is a straggler rather than a choice. A
  // genuinely English draft has zero Devanagari fields and is never touched.
  private async localizeStragglers<T extends Record<string, unknown>>(draft: T, keys: readonly string[]): Promise<T> {
    const populated = keys.filter((k) => isPopulatedText(draft[k]));
    const localized = populated.filter((k) => hasDevanagari(draft[k]));
    const stragglers = populated.filter((k) => !hasDevanagari(draft[k]));
    // Require the draft to be predominantly Nepali before rewriting anything,
    // so a mostly-English draft with one Nepali proper noun in it is left alone.
    if (stragglers.length === 0 || localized.length < stragglers.length) return draft;

    const payload = Object.fromEntries(stragglers.map((k) => [k, draft[k]]));
    try {
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: REPAIR_TIMEOUT_MS, maxRetries: 0 });
      const response = await client.chat.completions.create({
        model: MODEL,
        max_completion_tokens: 1500,
        reasoning_effort: 'minimal',
        verbosity: 'low',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You translate individual field values of an event/campaign brief into Nepali. Respond with ONLY a JSON object using EXACTLY the same keys and the same value types (a string stays a string, an array of strings stays an array of the same length).
- Write the Nepali in proper Devanagari script, in simple everyday conversational language an ordinary person in Nepal can read.
- Keep proper nouns that are genuinely written in Latin by their owner — the business's own name, social handles, and platform names like Instagram, TikTok, YouTube, Facebook — in Latin. Translate the Nepali words around them.
- Keep all numbers, counts and durations exactly as they are; only the language changes.
- Do not add, drop, merge or reorder anything. Do not make any value longer than the one you were given.`,
          },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('empty repair response');
      const parsed = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()) as Record<string, unknown>;

      const repaired: Record<string, unknown> = { ...draft };
      for (const key of stragglers) {
        const next = parsed[key];
        const before = draft[key];
        // Only accept a replacement that is actually Nepali and structurally
        // identical to what it replaces — anything else keeps the original,
        // since a half-applied repair is worse than an English field.
        if (typeof before === 'string' && typeof next === 'string' && next.trim() && DEVANAGARI.test(next)) {
          repaired[key] = next;
        } else if (Array.isArray(before) && Array.isArray(next) && next.length === before.length
          && next.every((v) => typeof v === 'string' && v.trim()) && next.some((v: string) => DEVANAGARI.test(v))) {
          repaired[key] = next;
        }
      }
      logger.info({ stragglers }, 'Localized straggler fields left in English on a Nepali draft');
      return repaired as T;
    } catch (err) {
      // Non-fatal by design: the draft is already usable, just partly English,
      // and every field stays editable in the app.
      logger.warn({ err: err instanceof Error ? err.message : err, stragglers }, 'Straggler localization failed, keeping original draft');
      return draft;
    }
  }

  private async callModel(systemPrompt: string, prompt: string): Promise<string> {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES });
    const response = await client.chat.completions.create({
      model: MODEL,
      // Reasoning tokens are billed against this same ceiling, so raising the
      // effort tier above without raising this would let a hard brief spend its
      // whole allowance thinking and return an empty/truncated body — which
      // this service can only treat as a failure and answer with a dummy draft.
      max_completion_tokens: 6000,
      reasoning_effort: DRAFT_REASONING_EFFORT,
      verbosity: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });
    const text = response.choices[0]?.message?.content;
    if (!text) {
      // Distinguish "ran out of tokens mid-JSON" from a genuinely empty reply —
      // both surface to the brand as the same dummy draft, so the only way to
      // tell which one is happening is from this log line.
      const finish = response.choices[0]?.finish_reason;
      throw new Error(`AI response did not contain text content (finish_reason: ${finish ?? 'unknown'})`);
    }
    return text;
  }

  private parseAndValidate<T>(raw: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: unknown } } }, label: string, validNeedsInputKeys?: readonly string[]): T {
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch (err) {
      logger.debug({ err, raw }, `${label} was not valid JSON`);
      throw new Error(`${label} was not valid JSON`);
    }
    // The model is asked for 0-2 needsInput entries from an exact key list, but it
    // doesn't always obey either constraint — it sometimes flags a real schema field
    // (e.g. "venue") that just isn't on the allowed list. Drop unknown keys and clamp
    // the count instead of rejecting an otherwise well-formed draft over this soft
    // hint field.
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).needsInput)) {
      let needsInput = (parsed as Record<string, unknown>).needsInput as unknown[];
      if (validNeedsInputKeys) needsInput = needsInput.filter((key) => validNeedsInputKeys.includes(key as string));
      (parsed as Record<string, unknown>).needsInput = needsInput.slice(0, 2);
    }
    const result = schema.safeParse(parsed);
    if (!result.success || !result.data) {
      logger.debug({ issues: result.error?.issues, raw }, `${label} failed schema validation`);
      throw new Error(`${label} failed schema validation`);
    }
    return result.data;
  }

  private matchToRealTaxonomy<T extends { category: string; secondaryCategories: string[]; platform: string; needsInput: string[] }>(
    draft: T,
    realCategories: string[],
    realPlatforms: string[],
  ): T & { aiSuggestedCategories: string[]; platforms: string[] } {
    // Nothing matched at all means the fallback below is an arbitrary pick, not
    // a near-miss — so flag the field for the brand to confirm instead of
    // presenting the first taxonomy row as if the AI had chosen it. Without
    // this, an unmatchable guess showed up as a confidently-wrong category with
    // nothing in the UI hinting it was a fallback.
    const unconfirmed: string[] = [];

    const categoryMatch = fuzzyMatch(draft.category, realCategories);
    const matchedCategory = categoryMatch ?? realCategories[0] ?? draft.category;
    if (matchedCategory !== draft.category && !realCategories.some((c) => c === draft.category)) {
      logger.warn({ guess: draft.category, matched: matchedCategory }, 'AI category guess did not match real taxonomy, falling back');
    }
    if (categoryMatch == null && realCategories.length > 0) unconfirmed.push('category');

    const platformMatch = fuzzyMatch(draft.platform, realPlatforms);
    const matchedPlatform = platformMatch ?? realPlatforms[0] ?? draft.platform;
    if (matchedPlatform !== draft.platform && !realPlatforms.some((p) => p === draft.platform)) {
      logger.warn({ guess: draft.platform, matched: matchedPlatform }, 'AI platform guess did not match known platforms, falling back');
    }
    if (platformMatch == null && realPlatforms.length > 0) unconfirmed.push('platform');

    const aiSuggestedCategories = [draft.category, ...draft.secondaryCategories]
      .filter((c) => c !== matchedCategory);

    return {
      ...draft,
      category: matchedCategory,
      platform: matchedPlatform,
      platforms: [matchedPlatform],
      // Both draft schemas cap needsInput at 2 entries and the mobile chip row
      // is sized for that, so keep the AI's own flags first and only top up.
      needsInput: [...draft.needsInput, ...unconfirmed.filter((f) => !draft.needsInput.includes(f))].slice(0, 2),
      aiSuggestedCategories,
    };
  }
}

// Normalizes away the punctuation and accents that separate an AI guess from
// the taxonomy row it obviously means — "Cafes"/"Café", "Bars & Nightlife"/
// "Bars and Nightlife", "Twitter / X"/"Twitter/X".
function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\band\b/g, '&')
    .replace(/[^a-z0-9&]+/g, ' ')
    .trim();
}

// Crude but sufficient here: the taxonomy is a fixed list of ordinary English
// nouns, and the only difference this has to absorb is the model returning
// "Restaurant" for "Restaurants" or "Gym" for "Gyms".
function singularize(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && (token.endsWith('ses') || token.endsWith('xes') || token.endsWith('ches') || token.endsWith('shes'))) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

// Significant words only — connectives are dropped so they can't carry an
// overlap score on their own ("Food & Drink" and "Health & Beauty" share
// nothing meaningful but would otherwise both score on "&").
function matchTokens(value: string): string[] {
  return normalizeForMatch(value).split(' ')
    .filter((t) => t.length > 2 && t !== 'and')
    .map(singularize);
}

function fuzzyMatch(guess: string, options: string[]): string | null {
  const normalized = normalizeForMatch(guess);
  if (!normalized) return null;

  // Whitespace-insensitive exact pass first, so "Tik Tok" still resolves to
  // "TikTok" and "Twitter/X" to "Twitter / X".
  const squashed = normalized.replace(/[^a-z0-9]/g, '');
  const exact = options.find((o) => normalizeForMatch(o).replace(/[^a-z0-9]/g, '') === squashed);
  if (exact) return exact;

  const guessTokens = matchTokens(guess);
  if (guessTokens.length === 0) return null;
  const guessKey = ` ${guessTokens.join(' ')} `;

  // Substring matching only in the direction that's actually safe: a guess that
  // CONTAINS a whole option ("Cafes & Restaurants" -> "Cafés"). The reverse
  // direction was the bug — a short guess matched the first option containing
  // those letters anywhere, so "Bar" could land on "Barbershops" and a brand's
  // event came back filed under the wrong category with nothing in the UI to
  // explain why. Longest option wins, so a guess containing both "Cafés" and
  // "Bars & Nightlife" resolves to the more specific one.
  const contained = options
    .filter((o) => {
      const key = matchTokens(o).join(' ');
      return key.length > 0 && guessKey.includes(` ${key} `);
    })
    .sort((a, b) => matchTokens(b).join(' ').length - matchTokens(a).join(' ').length)[0];
  if (contained) return contained;

  // Otherwise score by shared significant words and require a real overlap, so
  // an unmatchable guess returns null (and the caller falls back visibly)
  // rather than silently binding to a coincidental letter run.
  let best: { option: string; score: number } | null = null;
  for (const option of options) {
    const optionTokens = matchTokens(option);
    if (optionTokens.length === 0) continue;
    const shared = optionTokens.filter((t) => guessTokens.includes(t)).length;
    if (shared === 0) continue;
    const score = shared / Math.max(guessTokens.length, optionTokens.length);
    if (!best || score > best.score) best = { option, score };
  }
  return best && best.score >= 0.5 ? best.option : null;
}
