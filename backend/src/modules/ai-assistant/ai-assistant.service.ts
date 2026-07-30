import OpenAI, { toFile } from 'openai';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error';

const REQUEST_TIMEOUT_MS = 45_000;

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
      const result = await client.audio.transcriptions.create({ file, model: 'whisper-1' });
      const text = result.text?.trim();
      if (!text) throw new Error('Empty transcription');
      return text;
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'Audio transcription failed');
      throw new AppError('Could not understand the audio — please try again', 422);
    }
  }
}
