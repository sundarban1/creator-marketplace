import type { Conversation } from '@/types';

// Attachment messages have empty `content`/`lastMessage` (no caption), so the
// conversation list needs a type-specific fallback label instead of showing
// blank text — mirrors the push-notification body text the backend already
// sends for these same message types (see messaging.service.ts sendAttachment/
// completeVoiceAttachment).
export function getConversationPreviewText(
  conv: Pick<Conversation, 'lastMessage' | 'lastMessageType' | 'lastMessageAttachmentName'>,
  t: (key: string) => string,
): string {
  if (conv.lastMessage) return conv.lastMessage;

  switch (conv.lastMessageType) {
    case 'IMAGE': return t('messages.previewPhoto');
    case 'VIDEO': return t('messages.previewVideo');
    case 'VOICE': return t('messages.previewVoice');
    case 'FILE':  return conv.lastMessageAttachmentName || t('messages.previewFile');
    default:      return t('messages.noMessagesYet');
  }
}
