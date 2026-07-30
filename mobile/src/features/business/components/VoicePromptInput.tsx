import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync,
  useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS } from '@/utilities/constants';

// Recordings shorter than this are rejected outright (with feedback, not
// silently) instead of being handed off — Whisper will still return *some*
// text for a too-brief clip (often a hallucinated phrase like "Thank you."
// on near-silent audio), which would otherwise sail through and generate a
// nonsense draft. Requiring a couple of real seconds of audio makes that
// failure mode far less likely.
const MIN_RECORDING_MS = 2500;

// Kolab V1 audio validation: max 2 minutes — the mic auto-releases at this
// point rather than rejecting a too-long recording outright, since the brand
// is still mid-hold and has no way to know they've hit a cap otherwise.
const MAX_RECORDING_MS = 120_000;

// Kolab V1 audio validation: max 25MB. In practice a 2-minute HIGH_QUALITY
// recording never gets remotely close to this, but it's a cheap defensive
// check against an unexpectedly large file before it's uploaded for transcription.
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Phase = 'idle' | 'recording' | 'review';

type Props = {
  // Fires once a recording passes basic validation (long enough, not over
  // the cap/size limit) and is ready to be reviewed — the caller doesn't
  // transcribe it yet, just remembers the uri until its own "Create Event"
  // button (already elsewhere on the page) is pressed.
  onRecorded: (uri: string) => void;
  // "Say again" was pressed — caller should forget the pending recording.
  onDiscard: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

// Press-and-hold mic, Messenger-style — release to stop. Recording doesn't
// transcribe or generate anything itself: once stopped, the mic is replaced
// with a Play button (to hear the recording back) and a "Say again" pill
// (discard and re-record). There's no separate confirm button here — the
// page's own existing "Create Event" button is what actually transcribes
// and generates, once a recording is ready (see onRecorded).
export function VoicePromptInput({ onRecorded, onDiscard, onError, disabled }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const [phase, setPhase] = useState<Phase>('idle');
  // Source of truth for control flow (start/stop decisions) — recorderState
  // is polled on an interval and can lag a real press by up to that interval,
  // which would misfire on a very quick tap-release. Only used for display.
  const isRecordingRef = useRef(false);
  const startedAtRef = useRef(0);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // No player.pause() here — useAudioPlayer() already releases its native
    // object on unmount, and calling pause() after (or racing) that release
    // throws NativeSharedObjectNotFoundException.
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    };
  }, []);

  async function handlePressIn() {
    if (disabled || phase !== 'idle' || isRecordingRef.current) return;
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        onError(t('createEvent.micPermissionDenied'));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      startedAtRef.current = Date.now();
      setPhase('recording');
      // Auto-release at the cap instead of rejecting afterward — the brand is
      // still physically holding the button and has no other way to know
      // they've hit the 2-minute limit.
      autoStopTimerRef.current = setTimeout(() => { void finishRecording(); }, MAX_RECORDING_MS);
    } catch {
      onError(t('createEvent.audioTryAgain'));
      setPhase('idle');
    }
  }

  async function finishRecording() {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    const heldMs = Date.now() - startedAtRef.current;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (!uri) { setPhase('idle'); return; }
    if (heldMs < MIN_RECORDING_MS) {
      onError(t('createEvent.audioTooShort'));
      setPhase('idle');
      return;
    }
    if (heldMs >= MAX_RECORDING_MS) {
      onError(t('createEvent.audioTooLong'));
      setPhase('idle');
      return;
    }
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    if (info?.exists && info.size > MAX_FILE_SIZE_BYTES) {
      onError(t('createEvent.audioTooLong'));
      setPhase('idle');
      return;
    }
    try { player.replace({ uri }); } catch { /* player's native object not ready — playback just won't work */ }
    setPhase('review');
    onRecorded(uri);
  }

  async function handlePressOut() {
    await finishRecording();
  }

  function handleTogglePlayback() {
    try {
      if (playerStatus.playing) player.pause();
      else player.play();
    } catch { /* native object already released — nothing to play/pause */ }
  }

  function handleSayAgain() {
    try { player.pause(); } catch { /* native object already released */ }
    setPhase('idle');
    onDiscard();
  }

  const busy = !!disabled;

  if (phase === 'review') {
    return (
      <View style={styles.wrap}>
        <View style={styles.reviewRow}>
          <Pressable
            style={[styles.micBtn, { backgroundColor: busy ? C.border : C.brinjal1 }]}
            disabled={busy}
            onPress={handleTogglePlayback}
            accessibilityLabel={playerStatus.playing ? t('createEvent.audioPause') : t('createEvent.audioPlay')}>
            <Ionicons name={playerStatus.playing ? 'pause' : 'play'} size={24} color="#fff" />
          </Pressable>
          <Pressable
            style={[styles.sayAgainPill, { borderColor: C.border, backgroundColor: C.background }]}
            disabled={busy}
            onPress={handleSayAgain}>
            <Ionicons name="refresh" size={14} color={C.text} />
            <Text style={[styles.sayAgainText, { color: C.text }]}>{t('createEvent.audioSayAgain')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[
          styles.micBtn,
          { backgroundColor: recorderState.isRecording ? '#EF4444' : busy ? C.border : C.brinjal1 },
        ]}
        disabled={disabled}
        onPressIn={() => void handlePressIn()}
        onPressOut={() => void handlePressOut()}>
        <Ionicons name="mic" size={recorderState.isRecording ? 30 : 26} color="#fff" />
      </Pressable>
      <Text style={[styles.hint, { color: C.textSecondary }]}>
        {recorderState.isRecording
          ? `${t('createEvent.recordingHintHold')} · ${formatDuration(recorderState.durationMillis)}`
          : t('createEvent.audioHoldHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:     { alignItems: 'center', gap: 10, paddingVertical: 14 },
  micBtn:   { width: 68, height: 68, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  hint:     { fontSize: 12, fontFamily: F.regular, textAlign: 'center' },
  reviewRow:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sayAgainPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10 },
  sayAgainText: { fontSize: 13, fontFamily: F.medium },
});
