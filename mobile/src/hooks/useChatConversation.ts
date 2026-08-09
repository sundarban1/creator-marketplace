import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { chatService, toMessage, createVideoUploadTask, createVoiceUploadTask } from '@/services/chat';
import { compressVideo } from '@/utilities/uploadVideo';
import {
  getActiveUploadsFor, subscribeToUploadProgress, subscribeToUploadFinalizing,
  getActiveUploadResult, cancelActiveUpload, setFocusedUploadTarget,
} from '@/services/backgroundVideoUploadManager';
import {
  getActiveVoiceUploadsFor, subscribeToVoiceUploadProgress,
  getActiveVoiceUploadResult, cancelActiveVoiceUpload,
} from '@/services/voiceUploadRegistry';
import type { ApiMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { incomingMessageEvents } from '@/lib/incomingMessageEvents';
import { messagingEvents } from '@/lib/messagingEvents';
import {
  pickImageFromLibrary, pickImageFromCamera, pickDocumentAttachment, pickVideoFromLibrary, pickVideoFromCamera, promptAttachmentChoice,
  type PickedAttachment, type PickedVideo,
} from '@/utilities/chatAttachments';
import type { VoiceRecorderResult } from '@/features/chat/components/VoiceRecorderButton';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { Message } from '@/types';

function isTransientNetworkError(e: unknown): boolean {
  // A definitive rejection from the server (e.g. "exceeds 2 minute limit") throws
  // a plain Error with a specific message but no HTTP status attached the same way
  // a generic fetch/timeout failure does — treat anything that isn't clearly a
  // validation message as transient and worth retrying. A user-initiated cancel
  // is deliberately excluded too — it's handled separately in runVideoSend and
  // must never be auto-retried.
  const msg = e instanceof Error ? e.message : '';
  return !/limit|not supported|not allowed|cancelled/i.test(msg);
}

export type ChatStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

type UseChatConversationOptions = {
  conversationId: string;
  urlStatus?: string;
  participantUserId?: string;
  /** Focus the composer shortly after mount, but only once the conversation is ACCEPTED (creator screen's deep-link-from-notification behavior; business never passes this). */
  focusInputOnAccepted?: boolean;
  /** Extra side effect once markSeen's server call succeeds (creator screen also marks the referencing notification read; business has no equivalent). */
  onSeen?: () => void;
  /** Video attachments are only offered when chatting with a business — not creator<->creator (business screen always allows it). */
  allowVideo?: boolean;
};

/**
 * Shared chat-conversation state machine for the creator and business chat
 * screens — socket wiring (messages/typing/presence/reconnect), voice/video
 * upload orchestration (including reconstructing an in-flight upload after
 * navigating away and back), and message send/edit/delete/markSeen. Extracted
 * because the two screens' logic here was byte-identical (~700 duplicated
 * lines) while their header UI, accept/decline, and block/unblock features
 * are genuinely role-specific and stay in each screen.
 */
export function useChatConversation({
  conversationId, urlStatus, participantUserId, focusInputOnAccepted, onSeen, allowVideo,
}: UseChatConversationOptions) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesError, setMessagesError] = useState('');
  // Gates the whole screen behind a single loading state instead of letting
  // the header/list/composer paint progressively across separate commits —
  // only ever set on the conversation's first load per mount; a background
  // reconnect-triggered loadMessages() re-run must not blank an already-
  // visible conversation back to a spinner.
  const [initialLoading, setInitialLoading] = useState(true);
  const [status, setStatus] = useState<ChatStatus>((urlStatus as ChatStatus) ?? 'ACCEPTED');
  const [text, setText] = useState('');
  // Mirrors `text` (see the effect below) so handleSend's deferred callback
  // can read the latest value without closing over a stale render's `text`.
  const textRef = useRef('');
  useEffect(() => { textRef.current = text; }, [text]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [presence, setPresence] = useState<{ online: boolean; lastSeenAt: string | null } | null>(null);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const isSending = useRef(false);
  const uploadTasks = useRef<Record<string, { start: () => Promise<Message>; cancel: () => void }>>({});
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingEmitted = useRef(false);
  const seenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to offset 0 = visual bottom for inverted FlatList
  function scrollToBottom(animated = true) {
    listRef.current?.scrollToOffset({ offset: 0, animated });
  }

  function markSeen() {
    if (seenTimer.current) clearTimeout(seenTimer.current);
    seenTimer.current = setTimeout(() => {
      chatService.markSeen(conversationId)
        .then(() => {
          messagingEvents.refresh();
          onSeen?.();
        })
        .catch(() => null);
    }, 800);
  }

  // Load messages
  function loadMessages() {
    if (!conversationId) return;
    setMessagesError('');
    chatService.getMessages(conversationId)
      .then((msgs) => {
        // Keep any reconstructed pending-upload bubble(s) — they have no DB
        // row yet, so the server list never includes them; merging (instead
        // of replacing outright) is what keeps an in-progress video visible
        // across this same refresh.
        setMessages((prev) => [...msgs, ...prev.filter((m) => m.id.startsWith('temp-upload-'))]);
      })
      .catch((e) => setMessagesError(e instanceof Error ? e.message : t('messages.loadFailedSub')))
      .finally(() => setInitialLoading(false));
  }

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectedAt]);

  useEffect(() => {
    clearComposer();
    const convStatus = (urlStatus as ChatStatus) ?? 'ACCEPTED';
    setStatus(convStatus);
    setInitialLoading(true);
    if (!conversationId) { setMessages([]); setInitialLoading(false); return; }
    // Reconstruct any video/voice upload(s) still running for this conversation
    // before wiping/refetching — otherwise a video sent, then navigated away
    // from mid-upload, would appear to vanish until it finishes.
    setMessages([]);
    getActiveUploadsFor({ targetType: 'chat', conversationId }).forEach(attachToActiveUpload);
    getActiveVoiceUploadsFor(conversationId).forEach(attachToActiveVoiceUpload);
    loadMessages();
    if (convStatus === 'ACCEPTED') markSeen();
    if (focusInputOnAccepted && convStatus === 'ACCEPTED') {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Report focus so GlobalUploadBanner knows not to duplicate this
  // conversation's own inline upload progress while it's on screen.
  useFocusEffect(
    useCallback(() => {
      if (!conversationId) return;
      setFocusedUploadTarget({ targetType: 'chat', conversationId });
      return () => setFocusedUploadTarget(null);
    }, [conversationId])
  );

  // Incoming messages via NotificationContext's forwarded socket event bus
  useEffect(() => {
    if (!conversationId) return;
    return incomingMessageEvents.subscribe((data) => {
      if (data.conversationId !== conversationId) return;
      const incoming = toMessage(data.message);
      setMessages((prev) => {
        const withoutTemp = prev.filter(
          (m) => !(m.id.startsWith('temp-') && m.senderId === incoming.senderId)
        );
        if (withoutTemp.some((m) => m.id === incoming.id)) return withoutTemp;
        return [...withoutTemp, incoming];
      });
      scrollToBottom();
      markSeen();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Socket: typing indicators + room presence
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;
    socket.emit('join:conversation', { conversationId });

    const onTypingStart = (data: { conversationId: string }) => { if (data.conversationId === conversationId) setOtherTyping(true); };
    const onTypingStop  = (data: { conversationId: string }) => { if (data.conversationId === conversationId) setOtherTyping(false); };
    const onReconnect   = () => { socket.emit('join:conversation', { conversationId }); };
    // The other participant "delete for everyone"-ing a message — tombstone it live.
    const onMessageDeleted = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) => prev.map((m) =>
        m.id === data.messageId ? { ...m, isDeleted: true, text: '', attachmentUrl: null, attachmentName: null } : m
      ));
    };
    // The other participant edited a message — apply the update live.
    const onMessageEdited = (data: { conversationId: string; message: ApiMessage }) => {
      if (data.conversationId !== conversationId) return;
      const edited = toMessage(data.message);
      setMessages((prev) => prev.map((m) => (m.id === edited.id ? edited : m)));
    };
    // A socket-sent text message was rejected server-side (e.g. the new
    // messages-per-minute / duplicate-message rate limits) — the socket path
    // never otherwise resolves on failure (no ack), so without this the
    // optimistic bubble would sit there forever with no explanation.
    const onMessageError = (data: { conversationId: string; message?: string }) => {
      if (data.conversationId !== conversationId) return;
      isSending.current = false;
      setMessages((prev) => {
        const idx = [...prev].reverse().findIndex((m) => m.status === 'sending' && m.senderId === user?.id);
        if (idx === -1) return prev;
        const removeAt = prev.length - 1 - idx;
        return prev.filter((_, i) => i !== removeAt);
      });
      Alert.alert(t('messages.sendFailedTitle'), data.message ?? t('messages.sendFailedGeneric'));
    };

    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop',  onTypingStop);
    socket.on('connect',      onReconnect);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:error', onMessageError);

    return () => {
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop',  onTypingStop);
      socket.off('connect',      onReconnect);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:error', onMessageError);
      socket.emit('leave:conversation', { conversationId });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (seenTimer.current)   clearTimeout(seenTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Socket: the other participant's online/last-seen status
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !participantUserId) return;
    socket.emit('presence:subscribe', { userId: participantUserId });

    const onPresenceUpdate = (data: { userId: string; online: boolean; lastSeenAt: string | null }) => {
      if (data.userId === participantUserId) setPresence({ online: data.online, lastSeenAt: data.lastSeenAt });
    };
    const onReconnect = () => { socket.emit('presence:subscribe', { userId: participantUserId }); };

    socket.on('presence:update', onPresenceUpdate);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('presence:update', onPresenceUpdate);
      socket.off('connect', onReconnect);
      socket.emit('presence:unsubscribe', { userId: participantUserId });
    };
  }, [participantUserId]);

  function handleMessageLongPress(msg: Message) {
    if (msg.isDeleted || msg.id.startsWith('temp-')) return;
    const isMine = msg.senderId === user?.id;
    const options: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
      { text: t('messages.deleteForMe'), style: 'destructive', onPress: () => void deleteMessage(msg, false) },
    ];
    if (isMine) {
      if (msg.type === 'TEXT') {
        options.unshift({ text: t('messages.editMessage'), onPress: () => {
          setEditingMessage(msg);
          setText(msg.text);
          inputRef.current?.focus();
        } });
      }
      options.push({ text: t('messages.deleteForEveryone'), style: 'destructive', onPress: () => void deleteMessage(msg, true) });
    }
    options.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(t('messages.deleteMessageTitle'), undefined, options);
  }

  async function deleteMessage(msg: Message, forEveryone: boolean) {
    try {
      await chatService.deleteMessage(conversationId, msg.id, forEveryone);
      if (forEveryone) {
        setMessages((prev) => prev.map((m) =>
          m.id === msg.id ? { ...m, isDeleted: true, text: '', attachmentUrl: null, attachmentName: null } : m
        ));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('messages.deleteFailedGeneric'));
    }
  }

  useEffect(() => {
    if (otherTyping) scrollToBottom();
  }, [otherTyping]);

  function clearComposer() {
    setText('');
    setEditingMessage(null);
  }

  async function handleSaveEdit() {
    if (!editingMessage || !text.trim()) return;
    const content = text.trim();
    const msgId = editingMessage.id;
    if (content === editingMessage.text) { clearComposer(); return; }
    try {
      const updated = await chatService.editMessage(conversationId, msgId, content);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
      clearComposer();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('messages.editFailedGeneric'));
    }
  }

  function handleTextChange(val: string) {
    setText(val);
    const socket = getSocket();
    if (!socket) return;
    if (!val.trim()) {
      if (isTypingEmitted.current) { socket.emit('typing:stop', { conversationId }); isTypingEmitted.current = false; }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      return;
    }
    if (!isTypingEmitted.current) { socket.emit('typing:start', { conversationId }); isTypingEmitted.current = true; }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
      isTypingEmitted.current = false;
    }, 2000);
  }

  function handleSend() {
    if (isSending.current) return;
    if (editingMessage) { void handleSaveEdit(); return; }
    // iOS autocorrect/predictive text can commit a word replacement (which
    // fires onChangeText) in the very same tap that presses this button —
    // reading `text` synchronously here can race ahead of that in-flight
    // commit: the pre-correction word gets sent, and the correction's
    // onChangeText lands afterward and repopulates the just-cleared input.
    // Deferring one frame lets any in-flight autocorrect change reach
    // textRef first, so the actual send always reflects the final text.
    requestAnimationFrame(() => {
      if (isSending.current) return;
      const content = textRef.current.trim();
      if (!content) return;
      isSending.current = true;
      const socket = getSocket();

      if (socket && isTypingEmitted.current) {
        socket.emit('typing:stop', { conversationId });
        isTypingEmitted.current = false;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);

      // Optimistic update — show message immediately at bottom
      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId, conversationId,
        senderId: user?.id ?? '', text: content,
        timestamp: new Date().toISOString(), status: 'sending',
        type: 'TEXT',
      };
      setMessages((prev) => [...prev, optimistic]);
      textRef.current = '';
      clearComposer();
      scrollToBottom();

      if (socket?.connected) {
        socket.emit('message:send', { conversationId, content });
        // The server echoes message:new back; the subscriber above replaces the temp message
        isSending.current = false;
      } else {
        chatService.sendMessage(conversationId, content)
          .then((msg) => {
            setMessages((prev) => {
              const without = prev.filter((m) => m.id !== tempId);
              return without.some((m) => m.id === msg.id) ? without : [...without, msg];
            });
          })
          .catch((e) => {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            Alert.alert(t('messages.sendFailedTitle'), e instanceof Error ? e.message : t('messages.sendFailedGeneric'));
          })
          .finally(() => { isSending.current = false; });
      }
    });
  }

  async function handleSendAttachment(file: PickedAttachment, type: 'IMAGE' | 'FILE') {
    if (isSending.current) return;
    isSending.current = true;
    const caption = text.trim();

    const socket = getSocket();
    if (socket && isTypingEmitted.current) {
      socket.emit('typing:stop', { conversationId });
      isTypingEmitted.current = false;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId, conversationId,
      senderId: user?.id ?? '', text: caption,
      timestamp: new Date().toISOString(), status: 'sending',
      type, attachmentUrl: file.uri, attachmentName: file.name,
    };
    setMessages((prev) => [...prev, optimistic]);
    clearComposer();
    scrollToBottom();

    try {
      const msg = await chatService.sendAttachment(conversationId, file, caption);
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        return without.some((m) => m.id === msg.id) ? without : [...without, msg];
      });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert(t('messages.sendFailedTitle'), e instanceof Error ? e.message : t('messages.sendFailedGeneric'));
    } finally {
      isSending.current = false;
    }
  }

  function updateMsg(id: string, patch: Partial<Message>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  // Reconstructs a pending video bubble for an upload that's still running in
  // the background (started before this screen mounted, or before the user
  // navigated away and back) — the transfer itself never stopped
  // (backgroundVideoUploadManager keeps driving it independently), only this
  // screen's own local state lost track of it. Re-subscribes to the same
  // progress/finalizing/result signals runVideoSend would have used.
  function attachToActiveUpload(active: ReturnType<typeof getActiveUploadsFor>[number]) {
    const tempId = `temp-upload-${active.localUploadId}`;
    const caption = active.target.targetType === 'chat' ? (active.target.caption ?? '') : '';
    const optimistic: Message = {
      id: tempId, conversationId,
      senderId: user?.id ?? '', text: caption,
      timestamp: new Date().toISOString(), status: active.status,
      type: 'VIDEO',
      localUri: active.sourceFileUri, uploadProgress: active.progress, retryCount: 0,
    };
    setMessages((prev) => (prev.some((m) => m.id === tempId) ? prev : [...prev, optimistic]));

    const unsubProgress = subscribeToUploadProgress(active.localUploadId, (p) => updateMsg(tempId, { uploadProgress: p, status: 'uploading' }));
    const unsubFinalizing = subscribeToUploadFinalizing(active.localUploadId, () => updateMsg(tempId, { status: 'finalizing' }));
    uploadTasks.current[tempId] = {
      start: () => Promise.reject(new Error('Reconstructed upload cannot be (re)started')),
      cancel: () => cancelActiveUpload(active.localUploadId),
    };

    getActiveUploadResult(active.localUploadId)?.then((apiMessage) => {
      const serverMsg = toMessage(apiMessage as ApiMessage);
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        return without.some((m) => m.id === serverMsg.id) ? without : [...without, serverMsg];
      });
    }).catch((e) => {
      const detail = e instanceof Error ? e.message : undefined;
      if (detail === 'Video upload cancelled') {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      updateMsg(tempId, { status: 'failed', errorDetail: detail });
    }).finally(() => {
      unsubProgress();
      unsubFinalizing();
      delete uploadTasks.current[tempId];
    });
  }

  // Voice analogue of attachToActiveUpload above — reconstructs a pending
  // voice bubble for an upload that's still running (started before this
  // screen mounted, or before the user navigated away and back). The upload
  // itself never stopped (it's a plain JS promise chain, not tied to this
  // component), only this screen's own local state lost track of it.
  function attachToActiveVoiceUpload(active: ReturnType<typeof getActiveVoiceUploadsFor>[number]) {
    const tempId = `temp-voice-upload-${active.localUploadId}`;
    const optimistic: Message = {
      id: tempId, conversationId,
      senderId: user?.id ?? '', text: '',
      timestamp: new Date().toISOString(), status: 'uploading',
      type: 'VOICE',
      attachmentDurationSec: active.durationSec,
      attachmentWaveform: active.waveform.map((v) => v.toFixed(2)).join(','),
      localUri: active.sourceFileUri, uploadProgress: active.progress, retryCount: 0,
    };
    setMessages((prev) => (prev.some((m) => m.id === tempId) ? prev : [...prev, optimistic]));

    const unsubProgress = subscribeToVoiceUploadProgress(active.localUploadId, (p) => updateMsg(tempId, { uploadProgress: p }));
    uploadTasks.current[tempId] = {
      start: () => Promise.reject(new Error('Reconstructed upload cannot be (re)started')),
      cancel: () => cancelActiveVoiceUpload(active.localUploadId),
    };

    getActiveVoiceUploadResult(active.localUploadId)?.then((apiMessage) => {
      const serverMsg = toMessage(apiMessage as ApiMessage);
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        return without.some((m) => m.id === serverMsg.id) ? without : [...without, serverMsg];
      });
    }).catch((e) => {
      const detail = e instanceof Error ? e.message : undefined;
      if (detail === 'Voice upload cancelled') {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      updateMsg(tempId, { status: 'failed', errorDetail: detail });
    }).finally(() => {
      unsubProgress();
      delete uploadTasks.current[tempId];
    });
  }

  async function runVideoSend(msg: Message) {
    try {
      updateMsg(msg.id, { status: 'compressing', uploadProgress: 0 });
      const compressedUri = await compressVideo(msg.localUri!, (p) => updateMsg(msg.id, { uploadProgress: p }));
      updateMsg(msg.id, { status: 'uploading', uploadProgress: 0, localUri: compressedUri });

      const task = createVideoUploadTask(conversationId, compressedUri, 'video/mp4', msg.text,
        (p) => updateMsg(msg.id, { uploadProgress: p }),
        () => updateMsg(msg.id, { status: 'finalizing' }),
        msg.attachmentDurationSec ?? undefined);
      uploadTasks.current[msg.id] = task;

      const serverMsg = await task.start();
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== msg.id);
        return without.some((m) => m.id === serverMsg.id) ? without : [...without, serverMsg];
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : undefined;
      if (detail === 'Video upload cancelled') {
        // User-initiated cancel — remove the bubble entirely rather than
        // showing a "failed" state, and never retry.
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        return;
      }
      const attempt = (msg.retryCount ?? 0) + 1;
      if (isTransientNetworkError(e) && attempt <= 3) {
        updateMsg(msg.id, { retryCount: attempt, errorDetail: detail });
        await runVideoSend({ ...msg, retryCount: attempt });
        return;
      }
      updateMsg(msg.id, { status: 'failed', retryCount: attempt, errorDetail: detail });
    } finally {
      delete uploadTasks.current[msg.id];
    }
  }

  async function handleSendVideoAttachment(video: PickedVideo) {
    if (isSending.current) return;
    isSending.current = true;
    try {
      const tempId = `temp-${Date.now()}`;
      const caption = text.trim();

      const socket = getSocket();
      if (socket && isTypingEmitted.current) {
        socket.emit('typing:stop', { conversationId });
        isTypingEmitted.current = false;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);

      const optimistic: Message = {
        id: tempId, conversationId,
        senderId: user?.id ?? '', text: caption,
        timestamp: new Date().toISOString(), status: 'compressing',
        type: 'VIDEO',
        attachmentUrl: video.uri, attachmentDurationSec: video.durationSec,
        attachmentWidth: video.width, attachmentHeight: video.height,
        localUri: video.uri, uploadProgress: 0, retryCount: 0,
      };
      setMessages((prev) => [...prev, optimistic]);
      clearComposer();
      scrollToBottom();
      await runVideoSend(optimistic);
    } finally {
      isSending.current = false;
    }
  }

  // Single-shot direct-to-Cloudinary upload (see createVoiceUploadTask) —
  // no compression/finalizing stage the way video has, just uploading → sent.
  async function runVoiceSend(msg: Message) {
    try {
      const task = createVoiceUploadTask(
        conversationId, msg.localUri!, msg.attachmentDurationSec ?? 0,
        (msg.attachmentWaveform ?? '').split(',').filter(Boolean).map(Number),
        (p) => updateMsg(msg.id, { uploadProgress: p }),
      );
      uploadTasks.current[msg.id] = task;

      const serverMsg = await task.start();
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== msg.id);
        return without.some((m) => m.id === serverMsg.id) ? without : [...without, serverMsg];
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : undefined;
      if (detail === 'Voice upload cancelled') {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        return;
      }
      const attempt = (msg.retryCount ?? 0) + 1;
      if (isTransientNetworkError(e) && attempt <= 3) {
        updateMsg(msg.id, { retryCount: attempt, errorDetail: detail });
        await runVoiceSend({ ...msg, retryCount: attempt });
        return;
      }
      updateMsg(msg.id, { status: 'failed', retryCount: attempt, errorDetail: detail });
    } finally {
      delete uploadTasks.current[msg.id];
    }
  }

  async function handleSendVoiceAttachment(rec: VoiceRecorderResult) {
    if (isSending.current) return;
    isSending.current = true;
    try {
      const socket = getSocket();
      if (socket && isTypingEmitted.current) {
        socket.emit('typing:stop', { conversationId });
        isTypingEmitted.current = false;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);

      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId, conversationId,
        senderId: user?.id ?? '', text: '',
        timestamp: new Date().toISOString(), status: 'uploading',
        type: 'VOICE',
        attachmentDurationSec: rec.durationSec,
        attachmentWaveform: rec.waveform.map((v) => v.toFixed(2)).join(','),
        localUri: rec.uri, uploadProgress: 0, retryCount: 0,
      };
      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom();
      await runVoiceSend(optimistic);
    } finally {
      isSending.current = false;
    }
  }

  async function handleCameraPress() {
    const file = await pickImageFromCamera();
    if (file) void handleSendAttachment(file, 'IMAGE');
  }

  async function handleAttachmentPress() {
    const choice = await promptAttachmentChoice(allowVideo);
    if (choice === 'gallery') {
      const file = await pickImageFromLibrary();
      if (file) void handleSendAttachment(file, 'IMAGE');
    } else if (choice === 'video-library') {
      const video = await pickVideoFromLibrary();
      if (video) void handleSendVideoAttachment(video);
    } else if (choice === 'video-camera') {
      const video = await pickVideoFromCamera();
      if (video) void handleSendVideoAttachment(video);
    } else if (choice === 'document') {
      const file = await pickDocumentAttachment();
      if (file) void handleSendAttachment(file, file.mimeType.startsWith('image/') ? 'IMAGE' : 'FILE');
    }
  }

  function toggleEmojiPanel() {
    if (!emojiOpen) Keyboard.dismiss();
    setEmojiOpen((v) => !v);
  }

  function insertEmoji(emoji: string) {
    handleTextChange(text + emoji);
  }

  return {
    messages, setMessages, messagesError, initialLoading,
    status, setStatus,
    text, editingMessage,
    otherTyping, emojiOpen, setEmojiOpen, presence,
    listRef, inputRef, isSending, uploadTasks,
    scrollToBottom, loadMessages, markSeen,
    handleMessageLongPress, clearComposer, handleTextChange, handleSend,
    handleSendAttachment, handleSendVideoAttachment, handleSendVoiceAttachment,
    runVideoSend, runVoiceSend,
    handleCameraPress, handleAttachmentPress,
    toggleEmojiPanel, insertEmoji,
  };
}
