import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { BottomSheet } from '@/components/BottomSheet';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { campaignService } from '@/services/campaign';
import { ApiError } from '@/lib/api';
import type { EventQuestion } from '@/types';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

const QUESTION_MAX = 1000;
const ANSWER_MAX = 2000;

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

// Shared, per-event Q&A page for free events (OPEN_EVENT), which never open a
// chat. Same screen for both roles: the owning business and every accepted
// creator can read it; only accepted creators post questions, only the
// business answers/edits. Asker names are shown to the business only — the
// backend nulls `askerName` for creator viewers.
export default function EventQuestionsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isBusiness = user?.role === 'BUSINESS';
  const { campaignId } = useLocalSearchParams<{ campaignId: string; campaignTitle?: string }>();

  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);

  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const [answerTarget, setAnswerTarget] = useState<EventQuestion | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [savingAnswer, setSavingAnswer] = useState(false);

  const [toast, setToast] = useState('');
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!campaignId) { setLoading(false); return; }
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await campaignService.getEventQuestions(campaignId);
      setQuestions(data);
      setNoAccess(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setNoAccess(true);
      } else {
        setError(err instanceof Error ? err.message : t('eventQuestions.loadError'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId, t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleAsk = useCallback(async () => {
    const q = draft.trim();
    if (!q || posting || !campaignId) return;
    if (q.length > QUESTION_MAX) { showToast(t('eventQuestions.questionTooLong')); return; }
    setPosting(true);
    try {
      await campaignService.askEventQuestion(campaignId, q);
      setDraft('');
      showToast(t('eventQuestions.askedToast'));
      await load('refresh');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('eventQuestions.loadError'));
    } finally {
      setPosting(false);
    }
  }, [draft, posting, campaignId, showToast, t, load]);

  const openAnswer = useCallback((q: EventQuestion) => {
    setAnswerTarget(q);
    setAnswerDraft(q.answer ?? '');
  }, []);

  const handleSaveAnswer = useCallback(async () => {
    const a = answerDraft.trim();
    if (!a || savingAnswer || !answerTarget || !campaignId) return;
    if (a.length > ANSWER_MAX) { showToast(t('eventQuestions.answerTooLong')); return; }
    setSavingAnswer(true);
    try {
      await campaignService.answerEventQuestion(campaignId, answerTarget.id, a);
      setAnswerTarget(null);
      setAnswerDraft('');
      showToast(t('eventQuestions.answeredToast'));
      await load('refresh');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('eventQuestions.loadError'));
    } finally {
      setSavingAnswer(false);
    }
  }, [answerDraft, savingAnswer, answerTarget, campaignId, showToast, t, load]);

  const headerNote = isBusiness ? t('eventQuestions.headerBusiness') : t('eventQuestions.headerCreator');

  const listHeader = useMemo(() => (
    <View style={[qs.banner, { backgroundColor: C.primaryLight }]}>
      <FontAwesome5 name="comments" solid size={14} color={C.brinjal1} />
      <Text style={[qs.bannerTxt, { color: C.brinjal1 }]}>{headerNote}</Text>
    </View>
  ), [C.primaryLight, C.brinjal1, headerNote]);

  const renderItem = useCallback(({ item }: { item: EventQuestion }) => {
    const asker = item.isMine
      ? t('eventQuestions.youAsked')
      : isBusiness
        ? (item.askerName ?? t('eventQuestions.aCreatorAsked'))
        : t('eventQuestions.aCreatorAsked');
    return (
      <View style={[qs.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={qs.metaRow}>
          <View style={[qs.avatar, { backgroundColor: C.primaryLight }]}>
            <FontAwesome5 name="user" solid size={11} color={C.brinjal1} />
          </View>
          <Text style={[qs.asker, { color: C.text }]} numberOfLines={1}>{asker}</Text>
          <Text style={[qs.time, { color: C.textPlaceholder }]}>{relTime(item.createdAt)}</Text>
        </View>
        <Text style={[qs.question, { color: C.text }]}>{item.question}</Text>

        {item.answer ? (
          <View style={[qs.answerBox, { backgroundColor: C.background, borderLeftColor: C.brinjal1 }]}>
            <Text style={[qs.answerLabel, { color: C.brinjal1 }]}>{t('eventQuestions.organizerAnswer')}</Text>
            <Text style={[qs.answerTxt, { color: C.text }]}>{item.answer}</Text>
            {isBusiness && (
              <Pressable onPress={() => openAnswer(item)} hitSlop={8} style={qs.editLink}>
                <FontAwesome5 name="pen" solid size={10} color={C.textSecondary} />
                <Text style={[qs.editLinkTxt, { color: C.textSecondary }]}>{t('eventQuestions.editAnswer')}</Text>
              </Pressable>
            )}
          </View>
        ) : isBusiness ? (
          <Pressable
            style={[qs.answerBtn, { borderColor: C.brinjal1 }]}
            onPress={() => openAnswer(item)}>
            <FontAwesome5 name="reply" solid size={12} color={C.brinjal1} />
            <Text style={[qs.answerBtnTxt, { color: C.brinjal1 }]}>{t('eventQuestions.answerThis')}</Text>
          </Pressable>
        ) : (
          <Text style={[qs.pending, { color: C.textPlaceholder }]}>{t('eventQuestions.notAnsweredYet')}</Text>
        )}
      </View>
    );
  }, [C, isBusiness, openAnswer, t]);

  return (
    <SafeAreaView style={[qs.screen, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('eventQuestions.title')} backFallback="/(business)/(tabs)" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <MaxWidthContainer>
          {loading ? (
            <View style={qs.centered}><ActivityIndicator size="large" color={C.brinjal1} /></View>
          ) : noAccess ? (
            <EmptyState faIcon="lock" title={t('eventQuestions.title')} subtitle={t('eventQuestions.noAccess')} />
          ) : error ? (
            <ErrorState title={t('eventQuestions.loadError')} message={error} actionLabel={t('common.retry')} onAction={() => load()} />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={questions}
              keyExtractor={(q) => q.id}
              renderItem={renderItem}
              ListHeaderComponent={listHeader}
              contentContainerStyle={qs.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={C.brinjal1} />}
              ListEmptyComponent={
                <EmptyState
                  faIcon="comments"
                  title={t('eventQuestions.empty')}
                  subtitle={isBusiness ? undefined : t('eventQuestions.emptyCreatorHint')}
                />
              }
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Creator composer — the only way to post a question. */}
          {!loading && !noAccess && !error && !isBusiness && (
            <View style={[qs.composer, { backgroundColor: C.surface, borderTopColor: C.border }]}>
              <TextInput
                style={[qs.composerInput, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                placeholder={t('eventQuestions.composerPlaceholder')}
                placeholderTextColor={C.textPlaceholder}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={QUESTION_MAX}
              />
              <Pressable
                style={[qs.sendBtn, { backgroundColor: draft.trim() ? C.brinjal1 : C.border }]}
                onPress={handleAsk}
                disabled={!draft.trim() || posting}>
                {posting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <FontAwesome5 name="paper-plane" solid size={15} color="#fff" />}
              </Pressable>
            </View>
          )}
        </MaxWidthContainer>
      </KeyboardAvoidingView>

      {/* Business answer / edit-answer sheet. */}
      <BottomSheet
        visible={!!answerTarget}
        onClose={() => setAnswerTarget(null)}
        title={t('eventQuestions.answerModalTitle')}>
        {!!answerTarget && (
          <Text style={[qs.sheetQuestion, { color: C.textSecondary }]}>{answerTarget.question}</Text>
        )}
        <View style={{ marginVertical: 14 }}>
          <TextInputWithLabel
            label={t('eventQuestions.organizerAnswer')}
            placeholder={t('eventQuestions.answerPlaceholder')}
            value={answerDraft}
            onChangeText={setAnswerDraft}
            multiline
            maxLength={ANSWER_MAX}
          />
        </View>
        <Pressable
          style={[qs.saveBtn, { backgroundColor: C.brinjal1, opacity: !answerDraft.trim() || savingAnswer ? 0.6 : 1 }]}
          onPress={handleSaveAnswer}
          disabled={!answerDraft.trim() || savingAnswer}>
          {savingAnswer
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={qs.saveBtnTxt}>{t('eventQuestions.submitAnswer')}</Text>}
        </Pressable>
      </BottomSheet>

      {toast ? (
        <View style={qs.toast} pointerEvents="none">
          <Text style={qs.toastTxt}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const qs = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SCREEN_GUTTER, gap: SPACING.md, flexGrow: 1 },

  banner:    { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: SPACING.md, borderRadius: RADIUS.md },
  bannerTxt: { flex: 1, fontSize: 12, fontFamily: F.medium, lineHeight: 18 },

  card:     { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: 10, ...SHADOW.card },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar:   { width: 22, height: 22, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  asker:    { flex: 1, fontSize: 13, fontFamily: F.semibold },
  time:     { fontSize: 11, fontFamily: F.regular },
  question: { fontSize: 15, fontFamily: F.medium, lineHeight: 22 },

  answerBox:   { borderLeftWidth: 3, borderRadius: RADIUS.sm, padding: SPACING.md, gap: 4 },
  answerLabel: { fontSize: 11, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.4 },
  answerTxt:   { fontSize: 14, fontFamily: F.regular, lineHeight: 21 },
  editLink:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start' },
  editLinkTxt: { fontSize: 12, fontFamily: F.semibold },

  answerBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: RADIUS.md, paddingVertical: 10 },
  answerBtnTxt: { fontSize: 13, fontFamily: F.bold },
  pending:      { fontSize: 12, fontFamily: F.regular, fontStyle: 'italic' },

  composer:      { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.sm, paddingBottom: SPACING.md, borderTopWidth: 1 },
  // minHeight = lineHeight (22) + paddingVertical (11×2) so a single line sits
  // vertically centred in the box instead of hugging the top; the box then
  // grows line-by-line up to maxHeight. textAlignVertical centres it on Android.
  composerInput: { flex: 1, minHeight: 44, maxHeight: 110, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, lineHeight: 22, fontFamily: F.regular, textAlignVertical: 'center' },
  sendBtn:       { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },

  sheetQuestion: { fontSize: 14, fontFamily: F.medium, lineHeight: 21 },
  saveBtn:       { height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt:    { fontSize: 14, fontFamily: F.bold, color: '#fff' },

  toast:    { position: 'absolute', bottom: 90, left: 24, right: 24, backgroundColor: '#1F2937', borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  toastTxt: { color: '#fff', fontSize: 13, fontFamily: F.medium, textAlign: 'center' },
});
