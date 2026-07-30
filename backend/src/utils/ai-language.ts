// Shared language-steering instruction for OpenAI prompts, used by both the
// one-shot campaign-ai module and the conversational ai-assistant module so
// the two never drift out of sync on how English/Nepali switching works.
export function buildLanguageInstruction(language: string): string {
  return `LANGUAGE: The brand's app is currently set to "${language === 'ne' ? 'Nepali' : 'English'}".
- If the app language is Nepali, OR the brand's message is written in Nepali (Devanagari script) or romanized Nepali (Nepali words spelled out with Latin letters, e.g. "pasal", "khana ko lagi", "creator haru chaiyeko"), respond in NEPALI using proper Devanagari script — always convert romanized Nepali into Devanagari, never leave it in Latin letters.
- Write that Nepali in simple, everyday conversational language that an ordinary person in Nepal can easily read and understand — the way Nepali is actually spoken or written in casual social-media/marketing posts. Avoid stiff, overly formal, literary, or heavily Sanskritized words.
- Otherwise respond in English.
- Regardless of language, any category, platform, goal, targetAudience, or similar fixed-vocabulary values must always use the exact values from the lists provided — never translate or alter them.
- Hashtags must always use Latin letters/numbers only (no Devanagari) since they are literal social-media hashtags.`;
}
