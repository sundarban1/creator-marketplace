import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { F, RADIUS, SPACING } from '@/utilities/constants';
import { guidedCampaignService } from '@/services/guidedCampaign';
import { toAiContext, type GuidedForm, type GuidedStep } from './guidedModel';
import { Input, st } from './parts';

// "✨ Ask Kolab" (UX spec §17) — native counterpart of
// web/src/app/business/guided/AskKolab.tsx. A quiet co-pilot, not a chatbot:
// one question, one answer about THIS campaign, with starter questions that
// fit the current step.

const SUGGESTION_STEPS = ['basics', 'creators', 'content', 'budget', 'requirements', 'review'] as const;

function suggestionsFor(step: GuidedStep): string[] {
  const key = (SUGGESTION_STEPS as readonly string[]).includes(step) ? step : 'basics';
  return [1, 2, 3].map((n) => `guided.askQ_${key}_${n}`);
}

export function AskKolabButton({ step, form }: { step: GuidedStep; form: GuidedForm }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ q: string; text: string; fallback: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Ignore an answer that arrives after the sheet was closed.
  const seq = useRef(0);

  const ask = async (q: string) => {
    const text = q.trim();
    if (text.length < 3 || busy) return;
    const id = ++seq.current;
    setBusy(true); setError(''); setQuestion(text);
    try {
      const r = await guidedCampaignService.ask(text, step, toAiContext(form));
      if (id === seq.current) setAnswer({ q: text, text: r.answer, fallback: r.fallback });
    } catch {
      if (id === seq.current) setError(t('guided.askError'));
    } finally {
      if (id === seq.current) setBusy(false);
    }
  };

  const close = () => { seq.current++; setBusy(false); setOpen(false); };
  const reset = () => { setAnswer(null); setQuestion(''); setError(''); };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36,
          paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1,
          borderColor: C.brinjal1, backgroundColor: pressed ? C.primaryLight : C.surface,
        })}>
        <FontAwesome5 name="magic" size={12} color={C.brinjal1} />
        <Text style={[st.small, { color: C.brinjal1, fontFamily: F.semibold }]}>{t('guided.askKolab')}</Text>
      </Pressable>

      <BottomSheet visible={open} onClose={close} title={t('guided.askKolab')} maxHeightPct={0.85}>
        {answer ? (
          <View style={{ gap: SPACING.md }}>
            <Text style={[st.small, { color: C.textSecondary, fontFamily: F.semibold }]}>{answer.q}</Text>
            <View style={[st.note, { borderColor: C.brinjal1, backgroundColor: C.primaryLight, flexDirection: 'row', gap: SPACING.sm }]}>
              <FontAwesome5 name="magic" size={13} color={C.brinjal1} style={{ marginTop: 4 }} />
              <Text style={[st.body, { color: C.text, flex: 1 }]}>{answer.text}</Text>
            </View>
            <Text style={[st.small, { color: C.textSecondary }]}>{answer.fallback ? t('guided.askFallbackNote') : t('guided.askDisclaimer')}</Text>
            <Button label={t('guided.done')} onPress={close} fullWidth />
            <Button label={t('guided.askAnother')} variant="ghost" onPress={reset} fullWidth />
          </View>
        ) : (
          <View style={{ gap: SPACING.md }}>
            <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.askIntro')}</Text>
            <Text style={[st.small, { color: C.textSecondary, fontFamily: F.bold, textTransform: 'uppercase' }]}>{t('guided.askTryThese')}</Text>
            <View style={{ gap: SPACING.sm }}>
              {suggestionsFor(step).map((k) => (
                <Pressable
                  key={k}
                  disabled={busy}
                  onPress={() => void ask(t(k))}
                  accessibilityRole="button"
                  style={({ pressed }) => [st.row, { paddingRight: SPACING.md, paddingVertical: SPACING.sm, borderColor: C.border, backgroundColor: pressed ? C.primaryLight : C.surface, opacity: busy ? 0.6 : 1 }]}>
                  <Text style={[st.body, { color: C.text, flex: 1 }]}>{t(k)}</Text>
                  <FontAwesome5 name="arrow-right" size={11} color={C.textSecondary} />
                </Pressable>
              ))}
            </View>
            <Input value={question} onChangeText={setQuestion} multiline maxLength={500} placeholder={t('guided.askPlaceholder')} accessibilityLabel={t('guided.askKolab')} />
            {error ? <Text style={[st.small, { color: C.error }]}>{error}</Text> : null}
            {busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <ActivityIndicator size="small" color={C.brinjal1} />
                <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.askThinking')}</Text>
              </View>
            ) : null}
            <Button label={t('guided.askSend')} onPress={() => void ask(question)} loading={busy} disabled={question.trim().length < 3} fullWidth />
          </View>
        )}
      </BottomSheet>
    </>
  );
}
