import OpenAI, { toFile } from 'openai';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';

const REQUEST_TIMEOUT_MS = 45_000;

// Domain vocabulary fed to Whisper as leading context (see transcribeAudio).
// Names the terms a Kolab event brief actually uses — platform names, content
// formats, provider roles, Kathmandu-area venues, and the Nepali equivalents —
// so they come back spelled correctly instead of as near-homophones.
const TRANSCRIPTION_VOCAB_HINT = [
  'Kolab creator marketplace event brief.',
  'Instagram, TikTok, YouTube, Facebook, reel, reels, story, stories, post, caption, hashtag, collab, UGC.',
  'Content creator, influencer, photographer, videographer, model, MC, DJ, makeup artist, event planner.',
  'Kathmandu, Lalitpur, Bhaktapur, Pokhara, Thamel, Durbarmarg, Jhamsikhel, Baneshwor, Patan, Boudha, Lazimpat.',
  'Rupees, Rs, NPR, budget, capacity, venue, RSVP, launch, opening, tasting, giveaway.',
  'क्रिएटर, रिल, स्टोरी, पोस्ट, क्याप्सन, कार्यक्रम, उद्घाटन, ठाउँ, बजेट, रुपैयाँ, फोटोग्राफर, भिडियोग्राफर।',
].join(' ');

export class AiAssistantService {
  // Voice input for the create-event page's Audio prompt mode — transcribes a
  // short recording (expo-audio's HIGH_QUALITY preset, .m4a) into text that's
  // then fed through the same generateWithAi/generateEventWithAi flow as a
  // typed prompt. Uses whisper-1 rather than the newer gpt-4o-(mini-)transcribe
  // models: Whisper has long-established, well-tested Nepali support, which the
  // newer transcription models aren't guaranteed to match as reliably for a
  // lower-resource language.
  //
  // No `language` hint is passed to the API — the business can speak either
  // English or Nepali, and forcing a hint from the app's UI language would
  // bias/mistranscribe whichever one doesn't match. Whisper auto-detects the
  // spoken language instead, transcribing Nepali speech into Devanagari script.
  async transcribeAudio(buffer: Buffer, mimetype: string): Promise<string> {
    if (!env.OPENAI_API_KEY) throw new AppError('Voice input is not available right now', 503);

    const ext = mimetype.includes('wav') ? 'wav' : mimetype.includes('webm') ? 'webm' : mimetype.includes('3gp') ? '3gp' : 'm4a';
    const file = await toFile(buffer, `voice.${ext}`, { type: mimetype });
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS });

    try {
      const result = await client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        // Whisper conditions on this as if it were the transcript's preceding
        // context, so it's the one lever for domain vocabulary. Brands dictate
        // event briefs full of words Whisper otherwise mangles into everyday
        // near-homophones — "reel" -> "real", "Thamel" -> "camel", "creators"
        // -> "creator's" — and every one of those corrupts the draft generated
        // downstream. Deliberately bilingual: a code-mixed prompt keeps the
        // hint useful for Nepali speech without biasing auto-detection, since
        // Whisper picks the language from the audio, not from this string.
        prompt: TRANSCRIPTION_VOCAB_HINT,
        // Whisper's default temperature 0 already falls back to higher values
        // on its own internal quality thresholds; pinning it makes the same
        // recording transcribe the same way twice, so an inaccurate draft is
        // reproducible instead of a coin flip.
        temperature: 0,
      });
      const text = result.text?.trim();
      if (!text) throw new Error('Empty transcription');
      return text;
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'Audio transcription failed');
      throw new AppError('Could not understand the audio — please try again', 422);
    }
  }
}
