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
  // Set when expo-image can't fetch/decode the PNG at invitation.imageUrl (a
  // dead R2 public URL, a network failure, a corrupt render). Without this the
  // overlay spinner would sit on the card forever — expo-image's onLoadEnd is
  // not guaranteed to fire on a hard network error.
  const [imgError, setImgError] = useState(false);

  // Cache the downloaded file per version so repeated Share/Save don't re-fetch.
  const localUriRef = useRef<{ version: number; uri: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!campaignId) {
      Promise.resolve().then(() => { if (!cancelled) { setError(true); setLoading(false); } });
      return () => { cancelled = true; };
    }
    setImgReady(false);
    setImgError(false);
    campaignService.getEventInvitation(campaignId)
      .then((inv) => { if (!cancelled) { setInvitation(inv); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId, attempt]);

  // Watchdog: on a hard network failure expo-image can fire neither onLoadEnd
  // nor onError, which would leave the overlay spinner up indefinitely. If the
  // bitmap still hasn't reported after 20s, surface the retryable error state.
  useEffect(() => {
    if (!invitation || imgReady) return;
    const timer = setTimeout(() => { setImgError(true); setImgReady(true); }, 20000);
    return () => clearTimeout(timer);
  }, [invitation, imgReady]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    setAttempt((n) => n + 1);
  }, []);

  const ensureLocalFile = useCallback(async (inv: Invitation, downloadUrl: string): Promise<string> => {
    const cached = localUriRef.current;
    if (cached && cached.version === inv.version) {
      const info = await FileSystem.getInfoAsync(cached.uri).catch(() => null);
      if (info?.exists) return cached.uri;
    }
    const dest = `${FileSystem.cacheDirectory}kolab-invitation-v${inv.version}.png`;
    // downloadAsync has no timeout: a stalled connection (a throttled CDN, dead
    // network) would leave it pending forever and the Share/Save spinner stuck.
    // Drive it through a resumable download so a watchdog can cancel it, and cap
    // the wait — a failure here surfaces the normal retryable error toast.
    const download = FileSystem.createDownloadResumable(downloadUrl, dest);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; download.cancelAsync().catch(() => {}); }, 30000);
    let result: FileSystem.FileSystemDownloadResult | undefined;
    try {
      result = await download.downloadAsync();
    } finally {
      clearTimeout(timer);
    }
    if (timedOut || !result) {
      await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      throw new Error('invitation download timed out');
    }
    const { uri, status } = result;
    // downloadAsync resolves (and writes the body to disk) even on a 4xx/5xx —
    // guard so a 404 error page never gets saved/shared as a ".png".
    if (status !== 200) {
      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      throw new Error(`invitation download failed (${status})`);
    }
    localUriRef.current = { version: inv.version, uri };
    return uri;
  }, []);

  // While the Cloudflare cache rule in front of the invitation bucket was
  // misconfigured, a 404 for this exact URL could have been cached ON-DEVICE
  // (the bad response carried a year-long max-age). A per-version + per-retry
  // query param sidesteps any poisoned local/HTTP-cache entry without forcing a
  // re-download on every mount. R2 ignores the extra param; Cloudflare keys its
  // edge cache on it, so this also dodges a poisoned edge entry.
  const imageUri = invitation
    ? `${invitation.imageUrl}${invitation.imageUrl.includes('?') ? '&' : '?'}cb=${invitation.version}.${attempt}`
    : null;

  const handleShare = useCallback(async () => {
    if (!invitation || !imageUri || busy) return;
    setBusy('share');
    try {
      const uri = await ensureLocalFile(invitation, imageUri);
      if (!(await Sharing.isAvailableAsync())) { toast.error(t('eventInvitation.shareFailed')); return; }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('eventInvitation.title') });
    } catch (err) {
      if (__DEV__) console.warn('[event-invitation] share failed', err);
      toast.error(t('eventInvitation.shareFailed'));
    } finally {
      setBusy(null);
    }
  }, [invitation, imageUri, busy, ensureLocalFile, toast, t]);

  const handleSave = useCallback(async () => {
    if (!invitation || !imageUri || busy) return;
    setBusy('save');
    try {
      // Write-only: we only need to add one image, never read the library —
      // pairs with NSPhotoLibraryAddUsageDescription and is far more likely
      // to be granted than full photo access.
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) { toast.error(t('eventInvitation.saveDenied')); return; }
      const uri = await ensureLocalFile(invitation, imageUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      toast.success(t('eventInvitation.saved'));
    } catch (err) {
      if (__DEV__) console.warn('[event-invitation] save failed', err);
      toast.error(t('eventInvitation.saveFailed'));
    } finally {
      setBusy(null);
    }
  }, [invitation, imageUri, busy, ensureLocalFile, toast, t]);

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('eventInvitation.title')} backFallback="/(creator)/(tabs)" />
      <MaxWidthContainer>
        {error || imgError || (!loading && !invitation) ? (
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
                source={imageUri ? { uri: imageUri } : undefined}
                recyclingKey={imageUri}
                style={s.image}
                contentFit="contain"
                transition={200}
                accessibilityLabel={t('eventInvitation.title')}
                onLoadEnd={() => setImgReady(true)}
                onError={() => { setImgError(true); setImgReady(true); }}
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
