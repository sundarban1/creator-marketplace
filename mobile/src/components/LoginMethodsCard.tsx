import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { AppModal } from '@/components/AppModal';
import { authService, type AuthMethods, type AuthProviderName } from '@/services/auth';
import { ApiError } from '@/lib/api';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';

// Settings → Security card: shows how the user can sign in (password + linked
// social providers) and lets them connect / disconnect Apple. Self-contained —
// fetches its own data — so it drops into both the creator and business
// settings screens unchanged.
export function LoginMethodsCard() {
  const C = useAppColors();
  const { isDark } = useIsDark();
  const { t } = useLanguage();
  const toast = useToast();

  const [methods, setMethods] = useState<AuthMethods | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<null | 'APPLE_LINK' | AuthProviderName>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [confirm, setConfirm] = useState<AuthProviderName | null>(null);

  async function load() {
    try {
      const next = await authService.getAuthMethods();
      setMethods(next);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => { if (active) setAppleAvailable(ok); })
      .catch(() => { if (active) setAppleAvailable(false); });
    return () => { active = false; };
  }, []);

  const linkedApple  = methods?.providers.find((p) => p.provider === 'APPLE');
  const linkedGoogle = methods?.providers.find((p) => p.provider === 'GOOGLE');

  async function connectApple() {
    setBusy('APPLE_LINK');
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('no token');
      await authService.appleLink({
        identityToken: cred.identityToken,
        authorizationCode: cred.authorizationCode ?? undefined,
        appleUserId: cred.user,
      });
      await load();
      toast.success(t('loginMethods.appleConnected'));
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      toast.error(e instanceof ApiError ? e.message : t('loginMethods.appleConnectFailed'));
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: AuthProviderName) {
    setConfirm(null);
    setBusy(provider);
    try {
      setMethods(await authService.unlinkAuthProvider(provider));
      toast.success(t('loginMethods.disconnected'));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'LAST_LOGIN_METHOD') {
        toast.error(t('loginMethods.lastMethodError'));
      } else {
        toast.error(e instanceof ApiError ? e.message : t('loginMethods.disconnectFailed'));
      }
    } finally {
      setBusy(null);
    }
  }

  const s = styles(C);

  if (!methods) {
    return (
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <View style={s.centerRow}>
          {loadFailed
            ? <Pressable onPress={load} hitSlop={8}><Text style={[s.retry, { color: C.brinjal1 }]}>{t('loginMethods.retry')}</Text></Pressable>
            : <ActivityIndicator size="small" color={C.brinjal1} />}
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[s.card, { backgroundColor: C.surface }]}>
        {/* Password */}
        <View style={[s.row, { borderBottomColor: C.border }]}>
          <View style={[s.iconWrap, { backgroundColor: '#D9770618' }]}>
            <FontAwesome5 name="key" size={16} color="#D97706" />
          </View>
          <View style={s.rowBody}>
            <Text style={[s.label, { color: C.text }]}>{t('loginMethods.password')}</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>
              {methods.hasPassword ? t('loginMethods.passwordOn') : t('loginMethods.passwordOff')}
            </Text>
          </View>
          {methods.hasPassword && <FontAwesome5 name="check-circle" solid size={16} color={C.active} />}
        </View>

        {/* Apple */}
        {(appleAvailable || linkedApple) && (
          <View style={[s.row, { borderBottomColor: C.border }]}>
            <View style={[s.iconWrap, { backgroundColor: isDark ? '#ffffff' : '#000000' }]}>
              <FontAwesome5 name="apple" size={16} color={isDark ? '#000000' : '#ffffff'} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.label, { color: C.text }]}>{t('loginMethods.apple')}</Text>
              {linkedApple && (
                <Text style={[s.sub, { color: C.textSecondary }]} numberOfLines={1}>
                  {linkedApple.email ?? t('loginMethods.connected')}
                </Text>
              )}
            </View>
            {busy === 'APPLE' || busy === 'APPLE_LINK'
              ? <ActivityIndicator size="small" color={C.brinjal1} />
              : linkedApple
                ? <Pressable onPress={() => setConfirm('APPLE')} hitSlop={8}><Text style={[s.action, { color: C.error }]}>{t('loginMethods.disconnect')}</Text></Pressable>
                : <Pressable onPress={connectApple} hitSlop={8}><Text style={[s.action, { color: C.brinjal1 }]}>{t('loginMethods.connect')}</Text></Pressable>}
          </View>
        )}

        {/* Google — disconnect only (linking happens on the sign-in screen) */}
        {linkedGoogle && (
          <View style={[s.row, s.rowLast]}>
            <View style={[s.iconWrap, { backgroundColor: '#4285F418' }]}>
              <FontAwesome5 name="google" size={16} color="#4285F4" />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.label, { color: C.text }]}>{t('loginMethods.google')}</Text>
              <Text style={[s.sub, { color: C.textSecondary }]} numberOfLines={1}>
                {linkedGoogle.email ?? t('loginMethods.connected')}
              </Text>
            </View>
            {busy === 'GOOGLE'
              ? <ActivityIndicator size="small" color={C.brinjal1} />
              : <Pressable onPress={() => setConfirm('GOOGLE')} hitSlop={8}><Text style={[s.action, { color: C.error }]}>{t('loginMethods.disconnect')}</Text></Pressable>}
          </View>
        )}
      </View>

      <AppModal
        visible={confirm !== null}
        type="warning"
        icon="unlink"
        title={t('loginMethods.disconnectTitle')}
        body={t('loginMethods.disconnectBody', { provider: confirm === 'APPLE' ? t('loginMethods.apple') : t('loginMethods.google') })}
        confirmLabel={t('loginMethods.disconnect')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => confirm && disconnect(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function styles(C: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    // Mirrors the settings-screen <Card> wrapper so this drop-in aligns with the
    // Login/Password and Verification cards above and below it.
    card: { marginHorizontal: SCREEN_GUTTER, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.card },
    centerRow: { padding: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
    retry: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, minHeight: 60, borderBottomWidth: 1 },
    rowLast: { borderBottomWidth: 0 },
    rowBody: { flex: 1, gap: 2 },
    iconWrap: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: FONT_SIZE.md, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.md) },
    sub: { fontSize: FONT_SIZE.xs, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.xs) },
    action: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },
  });
}
