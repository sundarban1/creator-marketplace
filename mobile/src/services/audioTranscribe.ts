import { API_BASE, assertOnline, fetchWithTimeout, getApiLanguage, AI_TIMEOUT_MS } from '@/lib/api';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY } from '@/utilities/constants';

// Multipart upload, not JSON — can't go through the shared request() helper
// (mirrors the FormData/fetch pattern in utilities/uploadImage.ts), but does use
// the same bounded round-trip. Powers the create-event page's Audio prompt mode
// (see VoicePromptInput).
export async function transcribeAudio(uri: string): Promise<string> {
  assertOnline();
  const token = storage.get(ACCESS_TOKEN_KEY) ?? '';
  const form = new FormData();
  form.append('audio', { uri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);

  const { res, text } = await fetchWithTimeout(`${API_BASE}/api/ai-assistant/transcribe`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Language': getApiLanguage() },
    body:    form,
  }, AI_TIMEOUT_MS);
  const json = (text ? JSON.parse(text) : {}) as { success: boolean; data?: { text: string }; message?: string };
  if (!res.ok || !json.success) throw new Error(json.message ?? 'Transcription failed');
  return json.data?.text ?? '';
}
