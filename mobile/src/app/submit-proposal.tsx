import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { BackButton } from '@/components/BackButton';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { useToast } from '@/components/Toast';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { F } from '@/utilities/constants';

function isValidUrl(v: string) {
  try { new URL(v); return true; } catch { return false; }
}

export default function SubmitProposalScreen() {
  const { campaignId, campaignTitle, brand } = useLocalSearchParams<{
    campaignId: string;
    campaignTitle: string;
    brand: string;
  }>();
  const { t } = useLanguage();
  const C = useAppColors();
  const toast = useToast();

  const [coverLetter, setCoverLetter] = useState('');
  const [rate, setRate] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const coverLetterLen = coverLetter.trim().length;
  const proposedRate   = parseFloat(rate.replace(/[^0-9.]/g, ''));

  const coverError  = submitted && coverLetterLen < 50
    ? `Cover letter must be at least 50 characters (${coverLetterLen}/50)`
    : undefined;
  const rateError   = submitted && (!proposedRate || proposedRate <= 0)
    ? 'Enter a valid rate (e.g. 5000)'
    : undefined;
  const portError   = submitted && portfolio.trim() && !isValidUrl(portfolio.trim())
    ? 'Enter a valid URL (e.g. https://yourportfolio.com)'
    : undefined;

  const hasErrors = !!coverError || !!rateError || !!portError;

  async function handleSubmit() {
    setSubmitted(true);
    if (coverLetterLen < 50 || !proposedRate || proposedRate <= 0 || (portfolio.trim() && !isValidUrl(portfolio.trim()))) {
      toast.warning('Please fix the errors below before submitting.');
      return;
    }

    setLoading(true);
    try {
      await campaignService.apply(campaignId, {
        coverLetter: coverLetter.trim(),
        proposedRate,
        timeline: '2 weeks',
        socialHandles: {},
        portfolioUrl: portfolio.trim() || undefined,
      });
      toast.success(`Proposal sent to ${brand}!`, 'Application submitted');
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <LinearGradient colors={['#F97316', '#EF4444', '#EC4899']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        <BackButton fallback="/(creator)/" />
        <Text style={[styles.headerTitle, { color: '#fff' }]}>{t('proposal.title')}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Campaign badge */}
          <View style={[styles.campaignBadge, { backgroundColor: C.primaryLight, borderLeftColor: C.brinjal1 }]}>
            <Text style={[styles.badgeLabel, { color: C.brinjal1 }]}>{t('proposal.applyingTo')}</Text>
            <Text style={[styles.campaignTitle, { color: C.text }]}>{campaignTitle}</Text>
            <Text style={[styles.campaignBrand, { color: C.textSecondary }]}>{brand}</Text>
          </View>

          {/* Tip card */}
          <View style={[styles.tipCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={[styles.tipText, { color: C.textSecondary }]}>
              A strong cover letter that mentions the brand, your experience, and a clear idea performs best.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Cover letter */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.text }]}>
                {t('proposal.coverLetter')}
                <Text style={{ color: C.error }}> *</Text>
              </Text>
              <View style={[
                styles.textareaWrap,
                { borderColor: coverError ? C.error : C.border, backgroundColor: C.surface },
              ]}>
                <TextInput
                  style={[styles.textarea, { color: C.text }]}
                  value={coverLetter}
                  onChangeText={setCoverLetter}
                  placeholder={t('proposal.coverLetterPlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  multiline
                  numberOfLines={6}
                  maxLength={800}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.fieldMeta}>
                {coverError ? (
                  <Text style={[styles.fieldError, { color: C.error }]}>⚠ {coverError}</Text>
                ) : (
                  <Text style={[styles.charHint, { color: coverLetterLen >= 50 ? C.active : C.textSecondary }]}>
                    {coverLetterLen >= 50 ? '✓ ' : ''}{coverLetterLen}/800 characters
                    {coverLetterLen < 50 ? ` — ${50 - coverLetterLen} more needed` : ''}
                  </Text>
                )}
              </View>
            </View>

            {/* Rate */}
            <TextInputWithLabel
              label={`${t('proposal.rate')} *`}
              value={rate}
              onChangeText={setRate}
              placeholder={t('proposal.ratePlaceholder')}
              keyboardType="numeric"
              error={rateError}
            />

            {/* Portfolio */}
            <TextInputWithLabel
              label={t('proposal.portfolio')}
              value={portfolio}
              onChangeText={setPortfolio}
              placeholder={t('proposal.portfolioPlaceholder')}
              keyboardType="url"
              autoCapitalize="none"
              error={portError}
            />

            {hasErrors && submitted && (
              <View style={[styles.errorSummary, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorSummaryText, { color: C.error }]}>
                  ⛔ Please fix the errors above before submitting.
                </Text>
              </View>
            )}

            <Button label={loading ? 'Submitting…' : t('proposal.submit')} onPress={handleSubmit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  flex:            { flex: 1 },
  gradientHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle:     { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  scroll:          { padding: 20, gap: 16, paddingBottom: 48 },
  campaignBadge:   { borderRadius: 14, padding: 16, gap: 4, borderLeftWidth: 4 },
  badgeLabel:      { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: F.bold },
  campaignTitle:   { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  campaignBrand:   { fontSize: 13, fontFamily: F.regular },
  tipCard:         { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10, alignItems: 'flex-start' },
  tipEmoji:        { fontSize: 16, marginTop: 1 },
  tipText:         { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: F.regular },
  form:            { gap: 18 },
  fieldGroup:      { gap: 6 },
  fieldLabel:      { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  textareaWrap:    { borderWidth: 1.5, borderRadius: 12, overflow: 'hidden' },
  textarea:        { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 130, fontFamily: F.regular },
  fieldMeta:       { flexDirection: 'row', justifyContent: 'flex-end' },
  fieldError:      { fontSize: 12, fontWeight: '500', flex: 1, fontFamily: F.medium },
  charHint:        { fontSize: 11, fontFamily: F.regular },
  errorSummary:    { borderWidth: 1, borderRadius: 10, padding: 12 },
  errorSummaryText:{ fontSize: 13, fontWeight: '500', textAlign: 'center', fontFamily: F.medium },
});
