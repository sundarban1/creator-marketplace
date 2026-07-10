import Anthropic from '@anthropic-ai/sdk';
import { CategoryScope } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { CategoryRepository } from '../category/category.repository';
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

// Used when the Anthropic API is unavailable (no key, auth/billing failure, timeout,
// or a malformed response) so campaign creation still works end-to-end for demos/dev.
function pickDummyDraft(prompt: string): AiCampaignDraft {
  const { keywords, ...draft } = matchByKeywords(dummy.campaignTemplates, prompt);
  return aiCampaignDraftSchema.parse(draft);
}

function pickDummyDescription(input: SuggestDescriptionInput): string {
  const haystack = [input.title, input.category, input.platform, input.deliverables].filter(Boolean).join(' ');
  return matchByKeywords(dummy.descriptionTemplates, haystack).text;
}

const MODEL = 'claude-haiku-4-5-20251001';
const REQUEST_TIMEOUT_MS = 20_000;

// Canonical platform list — matches mobile's PLATFORM_FALLBACK; the distinct-platforms-in-use
// query can be empty on a fresh DB, so this is a stable list to fuzzy-match/fall back against.
const KNOWN_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];

function buildSystemPrompt(categoryNames: string[]): string {
  return `You are a campaign-brief generator for a creator-marketplace app in Nepal, connecting brands with content creators for paid promotional campaigns.

Given a brand's short description of what they want to promote, generate a complete campaign brief as a single JSON object — no prose, no markdown code fences, just the raw JSON object.

Existing categories in the app (prefer one of these for "category" if it fits; otherwise suggest the closest real-world category name):
${categoryNames.map((c) => `- ${c}`).join('\n')}

Known platforms: ${KNOWN_PLATFORMS.join(', ')} (prefer one of these for "platform").

Respond with a JSON object with EXACTLY these keys:
- title: string, a punchy campaign title
- description: string, 2-4 sentences describing what creators should do
- objective: string, one sentence describing the campaign's goal
- category: string, best-fit category
- secondaryCategories: string[] (0-3), other categories that could also fit
- platform: string, the single best platform for this campaign
- secondaryPlatforms: string[] (0-3), other platforms worth considering
- contentGuidelines: string[] (2-6 short bullet points)
- targetAudience: string[] (2-5 short bullet points describing who the content should reach)
- suggestedDurationDays: number, how many days the campaign should run (typically 7-30)
- creatorsNeeded: number, how many creators to recruit (typically 1-10)
- budgetMin: number, suggested minimum budget in NPR (Nepali Rupees) for the whole campaign
- budgetMax: number, suggested maximum budget in NPR
- paymentType: string, e.g. "Fixed Fee"
- deliverables: string, a short comma-separated description of expected content (e.g. "1 Instagram Reel, 2 Instagram Stories")
- hashtags: string[] (3-8 relevant hashtags, no # needed but allowed)
- sampleCaption: string, a ready-to-use example caption a creator could post
- callToAction: string, a short call-to-action phrase for the campaign
- approvalRequirements: string, one sentence about whether/how the brand wants to review content before it's posted
- location: string or null, a city/area if inferable, otherwise null
- needsInput: string[] (0-2), keys from this exact list you were NOT confident about and think the brand should double check: ["location","budgetMin","budgetMax","creatorsNeeded","deadline","platform","category"]. Only include a key here if you genuinely had to guess — always still fill in your best-guess value for it regardless.

Always fill in every field with your best sensible guess, even for a very short prompt — never leave a field empty or refuse to answer. Respond with ONLY the JSON object.`;
}

const DESCRIPTION_SYSTEM_PROMPT = `You are a campaign-brief copywriter for a creator-marketplace app in Nepal, connecting brands with content creators for promotional campaigns.

Given a few details about a brand's event/campaign, write a single description of 2-4 sentences describing what the campaign is about and what creators should do. Respond with ONLY the description text — no labels, no quotes, no markdown, no preamble.`;

export class CampaignAiService {
  private categoryRepo = new CategoryRepository();

  async suggestDescription(input: SuggestDescriptionInput): Promise<string> {
    try {
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

      const parts: string[] = [];
      if (input.title) parts.push(`Title: ${input.title}`);
      if (input.category) parts.push(`Category: ${input.category}`);
      if (input.platform) parts.push(`Platform: ${input.platform}`);
      if (input.deliverables) parts.push(`Deliverables: ${input.deliverables}`);

      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: REQUEST_TIMEOUT_MS });
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: DESCRIPTION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: parts.join('\n') }],
      });
      const block = response.content[0];
      const description = block?.type === 'text' ? block.text.trim().replace(/^["']|["']$/g, '') : '';
      if (description.length < 10) throw new Error('AI description was too short');
      return description;
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'Anthropic unavailable — falling back to dummy description');
      return pickDummyDescription(input);
    }
  }

  async generateDraft(prompt: string): Promise<AiCampaignDraft & { aiSuggestedCategories: string[]; aiSuggestedPlatforms: string[]; platforms: string[] }> {
    const realCategories = await this.categoryRepo.findManyPublic(CategoryScope.BUSINESS);
    const categoryNames = realCategories.map((c) => c.name);

    let draft: AiCampaignDraft;
    try {
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
      const raw = await this.callClaude(prompt, categoryNames);
      draft = this.parseAndValidate(raw);
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'Anthropic unavailable — falling back to dummy campaign draft');
      draft = pickDummyDraft(prompt);
    }
    return this.matchToRealTaxonomy(draft, categoryNames);
  }

  private async callClaude(prompt: string, categoryNames: string[]): Promise<string> {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: REQUEST_TIMEOUT_MS });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildSystemPrompt(categoryNames),
      messages: [{ role: 'user', content: prompt }],
    });
    const block = response.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('AI response did not contain text content');
    }
    return block.text;
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
  ): AiCampaignDraft & { aiSuggestedCategories: string[]; aiSuggestedPlatforms: string[]; platforms: string[] } {
    const matchedCategory = fuzzyMatch(draft.category, realCategories) ?? realCategories[0] ?? draft.category;
    if (matchedCategory !== draft.category && !realCategories.some((c) => c === draft.category)) {
      logger.warn({ guess: draft.category, matched: matchedCategory }, 'AI category guess did not match real taxonomy, falling back');
    }

    const matchedPlatform = fuzzyMatch(draft.platform, KNOWN_PLATFORMS) ?? 'Instagram';
    if (matchedPlatform !== draft.platform && !KNOWN_PLATFORMS.some((p) => p === draft.platform)) {
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
