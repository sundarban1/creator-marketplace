import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Image,
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
import { VoiceRecorderButton } from '@/features/chat/components/VoiceRecorderButton';
import { VoiceBubblePlayer } from '@/features/chat/components/VoiceBubblePlayer';
import { F, RADIUS } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BackButton } from '@/components/BackButton';
import { CHAT_EMOJIS } from '@/utilities/chatEmojis';
import { formatPresence } from '@/utilities/presence';
import { useChatConversation } from '@/hooks/useChatConversation';
import type { Message } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#7C3AED', '#0EA5E9', '#059669', '#D97706', '#EC4899', '#06B6D4', '#EF4444'];

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
    const showAvatar = !isSent && (!prevInArr || prevInArr.senderId !== msg.senderId);
    const isLast     = !msg.id.startsWith('temp-') && msg.id === lastSentId;

    items.push({ _k: 'msg', msg, isSent, showAvatar, isLast, id: msg.id });

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

// ── Local video preview (pending/failed only) — see the creator chat screen's
// identical component for the full rationale (paused/muted first-frame preview,
// swapped for a plain cached thumbnail once sent). ──

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
            <FontAwesome5 name="file-alt" solid size={19} color={isSent ? '#fff' : C.brinjal1} />
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
            {!isPending && msg.status !== 'failed' && msg.attachmentDurationSec != null && (
              <Text style={[s.voiceDurationLine, { color: isSent ? 'rgba(255,255,255,0.75)' : C.textSecondary }]}>
                {formatDuration(msg.attachmentDurationSec)}
              </Text>
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
        {isVoice && msg.status === 'failed' && (
          // Two distinct buttons, not two icons crammed inside the voice bubble
          // card above — each gets its own outlined pill, mirroring the failed
          // video attachment's retry/delete pattern (s.failedBtn) elsewhere in
          // this file.
          <View style={s.voiceFailedActions}>
            <Pressable onPress={() => onRetryUpload(msg)} style={[s.voiceFailedActionBtn, { borderColor: C.brinjal1 }]}>
              <FontAwesome5 name="redo" solid size={11} color={C.brinjal1} />
              <Text style={[s.voiceFailedActionTxt, { color: C.brinjal1 }]}>{t('messages.retry')}</Text>
            </Pressable>
            <Pressable onPress={() => onDeleteFailed(msg.id)} style={[s.voiceFailedActionBtn, { borderColor: '#EF4444' }]}>
              <FontAwesome5 name="trash-alt" solid size={11} color="#EF4444" />
              <Text style={[s.voiceFailedActionTxt, { color: '#EF4444' }]}>{t('common.delete')}</Text>
            </Pressable>
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

export default function BusinessChatRoomScreen() {
  const {
    id, name, avatar, userId: participantUserId, participantId, status: urlStatus, campaignTitle,
  } = useLocalSearchParams<{
    id: string; name?: string; avatar?: string; userId?: string; participantId?: string; status?: string; campaignTitle?: string;
  }>();
  const { user } = useAuth();
  const { t }    = useLanguage();
  const C        = useAppColors();
  const insets   = useSafeAreaInsets();
  const { flags } = usePlatformFlags();

  const personName  = name ?? 'Chat';
  const personColor = avatarColor(personName);
  const personAvatar = avatar || undefined;
  const [personAvatarFailed, setPersonAvatarFailed] = useState(false);

  const chat = useChatConversation({
    conversationId: id,
    urlStatus,
    participantUserId,
  });

  function openParticipantProfile() {
    if (!participantId) return;
    router.push({ pathname: '/(business)/creator-detail', params: { id: participantId } });
  }

  const isPending  = chat.status === 'PENDING';
  const isDeclined = chat.status === 'DECLINED';
  const listItems  = buildItems(chat.messages, user?.id ?? '', chat.otherTyping);
  // Blocks starting a second video while one is already compressing/uploading/sending.
  const hasActiveUpload = chat.messages.some((m) => m.status === 'compressing' || m.status === 'uploading' || m.status === 'finalizing' || m.status === 'sending');

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* ── Header ── */}
      <View style={{ backgroundColor: C.surface }}>
        <View style={s.header}>
          <BackButton fallback="/(business)/messages" />
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
              {chat.otherTyping
                ? <Text style={[s.headerSub, { color: C.brinjal1 }]}>typing…</Text>
                : isPending
                ? (
                  <View style={s.headerSubRow}>
                    <FontAwesome5 name="clock" size={11} color={C.draft} />
                    <Text style={[s.headerSub, { color: C.draft, marginTop: 0 }]}>{t('messages.waitingResponse')}</Text>
                  </View>
                )
                : isDeclined
                ? <Text style={[s.headerSub, { color: C.error }]}>{t('messages.requestDeclined')}</Text>
                : (() => {
                    const label = chat.presence ? formatPresence(t, chat.presence.online, chat.presence.lastSeenAt) : null;
                    return label
                      ? <Text style={[s.headerSub, { color: chat.presence?.online ? C.active : C.textSecondary }]}>{label}</Text>
                      : null;
                  })()}
            </View>
          </Pressable>
        </View>
        <View style={[s.headerSeparator, { backgroundColor: C.border }]} />
      </View>

      {/* ── Campaign banner ── */}
      {!!campaignTitle && (
        <View style={[s.campaignBar, { backgroundColor: C.primaryLight, borderBottomColor: C.border }]}>
          <FontAwesome5 name="briefcase" solid size={13} color={C.brinjal1} />
          <Text style={[s.campaignBarTxt, { color: C.brinjal1 }]} numberOfLines={1}>{campaignTitle}</Text>
        </View>
      )}

      {/* ── Pending notice ── */}
      {isPending && (
        <View style={[s.pendingBanner, { backgroundColor: '#FFFBEB', borderBottomColor: '#FDE68A' }]}>
          <FontAwesome5 name="clock" size={14} color="#92400E" />
          <Text style={[s.pendingTxt, { color: '#92400E' }]}>{t('messages.pendingNotice', { name: personName })}</Text>
        </View>
      )}

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {/* inverted=true → newest messages at bottom, scroll up for history (Instagram pattern) */}
        <FlatList
          ref={chat.listRef}
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
                onLongPress={() => chat.handleMessageLongPress(item.msg)}
                onRetryUpload={(msg) => void (msg.type === 'VOICE' ? chat.runVoiceSend(msg) : chat.runVideoSend(msg))}
                onDeleteFailed={(msgId) => chat.setMessages((prev) => prev.filter((m) => m.id !== msgId))}
                onCancelUpload={(msg) => chat.uploadTasks.current[msg.id]?.cancel()}
              />
            );
          }}
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            chat.messagesError ? (
              <View style={s.emptyWrap}>
                <View style={[s.emptyIcon, { backgroundColor: C.primaryLight }]}>
                  <FontAwesome5 name="exclamation-circle" solid size={36} color={C.brinjal1} />
                </View>
                <Text style={[s.emptyTitle, { color: C.text }]}>{t('messages.loadMessagesFailedTitle')}</Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>{chat.messagesError}</Text>
                <Pressable onPress={chat.loadMessages} style={s.retryBtn}>
                  <Text style={[s.retryBtnText, { color: C.brinjal1 }]}>{t('messages.retry')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.emptyWrap}>
                <View style={[s.emptyIcon, { backgroundColor: C.primaryLight }]}>
                  <FontAwesome5 name="comment-alt" size={36} color={C.brinjal1} />
                </View>
                <Text style={[s.emptyTitle, { color: C.text }]}>
                  {isPending ? t('messages.waitingResponse') : t('messages.startConversation')}
                </Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                  {isPending ? t('messages.requestWillAppear') : t('messages.sendFirstMessage')}
                </Text>
              </View>
            )
          }
        />

        {/* ── Input bar ── */}
        {chat.status === 'ACCEPTED' && !flags.messagingEnabled && (
          <View style={[s.inputBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 8, justifyContent: 'center' }]}>
            <Text style={[s.charCount, { color: C.textSecondary }]}>{t('messages.messagingDisabled')}</Text>
          </View>
        )}
        {chat.status === 'ACCEPTED' && flags.messagingEnabled && (
          <>
            {chat.editingMessage && (
              <View style={[s.editingBanner, { backgroundColor: C.surface, borderTopColor: C.border }]}>
                <FontAwesome5 name="edit" size={14} color={C.brinjal1} />
                <Text style={[s.editingBannerTxt, { color: C.brinjal1 }]} numberOfLines={1}>{t('messages.editingMessage')}</Text>
                <Pressable onPress={chat.clearComposer} hitSlop={8}>
                  <FontAwesome5 name="times" solid size={16} color={C.textSecondary} />
                </Pressable>
              </View>
            )}
            <View style={[s.inputBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: chat.emojiOpen ? 8 : insets.bottom + 8 }]}>
              <Pressable style={s.iconBtn} onPress={chat.handleCameraPress} hitSlop={4}>
                <FontAwesome5 name="camera" solid size={24} color={C.brinjal1} />
              </Pressable>
              <Pressable style={s.iconBtn} onPress={chat.handleAttachmentPress} disabled={hasActiveUpload} hitSlop={4}>
                <FontAwesome5 name="images" solid size={24} color={hasActiveUpload ? C.textSecondary : C.brinjal1} />
              </Pressable>
              <View style={[s.inputWrap, { borderColor: C.border, backgroundColor: C.background }]}>
                <Pressable onPress={chat.toggleEmojiPanel} hitSlop={4}>
                  <FontAwesome5 name={chat.emojiOpen ? 'smile' : 'smile'} size={20} color={C.textSecondary} />
                </Pressable>
                <TextInput
                  ref={chat.inputRef}
                  style={[s.input, { color: C.text }]}
                  value={chat.text}
                  onChangeText={chat.handleTextChange}
                  onFocus={() => chat.setEmojiOpen(false)}
                  placeholder={t('messages.typePlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  multiline
                  maxLength={1000}
                  returnKeyType="default"
                />
                {chat.text.length > 900 && (
                  <Text style={[s.charCount, { color: C.textSecondary }]}>{1000 - chat.text.length}</Text>
                )}
              </View>
              {chat.text.trim() || chat.editingMessage ? (
                <Pressable
                  style={[s.sendBtn, { backgroundColor: C.brinjal1 }]}
                  onPress={chat.handleSend}>
                  <FontAwesome5 name={chat.editingMessage ? 'check' : 'paper-plane'} solid size={18} color="#fff" />
                </Pressable>
              ) : (
                <VoiceRecorderButton disabled={hasActiveUpload || chat.isSending.current} onRecorded={chat.handleSendVoiceAttachment} />
              )}
            </View>

            {/* ── Emoji panel (replaces the system keyboard when open) ── */}
            {chat.emojiOpen && (
              <View style={[s.emojiPanel, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom }]}>
                <FlatList
                  data={CHAT_EMOJIS}
                  keyExtractor={(e) => e}
                  numColumns={8}
                  renderItem={({ item }) => (
                    <Pressable style={s.emojiItem} onPress={() => chat.insertEmoji(item)}>
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
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  headerSeparator: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  headerTouch:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar:    { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  headerAvatarTxt: { color: '#fff', fontSize: 14, fontFamily: F.bold },
  headerInfo:      { flex: 1 },
  headerSubRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  headerName:      { fontSize: 16, fontFamily: F.bold },
  headerSub:       { fontSize: 11, fontFamily: F.medium, marginTop: 1 },

  // Campaign banner
  campaignBar:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  campaignBarTxt: { flex: 1, fontSize: 12, fontFamily: F.semibold },

  // Pending banner
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1 },
  pendingTxt:    { flex: 1, fontSize: 12, fontFamily: F.medium, lineHeight: 17 },

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
  imageUploadingOverlay:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', gap: 6 },
  captionBubble:        { marginTop: 4 },
  videoPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  durationBadge:    { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  durationBadgeTxt: { color: '#fff', fontSize: 11, fontFamily: F.semibold },
  videoStatusTxt:   { color: '#fff', fontSize: 14, fontFamily: F.semibold, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
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
  voiceFailedRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  voiceFailedTxt:   { flex: 1, fontSize: 12, fontFamily: F.medium },
  voiceFailedActions:  { flexDirection: 'row', gap: 8, marginTop: 6 },
  voiceFailedActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5 },
  voiceFailedActionTxt: { fontSize: 11, fontFamily: F.semibold },
  voiceDurationLine: { fontSize: 11, fontFamily: F.regular, marginTop: -8, alignSelf: 'flex-end', marginRight: 10 },

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
