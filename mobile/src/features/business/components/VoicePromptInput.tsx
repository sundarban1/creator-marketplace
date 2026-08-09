import { FontAwesome5 } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync,
  useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

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

// Number of bars in the live level meter shown while recording.
const BAR_COUNT = 28;
// dB floor for normalizing `metering` (roughly silence) up to 0 (loudest) —
// on both iOS and Android, expo-audio reports metering in this dB range when
// isMeteringEnabled is set, so this doesn't need a per-platform branch.
const METERING_FLOOR_DB = -50;

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
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 100);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const [phase, setPhase] = useState<Phase>('idle');
  // Rolling history of normalized (0–1) levels driving the live bar meter —
  // shifts left and appends the newest reading each time metering updates.
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.05));
  // Source of truth for control flow (start/stop decisions) — recorderState
  // is polled on an interval and can lag a real press by up to that interval,
  // which would misfire on a very quick tap-release. Only used for display.
  const isRecordingRef = useRef(false);
  const startedAtRef = useRef(0);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Assert this up front, not only once recording starts — iOS has one
    // shared AVAudioSession for the whole app, and the sibling Quick Audio
    // Samples (TTS, in create-campaign.tsx) would otherwise play silently
    // under the hardware mute switch until the brand happened to record
    // something first.
    void setAudioModeAsync({ playsInSilentMode: true });
    // Resolve the mic permission prompt here, on mount, instead of inside
    // handlePressIn. This component only mounts once the brand has already
    // picked Audio mode, so it's an expected moment to ask — and critically,
    // it keeps the OS permission dialog from popping up in the middle of the
    // brand's very first press-and-hold gesture. When it did, the dialog
    // stole the touch, so the eventual press-out never reached the
    // Pressable and the "hold" behaved like a toggle instead.
    void requestRecordingPermissionsAsync();
    // No player.pause() here — useAudioPlayer() already releases its native
    // object on unmount, and calling pause() after (or racing) that release
    // throws NativeSharedObjectNotFoundException.
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      // Screen torn down mid-hold (Android back-gesture, Activity recreated by
      // a stricter OEM memory manager, split-screen resize, etc.) — release
      // the mic and the audio-mode flag rather than leaving allowsRecording
      // stuck true and the native recorder object dangling.
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        recorder.stop().catch(() => {});
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      }
    };
  }, []);

  // Feeds the live bar meter — `metering` (dB) updates on the same 100ms poll
  // as recorderState itself, so this just normalizes and appends each tick.
  useEffect(() => {
    if (phase !== 'recording') return;
    const db = recorderState.metering;
    if (db === undefined) return;
    const norm = Math.max(0.05, Math.min(1, (db - METERING_FLOOR_DB) / -METERING_FLOOR_DB));
    setLevels((prev) => [...prev.slice(1), norm]);
  }, [recorderState.metering, phase]);

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
      setLevels(Array(BAR_COUNT).fill(0.05));
      setPhase('recording');
      // Auto-release at the cap instead of rejecting afterward — the brand is
      // still physically holding the button and has no other way to know
      // they've hit the 2-minute limit.
      autoStopTimerRef.current = setTimeout(() => { void finishRecording(); }, MAX_RECORDING_MS);
    } catch (err) {
      // setAudioModeAsync/prepareToRecordAsync/record() can throw even after
      // permission is granted — mic held by another app, OEM audio-focus
      // quirks, etc. Report it so device-specific failures here are as
      // diagnosable as chat's VoiceRecorderButton already are.
      Sentry.captureException(err, { tags: { feature: 'create-event-voice-prompt' } });
      onError(t('createEvent.audioTryAgain'));
      setPhase('idle');
    }
  }

  async function finishRecording() {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    const heldMs = Date.now() - startedAtRef.current;
    try {
      // `recorder.stop()` itself can reject beyond the "already stopped" case
      // this guards against — e.g. NativeSharedObjectNotFoundException if the
      // recorder's native object was already released by a backgrounded/
      // recreated Activity racing this call, which is far more common on
      // Android's process lifecycle than iOS's.
      try { await recorder.stop(); } catch { /* already stopped, or native object gone */ }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
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
    } catch (err) {
      // Guarantees the mic can never get stuck showing "recording" forever —
      // without this, any unexpected throw in the stop path left the UI
      // frozen mid-hold with no error and no way out except leaving the screen.
      Sentry.captureException(err, { tags: { feature: 'create-event-voice-prompt' } });
      onError(t('createEvent.audioTryAgain'));
      setPhase('idle');
    }
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
            style={[styles.listenPill, { borderColor: busy ? C.border : C.brinjal1, backgroundColor: busy ? C.background : `${C.brinjal1}1A` }]}
            disabled={busy}
            onPress={handleTogglePlayback}
            accessibilityLabel={playerStatus.playing ? t('createEvent.audioPause') : t('createEvent.audioPlay')}>
            <FontAwesome5 name={playerStatus.playing ? 'pause' : 'play'} solid size={16} color={busy ? C.textSecondary : C.brinjal1} />
            <Text style={[styles.listenText, { color: busy ? C.textSecondary : C.brinjal1 }]}>
              {playerStatus.playing ? t('createEvent.audioPause') : t('createEvent.audioListenToRecording')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.sayAgainPill, { borderColor: C.border, backgroundColor: C.background }]}
            disabled={busy}
            onPress={handleSayAgain}>
            <FontAwesome5 name="sync-alt" solid size={14} color={C.text} />
            <Text style={[styles.sayAgainText, { color: C.text }]}>{t('createEvent.audioSayAgain')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* Absolutely positioned within this component (not a react-native
          Modal) so it never affects layout, but also never opens a new
          native window mid-gesture. On Android, a Modal mounts as its own
          Dialog/Window — doing that while the finger is still down on the
          mic Pressable below steals the in-flight touch, so onPressOut
          never arrives and recording never stops (iOS composites Modal in
          the same window, so it never hit this). pointerEvents "none" lets
          press-and-hold on the mic keep working underneath it. */}
      {phase === 'recording' && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={[styles.meterCard, { backgroundColor: '#fff' }]}>
            <View style={styles.meter}>
              {levels.map((lvl, i) => (
                <View
                  key={i}
                  style={[styles.meterBar, { height: 4 + lvl * 32, backgroundColor: '#EF4444' }]}
                />
              ))}
            </View>
          </View>
        </View>
      )}
      <Pressable
        style={[
          styles.micBtn,
          { backgroundColor: recorderState.isRecording ? '#EF4444' : busy ? C.border : C.brinjal1 },
        ]}
        disabled={disabled}
        hitSlop={12}
        onPressIn={() => void handlePressIn()}
        onPressOut={() => void handlePressOut()}>
        <FontAwesome5 name="microphone" solid size={recorderState.isRecording ? 36 : 32} color="#fff" />
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
  wrap:      { alignItems: 'center', gap: 10, paddingVertical: 14, position: 'relative' },
  micBtn:    { width: 84, height: 84, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  overlay:   { position: 'absolute', bottom: '100%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', marginBottom: 24, zIndex: 10 },
  meterCard: { borderRadius: RADIUS.lg, paddingHorizontal: 22, paddingVertical: 18, ...SHADOW.floating },
  meter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 36, width: 160 },
  meterBar:  { width: 3, borderRadius: 2 },
  hint:      { fontSize: 12, fontFamily: F.regular, textAlign: 'center' },
  reviewRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listenPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10 },
  listenText:   { fontSize: 13, fontFamily: F.medium },
  sayAgainPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10 },
  sayAgainText: { fontSize: 13, fontFamily: F.medium },
});
