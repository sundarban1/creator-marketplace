import OpenAI from 'openai';
import { CategoryScope } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { CategoryRepository } from '../category/category.repository';
import { PlatformRepository } from '../platform/platform.repository';
import { aiCampaignDraftSchema, type AiCampaignDraft, type SuggestDescriptionInput } from './campaign-ai.schema';
import dummyData from './campaign-ai.dummy.json';

type DummyCampaignTemplate = AiCampaignDraft & { keywords: string[] };
type DummyDescriptionTemplate = { keywords: string[]; text: string };

const dummy = dummyData as unknown as {
  campaignTemplates: DummyCampaignTemplate[];
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

function pickDummyDescription(input: SuggestDescriptionInput): string {
  const haystack = [input.title, input.category, input.platform, input.deliverables].filter(Boolean).join(' ');
  return matchByKeywords(dummy.descriptionTemplates, haystack).text;
}

const MODEL = 'gpt-5-mini';
const REQUEST_TIMEOUT_MS = 45_000;

function buildLanguageInstruction(language: string): string {
  return `LANGUAGE: The brand's app is currently set to "${language === 'ne' ? 'Nepali' : 'English'}".
- If the app language is Nepali, OR the brand's prompt below is written in Nepali (Devanagari script) or romanized Nepali (Nepali words spelled out with Latin letters, e.g. "pasal", "khana ko lagi", "creator haru chaiyeko"), write title, description, objective, contentGuidelines, sampleCaption, approvalRequirements, and location (if not null) in NEPALI using proper Devanagari script — always convert romanized Nepali into Devanagari, never leave it in Latin letters.
- Write that Nepali in simple, everyday conversational language that an ordinary person in Nepal can easily read and understand — the way Nepali is actually spoken or written in casual social-media/marketing posts. Avoid stiff, overly formal, literary, or heavily Sanskritized words.
- Otherwise write those same fields in English.
- Regardless of language, category, secondaryCategories, platform, secondaryPlatforms, goal, and targetAudience must always use the exact values from the lists provided — never translate or alter them.
- hashtags must always use Latin letters/numbers only (no Devanagari) since they are literal social-media hashtags.`;
}

function buildSystemPrompt(categoryNames: string[], platformNames: string[], language: string): string {
  return `You are a campaign-brief generator for a creator-marketplace app in Nepal, connecting brands with content creators for paid promotional campaigns.

Given a brand's short description of what they want to promote, generate a complete campaign brief as a single JSON object — no prose, no markdown code fences, just the raw JSON object.

Existing categories in the app (prefer one of these for "category" if it fits; otherwise suggest the closest real-world category name):
${categoryNames.map((c) => `- ${c}`).join('\n')}

Known platforms: ${platformNames.join(', ')} (prefer one of these for "platform").

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
- deliverables: object with EXACTLY these integer keys, each 0-10: "REEL", "STORY", "PHOTO_POST", "CAROUSEL_POST", "VISIT_STORE", "PRODUCT_REVIEW_VIDEO", "EVENT_COVERAGE_VIDEO", "MENTION_IN_CAPTION", "TAG_BUSINESS", "GOOGLE_REVIEW". Each number is how many pieces of that content type EACH INDIVIDUAL creator should produce (not multiplied by creatorsNeeded, not a campaign-wide total) — keep these small and realistic, typically 1-3 for the 2-3 content types that best fit the brief, 0 for everything else. At least one key must be > 0.
- hashtags: string[] (3-8 relevant hashtags, no # needed but allowed)
- sampleCaption: string, a ready-to-use example caption a creator could post
- approvalRequirements: string, one sentence about whether/how the brand wants to review content before it's posted
- location: string or null, a city/area if inferable, otherwise null
- needsInput: string[] (0-2), keys from this exact list you were NOT confident about and think the brand should double check: ["location","budgetMin","budgetMax","creatorsNeeded","deadline","platform","category"]. Only include a key here if you genuinely had to guess — always still fill in your best-guess value for it regardless.

${buildLanguageInstruction(language)}

Always fill in every field with your best sensible guess, even for a very short prompt — never leave a field empty or refuse to answer. Respond with ONLY the JSON object.`;
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

  async generateDraft(prompt: string, language: string = 'en'): Promise<AiCampaignDraft & { aiSuggestedCategories: string[]; aiSuggestedPlatforms: string[]; platforms: string[] }> {
    const [realCategories, realPlatforms] = await Promise.all([
      this.categoryRepo.findManyPublic(CategoryScope.BUSINESS),
      this.platformRepo.findManyPublic(),
    ]);
    const categoryNames = realCategories.map((c) => c.name);
    const platformNames = realPlatforms.map((p) => p.name);

    let draft: AiCampaignDraft;
    try {
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
      const raw = await this.callModel(prompt, categoryNames, platformNames, language);
      draft = this.parseAndValidate(raw);
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'OpenAI unavailable — falling back to dummy campaign draft');
      draft = pickDummyDraft(prompt);
    }
    return this.matchToRealTaxonomy(draft, categoryNames, platformNames);
  }

  private async callModel(prompt: string, categoryNames: string[], platformNames: string[], language: string): Promise<string> {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS });
    const response = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 3000,
      reasoning_effort: 'minimal',
      verbosity: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(categoryNames, platformNames, language) },
        { role: 'user', content: prompt },
      ],
    });
    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('AI response did not contain text content');
    }
    return text;
  }

  private parseAndValidate(raw: string): AiCampaignDraft {
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch (err) {
      logger.debug({ err, raw }, 'AI campaign response was not valid JSON');
      throw new Error('AI campaign response was not valid JSON');
    }
    // The model is asked for 0-2 needsInput entries but doesn't always obey that cap —
    // clamp instead of rejecting an otherwise well-formed draft over a soft hint field.
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).needsInput)) {
      (parsed as Record<string, unknown>).needsInput = ((parsed as Record<string, unknown>).needsInput as unknown[]).slice(0, 2);
    }
    const result = aiCampaignDraftSchema.safeParse(parsed);
    if (!result.success) {
      logger.debug({ issues: result.error.issues, raw }, 'AI campaign response failed schema validation');
      throw new Error('AI campaign response failed schema validation');
    }
    return result.data;
  }

  private matchToRealTaxonomy(
    draft: AiCampaignDraft,
    realCategories: string[],
    realPlatforms: string[],
  ): AiCampaignDraft & { aiSuggestedCategories: string[]; aiSuggestedPlatforms: string[]; platforms: string[] } {
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
