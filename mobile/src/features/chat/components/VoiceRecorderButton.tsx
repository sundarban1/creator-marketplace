import { FontAwesome5 } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync,
  useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

// Spec's 1s floor — deliberately not VoicePromptInput's 2500ms, chat voice
// notes are meant to support much shorter clips than an AI event prompt.
const MIN_RECORDING_MS = 1000;
const MAX_RECORDING_MS = 120_000;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
// A real AAC clip, even the shortest allowed one, is always well above this —
// anything smaller means recording never actually captured audio.
const MIN_FILE_SIZE_BYTES = 1024;
const BAR_COUNT = 28;
const METERING_FLOOR_DB = -50;
const CANCEL_THRESHOLD_PX = -80;
const CANCEL_RESET_THRESHOLD_PX = -40;
const LOCK_THRESHOLD_PX = -80;

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Phase = 'idle' | 'recording' | 'cancelling' | 'locked';

export type VoiceRecorderResult = { uri: string; durationSec: number; waveform: number[] };

type Props = {
  // Fires once with an already-validated clip — no review/preview step
  // (Instagram-style: release sends immediately), unlike VoicePromptInput's
  // hold-then-review flow this component's recording engine is modeled on.
  onRecorded: (result: VoiceRecorderResult) => void;
  disabled?: boolean;
};

// `useAudioRecorder` below constructs a native AudioRecorder object
// synchronously during render (plus GestureDetector/Reanimated worklet
// setup) — expensive enough on first mount that, since this button sits
// inline in the chat composer, it was visibly delaying the whole input bar
// (camera/image/text-input/send) from painting together with the message
// list right after opening a conversation. Deferring the real button's
// mount to after the screen's initial transition/paint settles keeps that
// cost off the critical path; everything else in the composer is unaffected
// since it doesn't depend on this component. The placeholder below matches
// the real button's footprint exactly so there's no layout shift when it
// swaps in a beat later.
export function VoiceRecorderButton(props: Props) {
  const C = useAppColors();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // TEMP DIAGNOSTIC — measuring how long the InteractionManager queue takes
    // to drain on first mount. Remove after.
    const mountedAt = Date.now();
    console.log('[VOICE-BTN]', 'placeholder mounted at', mountedAt);
    const task = InteractionManager.runAfterInteractions(() => {
      console.log('[VOICE-BTN]', 'ready swap after', Date.now() - mountedAt, 'ms');
      setReady(true);
    });
    return () => task.cancel();
  }, []);

  if (!ready) {
    return (
      <View style={s.wrap}>
        <View style={[s.micBtn, { backgroundColor: C.border }]}>
          <FontAwesome5 name="microphone" solid size={18} color="#fff" />
        </View>
      </View>
    );
  }
  return <VoiceRecorderButtonReady {...props} />;
}

function VoiceRecorderButtonReady({ onRecorded, disabled }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.05));
  const [durationMs, setDurationMs] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Gesture callbacks (scheduled onto the JS thread) read this instead of the
  // `phase` state directly — state updates triggered via scheduleOnRN can lag
  // a fast slide by a frame, which would misfire threshold transitions.
  const phaseRef = useRef<Phase>('idle');
  const isRecordingRef = useRef(false);
  const startedAtRef = useRef(0);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permissionErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // No eager setAudioModeAsync/requestRecordingPermissionsAsync call on mount
  // here (there used to be one) — both are redundant with the identical
  // calls startRecording() already makes right before actually recording,
  // and asking for mic permission only once the user holds to record (rather
  // than the instant any chat screen opens) is also the better permissions UX.
  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (permissionErrorTimerRef.current) clearTimeout(permissionErrorTimerRef.current);
      // Screen torn down mid-hold (navigating away while still recording,
      // Activity recreated by a stricter OEM memory manager, etc.) — release
      // the mic and the audio-mode flag rather than leaving allowsRecording
      // stuck true and the native recorder object dangling.
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        recorder.stop().catch(() => {});
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      }
    };
  }, []);

  // Feeds the live bar meter — same normalization VoicePromptInput uses.
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'locked') return;
    const db = recorderState.metering;
    if (db !== undefined) {
      const norm = Math.max(0.05, Math.min(1, (db - METERING_FLOOR_DB) / -METERING_FLOOR_DB));
      setLevels((prev) => [...prev.slice(1), norm]);
    }
    setDurationMs(recorderState.durationMillis);
  }, [recorderState.metering, recorderState.durationMillis, phase]);

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  async function startRecording() {
    if (disabled || phaseRef.current !== 'idle' || isRecordingRef.current) return;
    setPermissionError(null);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setPermissionError(t('messages.voiceMicPermissionDenied'));
        if (permissionErrorTimerRef.current) clearTimeout(permissionErrorTimerRef.current);
        permissionErrorTimerRef.current = setTimeout(() => setPermissionError(null), 3000);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      startedAtRef.current = Date.now();
      setLevels(Array(BAR_COUNT).fill(0.05));
      setDurationMs(0);
      translateX.value = 0;
      translateY.value = 0;
      setPhaseBoth('recording');
      // Auto-stop and send at the cap, same reasoning as VoicePromptInput —
      // the user is still physically holding/locked with no other way to
      // know they've hit the limit.
      autoStopTimerRef.current = setTimeout(() => { void finishRecording(); }, MAX_RECORDING_MS);
    } catch (err) {
      // Previously swallowed silently — on some Android devices (audio focus
      // held by another app, vendor-specific MediaRecorder quirks, etc.)
      // setAudioModeAsync/prepareToRecordAsync/record() can throw even after
      // permission is granted. With no visible feedback this looked exactly
      // like "the mic doesn't do anything": no meter, no error, no clip.
      // Surface it like VoicePromptInput's handlePressIn does, and report it
      // so device-specific failures are actually diagnosable from Sentry.
      Sentry.captureException(err, { tags: { feature: 'chat-voice-recorder' } });
      isRecordingRef.current = false;
      setPhaseBoth('idle');
      setPermissionError(t('messages.voiceRecordingFailed'));
      if (permissionErrorTimerRef.current) clearTimeout(permissionErrorTimerRef.current);
      permissionErrorTimerRef.current = setTimeout(() => setPermissionError(null), 3000);
    }
  }

  async function discardRecording() {
    if (!isRecordingRef.current) { setPhaseBoth('idle'); return; }
    isRecordingRef.current = false;
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    let uri: string | null = null;
    try { uri = recorder.uri; await recorder.stop(); } catch { /* already stopped */ }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    setPhaseBoth('idle');
  }

  async function finishRecording() {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    const heldMs = Date.now() - startedAtRef.current;
    const capturedLevels = levels.slice();
    try { await recorder.stop(); } catch { /* already stopped */ }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    const uri = recorder.uri;
    setPhaseBoth('idle');
    if (!uri) return;

    // Too short: silently discard — an accidental tap shouldn't produce an
    // intrusive error, matching Instagram's forgiveness here. Too-long is
    // already prevented by the auto-stop timer above.
    if (heldMs < MIN_RECORDING_MS) {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      return;
    }
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    // No usable audio was actually captured (permission granted but the
    // recorder never really started, hardware hiccup, etc.) — the hold
    // duration alone isn't proof a real clip exists, so guard on the file
    // itself too rather than sending an empty/near-empty attachment.
    if (!info?.exists || info.size < MIN_FILE_SIZE_BYTES) {
      if (info?.exists) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      return;
    }
    if (info.size > MAX_FILE_SIZE_BYTES) {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      return;
    }
    onRecorded({ uri, durationSec: Math.min(120, Math.round(heldMs / 1000)), waveform: capturedLevels });
  }

  // ── Gesture (Instagram-style: hold/slide-left-cancel/slide-up-lock) ────────

  function handleTouchDown() {
    void startRecording();
  }

  function handleUpdate(x: number, y: number) {
    if (phaseRef.current !== 'recording' && phaseRef.current !== 'cancelling') return;
    translateX.value = Math.min(0, x);
    translateY.value = Math.min(0, y);

    if (phaseRef.current === 'recording' && y < LOCK_THRESHOLD_PX && x > CANCEL_THRESHOLD_PX) {
      setPhaseBoth('locked');
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      return;
    }
    if (x < CANCEL_THRESHOLD_PX && phaseRef.current !== 'cancelling') {
      setPhaseBoth('cancelling');
    } else if (x > CANCEL_RESET_THRESHOLD_PX && phaseRef.current === 'cancelling') {
      setPhaseBoth('recording');
    }
  }

  function handleFinalize() {
    if (phaseRef.current === 'cancelling') {
      void discardRecording();
    } else if (phaseRef.current === 'recording') {
      void finishRecording();
    }
    // 'locked': lifting the finger doesn't stop anything — the explicit
    // stop/send or discard button in the locked bar handles it instead.
  }

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .shouldCancelWhenOutside(false)
    .onTouchesDown(() => {
      'worklet';
      scheduleOnRN(handleTouchDown);
    })
    .onUpdate((e) => {
      'worklet';
      scheduleOnRN(handleUpdate, e.translationX, e.translationY);
    })
    .onFinalize(() => {
      'worklet';
      scheduleOnRN(handleFinalize);
    });

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const busy = !!disabled;
  const isHolding = phase === 'recording' || phase === 'cancelling';

  if (phase === 'locked') {
    return (
      <View style={[s.lockedBar, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={s.lockedMeter}>
          {levels.map((lvl, i) => (
            <View key={i} style={[s.meterBar, { height: 3 + lvl * 18, backgroundColor: '#EF4444' }]} />
          ))}
        </View>
        <Text style={[s.lockedDuration, { color: C.text }]}>{formatDuration(durationMs)}</Text>
        <Pressable style={s.lockedDiscardBtn} onPress={() => void discardRecording()} hitSlop={8}>
          <FontAwesome5 name="trash-alt" solid size={16} color="#EF4444" />
        </Pressable>
        <Pressable style={[s.lockedSendBtn, { backgroundColor: C.brinjal1 }]} onPress={() => void finishRecording()} hitSlop={8}>
          <FontAwesome5 name="paper-plane" solid size={16} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      {isHolding && (
        <View style={s.overlay} pointerEvents="none">
          <View style={[s.meterCard, { backgroundColor: '#fff' }]}>
            {phase === 'cancelling' ? (
              <View style={s.cancelHintRow}>
                <FontAwesome5 name="trash-alt" solid size={14} color="#EF4444" />
                <Text style={s.cancelHintText}>{t('messages.voiceReleaseToCancel')}</Text>
              </View>
            ) : (
              <>
                {/* Same meter card look as VoicePromptInput's Speak flow in
                    create-event — bar count/size/color and card padding all
                    match, so the live waveform reads as one consistent
                    recording UI across the app. */}
                <View style={s.meter}>
                  {levels.map((lvl, i) => (
                    <View key={i} style={[s.meterBar, { height: 4 + lvl * 32, backgroundColor: '#EF4444' }]} />
                  ))}
                </View>
                <Text style={[s.slideHintText, { color: C.textSecondary }]}>
                  {`${formatDuration(durationMs)} · ${t('messages.voiceSlideToCancel')}`}
                </Text>
                <Text style={[s.lockHintText, { color: C.textSecondary }]}>{t('messages.voiceSlideToLock')}</Text>
              </>
            )}
          </View>
        </View>
      )}
      {permissionError && (
        <View style={s.overlay} pointerEvents="none">
          <View style={[s.meterCard, { backgroundColor: '#FEF2F2' }]}>
            <Text style={s.permissionErrorText}>{permissionError}</Text>
          </View>
        </View>
      )}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            s.micBtn,
            { backgroundColor: phase === 'cancelling' ? '#EF4444' : busy ? C.border : C.brinjal1 },
            micStyle,
          ]}>
          <FontAwesome5 name="microphone" solid size={18} color="#fff" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { alignItems: 'center', justifyContent: 'center' },
  micBtn:  { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  // Same meterCard/meter/meterBar look as VoicePromptInput's Speak flow, but
  // right-anchored (not centered) — this mic sits at the right edge of the
  // composer, so centering a 160px-wide card over a 44px button pushed half
  // of it off the right edge of the screen. Anchoring the card's right edge
  // to the button's right edge and growing left keeps it fully on-screen.
  // `bottom` is a fixed px offset (micBtn's own height), not '100%' — `wrap`
  // below has no explicit height (it's sized by its content), and Android's
  // Yoga resolves a percentage `bottom` against an ancestor's *explicit*
  // height only; against an auto/content-sized parent it falls through to a
  // much larger positioned ancestor further up the tree, which is why this
  // card rendered mid-screen on Android while iOS (no such fallback quirk)
  // showed it correctly right above the mic button. A fixed px value sidesteps
  // percentage resolution entirely, so both platforms anchor the same way.
  overlay: { position: 'absolute', bottom: 44, right: 0, alignItems: 'flex-end', justifyContent: 'center', marginBottom: 24, zIndex: 10 },
  meterCard: { borderRadius: RADIUS.lg, paddingHorizontal: 22, paddingVertical: 18, alignItems: 'center', gap: 6, ...SHADOW.floating },
  meter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 36, width: 160 },
  meterBar:  { width: 3, borderRadius: 2 },
  slideHintText: { fontSize: 12, fontFamily: F.regular },
  lockHintText:  { fontSize: 11, fontFamily: F.regular },
  cancelHintRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cancelHintText: { fontSize: 13, fontFamily: F.medium, color: '#EF4444' },
  permissionErrorText: { fontSize: 12, fontFamily: F.medium, color: '#DC2626', maxWidth: 220 },

  lockedBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, minWidth: 220 },
  lockedMeter: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, flex: 1 },
  lockedDuration:  { fontSize: 13, fontFamily: F.medium },
  lockedDiscardBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  lockedSendBtn:    { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
});
