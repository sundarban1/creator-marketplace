import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { messagingEvents } from '@/lib/messagingEvents';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { usePlatformFlags } from '@/context/PlatformSettingsContext';
import { chatService, toMessage, createVideoUploadTask, createVoiceUploadTask } from '@/services/chat';
import { VoiceRecorderButton, type VoiceRecorderResult } from '@/features/chat/components/VoiceRecorderButton';
import { VoiceBubblePlayer } from '@/features/chat/components/VoiceBubblePlayer';
import { compressVideo } from '@/utilities/uploadVideo';
import {
  getActiveUploadsFor, subscribeToUploadProgress, subscribeToUploadFinalizing,
  getActiveUploadResult, cancelActiveUpload, setFocusedUploadTarget,
} from '@/services/backgroundVideoUploadManager';
import type { ApiMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { notificationService } from '@/services/notifications';
import { incomingMessageEvents } from '@/lib/incomingMessageEvents';
import { F, RADIUS } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BackButton } from '@/components/BackButton';
import { CHAT_EMOJIS } from '@/utilities/chatEmojis';
import { formatPresence } from '@/utilities/presence';
import {
  pickImageFromLibrary, pickImageFromCamera, pickDocumentAttachment, pickVideoFromLibrary, pickVideoFromCamera, promptAttachmentChoice,
  type PickedAttachment, type PickedVideo,
} from '@/utilities/chatAttachments';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { Message } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#7C3AED', '#0EA5E9', '#059669', '#D97706', '#EC4899', '#06B6D4', '#EF4444'];

// Bounds for the composer's auto-grow height — MIN keeps it a one-line pill
// at rest, MAX caps growth before the text scrolls internally.
const MIN_INPUT_HEIGHT = 20;
const MAX_INPUT_HEIGHT = 100;

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]!;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

function formatDateLabel(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type ListItem =
  | { _k: 'date';   label: string; id: string }
  | { _k: 'msg';    msg: Message; isSent: boolean; showAvatar: boolean; isLast: boolean; id: string }
  | { _k: 'typing'; id: string };

// Builds items for an inverted FlatList (newest first = renders at bottom).
// Typing indicator is first so it appears at the visual bottom.
// Date separators appear after the oldest message of each day so they render
// above that day's group when the list is flipped.
function buildItems(msgs: Message[], userId: string, typing: boolean): ListItem[] {
  const items: ListItem[] = [];

  if (typing) items.push({ _k: 'typing', id: 'typing' });

  const rev = [...msgs].reverse(); // newest first
  const lastSentId = rev.find((m) => m.senderId === userId && !m.id.startsWith('temp-'))?.id ?? '';

  for (let i = 0; i < rev.length; i++) {
    const msg       = rev[i]!;
    const prevInArr = rev[i - 1]; // more recent → rendered below in UI
    const nextInArr = rev[i + 1]; // older → rendered above in UI

    const isSent     = msg.senderId === userId;
    // Avatar sits at the bottom of a received group: show when the message
    // directly below (prevInArr) is from a different sender.
    const showAvatar = !isSent && (!prevInArr || prevInArr.senderId !== msg.senderId);
    const isLast     = !msg.id.startsWith('temp-') && msg.id === lastSentId;

    items.push({ _k: 'msg', msg, isSent, showAvatar, isLast, id: msg.id });

    // Insert a date separator after the oldest message of a day so it renders
    // above that day's group when the list is inverted.
    const currDate = new Date(msg.timestamp).toDateString();
    const nextDate = nextInArr ? new Date(nextInArr.timestamp).toDateString() : null;
    if (!nextDate || currDate !== nextDate) {
      items.push({ _k: 'date', label: formatDateLabel(msg.timestamp), id: `d-${currDate}-${i}` });
    }
  }

  return items;
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingDots({ avatarName, color }: { avatarName: string; color: string }) {
  const C = useAppColors();
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -5, duration: 220, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0,  duration: 220, useNativeDriver: true }),
          Animated.delay(480 - delay),
        ])
      );
    const a1 = anim(d1, 0); const a2 = anim(d2, 160); const a3 = anim(d3, 320);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={td.row}>
      <View style={[td.mini, { backgroundColor: color }]}>
        <Text style={td.miniTxt}>{initials(avatarName)}</Text>
      </View>
      <View style={[td.bubble, { backgroundColor: C.surface, borderColor: C.border }]}>
        {[d1, d2, d3].map((d, i) => (
          <Animated.View key={i} style={[td.dot, { backgroundColor: C.textSecondary, transform: [{ translateY: d }] }]} />
        ))}
      </View>
    </View>
  );
}

const td = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  mini:    { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  miniTxt: { color: '#fff', fontSize: 10, fontFamily: F.bold },
  bubble:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 12, borderRadius: RADIUS.lg, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  dot:     { width: 7, height: 7, borderRadius: 3.5 },
});

// ── Local video preview (pending/failed only — a paused, muted first-frame
// preview of the on-device file. Once sent, the bubble switches to a plain
// cached thumbnail image instead — see the isVideo branch below — so a long
// chat history never has more than one video decoder mounted at a time. ──

function LocalVideoPreview({ uri, style }: { uri: string; style: object }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.pause();
  });
  return <VideoView player={player} style={style as never} nativeControls={false} contentFit="cover" />;
}

// ── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg, isSent, showAvatar, isLast, personName, personColor, personAvatar, onLongPress, onRetryUpload, onDeleteFailed, onCancelUpload,
}: {
  msg: Message; isSent: boolean; showAvatar: boolean; isLast: boolean;
  personName: string; personColor: string; personAvatar?: string; onLongPress: () => void;
  onRetryUpload: (msg: Message) => void; onDeleteFailed: (id: string) => void; onCancelUpload: (msg: Message) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const isPending = msg.id.startsWith('temp-');
  const isImage   = msg.type === 'IMAGE' && !!msg.attachmentUrl;
  const isFile    = msg.type === 'FILE'  && !!msg.attachmentUrl;
  const isVideo   = msg.type === 'VIDEO' && !!msg.attachmentUrl;
  const isVoice   = msg.type === 'VOICE';

  if (msg.isDeleted) {
    return (
      <View style={[s.bubbleRow, isSent ? s.bubbleRowSent : s.bubbleRowReceived]}>
        {!isSent && <View style={s.avatarSpacer} />}
        <View style={[s.bubbleWrap, isSent ? s.bubbleWrapSent : s.bubbleWrapReceived]}>
          <View style={[s.bubble, s.deletedBubble, { borderColor: C.border }]}>
            <FontAwesome5 name="ban" solid size={13} color={C.textSecondary} />
            <Text style={[s.deletedTxt, { color: C.textSecondary }]}>{t('messages.messageDeleted')}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={[s.bubbleRow, isSent ? s.bubbleRowSent : s.bubbleRowReceived]}
      onLongPress={isPending ? undefined : onLongPress} delayLongPress={350}>
      {!isSent && (
        showAvatar
          ? personAvatar && !avatarFailed
            ? <ExpoImage source={{ uri: personAvatar }} style={s.msgAvatar} contentFit="cover" onError={() => setAvatarFailed(true)} />
            : <View style={[s.msgAvatar, { backgroundColor: personColor }]}>
                <Text style={s.msgAvatarTxt}>{initials(personName)}</Text>
              </View>
          : <View style={s.avatarSpacer} />
      )}
      <View style={[s.bubbleWrap, isSent ? s.bubbleWrapSent : s.bubbleWrapReceived]}>
        {isImage ? (
          <Pressable
            onPress={() => msg.attachmentUrl && !isPending && Linking.openURL(msg.attachmentUrl)}
            onLongPress={isPending ? undefined : onLongPress} delayLongPress={350}>
            <View style={s.imageBubble}>
              <Image source={{ uri: msg.attachmentUrl! }} style={s.attachmentImage} resizeMode="cover" />
              {isPending && (
                <View style={s.imageUploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </View>
            {!!msg.text && (
              <View style={[
                s.bubble, s.captionBubble,
                isSent
                  ? [s.bubbleSent, { backgroundColor: C.brinjal1 }]
                  : [s.bubbleReceived, { backgroundColor: C.surface, borderColor: C.border }],
              ]}>
                <Text style={[s.bubbleTxt, { color: isSent ? '#fff' : C.text }]}>{msg.text}</Text>
              </View>
            )}
          </Pressable>
        ) : isFile ? (
          <Pressable
            onPress={() => msg.attachmentUrl && !isPending && Linking.openURL(msg.attachmentUrl)}
            onLongPress={isPending ? undefined : onLongPress} delayLongPress={350}
            style={[
              s.fileBubble,
              isSent
                ? { backgroundColor: C.brinjal1 }
                : { backgroundColor: C.surface, borderColor: C.border, borderWidth: StyleSheet.hairlineWidth },
            ]}>
            <FontAwesome5 name="file-alt" solid size={22} color={isSent ? '#fff' : C.brinjal1} />
            <Text numberOfLines={1} style={[s.fileNameTxt, { color: isSent ? '#fff' : C.text }]}>
              {msg.attachmentName ?? 'File'}
            </Text>
            {isPending && <ActivityIndicator size="small" color={isSent ? '#fff' : C.brinjal1} />}
          </Pressable>
        ) : isVideo ? (
          <Pressable
            onPress={() => {
              if (isPending || msg.status === 'failed') return;
              router.push({ pathname: '/video-player', params: { url: msg.attachmentUrl!, thumbnail: msg.attachmentThumbnailUrl ?? '' } });
            }}
            onLongPress={isPending ? undefined : onLongPress} delayLongPress={350}>
            <View style={s.imageBubble}>
              {isPending || msg.status === 'failed'
                ? <LocalVideoPreview uri={msg.localUri ?? msg.attachmentUrl!} style={s.attachmentImage} />
                : <ExpoImage source={{ uri: msg.attachmentThumbnailUrl ?? undefined }} style={s.attachmentImage} contentFit="cover" />}
              {msg.status !== 'compressing' && msg.status !== 'uploading' && msg.status !== 'finalizing' && msg.status !== 'failed' && (
                <View style={s.videoPlayOverlay}>
                  <FontAwesome5 name="play-circle" solid size={44} color="#fff" />
                </View>
              )}
              {msg.attachmentDurationSec != null && msg.status !== 'failed' && (
                <View style={s.durationBadge}>
                  <Text style={s.durationBadgeTxt}>{formatDuration(msg.attachmentDurationSec)}</Text>
                </View>
              )}
              {msg.status === 'compressing' && (
                <View style={s.imageUploadingOverlay}>
                  <Text style={s.videoStatusTxt}>{t('messages.compressingVideo')} {Math.round((msg.uploadProgress ?? 0) * 100)}%</Text>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${Math.round((msg.uploadProgress ?? 0) * 100)}%` }]} />
                  </View>
                </View>
              )}
              {msg.status === 'uploading' && (
                <View style={s.imageUploadingOverlay}>
                  <Text style={s.videoStatusTxt}>{Math.round((msg.uploadProgress ?? 0) * 100)}%</Text>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${Math.round((msg.uploadProgress ?? 0) * 100)}%` }]} />
                  </View>
                  <Pressable style={s.cancelUploadBtn} onPress={() => onCancelUpload(msg)} hitSlop={8}>
                    <FontAwesome5 name="times" solid size={12} color="#fff" />
                    <Text style={s.cancelUploadTxt}>{t('messages.cancelUpload')}</Text>
                  </Pressable>
                </View>
              )}
              {msg.status === 'finalizing' && (
                <View style={s.imageUploadingOverlay}>
                  <Text style={s.videoStatusTxt}>{t('messages.processingVideo')}</Text>
                </View>
              )}
              {msg.status === 'failed' && (
                <View style={s.imageUploadingOverlay}>
                  <FontAwesome5 name="exclamation-circle" solid size={22} color="#fff" />
                  <Text style={s.videoStatusTxt}>{t('messages.uploadFailed')}</Text>
                  {msg.errorDetail && (
                    <Text style={s.videoStatusDetailTxt} numberOfLines={2}>{msg.errorDetail}</Text>
                  )}
                  <View style={s.failedActions}>
                    <Pressable style={s.failedBtn} onPress={() => onRetryUpload(msg)}>
                      <Text style={s.failedBtnTxt}>{t('messages.retry')}</Text>
                    </Pressable>
                    <Pressable style={s.failedBtn} onPress={() => onDeleteFailed(msg.id)}>
                      <Text style={s.failedBtnTxt}>{t('common.delete')}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </Pressable>
        ) : isVoice ? (
          <View
            style={[
              s.voiceBubble,
              isSent
                ? { backgroundColor: C.brinjal1 }
                : { backgroundColor: C.surface, borderColor: C.border, borderWidth: StyleSheet.hairlineWidth },
            ]}>
            {msg.status === 'failed' ? (
              <View style={s.voiceFailedRow}>
                <Pressable onPress={() => onRetryUpload(msg)} hitSlop={8} style={s.voiceFailedIconBtn} accessibilityLabel={t('messages.retry')}>
                  <FontAwesome5 name="redo" solid size={13} color={isSent ? '#fff' : C.brinjal1} />
                </Pressable>
                <Pressable onPress={() => onDeleteFailed(msg.id)} hitSlop={8} style={s.voiceFailedIconBtn} accessibilityLabel={t('common.delete')}>
                  <FontAwesome5 name="trash-alt" solid size={13} color={isSent ? '#fff' : '#EF4444'} />
                </Pressable>
                <FontAwesome5 name="exclamation-circle" solid size={16} color={isSent ? '#fff' : '#EF4444'} />
                <Text style={[s.voiceFailedTxt, { color: isSent ? '#fff' : C.text }]} numberOfLines={1}>
                  {t('messages.uploadFailed')}
                </Text>
              </View>
            ) : isPending ? (
              <View style={s.voiceUploadingRow}>
                <ActivityIndicator size="small" color={isSent ? '#fff' : C.brinjal1} />
                <Text style={[s.voiceUploadingTxt, { color: isSent ? '#fff' : C.textSecondary }]}>
                  {Math.round((msg.uploadProgress ?? 0) * 100)}%
                </Text>
              </View>
            ) : (
              <VoiceBubblePlayer
                url={msg.attachmentUrl!}
                waveform={msg.attachmentWaveform}
                durationSec={msg.attachmentDurationSec ?? 0}
                isSent={isSent}
                activeColor={C.brinjal1}
                mutedColor={C.textSecondary}
              />
            )}
          </View>
        ) : (
          <View style={[
            s.bubble,
            isSent
              ? [s.bubbleSent, { backgroundColor: C.brinjal1, opacity: isPending ? 0.65 : 1 }]
              : [s.bubbleReceived, { backgroundColor: C.surface, borderColor: C.border }],
          ]}>
            <Text style={[s.bubbleTxt, { color: isSent ? '#fff' : C.text }]}>{msg.text}</Text>
          </View>
        )}
        <View style={s.bubbleMeta}>
          {!!msg.editedAt && <Text style={[s.bubbleTime, { color: C.textSecondary }]}>{t('messages.editedLabel')} · </Text>}
          <Text style={[s.bubbleTime, { color: C.textSecondary }]}>{formatTime(msg.timestamp)}</Text>
          {isSent && (
            isPending
              ? <FontAwesome5 name="clock" size={11} color={C.textSecondary} />
              : isLast
              ? <FontAwesome5 name="check-double" solid size={12} color={C.brinjal1} />
              : <FontAwesome5 name="check" solid size={12} color={C.textSecondary} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CreatorChatRoomScreen() {
  const {
    id, name, avatar, userId: participantUserId, participantId, status: urlStatus, focusInput, campaignTitle, participantRole,
  } = useLocalSearchParams<{
    id: string; name?: string; avatar?: string; userId?: string; participantId?: string; status?: string; focusInput?: string; campaignTitle?: string; participantRole?: string;
  }>();
  const { user } = useAuth();
  const { t }    = useLanguage();
  const C        = useAppColors();
  const insets   = useSafeAreaInsets();
  const { flags } = usePlatformFlags();

  const [blockStatus, setBlockStatus] = useState<{ blockedByMe: boolean; blockedByOther: boolean } | null>(null);

  useEffect(() => {
    if (participantRole === 'CREATOR' && id) {
      chatService.getBlockStatus(id).then(setBlockStatus).catch(() => {});
    }
  }, [id, participantRole]);

  function openParticipantProfile() {
    if (!participantId) return;
    if (participantRole === 'BUSINESS') {
      router.push({ pathname: '/(creator)/business-detail', params: { id: participantId } });
    } else if (participantRole === 'CREATOR') {
      router.push({ pathname: '/(creator)/creator-detail', params: { id: participantId } });
    }
  }

  function handleBlockPress() {
    if (blockStatus?.blockedByMe) {
      chatService.unblockConversation(id)
        .then(() => setBlockStatus((prev) => ({ blockedByMe: false, blockedByOther: prev?.blockedByOther ?? false })))
        .catch(() => {});
      return;
    }
    Alert.alert(
      t('messages.blockConfirmTitle', { name: name ?? '' }),
      t('messages.blockConfirmBody', { name: name ?? '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('messages.block'),
          style: 'destructive',
          onPress: () => {
            chatService.blockConversation(id)
              .then(() => setBlockStatus((prev) => ({ blockedByMe: true, blockedByOther: prev?.blockedByOther ?? false })))
              .catch(() => {});
          },
        },
      ],
    );
  }

  const [messages, setMessages]       = useState<Message[]>([]);
  const [messagesError, setMessagesError] = useState('');
  const [status, setStatus]           = useState<'PENDING' | 'ACCEPTED' | 'DECLINED'>(
    (urlStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED') ?? 'ACCEPTED',
  );
  const [text, setText]               = useState('');
  // Mirrors `text` (see the effect below) so handleSend's deferred callback
  // can read the latest value without closing over a stale render's `text`.
  const textRef                       = useRef('');
  useEffect(() => { textRef.current = text; }, [text]);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [acting, setActing]           = useState<'accept' | 'decline' | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [emojiOpen, setEmojiOpen]     = useState(false);
  const [presence, setPresence]       = useState<{ online: boolean; lastSeenAt: string | null } | null>(null);
  const listRef         = useRef<FlatList>(null);
  const inputRef        = useRef<TextInput>(null);
  const isSending       = useRef(false);
  const uploadTasks     = useRef<Record<string, { start: () => Promise<Message>; cancel: () => void }>>({});
  const typingTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingEmitted = useRef(false);
  const seenTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const personName  = name ?? 'Chat';
  const personColor = avatarColor(personName);
  const personAvatar = avatar || undefined;
  const [personAvatarFailed, setPersonAvatarFailed] = useState(false);

  // Scroll to offset 0 = visual bottom for inverted FlatList
  function scrollToBottom(animated = true) {
    listRef.current?.scrollToOffset({ offset: 0, animated });
  }

  function markSeen() {
    if (seenTimer.current) clearTimeout(seenTimer.current);
    seenTimer.current = setTimeout(() => {
      chatService.markSeen(id)
        .then(() => {
          messagingEvents.refresh();
          notificationService.markReadByRef(id).catch(() => null);
        })
        .catch(() => null);
    }, 800);
  }

  // Load messages
  function loadMessages() {
    if (!id) return;
    setMessagesError('');
    chatService.getMessages(id)
      .then((msgs) => {
        // Keep any reconstructed pending-upload bubble(s) — they have no DB
        // row yet, so the server list never includes them; merging (instead
        // of replacing outright) is what keeps an in-progress video visible
        // across this same refresh.
        setMessages((prev) => [...msgs, ...prev.filter((m) => m.id.startsWith('temp-upload-'))]);
      })
      .catch((e) => setMessagesError(e instanceof Error ? e.message : t('messages.loadFailedSub')));
  }

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectedAt]);

  useEffect(() => {
    clearComposer();
    const convStatus = (urlStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED') ?? 'ACCEPTED';
    setStatus(convStatus);
    if (!id) { setMessages([]); return; }
    // Reconstruct any video upload(s) still running for this conversation
    // before wiping/refetching — otherwise a video sent, then navigated away
    // from mid-upload, would appear to vanish until it finishes.
    setMessages([]);
    getActiveUploadsFor({ targetType: 'chat', conversationId: id }).forEach(attachToActiveUpload);
    loadMessages();
    if (convStatus === 'ACCEPTED') markSeen();
    if (focusInput === 'true' && convStatus === 'ACCEPTED') {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [id]);

  // Report focus so GlobalUploadBanner knows not to duplicate this
  // conversation's own inline upload progress while it's on screen.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setFocusedUploadTarget({ targetType: 'chat', conversationId: id });
      return () => setFocusedUploadTarget(null);
    }, [id])
  );

  // Incoming messages via NotificationContext's forwarded socket event bus
  useEffect(() => {
    if (!id) return;
    return incomingMessageEvents.subscribe((data) => {
      if (data.conversationId !== id) return;
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
  }, [id]);

  // Socket: typing indicators + room presence
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;
    socket.emit('join:conversation', { conversationId: id });

    const onTypingStart = (data: { conversationId: string }) => { if (data.conversationId === id) setOtherTyping(true); };
    const onTypingStop  = (data: { conversationId: string }) => { if (data.conversationId === id) setOtherTyping(false); };
    const onReconnect   = () => { socket.emit('join:conversation', { conversationId: id }); };
    // The other participant "delete for everyone"-ing a message — tombstone it live.
    const onMessageDeleted = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId !== id) return;
      setMessages((prev) => prev.map((m) =>
        m.id === data.messageId ? { ...m, isDeleted: true, text: '', attachmentUrl: null, attachmentName: null } : m
      ));
    };
    // The other participant edited a message — apply the update live.
    const onMessageEdited = (data: { conversationId: string; message: ApiMessage }) => {
      if (data.conversationId !== id) return;
      const edited = toMessage(data.message);
      setMessages((prev) => prev.map((m) => (m.id === edited.id ? edited : m)));
    };
    // A socket-sent text message was rejected server-side (e.g. the new
    // messages-per-minute / duplicate-message rate limits) — the socket path
    // never otherwise resolves on failure (no ack), so without this the
    // optimistic bubble would sit there forever with no explanation.
    const onMessageError = (data: { conversationId: string; message?: string }) => {
      if (data.conversationId !== id) return;
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
      socket.emit('leave:conversation', { conversationId: id });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (seenTimer.current)   clearTimeout(seenTimer.current);
    };
  }, [id]);

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
      await chatService.deleteMessage(id, msg.id, forEveryone);
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

  // Collapse the composer back to a single line — the native multiline
  // TextInput doesn't shrink on its own when `text` is cleared, so every
  // call site that clears it also resets this.
  function clearComposer() {
    setText('');
    setInputHeight(MIN_INPUT_HEIGHT);
    setEditingMessage(null);
  }

  async function handleSaveEdit() {
    if (!editingMessage || !text.trim()) return;
    const content = text.trim();
    const msgId = editingMessage.id;
    if (content === editingMessage.text) { clearComposer(); return; }
    try {
      const updated = await chatService.editMessage(id, msgId, content);
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
      if (isTypingEmitted.current) { socket.emit('typing:stop', { conversationId: id }); isTypingEmitted.current = false; }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      return;
    }
    if (!isTypingEmitted.current) { socket.emit('typing:start', { conversationId: id }); isTypingEmitted.current = true; }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: id });
      isTypingEmitted.current = false;
    }, 2000);
  }

  async function handleRespond(action: 'accept' | 'decline') {
    setActing(action);
    try {
      await chatService.respondToRequest(id, action);
      setStatus(action === 'accept' ? 'ACCEPTED' : 'DECLINED');
      if (action === 'accept') { markSeen(); }
      else { messagingEvents.refresh(); router.back(); }
    } finally {
      setActing(null);
    }
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

      // Stop typing indicator
      if (socket && isTypingEmitted.current) {
        socket.emit('typing:stop', { conversationId: id });
        isTypingEmitted.current = false;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);

      // Optimistic update — show message immediately at bottom
      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId, conversationId: id,
        senderId: user?.id ?? '', text: content,
        timestamp: new Date().toISOString(), status: 'sending',
        type: 'TEXT',
      };
      setMessages((prev) => [...prev, optimistic]);
      textRef.current = '';
      clearComposer();
      scrollToBottom();

      if (socket?.connected) {
        socket.emit('message:send', { conversationId: id, content });
        // The server echoes message:new back; the subscriber above replaces the temp message
        isSending.current = false;
      } else {
        chatService.sendMessage(id, content)
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
      socket.emit('typing:stop', { conversationId: id });
      isTypingEmitted.current = false;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId, conversationId: id,
      senderId: user?.id ?? '', text: caption,
      timestamp: new Date().toISOString(), status: 'sending',
      type, attachmentUrl: file.uri, attachmentName: file.name,
    };
    setMessages((prev) => [...prev, optimistic]);
    clearComposer();
    scrollToBottom();

    try {
      const msg = await chatService.sendAttachment(id, file, caption);
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
      id: tempId, conversationId: id,
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

  async function runVideoSend(msg: Message) {
    try {
      updateMsg(msg.id, { status: 'compressing', uploadProgress: 0 });
      const compressedUri = await compressVideo(msg.localUri!, (p) => updateMsg(msg.id, { uploadProgress: p }));
      updateMsg(msg.id, { status: 'uploading', uploadProgress: 0, localUri: compressedUri });

      const task = createVideoUploadTask(id, compressedUri, 'video/mp4', msg.text,
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
        socket.emit('typing:stop', { conversationId: id });
        isTypingEmitted.current = false;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);

      const optimistic: Message = {
        id: tempId, conversationId: id,
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
        id, msg.localUri!, msg.attachmentDurationSec ?? 0,
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
        socket.emit('typing:stop', { conversationId: id });
        isTypingEmitted.current = false;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);

      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId, conversationId: id,
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

  // Video is only allowed when chatting with a business — not creator<->creator.
  const allowVideo = participantRole !== 'CREATOR';

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

  const isPending  = status === 'PENDING';
  const isDeclined = status === 'DECLINED';
  const listItems  = buildItems(messages, user?.id ?? '', otherTyping);
  // Blocks starting a second video while one is already compressing/uploading/finalizing/sending.
  const hasActiveUpload = messages.some((m) => m.status === 'compressing' || m.status === 'uploading' || m.status === 'finalizing' || m.status === 'sending');

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton fallback="/(creator)/messages" />
        <Pressable
          style={({ pressed }) => [s.headerTouch, pressed && !!participantId && { opacity: 0.6 }]}
          onPress={openParticipantProfile} disabled={!participantId} hitSlop={4}>
          {personAvatar && !personAvatarFailed ? (
            <ExpoImage source={{ uri: personAvatar }} style={[s.headerAvatar, { borderColor: C.border }]} contentFit="cover" onError={() => setPersonAvatarFailed(true)} />
          ) : (
            <View style={[s.headerAvatar, { backgroundColor: personColor, borderColor: C.border }]}>
              <Text style={s.headerAvatarTxt}>{initials(personName)}</Text>
            </View>
          )}
          <View style={s.headerInfo}>
            <Text style={[s.headerName, { color: C.text }]} numberOfLines={1}>{personName}</Text>
            {otherTyping
              ? <Text style={[s.headerSub, { color: C.brinjal1 }]}>typing…</Text>
              : isPending
              ? (
                <View style={s.headerSubRow}>
                  <FontAwesome5 name="clock" size={11} color={C.draft} />
                  <Text style={[s.headerSub, { color: C.draft, marginTop: 0 }]}>{t('messages.requestPending')}</Text>
                </View>
              )
              : isDeclined
              ? <Text style={[s.headerSub, { color: C.error }]}>{t('messages.requestDeclined')}</Text>
              : (() => {
                  const label = presence ? formatPresence(t, presence.online, presence.lastSeenAt) : null;
                  return label
                    ? <Text style={[s.headerSub, { color: presence?.online ? C.active : C.textSecondary }]}>{label}</Text>
                    : null;
                })()}
          </View>
        </Pressable>
        {participantRole === 'CREATOR' && blockStatus && (
          <Pressable
            style={[
              s.blockBtn,
              blockStatus.blockedByMe
                ? { backgroundColor: '#EEF2FF', borderColor: C.brinjal1 }
                : { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
            ]}
            hitSlop={4}
            onPress={handleBlockPress}
          >
            <FontAwesome5
              name={blockStatus.blockedByMe ? 'lock-open' : 'ban'}
              size={13}
              color={blockStatus.blockedByMe ? C.brinjal1 : '#EF4444'}
            />
            <Text style={[s.blockBtnTxt, { color: blockStatus.blockedByMe ? C.brinjal1 : '#EF4444' }]}>
              {blockStatus.blockedByMe ? t('messages.unblock') : t('messages.block')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Campaign banner ── */}
      {!!campaignTitle && (
        <View style={[s.campaignBar, { backgroundColor: C.primaryLight, borderBottomColor: C.border }]}>
          <FontAwesome5 name="briefcase" solid size={13} color={C.brinjal1} />
          <Text style={[s.campaignBarTxt, { color: C.brinjal1 }]} numberOfLines={1}>{campaignTitle}</Text>
        </View>
      )}

      {/* ── Accept / Decline bar for PENDING ── */}
      {isPending && (
        <View style={[s.requestBar, { backgroundColor: '#FEF3C7', borderBottomColor: '#FDE68A' }]}>
          <View style={s.requestBarTop}>
            <FontAwesome5 name="briefcase" solid size={14} color="#92400E" />
            <Text style={[s.requestBarTxt, { color: '#92400E' }]}>
              {t('messages.requestFrom', { name: personName })}
            </Text>
          </View>
          <View style={s.requestBarActions}>
            <Pressable
              style={[s.declineBtn, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
              onPress={() => handleRespond('decline')}
              disabled={acting !== null}>
              {acting === 'decline'
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <><FontAwesome5 name="times-circle" solid size={15} color="#EF4444" /><Text style={[s.declineTxt, { color: '#EF4444' }]}>{t('messages.decline')}</Text></>}
            </Pressable>
            <Pressable
              style={[s.acceptBtn, { backgroundColor: C.brinjal1 }]}
              onPress={() => handleRespond('accept')}
              disabled={acting !== null}>
              {acting === 'accept'
                ? <ActivityIndicator size="small" color="#fff" />
                : <><FontAwesome5 name="check-circle" solid size={15} color="#fff" /><Text style={s.acceptTxt}>{t('messages.accept')}</Text></>}
            </Pressable>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {/* inverted=true → newest messages at bottom, scroll up for history (Instagram pattern) */}
        <FlatList
          ref={listRef}
          style={[s.flex, { backgroundColor: C.background }]}
          data={listItems}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item }) => {
            if (item._k === 'date') {
              return (
                <View style={s.dateSepWrap}>
                  <View style={[s.dateSep, { backgroundColor: C.border }]} />
                  <View style={[s.datePill, { backgroundColor: C.surface }]}>
                    <Text style={[s.dateTxt, { color: C.textSecondary }]}>{item.label}</Text>
                  </View>
                  <View style={[s.dateSep, { backgroundColor: C.border }]} />
                </View>
              );
            }
            if (item._k === 'typing') return <TypingDots avatarName={personName} color={personColor} />;
            return (
              <MessageBubble
                msg={item.msg} isSent={item.isSent}
                showAvatar={item.showAvatar} isLast={item.isLast}
                personName={personName} personColor={personColor} personAvatar={personAvatar}
                onLongPress={() => handleMessageLongPress(item.msg)}
                onRetryUpload={(msg) => void (msg.type === 'VOICE' ? runVoiceSend(msg) : runVideoSend(msg))}
                onDeleteFailed={(msgId) => setMessages((prev) => prev.filter((m) => m.id !== msgId))}
                onCancelUpload={(msg) => uploadTasks.current[msg.id]?.cancel()}
              />
            );
          }}
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            messagesError ? (
              <View style={s.emptyWrap}>
                <View style={[s.emptyIcon, { backgroundColor: C.primaryLight }]}>
                  <FontAwesome5 name="exclamation-circle" solid size={36} color={C.brinjal1} />
                </View>
                <Text style={[s.emptyTitle, { color: C.text }]}>{t('messages.loadMessagesFailedTitle')}</Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>{messagesError}</Text>
                <Pressable onPress={loadMessages} style={s.retryBtn}>
                  <Text style={[s.retryBtnText, { color: C.brinjal1 }]}>{t('messages.retry')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.emptyWrap}>
                <View style={[s.emptyIcon, { backgroundColor: C.primaryLight }]}>
                  <FontAwesome5 name="comment-alt" size={36} color={C.brinjal1} />
                </View>
                <Text style={[s.emptyTitle, { color: C.text }]}>
                  {isPending ? t('messages.requestPending') : t('messages.startConversation')}
                </Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                  {isPending ? t('messages.acceptRequest') : t('messages.sendFirstMessage')}
                </Text>
              </View>
            )
          }
        />

        {/* ── Input bar ── */}
        {status === 'ACCEPTED' && !flags.messagingEnabled && (
          <View style={[s.inputBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 8, justifyContent: 'center' }]}>
            <Text style={[s.charCount, { color: C.textSecondary }]}>{t('messages.messagingDisabled')}</Text>
          </View>
        )}
        {status === 'ACCEPTED' && flags.messagingEnabled && (blockStatus?.blockedByMe || blockStatus?.blockedByOther) && (
          <View style={[s.inputBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 8, justifyContent: 'center' }]}>
            <Text style={[s.charCount, { color: C.textSecondary }]}>
              {blockStatus.blockedByMe ? t('messages.youBlockedUser') : t('messages.blockedByOther')}
            </Text>
          </View>
        )}
        {status === 'ACCEPTED' && flags.messagingEnabled && !blockStatus?.blockedByMe && !blockStatus?.blockedByOther && (
          <>
            {editingMessage && (
              <View style={[s.editingBanner, { backgroundColor: C.surface, borderTopColor: C.border }]}>
                <FontAwesome5 name="edit" size={14} color={C.brinjal1} />
                <Text style={[s.editingBannerTxt, { color: C.brinjal1 }]} numberOfLines={1}>{t('messages.editingMessage')}</Text>
                <Pressable onPress={clearComposer} hitSlop={8}>
                  <FontAwesome5 name="times" solid size={16} color={C.textSecondary} />
                </Pressable>
              </View>
            )}
            <View style={[s.inputBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: emojiOpen ? 8 : insets.bottom + 8 }]}>
              <Pressable style={s.iconBtn} onPress={handleCameraPress} hitSlop={4}>
                <FontAwesome5 name="camera" solid size={24} color={C.brinjal1} />
              </Pressable>
              <Pressable style={s.iconBtn} onPress={handleAttachmentPress} disabled={hasActiveUpload} hitSlop={4}>
                <FontAwesome5 name="images" solid size={24} color={hasActiveUpload ? C.textSecondary : C.brinjal1} />
              </Pressable>
              <View style={[s.inputWrap, { borderColor: C.border, backgroundColor: C.background }]}>
                <Pressable onPress={toggleEmojiPanel} hitSlop={4}>
                  <FontAwesome5 name={emojiOpen ? 'smile' : 'smile'} size={20} color={C.textSecondary} />
                </Pressable>
                <TextInput
                  ref={inputRef}
                  style={[s.input, { color: C.text, height: Math.min(Math.max(MIN_INPUT_HEIGHT, inputHeight), MAX_INPUT_HEIGHT) }]}
                  value={text}
                  onChangeText={handleTextChange}
                  onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                  onFocus={() => setEmojiOpen(false)}
                  placeholder={t('messages.typePlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  multiline
                  maxLength={1000}
                  returnKeyType="default"
                />
                {text.length > 900 && (
                  <Text style={[s.charCount, { color: C.textSecondary }]}>{1000 - text.length}</Text>
                )}
              </View>
              {text.trim() || editingMessage ? (
                <Pressable
                  style={[s.sendBtn, { backgroundColor: C.brinjal1 }]}
                  onPress={handleSend}>
                  <FontAwesome5 name={editingMessage ? 'check' : 'paper-plane'} solid size={18} color="#fff" />
                </Pressable>
              ) : (
                <VoiceRecorderButton disabled={hasActiveUpload || isSending.current} onRecorded={handleSendVoiceAttachment} />
              )}
            </View>

            {/* ── Emoji panel (replaces the system keyboard when open) ── */}
            {emojiOpen && (
              <View style={[s.emojiPanel, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom }]}>
                <FlatList
                  data={CHAT_EMOJIS}
                  keyExtractor={(e) => e}
                  numColumns={8}
                  renderItem={({ item }) => (
                    <Pressable style={s.emojiItem} onPress={() => insertEmoji(item)}>
                      <Text style={s.emojiTxt}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  flex:      { flex: 1 },

  // Header
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
  headerTouch:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 11, paddingVertical: 7 },
  blockBtnTxt:     { fontSize: 12, fontFamily: F.semibold },
  headerAvatar:    { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  headerAvatarTxt: { color: '#fff', fontSize: 14, fontFamily: F.bold },
  headerInfo:      { flex: 1 },
  headerSubRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  headerName:      { fontSize: 16, fontFamily: F.bold },
  headerSub:       { fontSize: 11, fontFamily: F.medium, marginTop: 1 },

  // Campaign banner
  campaignBar:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  campaignBarTxt: { flex: 1, fontSize: 12, fontFamily: F.semibold },

  // Request bar
  requestBar:        { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  requestBarTop:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestBarTxt:     { flex: 1, fontSize: 13, fontFamily: F.semibold },
  requestBarActions: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: RADIUS.sm, borderWidth: 1.5, height: 40 },
  declineTxt: { fontSize: 13, fontFamily: F.semibold },
  acceptBtn:  { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: RADIUS.sm, height: 40 },
  acceptTxt:  { fontSize: 13, color: '#fff', fontFamily: F.bold },

  // Message list
  msgList: { padding: 12, paddingBottom: 8, gap: 2 },

  // Date separator
  dateSepWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16, gap: 8 },
  dateSep:     { flex: 1, height: StyleSheet.hairlineWidth },
  datePill:    { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  dateTxt:     { fontSize: 11, fontFamily: F.medium },

  // Bubbles
  bubbleRow:         { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 1, paddingHorizontal: 4 },
  bubbleRowSent:     { justifyContent: 'flex-end' },
  bubbleRowReceived: { justifyContent: 'flex-start' },
  msgAvatar:    { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  msgAvatarTxt: { color: '#fff', fontSize: 10, fontFamily: F.bold },
  avatarSpacer: { width: 28 },
  bubbleWrap:         { maxWidth: '75%' },
  bubbleWrapSent:     { alignItems: 'flex-end' },
  bubbleWrapReceived: { alignItems: 'flex-start' },
  bubble:         { borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleSent:     { borderBottomRightRadius: 4 },
  bubbleReceived: { borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  deletedBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.lg },
  deletedTxt: { fontSize: 13, fontFamily: F.regular, fontStyle: 'italic' },
  bubbleTxt:  { fontSize: 15, lineHeight: 22, fontFamily: F.regular },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 2 },
  bubbleTime: { fontSize: 10, fontFamily: F.regular },

  // Attachments
  imageBubble:          { width: 210, height: 210, borderRadius: RADIUS.lg, overflow: 'hidden' },
  attachmentImage:      { width: '100%', height: '100%' },
  imageUploadingOverlay:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', gap: 6 },
  captionBubble:        { marginTop: 4 },
  videoPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  durationBadge:    { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  durationBadgeTxt: { color: '#fff', fontSize: 11, fontFamily: F.semibold },
  videoStatusTxt:   { color: '#fff', fontSize: 12, fontFamily: F.semibold },
  videoStatusDetailTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontFamily: F.regular, textAlign: 'center', paddingHorizontal: 10, marginTop: 2 },
  failedActions:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  failedBtn:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: '#fff' },
  failedBtnTxt:     { color: '#111827', fontSize: 11, fontFamily: F.semibold },
  progressTrack:    { width: '70%', height: 4, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: RADIUS.full, backgroundColor: '#fff' },
  cancelUploadBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.2)' },
  cancelUploadTxt:  { color: '#fff', fontSize: 11, fontFamily: F.semibold },
  fileBubble:           { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, maxWidth: 220 },
  fileNameTxt:          { flex: 1, fontSize: 13, fontFamily: F.medium },

  voiceBubble:      { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 8, minWidth: 210, maxWidth: 260 },
  voiceUploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  voiceUploadingTxt: { fontSize: 12, fontFamily: F.medium },
  voiceFailedRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  voiceFailedIconBtn: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  voiceFailedTxt:   { flex: 1, fontSize: 12, fontFamily: F.medium },

  // Empty
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 80 },
  emptyIcon:  { width: 72, height: 72, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontFamily: F.bold, textAlign: 'center' },
  emptyHint:  { fontSize: 13, fontFamily: F.regular, textAlign: 'center', lineHeight: 19 },
  retryBtn:     { marginTop: 6, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { fontSize: 14, fontFamily: F.bold },

  // Input
  inputBar:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 10, paddingBottom: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  editingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  editingBannerTxt: { flex: 1, fontSize: 12, fontFamily: F.semibold },
  iconBtn:   { width: 36, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, maxHeight: 120, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 8 },
  input:     { flex: 1, fontSize: 15, fontFamily: F.regular, paddingVertical: 2 },
  charCount: { fontSize: 10, fontFamily: F.regular },
  sendBtn:   { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },

  // Emoji panel
  emojiPanel: { height: 260, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingTop: 8 },
  emojiItem:  { width: `${100 / 8}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  emojiTxt:   { fontSize: 26 },
});
