import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { COLORS } from '@/utilities/constants';

export default function SubmitProposalScreen() {
  const { campaignId, campaignTitle, brand } = useLocalSearchParams<{
    campaignId: string;
    campaignTitle: string;
    brand: string;
  }>();
  const { t } = useLanguage();

  const [coverLetter, setCoverLetter] = useState('');
  const [rate, setRate] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (coverLetter.trim().length < 50) {
      setError(t('proposal.shortLetterError'));
      return;
    }
    const proposedRate = parseFloat(rate.replace(/[^0-9.]/g, ''));
    if (!proposedRate) {
      setError(t('proposal.noRateError'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await campaignService.apply(campaignId, {
        coverLetter: coverLetter.trim(),
        proposedRate,
        timeline: '2 weeks',
        socialHandles: {},
        portfolioUrl: portfolio.trim() || undefined,
      });
      Alert.alert(
        t('proposal.successTitle'),
        t('proposal.successBody', { title: campaignTitle, brand }),
        [{ text: t('common.done'), onPress: () => router.back() }],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit proposal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(creator)/'))}
          style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>{t('proposal.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.campaignBadge}>
            <Text style={styles.badgeLabel}>{t('proposal.applyingTo')}</Text>
            <Text style={styles.campaignTitle}>{campaignTitle}</Text>
            <Text style={styles.campaignBrand}>{brand}</Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('proposal.coverLetter')}</Text>
              <TextInput
                style={styles.textarea}
                value={coverLetter}
                onChangeText={setCoverLetter}
                placeholder={t('proposal.coverLetterPlaceholder')}
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={6}
                maxLength={800}
              />
              <Text style={styles.charCount}>
                {t('proposal.charCount', { count: coverLetter.length })}
              </Text>
            </View>

            <TextInputWithLabel
              label={t('proposal.rate')}
              value={rate}
              onChangeText={setRate}
              placeholder={t('proposal.ratePlaceholder')}
              keyboardType="numeric"
            />

            <TextInputWithLabel
              label={t('proposal.portfolio')}
              value={portfolio}
              onChangeText={setPortfolio}
              placeholder={t('proposal.portfolioPlaceholder')}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Button label={t('proposal.submit')} onPress={handleSubmit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontSize: 18, color: COLORS.textSecondary },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  campaignBadge: {
    backgroundColor: '#F3EFFE',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brinjal1,
  },
  badgeLabel: { fontSize: 11, fontWeight: '600', color: COLORS.brinjal1, textTransform: 'uppercase' },
  campaignTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  campaignBrand: { fontSize: 13, color: COLORS.textSecondary },
  errorBanner: {
    backgroundColor: '#FFEAEA',
    color: COLORS.error,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
  },
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  textarea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 130,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right' },
});
