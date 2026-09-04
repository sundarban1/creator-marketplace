import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { creatorService } from '@/services/creator';
import { useCreatorProfile, creatorProfileKey } from '@/hooks/useCreatorProfile';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { isValidWebsiteUrl, normalizeWebsiteUrl } from '@/utilities/url';

// ─── EditProfileScreen ────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const { updateUser } = useAuth();
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Shared cache — same entry home/Discover/profile tab populate.
  const profileQuery = useCreatorProfile();
  const loading = profileQuery.isPending;
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const usernameCheckDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameCheckRequestId = useRef(0);
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [websiteError, setWebsiteError] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Seed the editable fields once — a background profile refetch (e.g.
  // triggered from another screen sharing this cache) must never overwrite
  // fields the user is mid-edit on.
  const seededRef = useRef(false);
  function seedFromProfile() {
    if (profileQuery.isError) { toast.error(t('profile.editCreator.loadError')); return; }
    const profile = profileQuery.data;
    if (!profile) return;
    setFullName(profile.fullName ?? '');
    setUsername(profile.username ?? '');
    setOriginalUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setWebsite(profile.website ?? '');
    setLocation(profile.location ?? '');
    setLocationLat(profile.locationLat ?? null);
    setLocationLng(profile.locationLng ?? null);
    setCategories(profile.categories ?? []);
  }
  useEffect(() => {
    if (seededRef.current || profileQuery.isPending) return;
    seededRef.current = true;
    seedFromProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQuery.isPending, profileQuery.isError, profileQuery.data]);

  function handleUsernameChange(v: string) {
    const clean = v.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    setUsername(clean);
    if (usernameCheckDebounce.current) clearTimeout(usernameCheckDebounce.current);

    if (clean === originalUsername) { setUsernameStatus('idle'); return; }
    if (clean.length < 3 || !/^[a-zA-Z0-9_]+$/.test(clean)) { setUsernameStatus('invalid'); return; }

    setUsernameStatus('checking');
    const requestId = ++usernameCheckRequestId.current;
    usernameCheckDebounce.current = setTimeout(async () => {
      try {
        const available = await creatorService.isUsernameAvailable(clean);
        if (requestId === usernameCheckRequestId.current) setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        if (requestId === usernameCheckRequestId.current) setUsernameStatus('idle');
      }
    }, 400);
  }

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setLocation(address);
    setLocationLat(lat || null);
    setLocationLng(lng || null);
    setLocationModalOpen(false);
  }

  async function handleSave() {
    let hasError = false;
    if (!fullName.trim() || fullName.trim().length < 2) {
      setNameError(t('profile.editCreator.nameMinLengthWarning'));
      hasError = true;
    }
    if (website.trim() && !isValidWebsiteUrl(website)) {
      setWebsiteError(t('profile.editCreator.websiteInvalidWarning'));
      hasError = true;
    }
    const usernameChanged = username !== originalUsername;
    // Username errors (taken / invalid / still-checking) already render inline
    // beneath the field via its `error` / `hint` props — just block the save.
    if (usernameChanged && usernameStatus !== 'idle' && usernameStatus !== 'available') {
      hasError = true;
    }
    if (hasError) return;
    setSaving(true);
    try {
      const payload: Parameters<typeof creatorService.updateProfile>[0] = {
        fullName: fullName.trim(),
        bio: bio.trim() || undefined,
        categories,
        // Empty means "cleared", not "unchanged" — null is how the API clears it.
        website: normalizeWebsiteUrl(website) || null,
      };
      if (usernameChanged) payload.username = username;
      // Always send location as a trio (or null-out the whole trio when
      // cleared) rather than only including whichever pieces are non-empty —
      // sending text without matching coordinates left stale coordinates
      // behind on the backend (an omitted key means "leave unchanged", not
      // "clear"), pairing a new/cleared address with an old, wrong pin.
      if (location.trim()) {
        payload.location = location.trim();
        payload.locationLat = locationLat;
        payload.locationLng = locationLng;
      } else {
        payload.location = null;
        payload.locationLat = null;
        payload.locationLng = null;
      }
      const profile = await creatorService.updateProfile(payload);
      // The server's own fresh profile, not a client guess — write it
      // straight into the shared cache so every screen reading it (home,
      // Discover, profile tab, …) is current without a refetch round trip.
      queryClient.setQueryData(creatorProfileKey, profile);
      updateUser({ name: profile.fullName, avatar: profile.avatarUrl ?? undefined });
      setUsername(profile.username ?? '');
      setOriginalUsername(profile.username ?? '');
      setUsernameStatus('idle');
      toast.success(t('profile.editCreator.saveSuccess'));
      router.back();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('profile.editCreator.saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      <PageHeader title={t('profile.editCreator.headerTitle')} backFallback="/(creator)/(tabs)/profile" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('profile.editCreator.sectionHeader')}</Text>
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>

          <View style={styles.field}>
            <TextInputWithLabel
              label={t('profile.editCreator.fullNameLabel')}
              leftIcon="user"
              value={fullName}
              onChangeText={(txt) => { setFullName(txt); setNameError(undefined); }}
              placeholder={t('profile.editCreator.fullNamePlaceholder')}
              error={nameError}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <TextInputWithLabel
              label={t('profile.editCreator.usernameLabel')}
              leftIcon="at"
              value={username}
              onChangeText={handleUsernameChange}
              placeholder={t('profile.editCreator.usernamePlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              error={
                usernameStatus === 'taken' ? t('profile.editCreator.usernameTakenError')
                : usernameStatus === 'invalid' ? t('profile.editCreator.usernameInvalidHint')
                : undefined
              }
              hint={
                usernameStatus === 'available' ? t('profile.editCreator.usernameAvailableHint')
                : usernameStatus === 'checking' ? t('profile.editCreator.usernameCheckingWarning')
                : undefined
              }
              rightSlot={
                usernameStatus === 'checking' ? <ActivityIndicator size="small" color={C.textSecondary} />
                : usernameStatus === 'available' ? <FontAwesome5 name="check-circle" solid size={18} color="#16A34A" />
                : (usernameStatus === 'taken' || usernameStatus === 'invalid') ? <FontAwesome5 name="times-circle" solid size={18} color={C.error} />
                : undefined
              }
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <TextInputWithLabel
              label={t('profile.editCreator.bioLabel')}
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, 500))}
              placeholder={t('profile.editCreator.bioPlaceholder')}
              multiline
              numberOfLines={4}
            />
            <Text style={[styles.charCount, { color: C.textSecondary }]}>{bio.length}/500</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <TextInputWithLabel
              label={t('profile.editCreator.websiteLabel')}
              leftIcon="globe"
              value={website}
              onChangeText={(txt) => { setWebsite(txt); setWebsiteError(undefined); }}
              onBlur={() => setWebsiteError(
                website.trim() && !isValidWebsiteUrl(website)
                  ? t('profile.editCreator.websiteInvalidWarning')
                  : undefined,
              )}
              placeholder={t('profile.editCreator.websitePlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              error={websiteError}
              hint={t('profile.editCreator.websiteHint')}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>{t('profile.editCreator.locationLabel')}</Text>
            <Pressable
              style={[styles.locationBtn, { backgroundColor: C.background, borderColor: C.border }]}
              onPress={() => setLocationModalOpen(true)}>
              <Text style={[styles.locationBtnTxt, { color: location ? C.text : C.textSecondary }]} numberOfLines={2}>
                {location || t('profile.editCreator.locationPlaceholder')}
              </Text>
              <Text style={styles.locationArrow}>›</Text>
            </Pressable>
            {location ? (
              <Pressable onPress={() => { setLocation(''); setLocationLat(null); setLocationLng(null); }}>
                <Text style={[styles.clearLocation, { color: C.error ?? '#EF4444' }]}>{t('profile.editCreator.clearLocation')}</Text>
              </Pressable>
            ) : null}
          </View>

        </View>

        <View style={styles.saveBtnWrap}>
          <Button label={t('profile.editCreator.saveBtn')} onPress={handleSave} loading={saving} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
      </KeyboardAvoidingView>
      </MaxWidthContainer>

      <LocationSearchModal
        visible={locationModalOpen}
        initialValue={location}
        onSelect={handleLocationSelect}
        onClose={() => setLocationModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:    { paddingBottom: SPACING.xxxl },
  // marginHorizontal matches card/saveBtnWrap's 16 below — this used to be a
  // stray 20, so the section label sat 4px further in than the card under it
  // (same fix as the business side's identical edit-profile screen).
  sectionHeader: { fontSize: 11, letterSpacing: 0, marginTop: 20, marginBottom: 6, marginHorizontal: SCREEN_GUTTER, fontFamily: F.bold },
  card:       { marginHorizontal: SCREEN_GUTTER, borderRadius: RADIUS.lg, borderWidth: 1, ...SHADOW.card, overflow: 'hidden' },
  field:      { padding: 16, gap: 6 },
  divider:    { height: 1 },
  label:      { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  charCount:  { fontSize: 11, textAlign: 'right', fontFamily: F.regular },
  locationBtn:    { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  locationBtnTxt: { flex: 1, fontSize: 14, lineHeight: 21, fontFamily: F.regular },
  locationArrow:  { fontSize: 20, color: '#9CA3AF' },
  clearLocation:  { fontSize: 12, marginTop: 2, fontFamily: F.semibold },
  chipGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip:       { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  chipText:   { fontSize: 13, fontFamily: F.semibold },
  saveBtnWrap:{ marginHorizontal: SCREEN_GUTTER, marginTop: 20 },
});
