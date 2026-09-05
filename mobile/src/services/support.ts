import { request, API_BASE, ensureFreshAccessToken, getApiLanguage } from '@/lib/api';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utilities/constants';
import type { PickedAttachment } from '@/utilities/chatAttachments';

export const supportService = {
  async contact(topic: string, message: string, attachmentUrls: string[]): Promise<void> {
    await request('POST', '/api/support/contact', { topic, message, attachmentUrls });
  },

  async report(type: string, description: string, attachmentUrls: string[]): Promise<void> {
    await request('POST', '/api/support/report', { type, description, attachmentUrls });
  },

  // Raw multipart POST (not request()) so this doesn't need a JSON body —
  // same refresh-on-401 recovery as campaign.ts's uploadDeliverableFile,
  // since this bypasses lib/api.ts's request() interceptor.
  async uploadAttachment(file: PickedAttachment): Promise<string> {
    const send = async (token: string) => {
      const form = new FormData();
      form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
      const res = await fetch(`${API_BASE}/api/support/attachments`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Language': getApiLanguage() },
        body:    form,
      });
      const json = await res.json() as { success: boolean; data: { url: string }; message?: string };
      return { status: res.status, json };
    };

    let { status, json } = await send(storage.get(ACCESS_TOKEN_KEY) ?? '');
    if (status === 401 && storage.get(REFRESH_TOKEN_KEY)) {
      const fresh = await ensureFreshAccessToken();
      if (fresh) ({ status, json } = await send(fresh));
    }

    if (status >= 200 && status < 300) return json.data.url;
    throw new Error(json?.message ?? 'Upload failed');
  },
};
