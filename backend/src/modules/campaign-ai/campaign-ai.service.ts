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
  EXCHANGE_OPTIONS, EXCHANGE_DESCRIPTIONS,
  type AiCampaignDraft, type AiEventDraft, type AiRequirementDraft, type SuggestDescriptionInput,
} from './campaign-ai.schema';
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

type DummyCampaignTemplate = AiCampaignDraft & { keywords: string[] };
type DummyEventTemplate = AiEventDraft & { keywords: string[] };
type DummyDescriptionTemplate = { keywords: string[]; text: string };

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

// Used when the OpenAI API is unavailable (no key, auth/billing failure, timeout,
// or a malformed response) so campaign creation still works end-to-end for demos/dev.
function pickDummyDraft(prompt: string): AiCampaignDraft {
  const { keywords, ...draft } = matchByKeywords(dummy.campaignTemplates, prompt);
  return aiCampaignDraftSchema.parse(draft);
}

function pickDummyEventDraft(prompt: string): AiEventDraft {
  const { keywords, ...draft } = matchByKeywords(dummy.eventTemplates, prompt);
  return aiEventDraftSchema.parse(draft);
}

function pickDummyDescription(input: SuggestDescriptionInput): string {
  const haystack = [input.title, input.category, input.platform, input.deliverables].filter(Boolean).join(' ');
  return matchByKeywords(dummy.descriptionTemplates, haystack).text;
}

const MODEL = 'gpt-5-mini';
const REQUEST_TIMEOUT_MS = 45_000;

function buildLanguageInstruction(language: string, inputSource?: 'voice' | 'text'): string {
  // Voice input: the prompt is a Whisper transcription, which auto-detects and
  // transcribes whatever language the brand actually spoke — that already-detected
  // language is the only signal that matters here. The app's UI language setting
  // must NOT override it (a Nepali-UI brand who spoke English should get an
  // English draft, not a Nepali one, and vice versa).
  if (inputSource === 'voice') {
    return `LANGUAGE: The prompt below is a transcription of the brand's own voice recording — it may be a mix of English and Nepali, but write based on whichever language the transcription is actually in.
- If the transcription is in Nepali (Devanagari script) or romanized Nepali (Nepali words spelled out with Latin letters, e.g. "pasal", "khana ko lagi", "creator haru chaiyeko"), write title, description, objective, contentGuidelines, sampleCaption, approvalRequirements, and location (if not null) in NEPALI using proper Devanagari script — always convert romanized Nepali into Devanagari, never leave it in Latin letters. A few stray English words mixed into otherwise-Nepali speech are normal and don't change this — still write in Nepali.
- Otherwise (the transcription is in English) write those same fields in English.
- Write Nepali in simple, everyday conversational language that an ordinary person in Nepal can easily read and understand — the way Nepali is actually spoken or written in casual social-media/marketing posts. Avoid stiff, overly formal, literary, or heavily Sanskritized words.
- Regardless of language, category, secondaryCategories, platform, secondaryPlatforms, goal, and targetAudience must always use the exact values from the lists provided — never translate or alter them.
- hashtags must always use Latin letters/numbers only (no Devanagari) since they are literal social-media hashtags.`;
  }

  return `LANGUAGE: The brand's app is currently set to "${language === 'ne' ? 'Nepali' : 'English'}".
- If the app language is Nepali, OR the brand's prompt below is written in Nepali (Devanagari script) or romanized Nepali (Nepali words spelled out with Latin letters, e.g. "pasal", "khana ko lagi", "creator haru chaiyeko"), write title, description, objective, contentGuidelines, sampleCaption, approvalRequirements, and location (if not null) in NEPALI using proper Devanagari script — always convert romanized Nepali into Devanagari, never leave it in Latin letters.
- Write that Nepali in simple, everyday conversational language that an ordinary person in Nepal can easily read and understand — the way Nepali is actually spoken or written in casual social-media/marketing posts. Avoid stiff, overly formal, literary, or heavily Sanskritized words.
- Otherwise write those same fields in English.
- Regardless of language, category, secondaryCategories, platform, secondaryPlatforms, goal, and targetAudience must always use the exact values from the lists provided — never translate or alter them.
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

function buildSystemPrompt(categoryNames: string[], providerCategoryNames: string[], platformNames: string[], language: string, businessContext: string, inputSource?: 'voice' | 'text'): string {
  return `You are a campaign-brief generator for a creator-marketplace app in Nepal, connecting businesses with providers (content creators, photographers, videographers, models, and other service providers) for paid opportunities.

Given a brand's short description of what they want to promote, generate a complete campaign brief as a single JSON object — no prose, no markdown code fences, just the raw JSON object.

Existing categories in the app (prefer one of these for "category" if it fits; otherwise suggest the closest real-world category name):
${categoryNames.map((c) => `- ${c}`).join('\n')}

Provider types available on the platform (use ONLY these for each requirements[] entry's "category" — this is a different, more specific list than the categories above):
${providerCategoryNames.map((c) => `- ${c}`).join('\n')}

Known platforms: ${platformNames.join(', ')} (prefer one of these for "platform").
${businessContext}
Respond with a JSON object with EXACTLY these keys:
- title: string, a punchy campaign title
- description: string, 2-4 sentences describing what creators should do
- objective: string, one sentence describing the campaign's goal
- category: string, best-fit category
- secondaryCategories: string[] (0-3), other categories that could also fit
- platform: string, the single best platform for this campaign
- secondaryPlatforms: string[] (0-3), other platforms worth considering
- contentGuidelines: string[] (2-6 short bullet points)
- goal: string, EXACTLY ONE of: "Brand Awareness", "More Customers", "Sales", "Followers & Engagement" — whichever best matches the campaign's main aim
- targetAudience: string[] (1-3 items), which CREATORS should promote this (not the end consumer) — EXACTLY from this list only: "Food Creator", "Travel Creator", "Lifestyle Creator", "Fashion Creator", "Tech Creator", "Fitness Creator", "Student Creator", "Any Creator". Use "Any Creator" alone only if no specific type fits better; never combine it with other types.
- suggestedDurationDays: number, how many days the campaign should run (typically 7-30)
- creatorsNeeded: number, how many creators to recruit (typically 1-10)
- budgetMin: number, suggested minimum budget in NPR (Nepali Rupees) for the whole campaign
- budgetMax: number, suggested maximum budget in NPR
- paymentType: string, e.g. "Fixed Fee"
- deliverables: object with EXACTLY these integer keys, each 0-10: "REEL", "STORY", "PHOTO_POST", "VISIT_STORE", "PRODUCT_REVIEW_VIDEO", "EVENT_COVERAGE_VIDEO", "MENTION_IN_CAPTION", "TAG_BUSINESS", "GOOGLE_REVIEW". Each number is how many pieces of that content type EACH INDIVIDUAL creator should produce (not multiplied by creatorsNeeded, not a campaign-wide total) — keep these small and realistic, typically 1-3 for the 2-3 content types that best fit the brief, 0 for everything else. At least one key must be > 0.
- hashtags: string[] (3-8 relevant hashtags, no # needed but allowed)
- sampleCaption: string, a ready-to-use example caption a creator could post
- approvalRequirements: string, one sentence about whether/how the brand wants to review content before it's posted
- location: string or null, a city/area if inferable, otherwise null
- needsInput: string[] (0-2), keys from this exact list you were NOT confident about and think the brand should double check: ["location","budgetMin","budgetMax","creatorsNeeded","deadline","platform","category"]. Only include a key here if you genuinely had to guess — always still fill in your best-guess value for it regardless.
- requirements: array (0-10 items) — ONLY populate this when the brief clearly names multiple DISTINCT provider types and/or explicit counts for each (e.g. "two TikTok creators and a photographer", "1 photographer and 2 content creators", "5 content creators, 2 photographers and 1 DJ"). Each item: { "category": one of the exact Provider types listed above, "quantity": integer count needed for that role, "budgetType": "FIXED"|"RANGE"|"NEGOTIABLE", "budgetFixed": number (required if budgetType is FIXED), "budgetMin"/"budgetMax": numbers (required if budgetType is RANGE), "deliverables": object, "description": string }. budgetFixed/budgetMin/budgetMax for a role are the amount paid to EACH INDIVIDUAL creator filling that role (same per-person convention as deliverables above), NOT a pool split across that role's quantity. If the brief gives ONE total budget for the whole brief (e.g. "budget is 10000" for "5 content creators, 2 photographers and 1 DJ"), do NOT copy that total into every role or divide it evenly per head — first allocate the total across roles by typical relative cost per role type (e.g. a DJ or photographer usually costs more per person than a content creator), THEN divide each role's allocated share by that role's quantity to land on a realistic per-person figure, such that summing (budgetFixed × quantity) across all roles lands close to the brief's stated total. If unclear or no total was given, use "NEGOTIABLE". If the brief describes only ONE general need (even if creatorsNeeded > 1, e.g. "3 food creators"), leave requirements as an empty array [] — do not invent a multi-role breakdown the brief doesn't support. Never leave requirements populated with a single item; use the top-level category/creatorsNeeded/budget/deliverables fields for that case instead.
  For "deliverables" and "description", exactly ONE of the two is meaningful per role, based on category:
  - category is "Content Creator" (or an equally general content-creation role): fill "deliverables" with the SAME exact keys/rules as the top-level deliverables field above, scoped to what THIS role should produce (lean on REEL/STORY/PHOTO_POST as fits the brief). Leave "description" as "".
  - any other category (Model, Photographer, Videographer, DJ, Dancer, Event Planner, etc.): leave "deliverables" all-zero, and instead fill "description" with a concise, specific, actionable 1-2 sentence brief of what that role should actually do — e.g. a Model: "Model outfits and pose for photo and short social clips per the brand's direction; available for the full shoot duration and wardrobe changes." A Photographer: "Capture high-resolution event photography and short video clips, deliver an edited gallery within 3 days." Never leave description empty for a non-Content-Creator role.

${buildLanguageInstruction(language, inputSource)}

${buildIntentInstruction()}

Whenever campaignIntentDetected is true, fill in every field above with your best sensible guess using the business profile and sensible defaults, even for a very short or vague prompt — never leave a field empty. Respond with ONLY the JSON object.`;
}

function buildEventSystemPrompt(categoryNames: string[], platformNames: string[], language: string, businessContext: string, inputSource?: 'voice' | 'text'): string {
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
- secondaryPlatforms: string[] (0-3), other platforms worth considering
- benefits: string[] (1-4 items) — what the brand is offering creators in return for attending, EXACTLY from this list only:
${BENEFIT_OPTIONS.map((b) => `  - "${b}": ${BENEFIT_DESCRIPTIONS[b]}`).join('\n')}
- exchangeType: string[] (1-6 items) — what the business wants attendees/creators to do in return for the free experience, EXACTLY from this list only:
${EXCHANGE_OPTIONS.map((e) => `  - "${e}": ${EXCHANGE_DESCRIPTIONS[e]}`).join('\n')}
- expectedContent: string (0-300 chars) — a short free-text description of the specific content ask, e.g. "1 Instagram Reel + 2 Stories within 3 days of the event". Populate this ONLY when exchangeType includes anything other than "Just attend & share organically". Leave it as an empty string "" when "Just attend & share organically" is the only or dominant selection.
- capacity: number, how many creators the venue can realistically host (typically 5-50)
- location: string or null, a city/area if inferable, otherwise null
- needsInput: string[] (0-2), keys from this exact list you were NOT confident about and think the brand should double check: ["location","capacity","platform","category"]. Only include a key here if you genuinely had to guess — always still fill in your best-guess value for it regardless.

${buildLanguageInstruction(language, inputSource)}

${buildIntentInstruction()}

Whenever campaignIntentDetected is true, fill in every field above with your best sensible guess using the business profile and sensible defaults, even for a very short or vague prompt — never leave a field empty. Respond with ONLY the JSON object.`;
}

function buildDescriptionSystemPrompt(language: string): string {
  return `You are a campaign-brief copywriter for a creator-marketplace app in Nepal, connecting brands with content creators for promotional campaigns.

Given a few details about a brand's event/campaign, write a single description of 2-4 sentences describing what the campaign is about and what creators should do. Respond with ONLY the description text — no labels, no quotes, no markdown, no preamble.

${buildLanguageInstruction(language)}
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

      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS });
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
      return pickDummyDescription(input);
    }
  }

  async generateDraft(prompt: string, language: string = 'en', userId?: string, inputSource?: 'voice' | 'text'): Promise<AiCampaignDraft & { aiSuggestedCategories: string[]; aiSuggestedPlatforms: string[]; platforms: string[]; requirements: (AiRequirementDraft & { categoryId: string })[] }> {
    const [realCategories, realProviderCategories, realPlatforms, businessContext] = await Promise.all([
      this.categoryRepo.findManyPublic(CategoryScope.BUSINESS),
      // strict:true — requirements need real provider TYPES (Photographer,
      // Content Creator...), never BOTH-scope content-niche rows, same rule
      // the Service category picker follows (see CategoryRepository comment).
      this.categoryRepo.findManyPublic(CategoryScope.CREATOR, true),
      this.platformRepo.findManyPublic(),
      this.loadBusinessContext(userId),
    ]);
    const categoryNames = realCategories.map((c) => c.name);
    const providerCategoryNames = realProviderCategories.map((c) => c.name);
    const platformNames = realPlatforms.map((p) => p.name);

    let draft: AiCampaignDraft;
    try {
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
      const raw = await this.callModel(buildSystemPrompt(categoryNames, providerCategoryNames, platformNames, language, businessContext, inputSource), prompt);
      this.assertCampaignIntent(raw);
      draft = this.parseAndValidate(raw, aiCampaignDraftSchema, 'AI campaign response');
    } catch (err) {
      if (err instanceof CampaignIntentError) throw err;
      logger.warn({ err: err instanceof Error ? err.message : err }, 'OpenAI unavailable — falling back to dummy campaign draft');
      draft = pickDummyDraft(prompt);
    }
    const matched = this.matchToRealTaxonomy(draft, categoryNames, platformNames);
    return { ...matched, requirements: this.resolveRequirements(draft.requirements, realProviderCategories) };
  }

  // Matches each AI-guessed requirement category name to a real CREATOR
  // category and attaches its id — mirrors matchToRealTaxonomy's fuzzy-match
  // for the top-level category/platform, but drops (rather than falls back
  // on) any entry that can't be matched at all, since a wrong provider type
  // silently attached to a real category id is worse than just omitting that
  // role and letting the business add it manually in the review step.
  private resolveRequirements(
    requirements: AiRequirementDraft[],
    realProviderCategories: { id: string; name: string }[],
  ): (AiRequirementDraft & { categoryId: string })[] {
    return requirements.flatMap((r) => {
      const matched = fuzzyMatch(r.category, realProviderCategories.map((c) => c.name));
      const category = matched != null ? realProviderCategories.find((c) => c.name === matched) : undefined;
      if (!category) {
        logger.warn({ guess: r.category }, 'AI requirement category did not match any real provider category, dropping requirement');
        return [];
      }
      return [{ ...r, category: category.name, categoryId: category.id }];
    });
  }

  async generateEventDraft(prompt: string, language: string = 'en', userId?: string, inputSource?: 'voice' | 'text'): Promise<AiEventDraft & { aiSuggestedCategories: string[]; aiSuggestedPlatforms: string[]; platforms: string[] }> {
    const [realCategories, realPlatforms, businessContext] = await Promise.all([
      this.categoryRepo.findManyPublic(CategoryScope.BUSINESS),
      this.platformRepo.findManyPublic(),
      this.loadBusinessContext(userId),
    ]);
    const categoryNames = realCategories.map((c) => c.name);
    const platformNames = realPlatforms.map((p) => p.name);

    let draft: AiEventDraft;
    try {
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
      const raw = await this.callModel(buildEventSystemPrompt(categoryNames, platformNames, language, businessContext, inputSource), prompt);
      this.assertCampaignIntent(raw);
      draft = this.parseAndValidate(raw, aiEventDraftSchema, 'AI event response');
    } catch (err) {
      if (err instanceof CampaignIntentError) throw err;
      logger.warn({ err: err instanceof Error ? err.message : err }, 'OpenAI unavailable — falling back to dummy event draft');
      draft = pickDummyEventDraft(prompt);
    }
    return this.matchToRealTaxonomy(draft, categoryNames, platformNames);
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

  private async callModel(systemPrompt: string, prompt: string): Promise<string> {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS });
    const response = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 3000,
      reasoning_effort: 'minimal',
      verbosity: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });
    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('AI response did not contain text content');
    }
    return text;
  }

  private parseAndValidate<T>(raw: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: unknown } } }, label: string): T {
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch (err) {
      logger.debug({ err, raw }, `${label} was not valid JSON`);
      throw new Error(`${label} was not valid JSON`);
    }
    // The model is asked for 0-2 needsInput entries but doesn't always obey that cap —
    // clamp instead of rejecting an otherwise well-formed draft over a soft hint field.
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).needsInput)) {
      (parsed as Record<string, unknown>).needsInput = ((parsed as Record<string, unknown>).needsInput as unknown[]).slice(0, 2);
    }
    const result = schema.safeParse(parsed);
    if (!result.success || !result.data) {
      logger.debug({ issues: result.error?.issues, raw }, `${label} failed schema validation`);
      throw new Error(`${label} failed schema validation`);
    }
    return result.data;
  }

  private matchToRealTaxonomy<T extends { category: string; secondaryCategories: string[]; platform: string; secondaryPlatforms: string[] }>(
    draft: T,
    realCategories: string[],
    realPlatforms: string[],
  ): T & { aiSuggestedCategories: string[]; aiSuggestedPlatforms: string[]; platforms: string[] } {
    const matchedCategory = fuzzyMatch(draft.category, realCategories) ?? realCategories[0] ?? draft.category;
    if (matchedCategory !== draft.category && !realCategories.some((c) => c === draft.category)) {
      logger.warn({ guess: draft.category, matched: matchedCategory }, 'AI category guess did not match real taxonomy, falling back');
    }

    const matchedPlatform = fuzzyMatch(draft.platform, realPlatforms) ?? realPlatforms[0] ?? draft.platform;
    if (matchedPlatform !== draft.platform && !realPlatforms.some((p) => p === draft.platform)) {
      logger.warn({ guess: draft.platform, matched: matchedPlatform }, 'AI platform guess did not match known platforms, falling back');
    }

    const aiSuggestedCategories = [draft.category, ...draft.secondaryCategories]
      .filter((c) => c !== matchedCategory);
    const aiSuggestedPlatforms = [draft.platform, ...draft.secondaryPlatforms]
      .filter((p) => p !== matchedPlatform);

    return {
      ...draft,
      category: matchedCategory,
      platform: matchedPlatform,
      platforms: [matchedPlatform],
      aiSuggestedCategories,
      aiSuggestedPlatforms,
    };
  }
}

function fuzzyMatch(guess: string, options: string[]): string | null {
  const normalized = guess.trim().toLowerCase();
  const exact = options.find((o) => o.toLowerCase() === normalized);
  if (exact) return exact;
  const partial = options.find((o) => o.toLowerCase().includes(normalized) || normalized.includes(o.toLowerCase()));
  return partial ?? null;
}
