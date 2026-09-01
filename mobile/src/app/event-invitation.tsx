import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
// SDK 56's top-level `expo-media-library` is the new class-based API and no
// longer exports saveToLibraryAsync/requestPermissionsAsync as functions — the
// classic function API lives under /legacy (same reason FileSystem is imported
// from expo-file-system/legacy above).
import * as MediaLibrary from 'expo-media-library/legacy';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { ErrorState } from '@/components/ErrorState';
import { useToast } from '@/components/Toast';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

const ASPECT = 1080 / 1350;

type Invitation = { imageUrl: string; width: number; height: number; version: number };

// Displays the confirmed creator's dynamically generated open-event invitation
// PNG (rendered + stored server-side — see backend modules/campaign/invitation).
// This screen never draws the invitation itself; it only presents the image and
// lets the creator share or save the actual PNG file. Reached from the "View My
// Invitation" link on the "You're Invited" card (EventQuestionsEntry).
export default function EventInvitationScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The API call only gives us the image URL — the PNG itself still has to
  // download before the card is actually visible, so keep the loading message
  // up until expo-image reports the bitmap is ready (or failed).
  const [imgReady, setImgReady] = useState(false);

  // Cache the downloaded file per version so repeated Share/Save don't re-fetch.
  const localUriRef = useRef<{ version: number; uri: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!campaignId) {
      Promise.resolve().then(() => { if (!cancelled) { setError(true); setLoading(false); } });
      return () => { cancelled = true; };
    }
    setImgReady(false);
    campaignService.getEventInvitation(campaignId)
      .then((inv) => { if (!cancelled) { setInvitation(inv); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId, attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    setAttempt((n) => n + 1);
  }, []);

  const ensureLocalFile = useCallback(async (inv: Invitation): Promise<string> => {
    const cached = localUriRef.current;
    if (cached && cached.version === inv.version) {
      const info = await FileSystem.getInfoAsync(cached.uri).catch(() => null);
      if (info?.exists) return cached.uri;
    }
    const dest = `${FileSystem.cacheDirectory}kolab-invitation-v${inv.version}.png`;
    const { uri } = await FileSystem.downloadAsync(inv.imageUrl, dest);
    localUriRef.current = { version: inv.version, uri };
    return uri;
  }, []);

  const handleShare = useCallback(async () => {
    if (!invitation || busy) return;
    setBusy('share');
    try {
      const uri = await ensureLocalFile(invitation);
      if (!(await Sharing.isAvailableAsync())) { toast.error(t('eventInvitation.shareFailed')); return; }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('eventInvitation.title') });
    } catch (err) {
      if (__DEV__) console.warn('[event-invitation] share failed', err);
      toast.error(t('eventInvitation.shareFailed'));
    } finally {
      setBusy(null);
    }
  }, [invitation, busy, ensureLocalFile, toast, t]);

  const handleSave = useCallback(async () => {
    if (!invitation || busy) return;
    setBusy('save');
    try {
      // Write-only: we only need to add one image, never read the library —
      // pairs with NSPhotoLibraryAddUsageDescription and is far more likely
      // to be granted than full photo access.
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) { toast.error(t('eventInvitation.saveDenied')); return; }
      const uri = await ensureLocalFile(invitation);
      await MediaLibrary.saveToLibraryAsync(uri);
      toast.success(t('eventInvitation.saved'));
    } catch (err) {
      if (__DEV__) console.warn('[event-invitation] save failed', err);
      toast.error(t('eventInvitation.saveFailed'));
    } finally {
      setBusy(null);
    }
  }, [invitation, busy, ensureLocalFile, toast, t]);

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('eventInvitation.title')} backFallback="/(creator)/(tabs)" />
      <MaxWidthContainer>
        {error || (!loading && !invitation) ? (
          <View style={s.centered}>
            <ErrorState
              icon="envelope-open-text"
              title={t('eventInvitation.errorTitle')}
              message={t('eventInvitation.errorBody')}
              actionLabel={t('eventInvitation.retry')}
              onAction={retry}
            />
          </View>
        ) : loading || !invitation ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={C.brinjal1} />
            <Text style={[s.loadingTxt, { color: C.textSecondary }]}>{t('eventInvitation.loading')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={[s.imageCard, { backgroundColor: C.surface }, SHADOW.card]}>
              <Image
                source={{ uri: invitation.imageUrl }}
                style={s.image}
                contentFit="contain"
                transition={200}
                accessibilityLabel={t('eventInvitation.title')}
                onLoadEnd={() => setImgReady(true)}
              />
              {!imgReady && (
                <View style={[s.imageOverlay, { backgroundColor: C.surface }]}>
                  <ActivityIndicator size="large" color={C.brinjal1} />
                  <Text style={[s.loadingTxt, { color: C.textSecondary }]}>{t('eventInvitation.loading')}</Text>
                </View>
              )}
            </View>

            <View style={s.actions}>
              <Pressable
                style={({ pressed }) => [s.primaryBtn, { backgroundColor: C.brinjal1 }, (pressed || busy === 'share') && s.dim]}
                onPress={handleShare}
                disabled={!!busy}>
                {busy === 'share'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <FontAwesome5 name="share-alt" solid size={15} color="#fff" />}
                <Text style={s.primaryBtnTxt}>{t('eventInvitation.share')}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [s.secondaryBtn, { borderColor: C.border, backgroundColor: C.surface }, (pressed || busy === 'save') && s.dim]}
                onPress={handleSave}
                disabled={!!busy}>
                {busy === 'save'
                  ? <ActivityIndicator size="small" color={C.brinjal1} />
                  : <FontAwesome5 name="download" solid size={15} color={C.brinjal1} />}
                <Text style={[s.secondaryBtnTxt, { color: C.brinjal1 }]}>{t('eventInvitation.save')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:     { flex: 1 },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SCREEN_GUTTER, gap: SPACING.md },
  loadingTxt: { fontSize: 13.5, fontFamily: F.regular },

  content:    { padding: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.xl },
  imageCard:  { borderRadius: RADIUS.lg, padding: SPACING.sm, overflow: 'hidden' },
  image:      { width: '100%', aspectRatio: ASPECT, borderRadius: RADIUS.md },
  imageOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, borderRadius: RADIUS.md },

  actions:    { gap: SPACING.md },
  primaryBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: RADIUS.md },
  primaryBtnTxt: { fontSize: 15, fontFamily: F.bold, color: '#fff' },
  secondaryBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: RADIUS.md, borderWidth: 1.5 },
  secondaryBtnTxt: { fontSize: 15, fontFamily: F.bold },
  dim:        { opacity: Platform.OS === 'ios' ? 0.85 : 0.9 },
});
