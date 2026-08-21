import { FontAwesome5 } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { MAX_AI_PROMPT_CHARS } from '@/services/campaign';
import { F, RADIUS, lineHeightFor } from '@/utilities/constants';

type Props = {
  // The transcription, already clamped by the caller. Null before one exists.
  value: string | null;
  onChangeText: (next: string) => void;
  // Transcription request still in flight — the recording is done but there's
  // nothing to show yet.
  transcribing: boolean;
  // Transcription failed on a recording that's still available to retry.
  failed: boolean;
  onRetry: () => void;
  disabled?: boolean;
};

// Shows the brand what the transcription actually heard, as an editable field,
// BEFORE the draft is generated from it. Without this the transcript was
// invisible: a misheard word (a dish name, a venue, a number) went straight
// into the generator and the brand's only clue was a draft that came out
// subtly wrong, with no way to tell whether the AI or the microphone was at
// fault. Editing here is editing the exact text the generator receives.
export function VoiceTranscriptReview({ value, onChangeText, transcribing, failed, onRetry, disabled }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();

  if (transcribing) {
    return (
      <View style={[styles.pending, { borderColor: C.border, backgroundColor: C.background }]}>
        <ActivityIndicator size="small" color={C.brinjal1} />
        <Text style={[styles.pendingText, { color: C.textSecondary }]}>
          {t('createEvent.audioTranscribing')}
        </Text>
      </View>
    );
  }

  // The recording survived the failure, so offer to re-send it. Making the
  // brand hold the mic again to recover from a dropped request would throw
  // away perfectly good audio.
  if (failed) {
    return (
      <View style={[styles.pending, { borderColor: C.error, backgroundColor: `${C.error}0D` }]}>
        <Text style={[styles.pendingText, { color: C.text, flex: 1 }]}>
          {t('createEvent.audioTranscriptFailed')}
        </Text>
        <Pressable
          style={[styles.retryPill, { borderColor: C.brinjal1 }]}
          disabled={disabled}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onRetry}>
          <FontAwesome5 name="redo" solid size={12} color={C.brinjal1} />
          <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('createEvent.audioTranscriptRetry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (value === null) return null;

  const empty = value.trim().length === 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <FontAwesome5 name="quote-left" solid size={12} color={C.brinjal1} />
        <Text style={[styles.heading, { color: C.text }]}>{t('createEvent.audioTranscriptHeading')}</Text>
      </View>
      <TextInputWithLabel
        label={t('createEvent.audioTranscriptLabel')}
        value={value}
        onChangeText={(v) => onChangeText(v.slice(0, MAX_AI_PROMPT_CHARS))}
        multiline
        numberOfLines={5}
        editable={!disabled}
        // Surfaced as a field error rather than only disabling the button, so
        // clearing the box explains itself instead of silently going dead.
        error={empty ? t('createEvent.audioTranscriptEmpty') : undefined}
        hint={empty ? undefined : t('createEvent.audioTranscriptHint')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:        { gap: 8, marginTop: 4 },
  headingRow:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heading:     { fontSize: 13, fontFamily: F.semibold, lineHeight: lineHeightFor(13) },
  pending:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 16, paddingHorizontal: 14, marginTop: 4 },
  pendingText: { fontSize: 13, fontFamily: F.medium, lineHeight: lineHeightFor(13) },
  retryPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  retryText:   { fontSize: 13, fontFamily: F.medium, lineHeight: lineHeightFor(13) },
});
